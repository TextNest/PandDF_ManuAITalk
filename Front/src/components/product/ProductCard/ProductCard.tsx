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
  MessageSquare
} from 'lucide-react';
import Modal from '@/components/ui/Modal/Modal';  // 🆕 추가
import QRCodeDisplay from '../QRCodeDisplay/QRCodeDisplay';  // 🆕 추가
import { Product } from '@/types/product.types';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isActive, setIsActive] = useState(product.status === 'active');
  const [showQRModal, setShowQRModal] = useState(false);  // 🆕 추가
  const menuRef = useRef<HTMLDivElement>(null);

  const statusColors = {
    active: styles.active,
    inactive: styles.inactive,
    draft: styles.draft,
  };

  const statusLabels = {
    active: '활성',
    inactive: '비활성',
    draft: '임시저장',
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

  // 🔥 수정: QR 모달 열기
  const handleViewQR = () => {
    setShowQRModal(true);  // 🆕 변경
    setIsMenuOpen(false);
  };

  const handleEdit = () => {
    console.log('수정하기:', product.id);
    // TODO: 수정 페이지로 이동
    setIsMenuOpen(false);
  };

  const handleToggleActive = () => {
    const newStatus = !isActive;
    setIsActive(newStatus);
    console.log('활성화 토글:', product.id, newStatus ? '활성화' : '비활성화');
    // TODO: API 호출
    setIsMenuOpen(false);
  };

  const handleDelete = () => {
    if (confirm(`"${product.name}" 제품을 삭제하시겠습니까?`)) {
      console.log('삭제:', product.id);
      // TODO: 실제 삭제 로직
    }
    setIsMenuOpen(false);
  };

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
          <h3 className={styles.title}>{product.name}</h3>
          <p className={styles.model}>{product.model}</p>
          {product.manufacturer && (
            <p className={styles.manufacturer}>{product.manufacturer}</p>
          )}
        </div>

        <div className={styles.meta}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>카테고리</span>
            <span className={styles.metaValue}>{product.category}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>문서</span>
            <span className={styles.metaValue}>{product.documentIds.length}개</span>
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
            <span className={`${styles.status} ${statusColors[product.status]}`}>
              {statusLabels[product.status]}
            </span>
            {/* 🔥 수정: status가 active인데 토글로 비활성화된 경우만 표시 */}
            {product.status === 'active' && !isActive && (
              <span className={styles.inactiveLabel}>비활성</span>
            )}
          </div>
        </div>
      </div>

      {/* 🆕 QR 코드 모달 추가 */}
      {showQRModal && (
        <Modal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          title="QR 코드"
        >
          <QRCodeDisplay
            productId={product.id}
            productName={product.name}
            size={256}
          />
        </Modal>
      )}
    </>
  );
}