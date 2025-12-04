// ============================================
// 📄 2. src/components/chat/TTSPlayer/TTSPlayer.tsx
// ============================================
// 이 컴포넌트는 UI를 렌더링하지 않으며, 오직 TTS 재생 로직만 처리합니다.
// ============================================

'use client';

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { streamTextToSpeech } from '@/features/chat/utils/tts';

export default function TTSPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const { 
    sessions,
    currentProductId,
    ttsPlayingMessageId, 
    stopTTS, 
    setTTSState,
    startRecording,
    isAutoPlayEnabled,
    lastInputMode
  } = useChatStore();

  useEffect(() => {
    if (!ttsPlayingMessageId || !audioRef.current) {
      return;
    }

    const currentSession = sessions[currentProductId!];
    const messageToPlay = currentSession?.messages.find(m => m.id === ttsPlayingMessageId);

    if (!messageToPlay) {
      stopTTS();
      return;
    }

    let cleanupStream: (() => void) | null = null;

    const play = async () => {
      cleanupStream = streamTextToSpeech(messageToPlay.content, audioRef.current!, {
        onStart: () => {
          setTTSState('playing');
        },
        onEnd: () => {
          stopTTS();
          // 음성 입력 모드일 경우에만 자동 녹음 시작
          if (isAutoPlayEnabled && lastInputMode === 'voice') {
            startRecording();
          }
        },
        onError: (error) => {
          console.error('TTS Error:', error);
          setTTSState('error');
          stopTTS();
        },
      });
    };

    play();

    return () => {
      if (cleanupStream) {
        cleanupStream();
      }
    };
  }, [ttsPlayingMessageId, sessions, currentProductId, setTTSState, stopTTS, startRecording, isAutoPlayEnabled, lastInputMode]);

  return <audio ref={audioRef} style={{ display: 'none' }} />;
}