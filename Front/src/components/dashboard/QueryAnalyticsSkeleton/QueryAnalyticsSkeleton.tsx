// ============================================
// 📄 src/components/dashboard/QueryAnalyticsSkeleton/QueryAnalyticsSkeleton.tsx
// ============================================
// 질의 분석 차트 스켈레톤 (Skeleton 컴포넌트 사용)
// ============================================

import Skeleton from '@/components/common/Skeleton/Skeleton';
import styles from './QueryAnalyticsSkeleton.module.css';

export default function QueryAnalyticsSkeleton() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Skeleton width={150} height={24} />
      </div>
      <div className={styles.chartArea}>
        {/* 차트 바 스켈레톤 */}
        <div className={styles.bars}>
          {[40, 60, 50, 70, 55, 75, 80].map((height, index) => (
            <div key={index} className={styles.barWrapper}>
              <Skeleton 
                variant="rectangular"
                width="100%"
                height={`${height}%`}
                style={{ borderRadius: '6px 6px 0 0' }}
              />
            </div>
          ))}
        </div>
        {/* X축 레이블 스켈레톤 */}
        <div className={styles.labels}>
          {Array(7).fill(0).map((_, index) => (
            <Skeleton key={index} width="100%" height={16} />
          ))}
        </div>
      </div>
    </div>
  );
}