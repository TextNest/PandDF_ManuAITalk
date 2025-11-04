// ============================================
// 📄 src/components/document/DocumentHeaderSkeleton/DocumentHeaderSkeleton.tsx
// ============================================
// 문서 페이지 헤더 스켈레톤 (검색바 + 필터 + 버튼)
// ============================================

import styles from './DocumentHeaderSkeleton.module.css';

export default function DocumentHeaderSkeleton() {
  return (
    <div className={styles.header}>
      {/* 제목 */}
      <div className={styles.titleSection}>
        <div className={styles.title}></div>
        <div className={styles.subtitle}></div>
      </div>

      {/* 액션 영역 */}
      <div className={styles.actions}>
        {/* 검색바 */}
        <div className={styles.searchBar}></div>
        
        {/* 필터 버튼들 */}
        <div className={styles.filters}>
          <div className={styles.filterButton}></div>
          <div className={styles.filterButton}></div>
          <div className={styles.filterButton}></div>
        </div>
        
        {/* 업로드 버튼 */}
        <div className={styles.uploadButton}></div>
      </div>
    </div>
  );
}