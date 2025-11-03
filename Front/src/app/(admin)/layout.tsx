// ============================================
// 📄 src/app/(admin)/layout.tsx (Updated)
// ============================================
// 관리자 영역 레이아웃 - 인증 체크 추가
// ============================================

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import { LogOut, ChevronDown } from 'lucide-react';
import styles from './admin-layout.module.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    // 로그인 안 되어있으면 로그인 페이지로
    if (!isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, router]);

  // 인증 확인 전까지 로딩
  if (!isAuthenticated) {
    return (
      <div className={styles.loading}>
        <p>권한 확인 중...</p>
      </div>
    );
  }

  return (
    <div className={styles.adminLayout}>
      <Sidebar />
      <div className={styles.mainContent}>
        <header className={styles.header}>
          <h1 className={styles.title}>ManuAI-Talk 관리자</h1>
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