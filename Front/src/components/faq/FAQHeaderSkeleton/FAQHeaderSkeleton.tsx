// ============================================
// 📄 src/components/faq/FAQHeaderSkeleton/FAQHeaderSkeleton.tsx
// ============================================
// FAQ 페이지 헤더 스켈레톤
// ============================================

import Skeleton from '@/components/common/Skeleton/Skeleton';
import styles from './FAQHeaderSkeleton.module.css';

export default function FAQHeaderSkeleton() {
  return (
    <div className={styles.header}>
      {/* 제목 */}
      <div className={styles.titleSection}>
        <Skeleton width={150} height={32} />
        <Skeleton width={200} height={20} style={{ marginTop: '8px' }} />
      </div>

      {/* 액션 영역 */}
      <div className={styles.actions}>
        {/* 검색바 */}
        <div className={styles.searchBar}>
          <Skeleton width="100%" height={44} />
        </div>
        
        {/* 필터 버튼들 */}
        <div className={styles.filters}>
          <Skeleton width={70} height={36} />
          <Skeleton width={70} height={36} />
          <Skeleton width={90} height={36} />
        </div>
        
        {/* 자동 생성 버튼 */}
        <Skeleton width={130} height={44} />
      </div>
    </div>
  );
}