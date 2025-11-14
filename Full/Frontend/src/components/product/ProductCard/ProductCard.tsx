// ============================================
// 📄 src/components/product/ProductCard/ProductCard.tsx
// ============================================
// 제품 카드 컴포넌트 (QR 코드 포함)
// ============================================

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
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
import Modal from '@/components/ui/Modal/Modal';
import QRCodeDisplay from '../QRCodeDisplay/QRCodeDisplay';
import { Product } from '@/types/product.types';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isActive, setIsActive] = useState(product.is_active); // is_active 사용
  const [showQRModal, setShowQRModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    // TODO: 수정 페이지로 이동
    setIsMenuOpen(false);
  };

  const handleToggleActive = () => {
    const newIsActive = !isActive;
    setIsActive(newIsActive);
    console.log('활성화 토글:', product.internal_id, newIsActive ? '활성화' : '비활성화');
    // TODO: API 호출
    setIsMenuOpen(false);
  };

  const handleDelete = () => {
    if (confirm(`"${product.product_name}" 제품을 삭제하시겠습니까?`)) {
      console.log('삭제:', product.internal_id);
      // TODO: 실제 삭제 로직
    }
    setIsMenuOpen(false);
  };

  const currentAnalysisStatus = analysisStatusMap[product.analysis_status];

  return (
    <>
      <div className={styles.card}>
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
                <button className={styles.dropdownItem} onClick={handleViewQR}>
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
          <p className={styles.model}>{product.product_id}</p>
          {product.manufacturer && (
            <p className={styles.manufacturer}>{product.manufacturer}</p>
          )}
        </div>

        <div className={styles.meta}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>카테고리</span>
            <span className={styles.metaValue}>{product.category.name}</span> {/* category.name 사용 */}
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>문서</span>
            <span className={styles.metaValue}>{product.pdf_path ? '1개' : '0개'}</span>
          </div>
        </div>

        {/* 통계 */}
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <Eye size={16} />
            <span>{product.viewCount.toLocaleString()}</span>
          </div>
          <div className={styles.statItem}>
            <MessageSquare size={16} />
            <span>{product.questionCount.toLocaleString()}</span>
          </div>
        </div>

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