// ============================================
// 📄 2. src/app/(admin)/faq/page.tsx
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button/Button';
import FAQList from '@/components/faq/FAQList/FAQList';
import FAQCreateModal from '@/components/faq/FAQCreateModal/FAQCreateModal';
import { FAQ } from '@/types/faq.types';
import apiClient from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { convertFAQResponseArrayToFAQArray } from '@/lib/utils/faq';
import styles from './faq-page.module.css';

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'candidate' | 'active' | 'inactive' | 'needsReview'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);



  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // API 호출 시 status 필터 적용 (all인 경우는 필터 없이 호출)
        const params: { status?: string; limit?: number } = {
          limit: 1000, // 충분히 큰 값으로 설정
        };

        if (statusFilter !== 'all' && statusFilter !== 'needsReview') {
          params.status = statusFilter;
        }

        const response = await apiClient.get(API_ENDPOINTS.FAQ.LIST, { params });
        const convertedFAQs = convertFAQResponseArrayToFAQArray(response.data);
        setFaqs(convertedFAQs);
      } catch (err: any) {
        console.error('FAQ 조회 실패:', err);

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
        setFaqs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFAQs();
  }, [statusFilter]);

  // FAQ 업데이트 핸들러
  const handleFAQUpdate = (updatedFaq: FAQ) => {
    setFaqs(prevFaqs =>
      prevFaqs.map(faq => faq.faqId === updatedFaq.faqId ? updatedFaq : faq)
    );
  };

  // FAQ 삭제 핸들러
  const handleFAQDelete = (faqId: string) => {
    setFaqs(prevFaqs => prevFaqs.filter(faq => faq.faqId !== faqId));
  };

  // FAQ 추가 핸들러
  const handleFAQCreate = (newFaq: FAQ) => {
    setFaqs(prevFaqs => [newFaq, ...prevFaqs]);
  };

  // 검색 쿼리에 따른 필터링 (클라이언트 측)
  const filteredFAQs = faqs.filter(faq => {
    // 1) 상태 필터 먼저 적용
    if (statusFilter === 'needsReview') {
      if (faq.status !== 'draft' && faq.status !== 'candidate') return false;
    } else if (statusFilter !== 'all') {
      if (faq.status !== statusFilter) return false;
    }

    // 2) 검색어 필터
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      faq.question.toLowerCase().includes(query) ||
      faq.answer.toLowerCase().includes(query) ||
      faq.productId.toLowerCase().includes(query) ||
      faq.productName.toLowerCase().includes(query) ||
      faq.tags?.includes(query)
    );
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>FAQ 관리</h1>
          <p className={styles.subtitle}>자주 묻는 질문을 관리하세요</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/faq/auto-generate">
            <Button variant="secondary">
              <Sparkles size={20} />
              자동 생성
            </Button>
          </Link>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={20} />
            FAQ 추가
          </Button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search className={styles.searchIcon} size={20} />
          <input
            type="text"
            placeholder="FAQ 검색..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filters}>
          <button
            className={`${styles.filterButton} ${statusFilter === 'all' ? styles.active : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            전체
          </button>
          <button
            className={`${styles.filterButton} ${statusFilter === 'active' ? styles.active : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            게시됨
          </button>
          <button
            className={`${styles.filterButton} ${statusFilter === 'needsReview' ? styles.active : ''}`}
            onClick={() => setStatusFilter('needsReview')}
          >
            확인 필요
          </button>
          <button
            className={`${styles.filterButton} ${statusFilter === 'inactive' ? styles.active : ''}`}
            onClick={() => setStatusFilter('inactive')}
          >
            비활성화
          </button>
        </div>
      </div>
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{filteredFAQs.filter(f => f.source === 'Manual').length}</span>
          <span className={styles.statLabel}>직접 등록</span>
        </div>
        {/* <div className={styles.statCard}>
          <span className={styles.statValue}>{filteredFAQs.filter(f => f.source === 'PDF').length}</span>
          <span className={styles.statLabel}>PDF 추출</span>
        </div> */}
        <div className={styles.statCard}>
          <span className={styles.statValue}>{filteredFAQs.filter(f => f.isAutoGenerated).length}</span>
          <span className={styles.statLabel}>AI 자동 생성</span>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <p>FAQ를 불러오는 중...</p>
        </div>
      ) : error ? (
        <div className={styles.error}>
          <p>오류: {error.message}</p>
        </div>
      ) : (
        <FAQList
          faqs={filteredFAQs}
          onUpdate={handleFAQUpdate}
          onDelete={handleFAQDelete}
        />
      )}

      {/* FAQ 추가 모달 */}
      <FAQCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleFAQCreate}
      />
    </div>
  );
}