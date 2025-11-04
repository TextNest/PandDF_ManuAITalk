// ============================================
// 📄 src/components/dashboard/TopQuestionsSkeleton/TopQuestionsSkeleton.tsx
// ============================================
// 자주 묻는 질문 TOP 5 스켈레톤 (Skeleton 컴포넌트 사용)
// ============================================

import Skeleton from '@/components/common/Skeleton/Skeleton';
import styles from './TopQuestionsSkeleton.module.css';

export default function TopQuestionsSkeleton() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Skeleton width={180} height={24} />
      </div>
      <div className={styles.list}>
        {Array(5).fill(0).map((_, index) => (
          <div key={index} className={styles.item}>
            <Skeleton variant="circular" width={32} height={32} />
            <div className={styles.content}>
              <Skeleton width="100%" height={20} />
              <Skeleton width={80} height={16} style={{ marginTop: '8px' }} />
            </div>
            <Skeleton variant="rectangular" width={24} height={24} />
          </div>
        ))}
      </div>
    </div>
  );
}