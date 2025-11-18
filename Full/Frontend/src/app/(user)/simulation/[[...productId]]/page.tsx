'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Maximize2, Move3d } from 'lucide-react';
import ARUI from '@/components/ar/ARUI';
import ARScene, { ARSceneHandle } from '@/components/ar/ARScene';
import styles from './simulation-page.module.css';
import { useARStore } from '@/store/useARStore';
import { toast } from '@/store/useToastStore';
import { Product } from '@/types/product.types';
import apiClient from '@/lib/api/client';

export default function SimulationPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.productId ? (params.productId as string[])[0] : undefined;

  // Use individual selectors for Zustand state to ensure correct re-renders
  const isARActive = useARStore(state => state.isARActive);
  const setARActive = useARStore(state => state.setARActive);
  const selectedFurniture = useARStore(state => state.selectedFurniture);
  const selectFurniture = useARStore(state => state.selectFurniture);
  // const setDebugMessage = useARStore(state => state.setDebugMessage); // Debug message removed

  const arSceneRef = useRef<ARSceneHandle>(null);
  const uiOverlayRef = useRef<HTMLDivElement>(null);
  const lastUITouchTimeRef = useRef(0);

  // This effect ONLY sets the initial furniture in the store
  useEffect(() => {
    // On component mount, always clear the previous selection
    // unless we are about to set a new one from the URL.
    if (!productId) {
      selectFurniture(null);
    }

    if (productId) {
      const fetchInitialProduct = async () => {
        try {
          const product = await apiClient.get<Product>(`/products/${productId}`);
          const mappedFurniture: FurnitureItem = {
            id: product.data.product_id ?? '',
            name: product.data.product_name,
            model3dUrl: product.data.model3d_url ?? undefined,
            width_mm: product.data.width_mm ?? undefined,
            height_mm: product.data.height_mm ?? undefined,
            depth_mm: product.data.depth_mm ?? undefined,
            // Add non-mm properties for ARUI compatibility
            width: product.data.width_mm ? product.data.width_mm / 1000 : undefined,
            height: product.data.height_mm ? product.data.height_mm / 1000 : undefined,
            depth: product.data.depth_mm ? product.data.depth_mm / 1000 : undefined,
          };
          selectFurniture(mappedFurniture);
        } catch (err) {
          console.error("Failed to fetch initial product", err);
          selectFurniture(null); // Clear selection on error
        }
      };
      fetchInitialProduct();
    }
  }, [productId, selectFurniture]);

  const handleStartAR = async () => {
    if (!('xr' in navigator)) {
      toast.error('WebXR을 지원하지 않는 브라우저입니다.');
      return;
    }
    const supported = await (navigator as any).xr.isSessionSupported('immersive-ar');
    if (!supported) {
      toast.error('이 기기에서는 AR 기능을 지원하지 않습니다.');
      return;
    }

    arSceneRef.current?.startAR();
    setARActive(true);
  };

  return (
    <div className={`${styles.page} ${isARActive ? styles.arActive : ''}`} ref={uiOverlayRef}>
      <ARUI lastUITouchTimeRef={lastUITouchTimeRef} />

      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <Move3d size={24} className={styles.headerIcon} />
          <div>
            <h1>공간 시뮬레이션</h1>
            <p>제품: {selectedFurniture ? selectedFurniture.name : (productId ? '로딩 중...' : '선택 없음')}</p>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.simulationContainer}>
          <div className={styles.arSceneWrapper}>
            <ARScene ref={arSceneRef} uiOverlayRef={uiOverlayRef} lastUITouchTimeRef={lastUITouchTimeRef} />
          </div>

          <div className={styles.placeholder}>
            <Maximize2 size={64} className={styles.placeholderIcon} />
            <h2>증강 현실로 제품을 미리 만나보세요!</h2>

            <div className={styles.specs}>
              <h3>구현 기능</h3>
              <ul>
                <li>📱 <strong>모바일 AR 카메라:</strong> WebXR 기반 증강 현실로 실제 공간에 제품을 배치합니다.</li>
                <li>🧊 <strong>3D 제품 시각화:</strong> Three.js로 렌더링된 3D 모델을 직접 보고 조작할 수 있습니다.</li>
                <li>🎯 <strong>정확한 제품 배치:</strong> 실제 제품 크기를 반영하여 정확한 위치에 가구를 놓아볼 수 있습니다.</li>
                <li>📏 <strong>공간 측정 도구:</strong> AR 공간 내에서 두 지점 사이의 거리를 측정하여 공간 활용도를 높입니다.</li>
                <li>🔗 <strong>제품 정보 연동:</strong> DB에 저장된 제품의 규격과 3D 모델을 실시간으로 불러옵니다.</li>
              </ul>
            </div>

            <button
              className={styles.arButton}
              onClick={handleStartAR}
            >
              AR 기능 시작
            </button>
          </div>
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.infoCard}>
            <h3>제품 정보</h3>
            {selectedFurniture ? (
              <>
                <div className={styles.infoItem}>
                  <span className={styles.label}>제품명:</span>
                  <span className={styles.value}>{selectedFurniture.name}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.label}>모델명:</span>
                  <span className={styles.value}>{selectedFurniture.id}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.label}>규격 (W x H x D):</span>
                  <span className={styles.value}>
                    {`${selectedFurniture.width_mm || (selectedFurniture.width || 0) * 1000}mm x ${selectedFurniture.height_mm || (selectedFurniture.height || 0) * 1000}mm x ${selectedFurniture.depth_mm || (selectedFurniture.depth || 0) * 1000}mm`}
                  </span>
                </div>
              </>
            ) : (
              <p>{productId ? '제품 정보를 불러오는 중...' : '선택된 제품이 없습니다.'}</p>
            )}
          </div>

          <div className={styles.infoCard}>
            <h3>사용 가이드</h3>
            <ol className={styles.guideList}>
              <li><strong>AR 시작:</strong> 'AR 카메라 시작' 버튼을 눌러 AR 모드를 활성화하세요.</li>
              <li><strong>공간 스캔:</strong> 화면 안내에 따라 휴대폰을 움직여 바닥을 인식시키세요.</li>
              <li><strong>제품 선택:</strong> AR 모드 진입 후 나타나는 메뉴에서 배치할 가구를 선택하세요.</li>
              <li><strong>제품 배치:</strong> 가구 미리보기가 나타나면, 원하는 위치로 이동 후 화면을 터치하여 배치하세요.</li>
              <li><strong>기타 기능:</strong> 메뉴에서 '측정 삭제' 또는 '가구 삭제'를 사용하여 배치된 객체를 관리할 수 있습니다.</li>
            </ol>
          </div>
        </aside>
      </main>
    </div>
  );
}
