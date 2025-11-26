// ============================================
// 📄 src/components/faq/FAQCreateModal/FAQCreateModal.tsx
// ============================================
// FAQ 추가 모달 컴포넌트
// ============================================

'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal/Modal';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import apiClient from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { convertFAQResponseToFAQ } from '@/lib/utils/faq';
import { FAQ } from '@/types/faq.types';
import styles from './FAQCreateModal.module.css';

interface FAQCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newFaq: FAQ) => void;
}

export default function FAQCreateModal({ isOpen, onClose, onSuccess }: FAQCreateModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    tags: '',
    status: 'draft' as 'draft' | 'candidate' | 'active' | 'inactive',
    source: 'Manual' as 'PDF' | 'Chatbot' | 'Manual',
  });

  // 제품 목록 관련 state 추가 (product_internal_id 포함)
  const [products, setProducts] = useState<Array<{
    product_internal_id: number;
    product_id: string;
    product_name: string;
  }>>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // 모달이 열릴 때 제품 목록 가져오기
  useEffect(() => {
    const fetchProducts = async () => {
      if (!isOpen) return;

      setIsLoadingProducts(true);
      try {
        const response = await apiClient.get('/api/products/admin');
        setProducts(response.data);
      } catch (error) {
        console.error('제품 목록 조회 실패:', error);
        alert('제품 목록을 불러올 수 없습니다.');
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.question.trim() || !formData.answer.trim()) {
      alert('질문과 답변을 입력해주세요.');
      return;
    }

    if (!selectedProductId) {
      alert('제품을 선택해주세요.');
      return;
    }

    try {
      setIsCreating(true);

      // 선택된 제품 정보 가져오기
      const selectedProduct = products.find(p => p.product_id === selectedProductId);

      const createData = {
        question: formData.question.trim(),
        answer: formData.answer.trim(),
        tags: formData.tags.trim() || null,
        product_internal_id: selectedProduct?.product_internal_id || null,
        faq_status: formData.status,
        source: formData.source
      };

      const response = await apiClient.post(API_ENDPOINTS.FAQ.CREATE, createData);
      const newFaq = convertFAQResponseToFAQ(response.data);

      // 폼 초기화
      setFormData({
        question: '',
        answer: '',
        tags: '',
        status: 'draft',
        source: 'Manual',
      });
      setSelectedProductId('');

      onSuccess(newFaq);
      onClose();
    } catch (err: any) {
      console.error('FAQ 생성 실패:', err);
      alert('FAQ 생성에 실패했습니다: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setFormData({
        question: '',
        answer: '',
        tags: '',
        status: 'draft',
        source: 'Manual',
      });
      setSelectedProductId('');
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="FAQ 추가"
      size="lg"
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>질문 *</label>
          <Input
            value={formData.question}
            onChange={(e) => setFormData({ ...formData, question: e.target.value })}
            placeholder="질문을 입력하세요"
            required
            fullWidth
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>답변 *</label>
          <textarea
            className={styles.textarea}
            value={formData.answer}
            onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
            placeholder="답변을 입력하세요"
            required
            rows={6}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>제품 선택 *</label>
          <select
            className={styles.select}
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            required
            disabled={isLoadingProducts}
          >
            <option value="">제품을 선택하세요</option>
            {products.map(product => (
              <option key={product.product_id} value={product.product_id}>
                {product.product_name} ({product.product_id})
              </option>
            ))}
          </select>
          {isLoadingProducts && <p className={styles.loadingText}>제품 목록 로딩 중...</p>}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>태그 (쉼표로 구분)</label>
          <Input
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="태그1, 태그2, 태그3"
            fullWidth
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>상태</label>
          <select
            className={styles.select}
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'candidate' | 'active' | 'inactive' })}
          >
            <option value="draft">임시작성</option>
            <option value="candidate">후보</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </select>
        </div>

        <div className={styles.formActions}>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isCreating}
          >
            취소
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isCreating}
          >
            추가
          </Button>
        </div>
      </form>
    </Modal>
  );
}