'use client';

import { useState, useEffect } from 'react';
import { User, Bot, ThumbsUp, ThumbsDown } from 'lucide-react';
import { dbManager, MessageFeedback } from '@/lib/db/indexedDB';
import styles from './ChatMessage.module.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Array<{
    documentName: string;
    pageNumber: number;
  }>;
}

interface ChatMessageProps {
  message: Message;
  sessionId: string;
  productId: string;
  isFirstMessage?: boolean; // 🆕 추가
}

export default function ChatMessage({
  message,
  sessionId,
  productId,
  isFirstMessage = false // 🆕 추가
}: ChatMessageProps) {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (message.role === 'assistant') {
      loadExistingFeedback();
    }
  }, [message.id, sessionId]);

  const loadExistingFeedback = async () => {
    const existingFeedback = await dbManager.getFeedback(sessionId, message.id);
    if (existingFeedback) {
      setFeedback(existingFeedback.feedbackType);
    }
  };

  const handleFeedback = async (type: 'positive' | 'negative') => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      // 🆕 같은 버튼을 다시 누르면 취소
      if (feedback === type) {
        // 피드백 삭제
        await dbManager.deleteFeedback(sessionId, message.id);
        setFeedback(null);
        console.log('피드백 취소됨');
      } else {
        // 새로운 피드백 저장 또는 변경
        const newFeedback: MessageFeedback = {
          id: `${sessionId}-${message.id}`,
          messageId: message.id,
          sessionId,
          productId,
          feedbackType: type,
          timestamp: new Date().toISOString(),
        };

        await dbManager.saveFeedback(newFeedback);
        setFeedback(type);
        console.log(`피드백 저장됨: ${type}`);
      }
    } catch (error) {
      console.error('피드백 처리 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 🆕 역할에 따라 별도 클래스명 사용
  const messageClass = message.role === 'user'
    ? `${styles.message} ${styles.userMessage}`
    : `${styles.message} ${styles.assistantMessage}`;

  return (
    <div className={messageClass}>
      <div className={styles.messageInner}>
        <div className={styles.avatar}>
          {message.role === 'user' ? <User size={20} /> : <Bot size={20} />}
        </div>
        
        <div className={styles.content}>
          <div className={styles.text}>{message.content}</div>
          
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

          {/* 🆕 첫 메시지가 아닐 때만 피드백 버튼 표시 */}
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