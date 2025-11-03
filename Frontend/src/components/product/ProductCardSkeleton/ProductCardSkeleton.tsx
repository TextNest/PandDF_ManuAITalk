// ============================================
// 📄 9. src/components/product/ProductCardSkeleton/ProductCardSkeleton.tsx
// ============================================
// 제품 카드 스켈레톤
// ============================================

import Skeleton from '@/components/common/Skeleton/Skeleton';
import styles from './ProductCardSkeleton.module.css';

export default function ProductCardSkeleton() {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Skeleton variant="rectangular" width={64} height={64} />
      </div>

      <div className={styles.content}>
        <Skeleton width="70%" height={24} />
        <Skeleton width="40%" height={20} style={{ marginTop: '4px' }} />
      </div>

      <div className={styles.meta}>
        <Skeleton width="100%" height={14} />
        <Skeleton width="80%" height={14} />
      </div>

      <div className={styles.footer}>
        <Skeleton width={60} height={20} />
        <Skeleton width={80} height={14} />
      </div>
    </div>
  );
}