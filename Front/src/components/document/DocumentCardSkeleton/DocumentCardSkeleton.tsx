// ============================================
// 📄 3. src/components/document/DocumentCardSkeleton/DocumentCardSkeleton.tsx
// ============================================
// 문서 카드 스켈레톤
// ============================================

import Skeleton from '@/components/common/Skeleton/Skeleton';
import styles from './DocumentCardSkeleton.module.css';

export default function DocumentCardSkeleton() {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Skeleton variant="rectangular" width={48} height={48} />
      </div>

      <div className={styles.content}>
        <Skeleton width="70%" height={24} />
        <Skeleton width="40%" height={16} style={{ marginTop: '8px' }} />
      </div>

      <div className={styles.meta}>
        <Skeleton width="50%" height={14} />
        <Skeleton width="30%" height={14} />
      </div>

      <div className={styles.footer}>
        <Skeleton width={60} height={20} />
        <Skeleton width={80} height={14} />
      </div>
    </div>
  );
}