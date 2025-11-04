// ============================================
// 📄 src/components/logs/UnansweredQueries/UnansweredQueries.tsx
// ============================================
// 미답변 질문 컴포넌트 (개선판)
// ============================================

'use client';

import { Clock, Package, AlertCircle, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button/Button';
import { UnansweredQuery } from '@/types/log.types';
import styles from './UnansweredQueries.module.css';

interface UnansweredQueriesProps {
  queries: UnansweredQuery[];
}

export default function UnansweredQueries({ queries }: UnansweredQueriesProps) {
  // 경과 시간 계산 (시간 단위)
  const getElapsedHours = (timestamp: Date): number => {
    return Math.floor((Date.now() - timestamp.getTime()) / (1000 * 60 * 60));
  };

  // 우선순위 레벨 결정
  const getPriorityLevel = (hours: number): 'urgent' | 'warning' | 'recent' => {
    if (hours >= 24) return 'urgent';   // 24시간 이상
    if (hours >= 6) return 'warning';   // 6시간 이상
    return 'recent';                     // 6시간 미만
  };

  // 시간 포맷
  const formatElapsedTime = (hours: number): string => {
    if (hours < 1) return '방금 전';
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
  };

  const handleAnswer = (query: UnansweredQuery) => {
    console.log('답변하기:', query);
    // TODO: FAQ 등록 모달 또는 페이지로 이동
    alert(`"${query.question}"에 대한 답변을 작성합니다.`);
  };

  const handleSnooze = (query: UnansweredQuery) => {
    console.log('보류:', query);
    // TODO: 보류 처리
    alert('질문을 보류 처리했습니다.');
  };

  const handleViewProduct = (productId: string) => {
    console.log('제품 페이지로 이동:', productId);
    // TODO: 제품 상세 페이지로 이동
  };

  if (queries.length === 0) {
    return (
      <div className={styles.empty}>
        <CheckCircle size={48} className={styles.emptyIcon} />
        <p className={styles.emptyText}>미답변 질문이 없습니다!</p>
        <p className={styles.emptySubtext}>모든 질문에 답변이 완료되었습니다.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {queries.map((query) => {
        const elapsedHours = getElapsedHours(query.timestamp);
        const priority = getPriorityLevel(elapsedHours);
        
        return (
          <div 
            key={query.id} 
            className={`${styles.queryCard} ${styles[priority]}`}
          >
            {/* 우선순위 배지 */}
            <div className={styles.priorityBadge}>
              {priority === 'urgent' && (
                <>
                  <AlertCircle size={16} />
                  <span>긴급</span>
                </>
              )}
              {priority === 'warning' && (
                <>
                  <Clock size={16} />
                  <span>주의</span>
                </>
              )}
              {priority === 'recent' && (
                <>
                  <Clock size={16} />
                  <span>최근</span>
                </>
              )}
            </div>

            {/* 질문 내용 */}
            <div className={styles.queryContent}>
              <h4 className={styles.question}>{query.question}</h4>
              
              <div className={styles.metadata}>
                <div className={styles.metaItem}>
                  <Package size={14} />
                  <span>{query.productName}</span>
                </div>
                <div className={styles.metaItem}>
                  <Clock size={14} />
                  <span>{formatElapsedTime(elapsedHours)}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.attemptCount}>
                    시도 {query.attemptCount}회
                  </span>
                </div>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className={styles.actions}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleAnswer(query)}
              >
                답변하기
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewProduct(query.productId)}
              >
                제품 보기
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSnooze(query)}
              >
                보류
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}