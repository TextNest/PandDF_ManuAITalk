// ============================================
// 📄 1. src/components/logs/RecentSessionTable/RecentSessionTable.tsx
// ============================================
// 최근 문의 컴포넌트
// ============================================

'use client';

import { SessionRecent } from '@/types/log.types';
import { formatProductId } from '@/lib/utils/log.utils';
import styles from './RecentSessionTable.module.css';

interface RecentSessionTableProps {
  sessions: SessionRecent[];
  onSelectSession?: (sessionId: string) => void;
}

export default function RecentSessionTable({sessions, onSelectSession,}: RecentSessionTableProps) {
  if (!sessions || sessions.length === 0) {
    return (
      <div className={styles.empty}>
        최근 진행된 문의가 없습니다.
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <table className={styles.table}>
        <tbody>
          {sessions.map((session) => (
            <tr
              key={session.sessionId}
              className={styles.row}
              onClick={() => onSelectSession?.(session.sessionId)}
            >
              <td className={styles.status}>
                {session.status === 'resolved' ? '해결' : '미해결'}
              </td>
              <td className={styles.product}>
                {formatProductId(session.productId)}
              </td>
              <td className={styles.message}>
                {session.message}
              </td>
              <td className={styles.satisfy}>
                {session.satisfaction.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};