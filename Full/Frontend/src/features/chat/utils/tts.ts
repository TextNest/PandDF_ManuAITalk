import { useChatStore } from '@/store/useChatStore';
// src/features/chat/utils/tts.ts

interface TTSStreamCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

/**
 * WebSocket과 Media Source Extensions를 사용하여 텍스트를 실시간 음성 스트림으로 재생합니다.
 * @param text 재생할 텍스트
 * @param audioEl 오디오를 재생할 HTMLAudioElement
 * @param callbacks 스트리밍 상태에 따른 콜백 함수들
 * @returns {() => void} 스트리밍을 중지하는 함수
 */
export const streamTextToSpeech = (
  text: string,
  audioEl: HTMLAudioElement,
  callbacks: TTSStreamCallbacks = {}
): (() => void) => {
  const { onStart, onEnd, onError } = callbacks;
  
  const plainText = text.replace(/(\*\*|__|\*|_|~~|`|---|#+\s)/g, '');
  if (!plainText.trim()) {
    onError?.("Text cannot be empty.");
    return () => {};
  }

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 
              (process.env.NEXT_PUBLIC_API_URL || 'ws://127.0.0.1:8000')
                .replace(/^http/, 'ws');
  
  const socket = new WebSocket(`${wsUrl}/voice/ws/tts`);
  let mediaSource = new MediaSource();
  let sourceBuffer: SourceBuffer | null = null;
  let audioQueue: ArrayBuffer[] = [];
  let isSourceBufferUpdating = false;
  let isSocketOpen = false;
  let isMediaSourceOpen = false;
  let objectUrl: string | null = null;

  const onPlaybackEnded = () => {
    onEnd?.();
  };

  const cleanup = () => {
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
    if (audioEl) {
      audioEl.removeEventListener('ended', onPlaybackEnded);
      audioEl.pause();
      audioEl.src = '';
      if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
      }
      audioEl.load();
    }
  };

  audioEl.addEventListener('ended', onPlaybackEnded);

  const appendNextAudioChunk = () => {
    if (isSourceBufferUpdating || !sourceBuffer || audioQueue.length === 0) {
      return;
    }
    isSourceBufferUpdating = true;
    const chunk = audioQueue.shift()!;
    try {
      sourceBuffer.appendBuffer(chunk);
    } catch (e) {
      console.error("TTS: Error appending buffer:", e);
      onError?.("Failed to process audio stream.");
      cleanup();
    }
  };

  const trySendText = () => {
    if (isSocketOpen && isMediaSourceOpen && socket.readyState === 1 /* OPEN */) {
      socket.send(JSON.stringify({ text: plainText }));
    }
  };

  mediaSource.addEventListener('sourceopen', () => {
    isMediaSourceOpen = true;
    try {
      sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
      sourceBuffer.addEventListener('updateend', () => {
        isSourceBufferUpdating = false;
        appendNextAudioChunk();
      });
      trySendText();
    } catch (e) {
      console.error("TTS: Error setting up MediaSource:", e);
      onError?.("Unsupported audio format or browser.");
      cleanup();
    }
  });

  objectUrl = URL.createObjectURL(mediaSource);
  audioEl.src = objectUrl;

  socket.onopen = () => {
    onStart?.();
    isSocketOpen = true;
    trySendText();
  };

  socket.onmessage = async (event) => {
    if (event.data instanceof Blob || event.data instanceof ArrayBuffer) {
      const arrayBuffer = event.data instanceof Blob 
        ? await event.data.arrayBuffer() 
        : event.data;
      
      audioQueue.push(arrayBuffer);
      if (!isSourceBufferUpdating) {
        appendNextAudioChunk();
      }
      if (audioEl.paused) {
        audioEl.play().catch(e => {
          if (e.name !== 'AbortError') {
            console.error("TTS: Audio play failed:", e);
          }
        });
      }
    } else {
        console.error('TTS: Received non-audio data on WebSocket:', event.data);
    }
  };

  socket.onclose = (event) => {
    // A normal closure (1000) is expected when the server finishes sending data.
    // It's not an application error. We should ensure all data is played out.
    const endStream = () => {
      if (sourceBuffer && !isSourceBufferUpdating && mediaSource.readyState === 'open') {
        try {
          mediaSource.endOfStream();
        } catch (e) {
          // This can sometimes fail if the browser is already tearing things down.
          console.error("TTS: Error ending MediaSource stream:", e);
        }
      }
    };

    // Wait until the buffer is empty before ending the stream.
    const checkBuffer = setInterval(() => {
      if (!isSourceBufferUpdating && audioQueue.length === 0) {
        clearInterval(checkBuffer);
        endStream();
      }
    }, 100);

    // Only treat non-normal closures as errors.
    if (event.code !== 1000) {
      onError?.(`WebSocket closed abnormally. Code: ${event.code}`);
    }
  };
  
  socket.onerror = (event) => {
    console.error("TTS: WebSocket error event:", event);
    onError?.("Connection to speech service failed.");
    cleanup();
  };

  return cleanup;
};
