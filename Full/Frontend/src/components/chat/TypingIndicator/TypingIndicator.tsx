// ============================================
// 📄 10. src/components/chat/TypingIndicator/TypingIndicator.tsx
// ============================================
// 타이핑 인디케이터 컴포넌트
// ============================================

import styles from './TypingIndicator.module.css';

export default function TypingIndicator() {
  return (
    <div className={styles.container}>
      <div className={styles.indicator}>
        <span className={styles.dot}></span>
        <span className={styles.dot}></span>
        <span className={styles.dot}></span>
      </div>
      <p className={styles.text}>답변을 생성하고 있습니다...</p>
    </div>
  );
}