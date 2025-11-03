// ============================================
// 📄 7. src/components/faq/FAQCardSkeleton/FAQCardSkeleton.tsx
// ============================================
// FAQ 카드 스켈레톤
// ============================================

import Skeleton from '@/components/common/Skeleton/Skeleton';
import styles from './FAQCardSkeleton.module.css';

export default function FAQCardSkeleton() {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <Skeleton width="80%" height={20} />
          <div className={styles.meta}>
            <Skeleton width={80} height={16} />
            <Skeleton width={100} height={16} />
          </div>
        </div>
        <Skeleton variant="rectangular" width={40} height={40} />
      </div>
    </div>
  );
}