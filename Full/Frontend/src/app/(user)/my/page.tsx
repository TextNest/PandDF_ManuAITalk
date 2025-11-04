'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { MessageSquare, Calendar, Trash2, ChevronRight } from 'lucide-react';
import styles from './my-page.module.css';
import { toast } from '@/store/useToastStore';

interface ChatSession {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  lastMessage: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

// Mock 데이터 (실제로는 API에서 가져옴)
const mockSessions: ChatSession[] = [
  {
    id: 'session-1',
    productId: 'samsung-wf123',
    productName: '삼성 세탁기 WF-123',
    lastMessage: '세탁기 소음이 너무 심한데 어떻게 해야 하나요?',
    messageCount: 5,
    createdAt: '2025-01-20T15:30:00',
    updatedAt: '2025-01-20T15:45:00',
  },
  {
    id: 'session-2',
    productId: 'samsung-wf123',
    productName: '삼성 세탁기 WF-123',
    lastMessage: '세탁기 설치 방법을 알려주세요',
    messageCount: 3,
    createdAt: '2025-01-15T10:20:00',
    updatedAt: '2025-01-15T10:35:00',
  },
  {
    id: 'session-3',
    productId: 'lg-rf456',
    productName: 'LG 냉장고 RF-456',
    lastMessage: '냉장고 온도 조절은 어떻게 하나요?',
    messageCount: 8,
    createdAt: '2025-01-18T14:00:00',
    updatedAt: '2025-01-18T14:20:00',
  },
  {
    id: 'session-4',
    productId: 'lg-rf456',
    productName: 'LG 냉장고 RF-456',
    lastMessage: 'A/S 신청 방법이 궁금합니다',
    messageCount: 4,
    createdAt: '2025-01-10T09:15:00',
    updatedAt: '2025-01-10T09:30:00',
  },
];

export default function MyChatsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>(mockSessions);
  const [isLoading, setIsLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<'product' | 'date'>('product');

  // 로그인 체크
  useEffect(() => {
    if (!isAuthenticated) {
      toast.warning('로그인이 필요한 서비스입니다.');
      router.push('/login');
      return;
    }

    // 실제로는 API 호출
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  }, [isAuthenticated, router]);

  // 제품별 그룹핑
  const groupedByProduct = sessions.reduce((acc, session) => {
    if (!acc[session.productId]) {
      acc[session.productId] = {
        productName: session.productName,
        sessions: [],
      };
    }
    acc[session.productId].sessions.push(session);
    return acc;
  }, {} as Record<string, { productName: string; sessions: ChatSession[] }>);

  // 날짜별 그룹핑
  const groupedByDate = sessions.reduce((acc, session) => {
    const date = new Date(session.updatedAt).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(session);
    return acc;
  }, {} as Record<string, ChatSession[]>);

  // 세션 클릭
  const handleSessionClick = (session: ChatSession) => {
    router.push(`/chat/${session.productId}?session=${session.id}`);
  };

  // 세션 삭제
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('이 대화를 삭제하시겠습니까?')) {
      setSessions(sessions.filter(s => s.id !== sessionId));
      toast.success('대화가 삭제되었습니다.');
      // TODO: API 호출
    }
  };
  // 시간 포맷
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <p>대화 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* 헤더 */}
        <div className={styles.header}>
          <div>
            <h1>내 대화</h1>
            <p>과거 대화 기록을 확인하고 이어서 질문하세요</p>
          </div>

          {/* 그룹핑 토글 */}
          <div className={styles.toggleGroup}>
            <button
              className={`${styles.toggleButton} ${groupBy === 'product' ? styles.active : ''}`}
              onClick={() => setGroupBy('product')}
            >
              제품별
            </button>
            <button
              className={`${styles.toggleButton} ${groupBy === 'date' ? styles.active : ''}`}
              onClick={() => setGroupBy('date')}
            >
              날짜별
            </button>
          </div>
        </div>

        {/* 세션이 없을 때 */}
        {sessions.length === 0 && (
          <div className={styles.emptyState}>
            <MessageSquare size={48} className={styles.emptyIcon} />
            <h2>아직 대화 기록이 없습니다</h2>
            <p>제품 QR 코드를 스캔하여 챗봇과 대화를 시작하세요</p>
            <button
              className={styles.primaryButton}
              onClick={() => router.push('/')}
            >
              시작하기
            </button>
          </div>
        )}

        {/* 제품별 그룹핑 */}
        {groupBy === 'product' && sessions.length > 0 && (
          <div className={styles.groupedList}>
            {Object.entries(groupedByProduct).map(([productId, { productName, sessions: productSessions }]) => (
              <div key={productId} className={styles.productGroup}>
                <div className={styles.productHeader}>
                  <h2>{productName}</h2>
                  <span className={styles.sessionCount}>
                    {productSessions.length}개의 대화
                  </span>
                </div>

                <div className={styles.sessionList}>
                  {productSessions.map((session) => (
                    <div
                      key={session.id}
                      className={styles.sessionCard}
                      onClick={() => handleSessionClick(session)}
                    >
                      <div className={styles.sessionContent}>
                        <div className={styles.sessionInfo}>
                          <MessageSquare size={20} className={styles.sessionIcon} />
                          <div className={styles.sessionText}>
                            <p className={styles.lastMessage}>{session.lastMessage}</p>
                            <div className={styles.sessionMeta}>
                              <span>{session.messageCount}개 메시지</span>
                              <span>•</span>
                              <span>{formatTime(session.updatedAt)}</span>
                            </div>
                          </div>
                        </div>

                        <div className={styles.sessionActions}>
                          <button
                            className={styles.deleteButton}
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            aria-label="삭제"
                          >
                            <Trash2 size={18} />
                          </button>
                          <ChevronRight size={20} className={styles.chevron} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 날짜별 그룹핑 */}
        {groupBy === 'date' && sessions.length > 0 && (
          <div className={styles.groupedList}>
            {Object.entries(groupedByDate).map(([date, dateSessions]) => (
              <div key={date} className={styles.dateGroup}>
                <div className={styles.dateHeader}>
                  <Calendar size={18} />
                  <h2>{date}</h2>
                </div>

                <div className={styles.sessionList}>
                  {dateSessions.map((session) => (
                    <div
                      key={session.id}
                      className={styles.sessionCard}
                      onClick={() => handleSessionClick(session)}
                    >
                      <div className={styles.sessionContent}>
                        <div className={styles.sessionInfo}>
                          <MessageSquare size={20} className={styles.sessionIcon} />
                          <div className={styles.sessionText}>
                            <p className={styles.productNameInline}>{session.productName}</p>
                            <p className={styles.lastMessage}>{session.lastMessage}</p>
                            <div className={styles.sessionMeta}>
                              <span>{session.messageCount}개 메시지</span>
                            </div>
                          </div>
                        </div>

                        <div className={styles.sessionActions}>
                          <button
                            className={styles.deleteButton}
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            aria-label="삭제"
                          >
                            <Trash2 size={18} />
                          </button>
                          <ChevronRight size={20} className={styles.chevron} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}