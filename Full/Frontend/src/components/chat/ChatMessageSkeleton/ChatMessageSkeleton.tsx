// ============================================
// 📄 13. src/components/chat/ChatMessageSkeleton/ChatMessageSkeleton.tsx
// ============================================
// 채팅 메시지 스켈레톤
// ============================================

import Skeleton from '@/components/common/Skeleton/Skeleton';
import styles from './ChatMessageSkeleton.module.css';

export default function ChatMessageSkeleton() {
  return (
    <div className={styles.container}>
      <div className={styles.messageContent}>
        <Skeleton width="90%" height={16} />
        <Skeleton width="70%" height={16} style={{ marginTop: '8px' }} />
        <Skeleton width="80%" height={16} style={{ marginTop: '8px' }} />
      </div>
      <Skeleton width={60} height={12} style={{ marginTop: '4px' }} />
    </div>
  );
}