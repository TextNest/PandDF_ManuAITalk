// ============================================
// 📄 6. src/components/logs/TopQuestionsTable/TopQuestionsTable.tsx
// ============================================
// 자주 묻는 질문 테이블
// ============================================

import { TrendingUp } from 'lucide-react';
import { TopQuestion } from '@/types/log.types';
import styles from './TopQuestionsTable.module.css';

interface TopQuestionsTableProps {
  questions: TopQuestion[];
}

export default function TopQuestionsTable({ questions }: TopQuestionsTableProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <TrendingUp size={20} />
          자주 묻는 질문 Top {questions.length}
        </h3>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>순위</th>
              <th>질문</th>
              <th>횟수</th>
              <th>평균 응답 시간</th>
              <th>도움됨</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((question, index) => (
              <tr key={index}>
                <td>
                  <div className={styles.rank}>{index + 1}</div>
                </td>
                <td className={styles.questionCell}>{question.question}</td>
                <td>
                  <span className={styles.count}>{question.count}</span>
                </td>
                <td>{question.averageResponseTime.toFixed(1)}s</td>
                <td>
                  <div className={styles.rateBar}>
                    <div 
                      className={styles.rateBarFill}
                      style={{ width: `${question.helpfulRate * 100}%` }}
                    />
                    <span className={styles.rateText}>
                      {Math.round(question.helpfulRate * 100)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
