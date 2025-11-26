'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth'; 
import { MessageSquare, Calendar, Trash2, ChevronRight } from 'lucide-react';
import styles from './my-page.module.css';
import { toast } from '@/store/useToastStore';
import apiClient from '@/lib/api/client'; // apiClient는 세션 로딩에 필요
import { API_ENDPOINTS } from '@/lib/api/endpoints';

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


// 💡 사용자 요청에 따라 함수는 에로우 함수로 작성합니다.
const MyChatsPage = () => {
    const router = useRouter();
    // fetchCurrentUser 함수는 비동기 호출을 위해 필요합니다.
    const { isAuthenticated, user, fetchCurrentUser } = useAuth(); 
    
    // ⚠️ sessions의 초기값을 빈 배열로 설정하여 reduce 오류 방지 (Mock 사용 시)
    const [sessions, setSessions] = useState<ChatSession[]>([]); 
    const [isLoading, setIsLoading] = useState(true);
    const [groupBy, setGroupBy] = useState<'product' | 'date'>('product');
    
    // 🆕 fetchCurrentUser 결과를 저장할 지역 상태
    const [pageUserName, setPageUserName] = useState(''); 

    // ✅ 초기 로딩 및 데이터 가져오기 로직 (useEffect 통합)
    useEffect(() => {
        // 💡 사용자 요청에 따라 함수는 에로우 함수로 작성합니다.
        const initializePage = async () => {
            if (!isAuthenticated) {
                toast.warning('로그인이 필요한 서비스입니다.');
                router.push('/login');
                // 리디렉션 후 함수 종료
                return;
            }
            const userData = await fetchCurrentUser();
            // --- 1. 사용자 정보 가져오기 및 이름 설정 ---
            try {
                // await를 사용하여 fetchCurrentUser 호출 (비동기 오류 해결)
                 
                
                // 💡 fetchCurrentUser 결과 또는 useAuth의 user 상태에서 이름 추출
                const nameToDisplay = userData?.name || user?.name || '사용자';
                setPageUserName(nameToDisplay);

            } catch (error) {
                console.error("사용자 정보 로딩 실패:", error);
                // API에서 이름 가져오기 실패 시, 기본값으로 설정
                setPageUserName(user?.name || '사용자');
            }
            
            // --- 2. 대화 목록 가져오기 ---
            try {
                // TODO: 실제 API 호출 로직으로 대체
                const response = await apiClient.post(API_ENDPOINTS.CHAT.SESSIONS,
                {name:userData.name}
                );
                console.log(response)
                setSessions(response.data || []);
                
                
            } catch (error) {
                 console.error("세션 목록 로딩 실패:", error);
                 toast.error('대화 목록을 불러오는 데 실패했습니다.');
                 setSessions([]);
            } finally {
                // 모든 비동기 작업 완료 후 로딩 해제
                setIsLoading(false);
            }
        };

        // isAuthenticated가 true일 때만 초기화 함수를 실행합니다.
        if (isAuthenticated) {
            initializePage();
        }
    
    // 💡 의존성 배열에 비동기 함수와 상태를 명시하여 무한 루프 위험 방지
    }, [isAuthenticated, router]); 
    

    // 💡 사용자 요청에 따라 함수는 에로우 함수로 작성합니다.
    // 제품별 그룹핑 (sessions 상태에 의존)
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

    // 💡 사용자 요청에 따라 함수는 에로우 함수로 작성합니다.
    // 날짜별 그룹핑 (sessions 상태에 의존)
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

    // 💡 사용자 요청에 따라 함수는 에로우 함수로 작성합니다.
    const handleSessionClick = (session: ChatSession) => {
        router.push(`/chat/${session.productId}?session_id=${session.session_id}`);
    };

    // 💡 사용자 요청에 따라 함수는 에로우 함수로 작성합니다.
    const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('이 대화를 삭제하시겠습니까?')) {
            setSessions(sessions.filter(s => s.id !== sessionId));
            toast.success('대화가 삭제되었습니다.');
            // TODO: API 호출 로직 추가
        }
    };
    
    // 💡 사용자 요청에 따라 함수는 에로우 함수로 작성합니다.
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
                        {/* 🆕 pageUserName 상태 사용 */}
                        <h1>{pageUserName}님의 과거대화</h1> 
                        <p>과거 대화 기록을 확인하고 이어서 질문하세요</p>
                    </div>

                    {/* 그룹핑 토글 유지 */}
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

export default MyChatsPage;