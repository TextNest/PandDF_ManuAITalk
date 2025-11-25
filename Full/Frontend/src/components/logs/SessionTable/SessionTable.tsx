// ============================================
// 📄 3. src/components/logs/SessionTable/SessionTable.tsx
// ============================================
// 세션 조회 컴포넌트
// ============================================

'use client';

import { SessionList } from '@/types/log.types';
import { formatProductId, formatTimestamp, statusColor } from '@/lib/utils/log.utils';
import styles from './SessionTable.module.css';

interface SessionTableProps {
  sessions: SessionList[];
  onSelectSession?: (sessionId: string) => void;
}

export default function SessionTable({ sessions, onSelectSession }: SessionTableProps) {
  if (!sessions || sessions.length === 0) {
    return (
      <div className={styles.empty}>
        조회된 세션이 없습니다.
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>결과</th>
            <th>제품 ID</th>
            <th>세션 ID</th>
            <th>질문</th>
            <th>종료 시간</th>
            <th>만족도</th>
          </tr>
        </thead>

        <tbody>
          {sessions.map((s) => (
            <tr
              key={s.sessionId}
              className={styles.row}
              onClick={() => onSelectSession?.(s.sessionId)}
            >
              {/* 1. 해결 여부 + 색상 원 */}
              <td>
                <span
                  className={styles.statusDot}
                  style={{ backgroundColor: statusColor(s.status) }}
                />
              </td>

              {/* 2. 제품 ID */}
              <td>{formatProductId(s.productId)}</td>

              {/* 3. 세션 ID */}
              <td>{s.sessionId}</td>

              {/* 4. 첫 번째 질문 */}
              <td className={styles.firstMessage}>{s.message}</td>

              {/* 5. 종료 시간 */}
              <td className={styles.endedAt}>{formatTimestamp(s.endedAt)}</td>

              {/* 6. 만족도 */}
              <td className={styles.satisfaction}>
                {s.satisfaction != null
                  ? `${s.satisfaction.toFixed(2)}%`
                  : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}