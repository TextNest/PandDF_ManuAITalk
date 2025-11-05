// ============================================
// 📄 6. src/components/document/DocumentCard/DocumentCard.tsx
// ============================================
// 문서 카드 컴포넌트
// ============================================

import Link from 'next/link';
import { FileText, MoreVertical, Download, Trash2 } from 'lucide-react';
import { Document } from '@/types/document.types';
import { formatFileSize, formatRelativeTime } from '@/lib/utils/format';
import styles from './DocumentCard.module.css';

interface DocumentCardProps {
  document: Document;
}

export default function DocumentCard({ document }: DocumentCardProps) {
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

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <FileText size={24} />
        </div>
        <button className={styles.menuButton}>
          <MoreVertical size={20} />
        </button>
      </div>

      <Link href={`/documents/${document.id}`} className={styles.content}>
        <h3 className={styles.title}>{document.name}</h3>
        <p className={styles.filename}>{document.fileName}</p>
      </Link>

      <div className={styles.meta}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>제품</span>
          <span className={styles.metaValue}>{document.productName || '-'}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>크기</span>
          <span className={styles.metaValue}>{formatFileSize(document.fileSize)}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>페이지</span>
          <span className={styles.metaValue}>{document.pageCount || '-'}p</span>
        </div>
      </div>

      <div className={styles.footer}>
        <span className={`${styles.status} ${statusColors[document.status]}`}>
          {statusLabels[document.status]}
        </span>
        <span className={styles.date}>
          {formatRelativeTime(document.uploadedAt)}
        </span>
      </div>

      <div className={styles.actions}>
        <button className={styles.actionButton} title="다운로드">
          <Download size={16} />
        </button>
        <button className={`${styles.actionButton} ${styles.danger}`} title="삭제">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
