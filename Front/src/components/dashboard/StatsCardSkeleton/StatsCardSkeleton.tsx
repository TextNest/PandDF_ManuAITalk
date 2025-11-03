// ============================================
// 📄 5. src/components/dashboard/StatsCardSkeleton/StatsCardSkeleton.tsx
// ============================================
// 통계 카드 스켈레톤
// ============================================

import Skeleton from '@/components/common/Skeleton/Skeleton';
import styles from './StatsCardSkeleton.module.css';

export default function StatsCardSkeleton() {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Skeleton variant="rectangular" width={48} height={48} />
        <Skeleton width="60%" height={14} />
      </div>
      
      <div className={styles.content}>
        <Skeleton width="50%" height={36} />
        <Skeleton width={60} height={20} style={{ marginTop: '8px' }} />
      </div>
    </div>
  );
}