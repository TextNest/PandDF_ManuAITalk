// ============================================
// 📄 6. src/components/faq/FAQCard/FAQCard.tsx
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Edit, Trash2, Save, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FAQ } from '@/types/faq.types';
import { formatRelativeTime } from '@/lib/utils/format';
import apiClient from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { convertFAQResponseToFAQ } from '@/lib/utils/faq';
import Modal from '@/components/ui/Modal/Modal';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import styles from './FAQCard.module.css';

interface FAQCardProps {
  faq: FAQ;
  onUpdate?: (updatedFaq: FAQ) => void;
  onDelete?: (faqId: string) => void;
}

export default function FAQCard({ faq, onUpdate, onDelete }: FAQCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const STATUS_LABELS: Record<string, string> = {
    draft: '임시저장',
    candidate: '후보',
    active: '활성',
    inactive: '비활성',
  };

  // 수정 폼 상태
  const [editForm, setEditForm] = useState({
    question: faq.question,
    answer: faq.answer,
    tags: Array.isArray(faq.tags) ? faq.tags.join(', ') : (faq.tags || ''),
    status: faq.status,
  });

  // 제품 목록 관련 state 추가 (product_internal_id 포함)
  const [products, setProducts] = useState<Array<{
    product_internal_id: number;
    product_id: string;
    product_name: string;
  }>>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>(faq.productId || '');
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // 제품 목록 가져오기
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const response = await apiClient.get('/api/products/admin');
        setProducts(response.data);
        // 점검용 로그
        // console.log('✅ 제품 목록 로드됨:', response.data);
        // console.log('첫 번째 제품:', response.data[0]);
        // console.log('product_id 타입:', typeof response.data[0]?.product_id);
      } catch (error) {
        console.error('제품 목록 조회 실패:', error);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    if (isEditing) {
      fetchProducts();
    }
  }, [isEditing]);

  useEffect(() => {
    if (products.length > 0 && faq.productId) {
      setSelectedProductId(faq.productId);
    }
  }, [products, faq.productId]);


  // 점검용 로그 
  // console.log('FAQ 카드 초기화');
  // console.log('faq.productId:', faq.productId);
  // console.log('faq.productInternalId:', faq.productInternalId);
  // console.log('초기 selectedProductId:', faq.productId || '');

  // faq가 변경되면 폼 업데이트
  useEffect(() => {
    if (!isEditing) {
      setEditForm({
        question: faq.question,
        answer: faq.answer,
        tags: Array.isArray(faq.tags) ? faq.tags.join(', ') : (faq.tags || ''),
        status: faq.status,
      });
    }
  }, [faq, isEditing]);

  // 수정 모드 시작
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();

    // 점검용 로그
    // console.log('📝 수정 모드 시작');
    // console.log('현재 FAQ:', faq);

    setIsEditing(true);
    setIsExpanded(true);
  };

  // 수정 취소
  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditForm({
      question: faq.question,
      answer: faq.answer,
      tags: Array.isArray(faq.tags) ? faq.tags.join(', ') : (faq.tags || ''),
      status: faq.status,
    });
    setIsEditing(false);
  };

  // 수정 저장
  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsSaving(true);

      // 선택된 제품 찾기(있으면)
      const selectedProduct = products.find(p => p.product_id === selectedProductId);

      const updateData: any = {
        // 사용자가 수정한 값들
        question: editForm.question,
        answer: editForm.answer,
        tags: editForm.tags || null,
        product_internal_id: selectedProduct?.product_internal_id || faq.productInternalId,
        faq_status: editForm.status,
      };

      const response = await apiClient.patch(
        API_ENDPOINTS.FAQ.UPDATE(faq.faqId),
        updateData
      );

      const updatedFaq = convertFAQResponseToFAQ(response.data);
      setIsEditing(false);

      if (onUpdate) {
        onUpdate(updatedFaq);
      }
    } catch (err: any) {
      console.error('FAQ 수정 실패:', err);
      alert('FAQ 수정에 실패했습니다: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  // 삭제 확인 모달 열기
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  // 삭제 확인
  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      await apiClient.delete(API_ENDPOINTS.FAQ.DELETE(faq.faqId));
      setShowDeleteModal(false);

      if (onDelete) {
        onDelete(faq.faqId);
      }
    } catch (err: any) {
      console.error('FAQ 삭제 실패:', err);
      alert('FAQ 삭제에 실패했습니다: ' + (err.response?.data?.detail || err.message));
      setIsDeleting(false);
    }
  };

  const handleHeaderClick = () => {
    if (!isEditing) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header} onClick={handleHeaderClick}>
        <div className={styles.headerContent}>
          <div className={styles.titleRow}>
            <h3 className={styles.question}>{faq.question}</h3>
            {faq.isAutoGenerated && (
              <span className={styles.aiBadge}>
                <Sparkles size={14} />
                AI
              </span>
            )}
          </div>
          <div className={styles.meta}>
            {faq.category && (
              <span className={styles.category}>{faq.category}</span>
            )}
            {faq.productName && (
              <span className={styles.product}>{faq.productName}</span>
            )}
            <span className={`${styles.status} ${styles[faq.status]}`}>
              {STATUS_LABELS[faq.status]||faq.status}
            </span>
          </div>
        </div>
        <button className={styles.expandButton}>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {isExpanded && (
        <div className={styles.body} onClick={(e) => e.stopPropagation()}>
          {isEditing ? (
            <div className={styles.editForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>질문 *</label>
                <Input
                  value={editForm.question}
                  onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                  placeholder="질문을 입력하세요"
                  fullWidth
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>답변 *</label>
                <textarea
                  className={styles.textarea}
                  value={editForm.answer}
                  onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                  placeholder="답변을 입력하세요"
                  rows={6}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>제품 선택 *</label>
                <select
                  className={styles.select}
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  disabled={isLoadingProducts}
                >
                  <option value="">제품을 선택하세요</option>
                  {products.map(product => (
                    <option key={product.product_id} value={product.product_id}>
                      {product.product_name} ({product.product_id})
                    </option>
                  ))}
                </select>
                {isLoadingProducts && <p>제품 목록 로딩 중...</p>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>태그 (쉼표로 구분)</label>
                <Input
                  value={editForm.tags}
                  onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                  placeholder="태그1, 태그2, 태그3"
                  fullWidth
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>상태</label>
                <select
                  className={styles.select}
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'draft' | 'candidate' | 'active' | 'inactive'})}
                >
                  <option value="draft">임시작성</option>
                  <option value="candidate">후보</option>
                  <option value="active">활성</option>
                  <option value="inactive">비활성</option>
                </select>
              </div>

              <div className={styles.editActions}>
                <Button
                  variant="secondary"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  <X size={16} />
                  취소
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  loading={isSaving}
                >
                  <Save size={16} />
                  저장
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.answer}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {faq.answer}
                </ReactMarkdown>
              </div>

              {faq.tags && (
                <div className={styles.tags}>
                  {(Array.isArray(faq.tags) ? faq.tags : [faq.tags]).map((tag, index) => (
                    <span key={index} className={styles.tag}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className={styles.stats}>
                <div className={styles.statItem}>
                  <span className={styles.date}>
                    {formatRelativeTime(faq.updatedAt)}
                  </span>
                </div>
              </div>

              <div className={styles.actions}>
                <button className={styles.actionButton} onClick={handleEdit}>
                  <Edit size={16} />
                  수정
                </button>
                <button className={`${styles.actionButton} ${styles.danger}`} onClick={handleDeleteClick}>
                  <Trash2 size={16} />
                  삭제
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 삭제 확인 모달 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => !isDeleting && setShowDeleteModal(false)}
        title="FAQ 삭제 확인"
        size="sm"
      >
        <div className={styles.deleteModalContent}>
          <p>정말로 이 FAQ를 삭제하시겠습니까?</p>
          <p className={styles.deleteWarning}>이 작업은 되돌릴 수 없습니다.</p>
          <div className={styles.deleteModalActions}>
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              아니오
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              loading={isDeleting}
            >
              예, 삭제합니다
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}