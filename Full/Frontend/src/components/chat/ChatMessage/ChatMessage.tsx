'use client';

import { useState, useEffect } from 'react';
import { User, Bot, ThumbsUp, ThumbsDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

  // 5. 피드백 로드 로직
  useEffect(() => {
    if (message.feedback !== feedback) {
      setFeedback(message.feedback || null);
    }
  }, [message.feedback]);


  // 6. 피드백 핸들러 로직
  const handleFeedback = async (type: 'positive' | 'negative') => {
    if (isLoading) return;
    setIsLoading(true);
    const previousFeedback = feedback;
    const newFeedbackType = (feedback===type)?null:type;

    try {
      await onSendFeedback(message.id, newFeedbackType);
      setFeedback(newFeedbackType);
      console.log(`피드백 저장됨: ${newFeedbackType}`);
    } catch (error){
      setFeedback(previousFeedback);
      console.log(`피드백 저장 실패: ${error}`)
    }finally{
      setIsLoading(false);
    }
  };

  // 7. 새 CSS 클래스 이름 적용
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

          {/* 피드백 (AI 응답 + 첫 메시지가 아닐 때) */}
          {message.role === 'assistant' && !isFirstMessage && (
            <div className={styles.feedbackButtons}>
              <button
                className={`${styles.feedbackButton} ${feedback === 'positive' ? styles.active : ''}`}
                onClick={() => handleFeedback('positive')}
                disabled={isLoading}
                title="도움이 되었어요"
              >
                <ThumbsUp size={16} />
                {feedback === 'positive' && <span className={styles.feedbackLabel}>도움됨</span>}
              </button>
              
              <button
                className={`${styles.feedbackButton} ${feedback === 'negative' ? styles.active : ''}`}
                onClick={() => handleFeedback('negative')}
                disabled={isLoading}
                title="도움이 안 되었어요"
              >
                <ThumbsDown size={16} />
                {feedback === 'negative' && <span className={styles.feedbackLabel}>아쉬워요</span>}
              </button>
            </div>
          )}
          
          {/* 타임스탬프 */}
          <div className={styles.timestamp}>
            {new Date(message.timestamp).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      </div>
    </div>
  );
}