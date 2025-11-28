// ============================================
// 📄 src/features/dashboard/hooks/useDashboardData.ts
// ============================================
// 대시보드 데이터 페칭 훅 (실제 API 연동)
// ============================================

import { useState, useEffect } from 'react';
import { getCompanyAdminStats } from '@/lib/api/dashboard';

// 타입 정의
export interface DashboardStats {
  totalDocuments: string;
  totalQueries: string;
  avgQuestionsPerSession: string; // 이름 변경
  totalFAQs: string;
  documentChange: number;
  queryChange: number;
  questionCountChange: number; // responseTimeChange -> questionCountChange
  faqChange: number;
}

export interface QueryAnalyticsData {
  date: string;
  queries: number;
}

export interface TopQuestion {
  id: string;
  question: string; // UI 호환성을 위해 이름 유지 (실제로는 제품명)
  count: number;
  trend: 'up' | 'down' | 'stable';
}

export interface RecentActivityItem {
  id: string;
  type: 'document' | 'query' | 'faq';
  title: string;
  timestamp: string;
  user?: string;
}

interface DashboardData {
  stats: DashboardStats;
  analytics: QueryAnalyticsData[];
  topQuestions: any[]; // TopProduct 타입으로 변경됨
  recentActivity: RecentActivityItem[];
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // 실제 API 호출
      const stats = await getCompanyAdminStats();

      // API 응답을 DashboardData 형식으로 변환
      const dashboardData: DashboardData = {
        stats: {
          totalDocuments: `${stats.total_documents}개`,
          totalQueries: `${stats.total_questions}개`,
          avgQuestionsPerSession: `${stats.avg_questions_per_session}개`,
          totalFAQs: `${stats.total_faqs}개`,
          documentChange: 0,
          queryChange: 0,
          questionCountChange: 0,
          faqChange: 0,
        },
        // 일별 질문 수 차트 데이터 매핑
        analytics: stats.daily_queries ? stats.daily_queries.map(d => ({
          date: d.date,
          queries: d.count
        })) : [],

        // 상위 제품 매핑 (기존 TopQuestions 컴포넌트 재활용)
        topQuestions: stats.top_products ? stats.top_products.map(p => ({
          id: p.product_id,
          product_name: p.product_name, // 컴포넌트에서 이 필드를 사용하도록 수정함
          count: p.count,
          trend: 'stable'
        })) : [],

        recentActivity: stats.recent_activity ? stats.recent_activity.map((activity: any, index: number) => ({
          id: `activity-${index}`,
          type: activity.type === 'query' ? 'query' : 'document',
          title: activity.content,
          timestamp: activity.created_at,
          user: 'User'
        })) : []
      };

      setData(dashboardData);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}