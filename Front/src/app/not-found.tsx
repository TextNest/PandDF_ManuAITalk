import Link from 'next/link';
import { Home, Search } from 'lucide-react';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.errorCode}>404</div>
        <h1 className={styles.title}>페이지를 찾을 수 없습니다</h1>
        <p className={styles.description}>
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
        </p>

        <div className={styles.actions}>
          <Link href="/" className={styles.primaryButton}>
            <Home size={20} />
            홈으로 돌아가기
          </Link>
          
          <Link href="/" className={styles.secondaryButton}>
            <Search size={20} />
            제품 검색하기
          </Link>
        </div>
      </div>
    </div>
  );
}