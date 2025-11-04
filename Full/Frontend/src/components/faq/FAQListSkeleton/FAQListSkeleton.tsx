// ============================================
// 📄 src/components/faq/FAQListSkeleton/FAQListSkeleton.tsx
// ============================================
// FAQ 목록 전체 스켈레톤
// ============================================

import FAQHeaderSkeleton from '../FAQHeaderSkeleton/FAQHeaderSkeleton';
import FAQCardSkeleton from '../FAQCardSkeleton/FAQCardSkeleton';
import styles from './FAQListSkeleton.module.css';

export default function FAQListSkeleton() {
  return (
    <div className={styles.container}>
      {/* 헤더 스켈레톤 */}
      <FAQHeaderSkeleton />

      {/* FAQ 목록 스켈레톤 */}
      <div className={styles.list}>
        {Array(5).fill(0).map((_, index) => (
          <FAQCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}