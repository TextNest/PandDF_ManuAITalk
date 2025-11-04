// ============================================
// 📄 8. src/components/layout/Footer/Footer.tsx
// ============================================
// 사용자 영역 푸터
// ============================================

import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.section}>
            <h3>ManuAI-Talk</h3>
            <p className={styles.description}>
              AI 기반 제품 설명서 질의응답 시스템
            </p>
          </div>
          
          <div className={styles.section}>
            <h4>서비스</h4>
            <ul className={styles.links}>
              <li><a href="/chat/sample-product">챗봇</a></li>
              <li><a href="/dashboard">관리자</a></li>
            </ul>
          </div>
          
          <div className={styles.section}>
            <h4>문의</h4>
            <ul className={styles.links}>
              <li>이메일: contact@manuai-talk.com</li>
              <li>전화: 02-1234-5678</li>
            </ul>
          </div>
        </div>
        
        <div className={styles.copyright}>
          <p>&copy; 2025 ManuAI-Talk. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
