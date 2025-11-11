// ============================================
// 📄 src/components/faq/FAQCreateModal/FAQCreateModal.tsx
// ============================================
// FAQ 추가 모달 컴포넌트
// ============================================

'use client';

import { useState } from 'react';
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
    category: '',
    tags: '',
    status: 'draft' as 'draft' | 'published',
    source: 'manual' as 'pdf' | 'chatbot' | 'manual',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.question.trim() || !formData.answer.trim()) {
      alert('질문과 답변을 입력해주세요.');
      return;
    }

    try {
      setIsCreating(true);
      
      const createData = {
        question: formData.question.trim(),
        answer: formData.answer.trim(),
        category: formData.category.trim() || null,
        tags: formData.tags.trim() || null,
        product_id: null,
        product_name: null,
        status: formData.status,
        source: formData.source,
        is_auto_generated: false,
        created_by: '관리자', // TODO: 실제 사용자 정보로 변경
      };

      const response = await apiClient.post(API_ENDPOINTS.FAQ.CREATE, createData);
      const newFaq = convertFAQResponseToFAQ(response.data);
      
      // 폼 초기화
      setFormData({
        question: '',
        answer: '',
        category: '',
        tags: '',
        status: 'draft',
        source: 'manual',
      });
      
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
        category: '',
        tags: '',
        status: 'draft',
        source: 'manual',
      });
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
          <label className={styles.formLabel}>카테고리</label>
          <Input
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="카테고리를 입력하세요"
            fullWidth
          />
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
            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' })}
          >
            <option value="draft">임시저장</option>
            <option value="published">게시됨</option>
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

