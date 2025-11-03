// ============================================
// 📄 7. src/app/(user)/product/[id]/page.tsx (모바일 전용)
// ============================================
// 모바일 최적화 제품 상세 페이지
// ============================================

import { MessageSquare, FileText, Phone } from 'lucide-react';
import styles from './product-page.module.css';

export default function ProductDetailPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  return (
    <div className={styles.productPage}>
      {/* 제품 이미지 */}
      <div className={styles.productImage}>
        <div className={styles.imagePlaceholder}>
          <FileText size={64} color="var(--color-gray-400)" />
        </div>
      </div>

      {/* 제품 정보 */}
      <div className={styles.productInfo}>
        <h1 className={styles.productName}>제품명</h1>
        <p className={styles.productId}>모델: {params.id}</p>
      </div>

      {/* 액션 버튼들 */}
      <div className={styles.actionButtons}>
        <a 
          href={`/chat/${params.id}`}
          className={`${styles.actionButton} ${styles.primary}`}
        >
          <MessageSquare size={24} />
          <div>
            <div className={styles.buttonTitle}>AI 상담하기</div>
            <div className={styles.buttonDesc}>궁금한 점을 물어보세요</div>
          </div>
        </a>

        <button className={styles.actionButton}>
          <FileText size={24} />
          <div>
            <div className={styles.buttonTitle}>설명서 보기</div>
            <div className={styles.buttonDesc}>PDF 매뉴얼 다운로드</div>
          </div>
        </button>

        <button className={styles.actionButton}>
          <Phone size={24} />
          <div>
            <div className={styles.buttonTitle}>고객센터</div>
            <div className={styles.buttonDesc}>1588-1234</div>
          </div>
        </button>
      </div>

      {/* 자주 묻는 질문 */}
      <div className={styles.faqSection}>
        <h2 className={styles.sectionTitle}>자주 묻는 질문</h2>
        <div className={styles.faqList}>
          <div className={styles.faqItem}>
            <p className={styles.faqQuestion}>제품 사용법이 궁금해요</p>
          </div>
          <div className={styles.faqItem}>
            <p className={styles.faqQuestion}>고장이 났어요</p>
          </div>
          <div className={styles.faqItem}>
            <p className={styles.faqQuestion}>A/S는 어떻게 받나요?</p>
          </div>
        </div>
      </div>
    </div>
  );
}