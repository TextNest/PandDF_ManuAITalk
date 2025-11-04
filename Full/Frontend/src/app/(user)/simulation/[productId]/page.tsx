'use client';

import { useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Maximize2, Move3d } from 'lucide-react';
import SessionHistory from '@/components/chat/SessionHistory/SessionHistory';
import { ChatSession } from '@/lib/db/indexedDB';
import ARUI from '@/components/ar/ARUI';
import ARScene, { ARSceneHandle } from '@/components/ar/ARScene';
import styles from './simulation-page.module.css';
import { useARStore } from '@/store/useARStore';

export default function SimulationPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.productId as string;
  const { isARActive, setARActive } = useARStore();

  const arSceneRef = useRef<ARSceneHandle>(null);
  const uiOverlayRef = useRef<HTMLDivElement>(null);
  const lastUITouchTimeRef = useRef(0);

  const handleStartAR = () => {
    // Call startAR directly from the user gesture
    arSceneRef.current?.startAR();
    // Set the global state to update the UI
    setARActive(true);
  };

  // Mock data for SessionHistory
  const mockSessions: ChatSession[] = [];
  const currentSessionId = '';

  const handleSelectSession = (sessionId: string) => {
    router.push(`/chat/${productId}?session=${sessionId}`);
  };

  const handleNewSession = () => {
    router.push(`/chat/${productId}`);
  };

  const handleDeleteSession = (sessionId: string) => {
    console.log('Delete session:', sessionId);
  };

  return (
    <div className={`${styles.page} ${isARActive ? styles.arActive : ''}`} ref={uiOverlayRef}>
      <ARUI lastUITouchTimeRef={lastUITouchTimeRef} />

      <div className={styles.sessionHistoryWrapper}>
        <SessionHistory
          sessions={mockSessions}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
        />
      </div>

      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <Move3d size={24} className={styles.headerIcon} />
          <div>
            <h1>공간 시뮬레이션</h1>
            <p>제품: {productId}</p>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.simulationContainer}>
          {/* ARScene is always rendered but hidden via CSS initially */}
          <div className={styles.arSceneWrapper}>
            <ARScene ref={arSceneRef} uiOverlayRef={uiOverlayRef} lastUITouchTimeRef={lastUITouchTimeRef} />
          </div>

          {/* Placeholder is shown/hidden via CSS */}
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

            <button className={styles.arButton} onClick={handleStartAR}>
              AR 기능 시작
            </button>
          </div>
        </div>

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
