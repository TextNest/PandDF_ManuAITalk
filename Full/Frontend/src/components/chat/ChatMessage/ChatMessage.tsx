'use client';

import { useState, useEffect, useRef } from 'react';
import { User, Bot, ThumbsUp, ThumbsDown, Volume2, Square, Loader } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { streamTextToSpeech } from '@/features/chat/utils/tts';
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
  const [ttsState, setTtsState] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopStreamingRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // 컴포넌트가 언마운트될 때 스트리밍 정리
    return () => {
      stopStreamingRef.current?.();
    };
  }, []);

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
    if (ttsState === 'loading' || ttsState === 'playing') {
      stopStreamingRef.current?.();
      setTtsState('idle');
    } else {
      if (audioRef.current) {
        const stop = streamTextToSpeech(message.content, audioRef.current, {
          onStart: () => setTtsState('loading'),
          onEnd: () => setTtsState('idle'),
          onError: (error) => {
            console.error('TTS Error:', error);
            setTtsState('error');
            setTimeout(() => setTtsState('idle'), 2000); // 2초 후 아이콘 복원
          },
        });
        
        // onStart 콜백에서 바로 playing으로 바꾸면 MSE가 준비되기 전에 play를 시도할 수 있으므로,
        // audioEl의 play 이벤트를 감지하여 상태를 변경
        const onPlay = () => setTtsState('playing');
        audioRef.current.addEventListener('play', onPlay);

        stopStreamingRef.current = () => {
          stop();
          audioRef.current?.removeEventListener('play', onPlay);
        };
      }
    }
  };
  
  const getVoiceButtonIcon = () => {
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
                  className={`${styles.voiceButton} ${ttsState === 'playing' ? styles.playing : ''}`}
                  onClick={handlePlayClick}
                  title={ttsState === 'playing' ? "재생 중지" : "음성으로 듣기"}
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