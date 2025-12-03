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
  
  // 1. 마크다운 문법 제거
  const plainText = text.replace(/(\*\*|__|\*|_|~~|`|---|#+\s)/g, '');
  if (!plainText.trim()) {
    onError?.("Text cannot be empty.");
    return () => {};
  }

  const wsUrl = (process.env.NEXT_PUBLIC_API_URL || 'ws://127.0.0.1:8000')
    .replace(/^http/, 'ws');
  
  const socket = new WebSocket(`${wsUrl}/ws/tts`);
  let mediaSource = new MediaSource();
  let sourceBuffer: SourceBuffer | null = null;
  let audioQueue: ArrayBuffer[] = [];
  let isSourceBufferUpdating = false;

  audioEl.src = URL.createObjectURL(mediaSource);

  const cleanup = () => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
    if (audioEl.src) {
      URL.revokeObjectURL(audioEl.src);
    }
  };

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

  mediaSource.addEventListener('sourceopen', () => {
    try {
      sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
      sourceBuffer.addEventListener('updateend', () => {
        isSourceBufferUpdating = false;
        appendNextAudioChunk();
      });
      // MediaSource가 준비되면 WebSocket에 텍스트 전송
      socket.send(JSON.stringify({ text: plainText }));
    } catch (e) {
      console.error("Error setting up MediaSource:", e);
      onError?.("Unsupported audio format or browser.");
      cleanup();
    }
  });

  socket.onopen = () => {
    onStart?.();
    // sourceopen 이벤트가 발생하면 텍스트를 전송하므로 여기서는 대기
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
        audioEl.play().catch(e => console.error("Audio play failed:", e));
      }
    }
  };

  socket.onclose = () => {
    const endStream = () => {
      if (sourceBuffer && !isSourceBufferUpdating && mediaSource.readyState === 'open') {
        try {
          mediaSource.endOfStream();
        } catch (e) {
          console.warn("Error ending stream:", e);
        }
      }
      onEnd?.();
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

  // 중지 함수 반환
  return () => {
    cleanup();
  };
};
