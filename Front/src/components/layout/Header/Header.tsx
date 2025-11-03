// ============================================
// 📄 6. src/components/layout/Header/Header.tsx
// ============================================
// 사용자 영역 헤더
// ============================================

import Link from 'next/link';
import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <h1>ManuAI-Talk</h1>
        </Link>
        
        <nav className={styles.nav}>
          <Link href="/" className={styles.navLink}>
            홈
          </Link>
          <Link href="/chat/sample-product" className={styles.navLink}>
            챗봇
          </Link>
          <Link href="/dashboard" className={styles.navLink}>
            관리자
          </Link>
        </nav>
      </div>
    </header>
  );
}