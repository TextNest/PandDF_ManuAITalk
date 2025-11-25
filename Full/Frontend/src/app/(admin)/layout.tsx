// ============================================
// 📄 src/app/(admin)/layout.tsx (Updated)
// ============================================
// 관리자 영역 레이아웃 - 인증 체크 추가
// ============================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import { LogOut, ChevronDown, Menu } from 'lucide-react'; // Menu 아이콘 추가
import styles from './admin-layout.module.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false); // 모바일 사이드바 상태

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, isHydrated, router]);

  if (!isHydrated || !isAuthenticated) {
    return (
      <div className={styles.loading}>
        <p>권한 확인 중...</p>
      </div>
    );
  }

  return (
    <div className={styles.adminLayout}>
      <Sidebar 
        isOpen={isMobileSidebarOpen} 
        onClose={() => setIsMobileSidebarOpen(false)} 
      />
      <div className={styles.mainContent}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button 
              className={styles.menuButton}
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h1 className={styles.title}>
              <span className={styles.desktopTitle}>ManuAI-Talk 관리자</span>
              <span className={styles.mobileTitle}>ManuAI-Talk</span>
            </h1>
          </div>
          <div className={styles.userMenu}>
            <div className={styles.userInfo}>
              <div className={styles.avatar}>
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className={styles.userDetails}>
                <span className={styles.userName}>{user?.name}</span>
                <span className={styles.userRole}>
                  {user?.companyName || '관리자'}
                </span>
              </div>
            </div>
            <button 
              className={styles.logoutButton}
              onClick={logout}
              title="로그아웃"
            >
              <LogOut size={18} />
              <span>로그아웃</span>
            </button>
          </div>
        </header>
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}