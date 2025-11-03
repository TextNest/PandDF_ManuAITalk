// ============================================
// 📄 src/components/document/DocumentListSkeleton/DocumentListSkeleton.tsx
// ============================================
// 문서 목록 전체 스켈레톤
// ============================================

import DocumentHeaderSkeleton from '../DocumentHeaderSkeleton/DocumentHeaderSkeleton';
import DocumentCardSkeleton from '../DocumentCardSkeleton/DocumentCardSkeleton';
import styles from './DocumentListSkeleton.module.css';

export default function DocumentListSkeleton() {
  return (
    <div className={styles.container}>
      {/* 헤더 스켈레톤 */}
      <DocumentHeaderSkeleton />

      {/* 문서 그리드 스켈레톤 */}
      <div className={styles.grid}>
        {Array(6).fill(0).map((_, index) => (
          <DocumentCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}