// ============================================
// 📄 9. src/components/dashboard/RecentActivity/RecentActivity.tsx
// ============================================
// 최근 활동 로그
// ============================================

import { Clock, FileText, MessageSquare } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils/format';
import type { RecentActivityItem } from '@/features/dashboard/hooks/useDashboardData';
import styles from './RecentActivity.module.css';

// type DisplayActivity = {
//   id: string;
//   type: 'document' | 'query' | 'faq';
//   title: string;
//   description?: string;
//   timestamp: string;
// };

// const defaultActivities: DisplayActivity[] = [
//   {
//     id: '1',
//     type: 'document',
//     title: '새로운 질문',
//     description: '제품 사용법이 궁금해요',
//     timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5분 전
//   },
//   {
//     id: '2',
//     type: 'document',
//     title: '문서 업로드',
//     description: '세탁기_WM-2024.pdf',
//     timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30분 전
//   },
//   {
//     id: '3',
//     type: 'query',
//     title: '새로운 질문',
//     description: '고장이 났어요',
//     timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2시간 전
//   },
//   {
//     id: '4',
//     type: 'document',
//     title: '문서 갱신',
//     description: '냉장고_RF-2024.pdf',
//     timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5시간 전
//   },
// ];

const iconMap = {
  query: MessageSquare,
  document: FileText,
  faq: FileText,
};

export default function RecentActivity({ activities }: { activities?: RecentActivityItem[] }) {
  const items = activities && activities.length > 0;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <Clock size={20} />
          최근 활동
        </h3>
        <a href="/logs" className={styles.viewAll}>전체 보기</a>
      </div>
      
      <div className={styles.timeline}>
        {!items ? (
          <div className={styles.noData}>
            데이터가 없습니다
          </div>
        ):(
          activities!.map((activity) => {
            const typeKey = (activity as any).type || 'query';
            const Icon = iconMap[typeKey as keyof typeof iconMap] || MessageSquare;
            const ts = (activity as any).timestamp ? new Date((activity as any).timestamp) : undefined;

            return (
              <div key={(activity as any).id} className={styles.item}>
                <div className={styles.iconWrapper}>
                  <Icon size={16} />
                </div>
                <div className={styles.content}>
                  <div className={styles.itemTitle}>{(activity as any).title}</div>
                  {(activity as any).description && <div className={styles.description}>{(activity as any).description}</div>}
                </div>
                <time className={styles.timestamp}>
                  {ts ? formatRelativeTime(ts) : ''}
                </time>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
