// ============================================
// 📄 src/components/dashboard/TopQuestions/TopQuestions.tsx
// ============================================
// 가장 많이 질문한 제품 Top 5 (기존 TopQuestions 재활용)
// ============================================

import { BarChart3, Package } from 'lucide-react';
import styles from './TopQuestions.module.css';

// 타입 변경: question -> product_name
type TopProductItem = { id?: string; product_name: string; count: number };

export default function TopQuestions({ questions }: { questions?: any[] }) {
  // props 이름은 호환성을 위해 questions 유지하되, 내부는 product 로직으로 변경
  const list = questions && questions.length ? questions : [];

  // 데이터가 없을 경우 처리
  if (list.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            <Package size={20} />
            가장 많이 질문한 제품 Top 5
          </h3>
        </div>
        <div className={styles.noData}>데이터가 없습니다.</div>
      </div>
    );
  }

  const maxCount = Math.max(...list.map(q => q.count));

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <Package size={20} />
          가장 많이 질문한 제품 Top 5
        </h3>
      </div>

      <div className={styles.list}>
        {list.map((item, index) => (
          <div key={item.product_id || index} className={styles.item}>
            <div className={styles.rank}>{index + 1}</div>
            <div className={styles.content}>
              {/* 질문 대신 제품명 표시 */}
              <div className={styles.question}>{item.product_name}</div>
              <div className={styles.barWrapper}>
                <div
                  className={styles.bar}
                  style={{ width: `${(item.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
            <div className={styles.count}>{item.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
