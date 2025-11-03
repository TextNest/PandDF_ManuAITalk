// ============================================
// 📄 3. src/components/layout/MobileHeader/MobileHeader.tsx
// ============================================
// 모바일 전용 헤더 - 로그인/로그아웃 버튼 추가
// ============================================

'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { LogIn, LogOut } from 'lucide-react';
import styles from './MobileHeader.module.css';

export default function MobileHeader() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();

  const handleAuth = () => {
    if (isAuthenticated) {
      logout();
    } else {
      router.push('/login');
    }
  };

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>ManuAI-Talk</h1>
      
      <button 
        className={styles.authButton}
        onClick={handleAuth}
        aria-label={isAuthenticated ? '로그아웃' : '로그인'}
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
    </header>
  );
}