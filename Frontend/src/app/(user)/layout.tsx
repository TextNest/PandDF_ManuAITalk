// ============================================
// 📄 1. src/app/(user)/layout.tsx (모바일 전용)
// ============================================
// 모바일 최적화 사용자 레이아웃
// ============================================

import MobileHeader from '@/components/layout/MobileHeader/MobileHeader';
import styles from './user-layout.module.css';

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.mobileLayout}>
      <MobileHeader />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}