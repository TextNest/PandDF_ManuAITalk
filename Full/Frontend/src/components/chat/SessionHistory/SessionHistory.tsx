'use client';

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
    isOpen: boolean; // Controlled by parent
    onClose: () => void; // Controlled by parent
    onLogin: () => void;
    onLogout: () => void;
    onNavigate: (path: string) => void;
    isAuthenticated: boolean;
}

export default function SessionHistory({
    sessions,
    currentSessionId,
    onSelectSession,
    onNewSession,
    onDeleteSession,
    isOpen,
    onClose,
    onLogin,
    onLogout,
    onNavigate,
    isAuthenticated,
}: SessionHistoryProps) {

    const handleDelete = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        if (confirm('이 대화를 삭제하시겠습니까?')) {
            onDeleteSession(sessionId);
        }
    };

    const handleAuth = () => {
        if (isAuthenticated) {
            onLogout();
        } else {
            onLogin();
        }
        onClose();
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

    if (!isOpen) return null;

    return (
        <>
            <div className={styles.backdrop} onClick={onClose} />
            <div className={styles.sidebar}>
                <div className={styles.header}>
                    <h3 className={styles.title}>
                        <MessageSquare size={20} />
                        메뉴
                    </h3>
                    {/* 새 대화 버튼은 항상 필요 */}
                    <Button variant="primary" size="sm" onClick={() => { onNewSession(); onClose(); }}>
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
                                onNavigate('/my');
                                onClose();
                            }}
                        >
                            <User size={18} />
                            <span>내 대화 목록</span>
                        </button>
                        )}

                    <button
                        className={styles.navButton}
                        onClick={() => {
                            const productId = window.location.pathname.split('/chat/')[1] || 'default';
                            onNavigate(`/simulation/${productId}`);
                            onClose();
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
                                    onClick={isAuthenticated ? () => {
                                        onSelectSession(session.session_id,session.productId);
                                        onClose();
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
    );
}