// ============================================
// 📄 src/app/(user)/chat/[productId]/page.tsx
// ============================================
// 세션 기능 + 로그인 유도 배너가 통합된 채팅 페이지
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useChat } from '@/features/chat/hooks/useChat';
import ChatMessage from '@/components/chat/ChatMessage/ChatMessage';
import SuggestedQuestions from '@/components/chat/SuggestedQuestions/SuggestedQuestions';
import TypingIndicator from '@/components/chat/TypingIndicator/TypingIndicator';
import SessionHistory from '@/components/chat/SessionHistory/SessionHistory';
import styles from './chat-page.module.css';
import { toast } from '@/store/useToastStore';

const SUGGESTED_QUESTIONS = [
  '제품 사용법이 궁금해요',
  '고장이 났어요',
  'A/S는 어떻게 받나요?',
  '설치 방법을 알려주세요',
];

export default function ChatPage({
  params
}: {
  params: { productId: string }
}) {
  const router = useRouter();

  // 인증 상태
  const { isAuthenticated } = useAuth();

  // 채팅 상태
  const [inputValue, setInputValue] = useState('');
  const {
    messages,
    isLoading,
    sendMessage,
    messagesEndRef,
    // 세션 관련
    sessionId,
    sessions,
    isSessionLoading,
    loadSession,
    startNewSession,
    deleteSession,
  } = useChat(params.productId);

  // 로그인 배너 상태
  const [showLoginBanner, setShowLoginBanner] = useState(true);

  // 로그인 시 배너 자동 숨김
  useEffect(() => {
    if (isAuthenticated) {
      setShowLoginBanner(false);
    }
  }, [isAuthenticated]);

  // 구글 로그인 함수
  const handleGoogleLogin = () => {
    // TODO: 실제 Google OAuth 연동
    toast.info('구글 로그인 기능은 백엔드 연동 후 활성화됩니다.');
    // 실제 구현: window.location.href = '/api/auth/google';
  };

  // 메시지 전송
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    await sendMessage(inputValue);
    setInputValue('');
  };

  // 추천 질문 선택
  const handleSuggestedQuestion = (question: string) => {
    setInputValue(question);
  };

  // Enter 키 전송
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 세션 로딩 중
  if (isSessionLoading) {
    return (
      <div className={styles.chatPage}>
        <div className={styles.loadingContainer}>
          <p>대화를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.chatPage}>
      {/* 세션 히스토리 사이드바 */}
      <SessionHistory
        sessions={sessions}
        currentSessionId={sessionId}
        onSelectSession={loadSession}
        onNewSession={startNewSession}
        onDeleteSession={deleteSession}
      />

      <div className={styles.chatContent}>
        {/* 로그인 유도 배너 (비로그인 시에만 표시) */}
        {!isAuthenticated && showLoginBanner && (
          <div className={styles.loginBanner}>
            <div className={styles.bannerContent}>
              <span>💡 로그인하면 대화 기록이 저장되고 더 많은 기능을 사용할 수 있어요!</span>
              <button
                className={styles.loginButton}
                onClick={handleGoogleLogin}
              >
                구글로 로그인
              </button>
            </div>
            <button
              className={styles.closeBanner}
              onClick={() => setShowLoginBanner(false)}
              aria-label="배너 닫기"
            >
              ✕
            </button>
          </div>
        )}

        {/* 제품 정보 헤더 - 버튼들 제거 */}
        <div className={styles.productInfo}>
          <p className={styles.productId}>제품: {params.productId}</p>
        </div>

        {/* 메시지 영역 */}
        <div className={styles.messageArea}>
          {messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              sessionId={sessionId}
              productId={params.productId}
              isFirstMessage={index === 0} // 🆕 추가
            />
          ))}

          {isLoading && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>

        {/* 추천 질문 (메시지가 1개일 때만) */}
        {messages.length === 1 && !isLoading && (
          <SuggestedQuestions
            questions={SUGGESTED_QUESTIONS}
            onSelect={handleSuggestedQuestion}
          />
        )}

        {/* 입력 영역 */}
        <div className={styles.inputArea}>
          <input
            type="text"
            className={styles.input}
            placeholder="메시지를 입력하세요..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <button
            className={styles.sendButton}
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            aria-label="전송"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}