// ============================================
// 📄 src/components/dashboard/DashboardSkeleton/DashboardSkeleton.tsx
// ============================================
// 대시보드 전체 스켈레톤 (Skeleton 컴포넌트 사용)
// ============================================

import Skeleton from '@/components/common/Skeleton/Skeleton';
import StatsCardSkeleton from '../StatsCardSkeleton/StatsCardSkeleton';
import QueryAnalyticsSkeleton from '../QueryAnalyticsSkeleton/QueryAnalyticsSkeleton';
import TopQuestionsSkeleton from '../TopQuestionsSkeleton/TopQuestionsSkeleton';
import RecentActivitySkeleton from '../RecentActivitySkeleton/RecentActivitySkeleton';
import styles from './DashboardSkeleton.module.css';

export default function DashboardSkeleton() {
  return (
    <div className={styles.dashboard}>
      {/* 헤더 스켈레톤 */}
      <div className={styles.header}>
        <Skeleton width={200} height={32} />
        <Skeleton width={300} height={20} style={{ marginTop: '8px' }} />
      </div>
      
      {/* 통계 카드 스켈레톤 */}
      <div className={styles.statsGrid}>
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>
      
      {/* 차트 영역 스켈레톤 */}
      <div className={styles.chartsGrid}>
        <QueryAnalyticsSkeleton />
        <TopQuestionsSkeleton />
      </div>
      
      {/* 최근 활동 스켈레톤 */}
      <RecentActivitySkeleton />
    </div>
  );
}