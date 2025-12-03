'use client';

import { useState, useEffect, useRef } from 'react';
import { User, Bot, ThumbsUp, ThumbsDown, Volume2, Square, Loader } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { streamTextToSpeech } from '@/features/chat/utils/tts';
import { useChatStore } from '@/store/useChatStore'; // Zustand 스토어 임포트
import styles from './ChatMessage.module.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  feedback?: 'positive' | 'negative' | null;
  sources?: Array<{
    documentName: string;
    pageNumber: number;
  }>;
}

interface ChatMessageProps {
  message: Message;
  sessionId: string;
  productId: string;
  isFirstMessage?: boolean;
  onSendFeedback: (
    messageId: string | number, 
    type: 'positive' | 'negative' | null
  ) => Promise<void>;
}

export default function ChatMessage({
  message,
  onSendFeedback,
  isFirstMessage = false,
}: ChatMessageProps) {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(message.feedback || null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  
  // 전역 TTS 상태 사용
  const { 
    ttsPlayingMessageId, 
    ttsState, 
    playTTS, 
    stopTTS, 
    setTTSState 
  } = useChatStore();

  const isCurrentPlaying = ttsPlayingMessageId === message.id;

  const audioRef = useRef<HTMLAudioElement>(null);
  
  useEffect(() => {
    // 이 Effect는 isCurrentPlaying 상태가 변경될 때 스트림의 생명주기를 관리합니다.
    let stopStreaming: (() => void) | null = null;

    if (isCurrentPlaying && audioRef.current) {
      // 재생을 시작해야 하지만, 이미 재생/로딩 중인 상태 변경으로 인한 재실행을 방지
      if (ttsState === 'idle' || ttsState === 'error') {
        // playTTS가 호출되면 loading 상태가 되므로, 바로 스트림을 시작하지 않고
        // ttsState가 loading으로 바뀐 후의 Effect 실행에 맡깁니다.
        // 이 부분은 직접적인 스트림 시작이 아닌 상태 동기화에 가깝습니다.
      } else if (ttsState === 'loading') {
        const audioEl = audioRef.current;
        const stop = streamTextToSpeech(message.content, audioEl, {
          onStart: () => setTTSState('loading'),
          onEnd: () => {
            const { ttsPlayingMessageId, isAutoPlayEnabled, startRecording, stopTTS: zustandStopTTS } = useChatStore.getState();
            if (ttsPlayingMessageId === message.id) {
              zustandStopTTS(); // 상태를 먼저 초기화
              if (isAutoPlayEnabled) {
                console.log("DEBUG: Attempting to start recording after TTS ended."); // 디버그 로그 추가
                startRecording(); // 그 다음에 녹음 시작
              }
            }
          },
          onError: (error) => {
            console.error('TTS Error:', error);
            if (useChatStore.getState().ttsPlayingMessageId === message.id) {
              setTTSState('error');
              setTimeout(() => stopTTS(), 2000);
            }
          },
        });
  
        const onPlay = () => setTTSState('playing');
        audioEl.addEventListener('play', onPlay, { once: true });
  
        stopStreaming = () => {
          stop();
          audioEl.removeEventListener('play', onPlay);
        };
      }
    }

    return () => {
      if (stopStreaming) {
        stopStreaming();
      }
    };
    // ttsState를 제거하여, 재생 상태 변경으로 인해 Effect가 재실행되지 않도록 합니다.
  }, [isCurrentPlaying, message.content, message.id, setTTSState, stopTTS]);

  useEffect(() => {
    if (message.feedback !== feedback) {
      setFeedback(message.feedback || null);
    }
  }, [message.feedback]);

  const handleFeedback = async (type: 'positive' | 'negative') => {
    if (feedbackLoading) return;
    setFeedbackLoading(true);
    const previousFeedback = feedback;
    const newFeedbackType = (feedback === type) ? null : type;

    try {
      await onSendFeedback(message.id, newFeedbackType);
      setFeedback(newFeedbackType);
    } catch (error) {
      setFeedback(previousFeedback);
      console.error(`피드백 저장 실패: ${error}`);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handlePlayClick = () => {
    if (isCurrentPlaying && (ttsState === 'loading' || ttsState === 'playing')) {
      stopTTS();
    } else {
      playTTS(message.id);
    }
  };
  
  const getVoiceButtonIcon = () => {
    if (!isCurrentPlaying) return <Volume2 size={16} />;

    switch (ttsState) {
      case 'loading':
        return <Loader size={16} className={styles.loaderIcon} />;
      case 'playing':
        return <Square size={16} />;
      case 'error':
        return <Volume2 size={16} color="red" />;
      default:
        return <Volume2 size={16} />;
    }
  };

  const messageClass = message.role === 'user'
    ? `${styles.message} ${styles.userMessage}`
    : `${styles.message} ${styles.assistantMessage}`;

  return (
    <div className={messageClass}>
      <audio ref={audioRef} style={{ display: 'none' }} />
      <div className={styles.messageInner}>
        <div className={styles.avatar}>
          {message.role === 'user' ? <User size={20} /> : <Bot size={20} />}
        </div>
        
        <div className={styles.content}>
          <div className={styles.text}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
          
          {message.role === 'assistant' && message.sources && (
            <div className={styles.sources}>
              <p className={styles.sourcesTitle}>📚 출처:</p>
              <ul>
                {message.sources.map((source, idx) => (
                  <li key={idx}>
                    {source.documentName} (p.{source.pageNumber})
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={styles.messageMeta}>
            {message.role === 'assistant' && !isFirstMessage && (
              <div className={styles.messageActions}>
                <div className={styles.feedbackButtons}>
                  <button
                    className={`${styles.feedbackButton} ${feedback === 'positive' ? styles.active : ''}`}
                    onClick={() => handleFeedback('positive')}
                    disabled={feedbackLoading}
                    title="도움이 되었어요"
                  >
                    <ThumbsUp size={16} />
                  </button>
                  <button
                    className={`${styles.feedbackButton} ${feedback === 'negative' ? styles.active : ''}`}
                    onClick={() => handleFeedback('negative')}
                    disabled={feedbackLoading}
                    title="도움이 안 되었어요"
                  >
                    <ThumbsDown size={16} />
                  </button>
                </div>
                <button
                  className={`${styles.voiceButton} ${isCurrentPlaying && ttsState === 'playing' ? styles.playing : ''}`}
                  onClick={handlePlayClick}
                  title={isCurrentPlaying && ttsState === 'playing' ? "재생 중지" : "음성으로 듣기"}
                >
                  {getVoiceButtonIcon()}
                </button>
              </div>
            )}
            
            <div className={styles.timestamp}>
              {new Date(message.timestamp).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}