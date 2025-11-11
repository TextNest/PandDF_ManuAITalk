// ============================================
// 📄 src/features/faq/hooks/useFAQs.ts
// ============================================
// FAQ 목록 데이터 페칭 훅
// ============================================

import { useState, useEffect } from 'react';

// 타입 정의
export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  status: 'published' | 'draft';
  createdAt: string;
  updatedAt: string;
  views: number;
  helpful: number;
}

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
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock 데이터
        const mockFAQs: FAQ[] = [
          {
            id: '1',
            question: '제품 A/S는 어디서 받을 수 있나요?',
            answer: '제품 A/S는 공식 서비스 센터에서 받으실 수 있습니다. 가까운 서비스 센터는 고객센터(1588-xxxx)로 문의해주세요.',
            category: 'A/S',
            status: 'published',
            createdAt: '2024-10-15T10:00:00',
            updatedAt: '2024-10-15T10:00:00',
            views: 245,
            helpful: 189,
          },
          {
            id: '2',
            question: '보증 기간은 얼마나 되나요?',
            answer: '제품 구매일로부터 1년간 무상 보증이 제공됩니다. 보증서를 잘 보관해주세요.',
            category: '보증',
            status: 'published',
            createdAt: '2024-10-14T15:30:00',
            updatedAt: '2024-10-14T15:30:00',
            views: 198,
            helpful: 156,
          },
          {
            id: '3',
            question: '배터리 교체는 어떻게 하나요?',
            answer: '배터리 교체는 공식 서비스 센터에서만 가능합니다. 임의로 분해하시면 보증이 무효화될 수 있습니다.',
            category: '배터리',
            status: 'published',
            createdAt: '2024-10-13T09:15:00',
            updatedAt: '2024-10-13T09:15:00',
            views: 156,
            helpful: 98,
          },
          {
            id: '4',
            question: '초기화 방법을 알려주세요',
            answer: '설정 > 일반 > 초기화 메뉴에서 "모든 설정 초기화"를 선택하시면 됩니다.',
            category: '설정',
            status: 'draft',
            createdAt: '2024-10-12T14:20:00',
            updatedAt: '2024-10-12T14:20:00',
            views: 134,
            helpful: 87,
          },
          {
            id: '5',
            question: '소프트웨어 업데이트는 어떻게 하나요?',
            answer: '설정 > 소프트웨어 업데이트에서 "자동 업데이트"를 활성화하시면 자동으로 업데이트됩니다.',
            category: '업데이트',
            status: 'published',
            createdAt: '2024-10-11T11:00:00',
            updatedAt: '2024-10-11T11:00:00',
            views: 112,
            helpful: 76,
          },
        ];

        // 필터 적용
        let filteredFAQs = mockFAQs;
        
        if (options.filter && options.filter !== 'all') {
          filteredFAQs = filteredFAQs.filter(faq => faq.status === options.filter);
        }
        
        if (options.searchQuery) {
          const query = options.searchQuery.toLowerCase();
          filteredFAQs = filteredFAQs.filter(faq => 
            faq.question.toLowerCase().includes(query) ||
            faq.answer.toLowerCase().includes(query)
          );
        }

        if (options.category) {
          filteredFAQs = filteredFAQs.filter(faq => faq.category === options.category);
        }

        setData({
          faqs: filteredFAQs,
          total: filteredFAQs.length,
        });
        setError(null);
      } catch (err) {
        setError(err as Error);
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