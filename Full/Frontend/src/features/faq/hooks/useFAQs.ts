// ============================================
// 📄 src/features/faq/hooks/useFAQs.ts
// ============================================
// FAQ 목록 데이터 페칭 훅
// ============================================

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { convertFAQResponseArrayToFAQArray } from '@/lib/utils/faq';
import { FAQ } from '@/types/faq.types';

export interface FAQsData {
  faqs: FAQ[];
  total: number;
}

interface UseFAQsOptions {
  searchQuery?: string;
  filter?: 'all' | 'published' | 'draft';
  category?: string;
}

export function useFAQs(options: UseFAQsOptions = {}) {
  const [data, setData] = useState<FAQsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // API 호출 파라미터 설정
        const params: { status?: string; category?: string; limit?: number } = {
          limit: 1000, // 충분히 큰 값으로 설정
        };

        if (options.filter && options.filter !== 'all') {
          params.status = options.filter;
        }

        if (options.category) {
          params.category = options.category;
        }

        // API 호출
        const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${API_ENDPOINTS.FAQ.LIST}`;
        console.log('FAQ API 호출 (useFAQs):', apiUrl, params);

        const response = await apiClient.get(API_ENDPOINTS.FAQ.LIST, { params });
        const faqs = convertFAQResponseArrayToFAQArray(response.data);

        // 클라이언트 측 검색 필터 적용 (검색은 서버에서 지원하지 않을 수 있으므로)
        let filteredFAQs = faqs;

        if (options.searchQuery) {
          const query = options.searchQuery.toLowerCase();
          filteredFAQs = filteredFAQs.filter(faq => 
            faq.question.toLowerCase().includes(query) ||
            faq.answer.toLowerCase().includes(query)
          );
        }

        setData({
          faqs: filteredFAQs,
          total: filteredFAQs.length,
        });
      } catch (err: any) {
        console.error('FAQ 조회 실패 (useFAQs):', err);
        
        // 더 자세한 에러 메시지 제공
        let errorMessage = 'FAQ를 불러오는데 실패했습니다.';
        if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
          errorMessage = '네트워크 오류가 발생했습니다. 백엔드 서버가 실행 중인지 확인해주세요.';
        } else if (err.response) {
          errorMessage = `서버 오류: ${err.response.status} - ${err.response.data?.detail || err.response.statusText}`;
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(new Error(errorMessage));
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [options.searchQuery, options.filter, options.category]);

  return {
    data,
    isLoading,
    error,
    refetch: () => {
      setIsLoading(true);
    },
  };
}