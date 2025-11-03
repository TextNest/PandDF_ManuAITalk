// ============================================
// 📄 src/features/dashboard/hooks/useDashboardData.ts
// ============================================
// 대시보드 데이터 페칭 훅
// ============================================

import { useState, useEffect } from 'react';

// 타입 정의
export interface DashboardStats {
  totalDocuments: number;
  totalQueries: number;
  avgResponseTime: string;
  totalFAQs: number;
  documentChange: number;
  queryChange: number;
  responseTimeChange: number;
  faqChange: number;
}

export interface QueryAnalyticsData {
  date: string;
  queries: number;
}

export interface TopQuestion {
  id: string;
  question: string;
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
  topQuestions: TopQuestion[];
  recentActivity: RecentActivityItem[];
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // 실제로는 API 호출
    // const response = await apiClient.get('/api/dashboard');
    
    // Mock 데이터 페칭 시뮬레이션 (1.5초 딜레이)
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock 데이터
        const mockData: DashboardData = {
          stats: {
            totalDocuments: 24,
            totalQueries: 1547,
            avgResponseTime: '2.3s',
            totalFAQs: 156,
            documentChange: +12,
            queryChange: +23,
            responseTimeChange: -15,
            faqChange: +8,
          },
          analytics: [
            { date: '2024-10-10', queries: 45 },
            { date: '2024-10-11', queries: 52 },
            { date: '2024-10-12', queries: 48 },
            { date: '2024-10-13', queries: 61 },
            { date: '2024-10-14', queries: 55 },
            { date: '2024-10-15', queries: 67 },
            { date: '2024-10-16', queries: 72 },
          ],
          topQuestions: [
            {
              id: '1',
              question: '제품 A/S 문의는 어디로 하나요?',
              count: 145,
              trend: 'up',
            },
            {
              id: '2',
              question: '보증 기간은 얼마나 되나요?',
              count: 132,
              trend: 'stable',
            },
            {
              id: '3',
              question: '배터리 교체는 어떻게 하나요?',
              count: 98,
              trend: 'down',
            },
            {
              id: '4',
              question: '초기화 방법을 알려주세요',
              count: 87,
              trend: 'up',
            },
            {
              id: '5',
              question: '소프트웨어 업데이트 방법',
              count: 76,
              trend: 'stable',
            },
          ],
          recentActivity: [
            {
              id: '1',
              type: 'document',
              title: 'Galaxy S24 사용 설명서 업로드',
              timestamp: '2024-10-16T14:30:00',
              user: '관리자',
            },
            {
              id: '2',
              type: 'query',
              title: '사용자가 "배터리 수명" 질문',
              timestamp: '2024-10-16T14:25:00',
            },
            {
              id: '3',
              type: 'faq',
              title: 'FAQ 자동 생성 완료 (15개)',
              timestamp: '2024-10-16T14:20:00',
              user: '시스템',
            },
            {
              id: '4',
              type: 'document',
              title: 'AirPods Pro 매뉴얼 수정',
              timestamp: '2024-10-16T14:15:00',
              user: '김현태',
            },
            {
              id: '5',
              type: 'query',
              title: '사용자가 "초기화 방법" 질문',
              timestamp: '2024-10-16T14:10:00',
            },
          ],
        };
        
        setData(mockData);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch: () => {
      setIsLoading(true);
      // 리페치 로직
    },
  };
}