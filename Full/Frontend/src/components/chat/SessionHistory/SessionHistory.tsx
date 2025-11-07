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
    onSelectSession: (sessionId: string,productId: string) => void;
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
    
    const getSessionTitle = (session: ChatSession) => {
        // 백엔드 API가 lastMessage 필드를 반환한다고 가정
        if ('lastMessage' in session && session.lastMessage) {
            return session.lastMessage.substring(0, 30) + (session.lastMessage.length > 30 ? '...' : '');
        }
        if (session.messages && session.messages.length > 0) {
            return session.messages[0].content.substring(0, 30) + '...';
        }
        return '새 대화';
    };


    return (
        <>
            {/* 토글 버튼 */}
            <button 
                className={styles.toggleButton}
                onClick={() => {
                    if (isAuthenticated) {
                        setIsOpen(!isOpen); // 1. 로그인 상태면 사이드바를 엽니다.
                    } else {
                        router.push('/login'); // 2. 비로그인 상태면 로그인 페이지로 이동합니다.
                    }
                }}
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
                            {/* 새 대화 버튼은 항상 필요 */}
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
                            
                            {/* 🚩 [추가]: 비로그인 시 세션 목록 위에 반투명 오버레이를 띄웁니다. */}
                            {!isAuthenticated && (
                                <div className={styles.loginOverlay}>
                                    <p>대화 기록 저장 및 관리는</p>
                                    <p>로그인 후 이용 가능합니다.</p>
                                    {/* 오버레이 내부에 로그인 버튼 추가 */}
                                    <button 
                                        className={styles.loginOverlayButton}
                                        onClick={handleAuth}
                                    >
                                        <LogIn size={18} /> 로그인하기
                                    </button>
                                </div>
                            )}

                            {/* 🚩 세션 목록 (인증 여부와 상관없이 렌더링) */}
                            <div className={`${styles.sessionList} ${!isAuthenticated ? styles.faded : ''}`}>
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
                                            // 🚩 [수정]: 로그인 상태일 때만 onClick 활성화
                                            onClick={isAuthenticated ? () => {
                                                onSelectSession(session.session_id,session.productId);
                                                setIsOpen(false);
                                            } : undefined}
                                        >
                                            <div className={styles.sessionInfo}>
                                                <div className={styles.sessionTitle}>
                                                    {getSessionTitle(session)}
                                                </div>
                                                <div className={styles.sessionMeta}>
                                                    <span>{session.messageCount ? session.messageCount : '0'}개 메시지</span>
                                                    <span>·</span>
                                                    <span>{formatRelativeTime(new Date(session.updatedAt))}</span>
                                                </div>
                                            </div>
                                            {/* 삭제 버튼도 로그인 시에만 활성화 */}
                                            {isAuthenticated && (
                                                <button
                                                    className={styles.deleteButton}
                                                    onClick={(e) => handleDelete(e, session.session_id)}
                                                    aria-label="삭제"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* 하단 로그인/로그아웃 버튼 (유지) */}
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