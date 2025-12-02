'use client';

import { useState, useEffect, useRef } from 'react';
import { User, Bot, ThumbsUp, ThumbsDown, Volume2, Square } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { playTextToSpeech } from '@/features/chat/utils/tts';
// 2. IndexedDB 로직
// import { dbManager, MessageFeedback } from '@/lib/db/indexedDB';
// 3. CSS 파일
import styles from './ChatMessage.module.css';

// 4. Message 타입 정의
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
  sessionId,
  productId,
  isFirstMessage = false,
  onSendFeedback
}: ChatMessageProps) {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(message.feedback || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 5. 피드백 로드 로직
  useEffect(() => {
    if (message.feedback !== feedback) {
      setFeedback(message.feedback || null);
    }
  }, [message.feedback]);

  // 컴포넌트 언마운트 시 오디오 정리
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleFeedback = async (type: 'positive' | 'negative') => {
    if (isLoading) return;
    setIsLoading(true);
    const previousFeedback = feedback;
    const newFeedbackType = (feedback === type) ? null : type;

    try {
      await onSendFeedback(message.id, newFeedbackType);
      setFeedback(newFeedbackType);
    } catch (error) {
      setFeedback(previousFeedback);
      console.error(`피드백 저장 실패: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

// ... (생략) ...

  const handlePlaySound = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0; // 재생 위치를 처음으로
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    try {
      audioRef.current = await playTextToSpeech(message.content);
      // playTextToSpeech 내부의 onended에서 isPlaying을 false로 설정할 수도 있지만,
      // 중복 방지를 위해 audioRef를 통해 직접 제어
      audioRef.current.onended = () => {
        setIsPlaying(false);
      };
    } catch (error) {
      console.error("TTS playback failed in ChatMessage:", error);
      setIsPlaying(false);
    }
  };
  
  const messageClass = message.role === 'user'
    ? `${styles.message} ${styles.userMessage}`
    : `${styles.message} ${styles.assistantMessage}`;

  return (
    <div className={messageClass}>
      <div className={styles.messageInner}>
        {/* 아바타 */}
        <div className={styles.avatar}>
          {message.role === 'user' ? <User size={20} /> : <Bot size={20} />}
        </div>
        
        {/* 컨텐츠 */}
        <div className={styles.content}>
          {/* 8. 🛑 핵심! message.content를 ReactMarkdown으로 렌더링 */}
          <div className={styles.text}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
          
          {/* 출처 (AI 응답 + sources가 있을 때) */}
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
                    disabled={isLoading}
                    title="도움이 되었어요"
                  >
                    <ThumbsUp size={16} />
                  </button>
                  <button
                    className={`${styles.feedbackButton} ${feedback === 'negative' ? styles.active : ''}`}
                    onClick={() => handleFeedback('negative')}
                    disabled={isLoading}
                    title="도움이 안 되었어요"
                  >
                    <ThumbsDown size={16} />
                  </button>
                </div>
                <button
                  className={`${styles.voiceButton} ${isPlaying ? styles.playing : ''}`}
                  onClick={handlePlaySound}
                  title={isPlaying ? "재생 중지" : "음성으로 듣기"}
                >
                  {isPlaying ? <Square size={16} /> : <Volume2 size={16} />}
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