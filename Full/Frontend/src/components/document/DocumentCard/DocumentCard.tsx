// ============================================
// 📄 6. src/components/document/DocumentCard/DocumentCard.tsx
// ============================================
// 문서 카드 컴포넌트 - 전체 기능
// ============================================

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  MoreVertical,
  Download,
  Trash2,
  Eye,
  Edit,
  Power,
  Copy
} from 'lucide-react';
import { Document } from '@/types/document.types';
import { formatFileSize, formatRelativeTime } from '@/lib/utils/format';
import styles from './DocumentCard.module.css';

interface DocumentCardProps {
  document: Document;
}

export default function DocumentCard({ document: doc }: DocumentCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isActive, setIsActive] = useState(doc.status === 'ready');
  const menuRef = useRef<HTMLDivElement>(null);

  const statusColors = {
    processing: styles.processing,
    ready: styles.ready,
    error: styles.error,
  };

  const statusLabels = {
    processing: '처리 중',
    ready: '사용 가능',
    error: '오류',
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

  const handleView = () => {
    console.log('상세보기:', doc.id);
    setIsMenuOpen(false);
  };

  const handleEdit = () => {
    console.log('수정하기:', doc.id);
    // TODO: 수정 페이지로 이동 또는 모달
    setIsMenuOpen(false);
  };

  const handleDownload = () => {
    console.log('다운로드:', doc.id);
    // TODO: 실제 다운로드 로직
    setIsMenuOpen(false);
  };

  const handleToggleActive = () => {
    const newStatus = !isActive;
    setIsActive(newStatus);
    console.log('활성화 토글:', doc.id, newStatus ? '활성화' : '비활성화');
    // TODO: API 호출
    setIsMenuOpen(false);
  };

  const handleDuplicate = () => {
    console.log('복제:', doc.id);
    // TODO: 복제 로직
    setIsMenuOpen(false);
  };

  const handleDelete = () => {
    if (confirm(`"${doc.name}" 문서를 삭제하시겠습니까?`)) {
      console.log('삭제:', doc.id);
      // TODO: 실제 삭제 로직
    }
    setIsMenuOpen(false);
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <FileText size={24} />
        </div>

        {/* 케밥 메뉴 */}
        <div className={styles.menuWrapper} ref={menuRef}>
          <button
            className={styles.menuButton}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <MoreVertical size={20} />
          </button>

          {/* 드롭다운 메뉴 */}
          {isMenuOpen && (
            <div className={styles.dropdown}>
              <button className={styles.dropdownItem} onClick={handleView}>
                <Eye size={16} />
                상세보기
              </button>

              <button className={styles.dropdownItem} onClick={handleEdit}>
                <Edit size={16} />
                수정하기
              </button>

              <button className={styles.dropdownItem} onClick={handleDownload}>
                <Download size={16} />
                다운로드
              </button>

              <button className={styles.dropdownItem} onClick={handleDuplicate}>
                <Copy size={16} />
                복제하기
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

      <Link href={`/documents/${doc.id}`} className={styles.content}>
        {/* 🔥 순서 변경 */}
        <h3 className={styles.title}>{doc.productName || '제품 정보 없음'}</h3>
        <p className={styles.filename}>{doc.fileName}</p>
        {doc.name && (
          <p className={styles.description}>{doc.name}</p>
        )}
      </Link>

      <div className={styles.meta}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>제품</span>
          <span className={styles.metaValue}>{doc.productName || '-'}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>크기</span>
          <span className={styles.metaValue}>{formatFileSize(doc.fileSize)}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>페이지</span>
          <span className={styles.metaValue}>{doc.pageCount || '-'}p</span>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.statusGroup}>
          <span className={`${styles.status} ${statusColors[doc.status]}`}>
            {statusLabels[doc.status]}
          </span>
          {!isActive && (
            <span className={styles.inactiveLabel}>비활성</span>
          )}
        </div>
        <span className={styles.date}>
          {formatRelativeTime(doc.uploadedAt)}
        </span>
      </div>
    </div>
  );
}