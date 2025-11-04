'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Menu, Trash2, Plus, MessageSquare, User, Maximize2, LogIn, LogOut } from 'lucide-react';
import { ChatSession } from '@/lib/db/indexedDB';
import { formatRelativeTime } from '@/lib/utils/format';
import Button from '@/components/ui/Button/Button';
import styles from './SessionHistory.module.css';

interface SessionHistoryProps {
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
}

export default function SessionHistory({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
}: SessionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();

  const productId = typeof window !== 'undefined' 
    ? window.location.pathname.split('/chat/')[1] 
    : 'test-product';

  const handleDelete = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (confirm('이 대화를 삭제하시겠습니까?')) {
      onDeleteSession(sessionId);
    }
  };

  const handleAuth = () => {
    if (isAuthenticated) {
      logout();
      setIsOpen(false);
    } else {
      router.push('/login');
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* 토글 버튼 */}
      <button 
        className={styles.toggleButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="대화 기록"
      >
        <Menu size={20} />
      </button>

      {/* 사이드바 */}
      {isOpen && (
        <>
          <div className={styles.backdrop} onClick={() => setIsOpen(false)} />
          <div className={styles.sidebar}>
            <div className={styles.header}>
              <h3 className={styles.title}>
                <MessageSquare size={20} />
                메뉴
              </h3>
              <Button variant="primary" size="sm" onClick={onNewSession}>
                <Plus size={16} />
                새 대화
              </Button>
            </div>

            {/* 네비게이션 섹션 */}
            <div className={styles.navigationSection}>
              <h4 className={styles.sectionTitle}>바로가기</h4>
              
              {isAuthenticated && (
                <button
                  className={styles.navButton}
                  onClick={() => {
                    router.push('/my');
                    setIsOpen(false);
                  }}
                >
                  <User size={18} />
                  <span>내 대화 목록</span>
                </button>
              )}

              <button
                className={styles.navButton}
                onClick={() => {
                  router.push(`/simulation/${productId}`);
                  setIsOpen(false);
                }}
              >
                <Maximize2 size={18} />
                <span>공간 시뮬레이션</span>
              </button>
            </div>

            {/* 구분선 */}
            <div className={styles.divider} />

            {/* 세션 섹션 */}
            <div className={styles.sessionSection}>
              <h4 className={styles.sectionTitle}>대화 세션</h4>
              <div className={styles.sessionList}>
                {sessions.length === 0 ? (
                  <div className={styles.empty}>
                    <p>저장된 대화가 없습니다</p>
                  </div>
                ) : (
                  sessions.map((session) => (
                    <div
                      key={session.id}
                      className={`${styles.sessionItem} ${
                        session.id === currentSessionId ? styles.active : ''
                      }`}
                      onClick={() => {
                        onSelectSession(session.id);
                        setIsOpen(false);
                      }}
                    >
                      <div className={styles.sessionInfo}>
                        <div className={styles.sessionTitle}>
                          {session.messages.length > 0
                            ? session.messages[0].content.substring(0, 30) + '...'
                            : '새 대화'}
                        </div>
                        <div className={styles.sessionMeta}>
                          <span>{session.messages.length}개 메시지</span>
                          <span>·</span>
                          <span>{formatRelativeTime(new Date(session.updatedAt))}</span>
                        </div>
                      </div>
                      <button
                        className={styles.deleteButton}
                        onClick={(e) => handleDelete(e, session.id)}
                        aria-label="삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 🆕 하단 로그인/로그아웃 버튼 */}
            <div className={styles.footer}>
              <button
                className={styles.authButton}
                onClick={handleAuth}
              >
                {isAuthenticated ? (
                  <>
                    <LogOut size={18} />
                    <span>로그아웃</span>
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    <span>로그인</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}