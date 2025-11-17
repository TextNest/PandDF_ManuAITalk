// ============================================
// 📄 src/components/product/ProductCard/ProductCard.tsx
// ============================================
// 제품 카드 컴포넌트 (QR 코드 포함)
// ============================================

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // useRouter 임포트
import {
  Package,
  MoreVertical,
  Edit,
  Trash2,
  Power,
  QrCode,
  Eye,
  MessageSquare,
  Hourglass, // 분석 상태 아이콘 추가
  CheckCircle, // 분석 완료 아이콘 추가
  XCircle // 분석 실패 아이콘 추가
} from 'lucide-react';
import apiClient from '@/lib/api/client';
import { toast } from '@/store/useToastStore';
import Modal from '@/components/ui/Modal/Modal';
import QRCodeDisplay from '../QRCodeDisplay/QRCodeDisplay';
import { Product } from '@/types/product.types';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
  onProductUpdate: (updatedProduct: Product) => void;
  onProductDelete: (deletedProductId: number) => void;
}

export default function ProductCard({ product, onProductUpdate, onProductDelete }: ProductCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isActive, setIsActive] = useState(product.is_active); // is_active 사용
  const [showQRModal, setShowQRModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter(); // useRouter 초기화

  // analysis_status에 따른 스타일 및 라벨
  const analysisStatusMap = {
    PENDING: { label: '분석 대기중', color: styles.statusPending, icon: <Hourglass size={16} /> },
    COMPLETED: { label: '분석 완료', color: styles.statusCompleted, icon: <CheckCircle size={16} /> },
    FAILED: { label: '분석 실패', color: styles.statusFailed, icon: <XCircle size={16} /> },
  };

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      window.document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      window.document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleViewQR = () => {
    setShowQRModal(true);
    setIsMenuOpen(false);
  };

  const handleEdit = () => {
    console.log('수정하기:', product.internal_id);
    router.push(`/products/edit/${product.internal_id}`); // 수정 페이지로 이동
    setIsMenuOpen(false);
  };

  const handleToggleActive = async () => {
    const newIsActive = !isActive;
    try {
      const response = await apiClient.put(`/api/products/${product.internal_id}`, { is_active: newIsActive });
      if (response.status === 200) {
        setIsActive(newIsActive);
        onProductUpdate(response.data);
        toast.success(`제품이 ${newIsActive ? '활성화' : '비활성화'}되었습니다.`);
      } else {
        toast.error('상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error toggling active status:', error);
      toast.error('상태 변경 중 오류가 발생했습니다.');
    }
    setIsMenuOpen(false);
  };

  const handleDelete = async () => {
    if (confirm(`"${product.product_name}" 제품을 삭제하시겠습니까?`)) {
      try {
        const response = await apiClient.delete(`/api/products/${product.internal_id}`);
        if (response.status === 204) {
          onProductDelete(product.internal_id);
          toast.success('제품이 삭제되었습니다.');
        } else {
          toast.error('제품 삭제에 실패했습니다.');
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('제품 삭제 중 오류가 발생했습니다.');
      }
    }
    setIsMenuOpen(false);
  };

  const currentAnalysisStatus = analysisStatusMap[product.analysis_status];
  const isAnalysisComplete = product.analysis_status === 'COMPLETED';

  return (
    <>
      <div className={`${styles.card} ${isMenuOpen ? styles.menuOpen : ''}`}>
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <Package size={24} />
          </div>

          {/* 케밥 메뉴 */}
          <div className={styles.menuWrapper} ref={menuRef}>
            <button
              className={styles.menuButton}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <MoreVertical size={20} />
            </button>

            {isMenuOpen && (
              <div className={styles.dropdown}>
                <button className={styles.dropdownItem} onClick={handleViewQR} disabled={!isAnalysisComplete}>
                  <QrCode size={16} />
                  QR 코드 보기
                </button>

                <button className={styles.dropdownItem} onClick={handleEdit}>
                  <Edit size={16} />
                  수정하기
                </button>

                <div className={styles.divider} />

                <button
                  className={styles.dropdownItem}
                  onClick={handleToggleActive}
                >
                  <Power size={16} />
                  {isActive ? '비활성화' : '활성화'}
                </button>

                <div className={styles.divider} />

                <button
                  className={`${styles.dropdownItem} ${styles.danger}`}
                  onClick={handleDelete}
                >
                  <Trash2 size={16} />
                  삭제
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.content}>
          <h3 className={styles.title}>{product.product_name}</h3>
          {isAnalysisComplete && (
            <>
              <p className={styles.model}>{product.product_id}</p>
              {product.manufacturer && (
                <p className={styles.manufacturer}>{product.manufacturer}</p>
              )}
            </>
          )}
        </div>

        {isAnalysisComplete && (
          <div className={styles.meta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>카테고리</span>
              <span className={styles.metaValue}>{product.category || '미지정'}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>문서</span>
              <span className={styles.metaValue}>{product.pdf_path ? '1개' : '0개'}</span>
            </div>
          </div>
        )}

        {/* 통계 (제거됨) */}

        <div className={styles.footer}>
          <div className={styles.statusGroup}>
            <span className={`${styles.status} ${product.is_active ? styles.active : styles.inactive}`}>
              {product.is_active ? '활성' : '비활성'}
            </span>
            {currentAnalysisStatus && (
              <span className={`${styles.status} ${currentAnalysisStatus.color}`}>
                {currentAnalysisStatus.icon} {currentAnalysisStatus.label}
              </span>
            )}
            {product.model3d_url && (
              <span className={`${styles.status} ${styles.status3D}`}>
                3D
              </span>
            )}
          </div>
        </div>
      </div>

      {/* QR 코드 모달 */}
      {showQRModal && (
        <Modal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          title="QR 코드"
        >
          <QRCodeDisplay
            productId={product.internal_id}
            productName={product.product_name}
            size={256}
          />
        </Modal>
      )}
    </>
  );
}