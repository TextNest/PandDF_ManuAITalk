'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Maximize2, Move3d } from 'lucide-react';
import SessionHistory from '@/components/chat/SessionHistory/SessionHistory'; // 🆕 추가
import { ChatSession } from '@/lib/db/indexedDB'; // 🆕 추가
import styles from './simulation-page.module.css';

export default function SimulationPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.productId as string;

  // 🆕 SessionHistory를 위한 Mock 데이터
  const mockSessions: ChatSession[] = [];
  const currentSessionId = '';

  const handleSelectSession = (sessionId: string) => {
    // 세션 선택 시 채팅 페이지로 이동
    router.push(`/chat/${productId}?session=${sessionId}`);
  };

  const handleNewSession = () => {
    router.push(`/chat/${productId}`);
  };

  const handleDeleteSession = (sessionId: string) => {
    console.log('Delete session:', sessionId);
  };

  return (
    <div className={styles.page}>
      {/* 🆕 네비게이션 사이드바 */}
      <SessionHistory
        sessions={mockSessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
      />

      {/* 헤더 - 간소화 */}
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <Move3d size={24} className={styles.headerIcon} />
          <div>
            <h1>공간 시뮬레이션</h1>
            <p>제품: {productId}</p>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className={styles.main}>
        {/* 시뮬레이션 영역 */}
        <div className={styles.simulationContainer}>
          <div className={styles.placeholder}>
            <Maximize2 size={64} className={styles.placeholderIcon} />
            <h2>AR/3D 시뮬레이션 영역</h2>
            <p>이 영역에 AR 또는 3D 시뮬레이션 기능이 구현됩니다</p>

            <div className={styles.specs}>
              <h3>구현 예정 기능:</h3>
              <ul>
                <li>✅ RAG에서 제품 규격 추출</li>
                <li>✅ 사용자 공간 크기 입력</li>
                <li>✅ 2D/3D 시각화</li>
                <li>✅ AR 카메라 (모바일)</li>
                <li>✅ 배치 가능 여부 판단</li>
              </ul>
            </div>

            <div className={styles.devNote}>
              <strong>개발자 노트:</strong>
              <p>이 페이지는 시뮬레이션 기능을 위한 컨테이너입니다.</p>
              <p>실제 AR/3D 로직은 별도 컴포넌트로 구현하여 이 영역에 삽입하면 됩니다.</p>
            </div>
          </div>
        </div>

        {/* 사이드 패널 */}
        <aside className={styles.sidebar}>
          <div className={styles.infoCard}>
            <h3>제품 정보</h3>
            <div className={styles.infoItem}>
              <span className={styles.label}>제품 ID:</span>
              <span className={styles.value}>{productId}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>규격 (예시):</span>
              <span className={styles.value}>60cm x 85cm x 90cm</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>무게:</span>
              <span className={styles.value}>45kg</span>
            </div>
          </div>

          <div className={styles.infoCard}>
            <h3>사용 가이드</h3>
            <ol className={styles.guideList}>
              <li>공간 크기를 측정하세요</li>
              <li>제품 규격을 확인하세요</li>
              <li>시뮬레이션으로 배치를 확인하세요</li>
              <li>AR 모드로 실제 공간에서 확인하세요</li>
            </ol>
          </div>
        </aside>
      </main>
    </div>
  );
}
