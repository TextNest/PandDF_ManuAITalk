// ============================================
// 📄 src/app/(admin)/dashboard/page.tsx (Updated)
// ============================================
// 관리자 대시보드 메인 페이지 - 로딩 상태 추가
// ============================================

'use client';

import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData';
import StatsCard from '@/components/dashboard/StatsCard/StatsCard';
import QueryAnalytics from '@/components/dashboard/QueryAnalytics/QueryAnalytics';
import TopQuestions from '@/components/dashboard/TopQuestions/TopQuestions';
import RecentActivity from '@/components/dashboard/RecentActivity/RecentActivity';
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton/DashboardSkeleton';
import styles from './dashboard-page.module.css';

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboardData();

  // 로딩 중
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // 에러 처리
  if (error) {
    return (
      <div className={styles.error}>
        <h2>데이터를 불러올 수 없습니다</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  // 데이터 없음
  if (!data) {
    return (
      <div className={styles.empty}>
        <p>데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1>대시보드</h1>
        <p className={styles.subtitle}>시스템 현황을 한눈에 확인하세요</p>
      </div>

      {/* 통계 카드 */}
      <div className={styles.statsGrid}>
        <StatsCard
          title="총 문서 수"
          value={data.stats.totalDocuments}
          change={data.stats.documentChange}
          icon="file"
          color="primary"
        />
        <StatsCard
          title="총 질문 수"
          value={data.stats.totalQueries}
          change={data.stats.queryChange}
          icon="message"
          color="success"
        />
        <StatsCard
          title="제품별 평균 질문 수"
          value={data.stats.avgQuestionsPerSession}
          change={data.stats.questionCountChange}
          icon="bar"
          color="secondary"
        />
        <StatsCard
          title="자동 생성된 FAQ 수"
          value={data.stats.totalFAQs}
          change={data.stats.faqChange}
          icon="help"
          color="warning"
        />
      </div>

      {/* 차트 영역 */}
      <div className={styles.chartsGrid}>
        <QueryAnalytics data={data.analytics} />
        <TopQuestions questions={data.topQuestions} />
      </div>

      {/* 최근 활동 */}
      <RecentActivity activities={data.recentActivity} />
    </div>
  );
}