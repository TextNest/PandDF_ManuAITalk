'use client';

<<<<<<< HEAD
import { useRef } from 'react';
=======
import { useEffect, useRef, useState } from 'react';
>>>>>>> main
import { useParams, useRouter } from 'next/navigation';
import { Maximize2, Move3d } from 'lucide-react';
import SessionHistory from '@/components/chat/SessionHistory/SessionHistory';
import { ChatSession } from '@/lib/db/indexedDB';
import ARUI from '@/components/ar/ARUI';
import ARScene, { ARSceneHandle } from '@/components/ar/ARScene';
import styles from './simulation-page.module.css';
import { useARStore } from '@/store/useARStore';
<<<<<<< HEAD
=======
import { Product } from '@/types/product.types';
import apiClient from '@/lib/api/client';
>>>>>>> main

export default function SimulationPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.productId as string;
  const { isARActive, setARActive } = useARStore();
<<<<<<< HEAD

=======
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isARSupported, setIsARSupported] = useState(false);
  const [arSupportChecked, setArSupportChecked] = useState(false);

  useEffect(() => {
    const checkARSupport = async () => {
      if (!('xr' in navigator)) {
        setIsARSupported(false);
      } else {
        const supported = await (navigator as any).xr.isSessionSupported('immersive-ar');
        setIsARSupported(supported);
      }
      setArSupportChecked(true);
    };
    checkARSupport();
  }, []);

>>>>>>> main
  const arSceneRef = useRef<ARSceneHandle>(null);
  const uiOverlayRef = useRef<HTMLDivElement>(null);
  const lastUITouchTimeRef = useRef(0);

<<<<<<< HEAD
=======
  useEffect(() => {
    if (productId) {
      const fetchProduct = async () => {
        try {
          // Assuming the API endpoint is /api/products/{id}
          // Note: The provided file structure shows the products API router is at /api/products
          const response = await apiClient.get<Product>(`/products/${productId}`);
          setProduct(response.data);
        } catch (err) {
          console.error("Failed to fetch product", err);
          setError("제품 정보를 불러오는 데 실패했습니다.");
        }
      };
      fetchProduct();
    }
  }, [productId]);

>>>>>>> main
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
            <p>제품: {product ? product.product_name : productId}</p>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.simulationContainer}>
          {/* ARScene is always rendered but hidden via CSS initially */}
          <div className={styles.arSceneWrapper}>
<<<<<<< HEAD
            <ARScene ref={arSceneRef} uiOverlayRef={uiOverlayRef} lastUITouchTimeRef={lastUITouchTimeRef} />
=======
            <ARScene ref={arSceneRef} uiOverlayRef={uiOverlayRef} lastUITouchTimeRef={lastUITouchTimeRef} product={product} />
>>>>>>> main
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

<<<<<<< HEAD
            <button className={styles.arButton} onClick={handleStartAR}>
              AR 기능 시작
            </button>
=======
            <button
              className={styles.arButton}
              onClick={handleStartAR}
              disabled={!arSupportChecked || !isARSupported}
            >
              AR 기능 시작
            </button>
            {!arSupportChecked && (
              <p className={styles.arSupportMessage}>AR 지원 여부 확인 중...</p>
            )}
            {arSupportChecked && !isARSupported && (
              <p className={styles.arSupportMessage}>이 기기에서는 AR 기능을 지원하지 않습니다.</p>
            )}
>>>>>>> main
          </div>
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.infoCard}>
            <h3>제품 정보</h3>
            {error && <p className={styles.error}>{error}</p>}
            {product ? (
              <>
                <div className={styles.infoItem}>
                  <span className={styles.label}>제품명:</span>
                  <span className={styles.value}>{product.product_name}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.label}>모델명:</span>
                  <span className={styles.value}>{product.product_id}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.label}>규격 (W x H x D):</span>
                  <span className={styles.value}>
                    {`${product.width_mm || 1000}mm x ${product.height_mm || 1000}mm x ${product.depth_mm || 1000}mm`}
                  </span>
                </div>
              </>
            ) : (
              <p>제품 정보를 불러오는 중...</p>
            )}
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
