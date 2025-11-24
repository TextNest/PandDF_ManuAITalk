'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import SuperAdminSidebar from '@/components/layout/SuperAdminSidebar/SuperAdminSidebar';
import { LogOut, Menu } from 'lucide-react'; // Menu 아이콘 추가
import styles from './superadmin-layout.module.css';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // 사이드바 상태

  useEffect(() => {
    // 로그인 안 되어있으면 로그인 페이지로
    if (!isAuthenticated) {
      router.push('/admin/login');
      return;
    }

    // 슈퍼 관리자가 아니면 접근 불가! 🔥
    if (user?.role !== 'super_admin') {
      alert('접근 권한이 없습니다. 슈퍼 관리자만 접근할 수 있습니다.');
      router.push('/dashboard'); // 기업 관리자는 대시보드로
    }
  }, [isAuthenticated, user, router]);

  // 인증 확인 전까지 로딩
  if (!isAuthenticated || user?.role !== 'super_admin') {
    return (
      <div className={styles.loading}>
        <p>권한 확인 중...</p>
      </div>
    );
  }

  return (
    <div className={styles.superAdminLayout}>
      {/* 사이드바 컴포넌트에 상태 전달 */}
      <SuperAdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* 모바일 백드롭 */}
      {isSidebarOpen && <div className={styles.backdrop} onClick={() => setIsSidebarOpen(false)} />}

      <div className={styles.mainContent}>
        <header className={styles.header}>
          {/* 햄버거 메뉴 버튼 (모바일에서만 표시) */}
          <button 
            className={styles.menuButton} 
            onClick={() => setIsSidebarOpen(true)}
            title="메뉴 열기"
          >
            <Menu size={24} />
          </button>

          <h1 className={styles.title}>슈퍼 관리자</h1>
          <div className={styles.userMenu}>
            <div className={styles.userInfo}>
              <div className={styles.avatar}>
                {user?.name?.charAt(0) || 'S'}
              </div>
              <div className={styles.userDetails}>
                <span className={styles.userName}>{user?.name}</span>
                <span className={styles.userRole}>슈퍼 관리자</span>
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