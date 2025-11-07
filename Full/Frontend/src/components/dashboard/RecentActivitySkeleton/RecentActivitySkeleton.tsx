// ============================================
// 📄 src/components/dashboard/RecentActivitySkeleton/RecentActivitySkeleton.tsx
// ============================================
// 최근 활동 스켈레톤 (Skeleton 컴포넌트 사용)
// ============================================

import Skeleton from '@/components/common/Skeleton/Skeleton';
import styles from './RecentActivitySkeleton.module.css';

export default function RecentActivitySkeleton() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Skeleton width={150} height={24} />
      </div>
      <div className={styles.list}>
        {Array(5).fill(0).map((_, index) => (
          <div key={index} className={styles.item}>
            <Skeleton variant="rectangular" width={40} height={40} />
            <div className={styles.content}>
              <Skeleton width="100%" height={20} />
              <Skeleton width={150} height={16} style={{ marginTop: '8px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}