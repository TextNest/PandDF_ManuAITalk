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

  const wsUrl = (process.env.NEXT_PUBLIC_API_URL || 'ws://127.0.0.1:8000')
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
    // onEnd 콜백은 여기서만 호출되어야 가장 정확합니다.
    onEnd?.();
  };

  const cleanup = () => {
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
    if (audioEl) {
      // 이벤트 리스너를 정리합니다.
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

  // onended 이벤트를 onEnd 콜백에 연결
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
      console.error("Error appending buffer:", e);
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
      console.error("Error setting up MediaSource:", e);
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
            console.error("Audio play failed:", e);
          }
        });
      }
    }
  };

  socket.onclose = () => {
    // 서버가 연결을 닫으면, 스트림이 끝났음을 브라우저에 알립니다.
    const endStream = () => {
      if (sourceBuffer && !isSourceBufferUpdating && mediaSource.readyState === 'open') {
        try {
          mediaSource.endOfStream();
        } catch (e) {
          console.warn("Error ending stream:", e);
        }
      }
      // 더 이상 onEnd()를 여기서 호출하지 않습니다.
    };

    const checkBuffer = setInterval(() => {
      if (!isSourceBufferUpdating && audioQueue.length === 0) {
        clearInterval(checkBuffer);
        endStream();
      }
    }, 100);
  };
  
  socket.onerror = (event) => {
    console.error("WebSocket error:", event);
    onError?.("Connection to speech service failed.");
    cleanup();
  };

  return cleanup;
};