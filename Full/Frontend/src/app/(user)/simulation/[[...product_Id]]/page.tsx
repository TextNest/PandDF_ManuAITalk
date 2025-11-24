'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Move3d, Camera } from 'lucide-react';
import ARUI from '@/components/ar/ARUI';
import ARScene, { ARSceneHandle } from '@/components/ar/ARScene';
import PlacedItemsCard from '@/components/ar/PlacedItemsCard';
import ARSummaryModal from '@/components/ar/ARSummaryModal'; // ARSummaryModal import
import styles from './simulation-page.module.css';
import { useARStore } from '@/store/useARStore';
import { toast } from '@/store/useToastStore';
import { Product } from '@/types/product.types';
import apiClient from '@/lib/api/client';
import { FurnitureItem } from '@/lib/ar/types';

export default function SimulationPage() {
  const params = useParams();
  const rawProductId = params.product_Id ? (params.product_Id as string[])[0] : undefined;
  const productId = rawProductId ? decodeURIComponent(rawProductId) : undefined;

  const isARActive = useARStore(state => state.isARActive);
  const setARActive = useARStore(state => state.setARActive);
  const selectedFurniture = useARStore(state => state.selectedFurniture);
  const selectFurniture = useARStore(state => state.selectFurniture);
  const endARCounter = useARStore(state => state.endARCounter); // endARCounter 추가
  const placedItems = useARStore(state => state.placedItems); // placedItems 추가
  const reset = useARStore(state => state.reset); // reset 함수 추가

  const [isSummaryModalOpen, setSummaryModalOpen] = useState(false); // 모달 상태 추가

  const arSceneRef = useRef<ARSceneHandle>(null);
  const uiOverlayRef = useRef<HTMLDivElement>(null);
  const lastUITouchTimeRef = useRef(0);

  useEffect(() => {
    if (!productId) {
      selectFurniture(null);
    }

    if (productId) {
      const fetchInitialProduct = async () => {
        try {
          console.log("Fetching product with id:", productId); // Debug code preserved
          const product = await apiClient.get<Product>(`/api/products/${productId}`);
          const mappedFurniture: FurnitureItem = {
            id: product.data.product_id ?? '',
            name: product.data.product_name || '',
            model3dUrl: product.data.model3d_url ?? undefined,
            width_mm: product.data.width_mm ?? undefined,
            height_mm: product.data.height_mm ?? undefined,
            depth_mm: product.data.depth_mm ?? undefined,
            width: product.data.width_mm ? product.data.width_mm / 1000 : 0,
            height: product.data.depth_mm ? product.data.depth_mm / 1000 : 0,
            depth: product.data.height_mm ? product.data.height_mm / 1000 : 0,
          };
          selectFurniture(mappedFurniture);
          console.log("Mapped furniture for AR:", mappedFurniture); // Debug code preserved
        } catch (err) {
          console.error("Failed to fetch initial product", err);
          selectFurniture(null);
        }
      };
      fetchInitialProduct();
    }
  }, [productId, selectFurniture]);

  const prevIsARActive = useRef(isARActive);

  useEffect(() => {
    // isARActive가 true에서 false로 변경되었을 때를 감지
    if (prevIsARActive.current && !isARActive) {
      console.log("AR session has ended. Checking placed items:", placedItems.length); // Debug code
      if (placedItems.length > 0) {
        setSummaryModalOpen(true);
      } else {
        reset();
      }
    }
    prevIsARActive.current = isARActive;
  }, [isARActive, placedItems, reset]);

  // 컴포넌트가 언마운트될 때 스토어를 리셋하는 useEffect 추가
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

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

  const handleCloseModal = () => {
    setSummaryModalOpen(false);
    reset(); // 모달 닫을 때 스토어 상태 초기화
  };

  return (
    <div className={`${styles.page} ${isARActive ? styles.arActive : ''}`}>
      <div className={styles.arSceneWrapper}>
        <ARScene ref={arSceneRef} uiOverlayRef={uiOverlayRef} lastUITouchTimeRef={lastUITouchTimeRef} />
      </div>

      <div ref={uiOverlayRef} className={styles.arOverlayContainer}>
        <ARUI lastUITouchTimeRef={lastUITouchTimeRef} />
        <PlacedItemsCard />
      </div>

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
          <div className={styles.placeholder}>
            <button
              className={styles.arButton}
              onClick={handleStartAR}
            >
              <Camera size={20} />
              <span>AR로 제품 보기</span>
            </button>

            <div className={styles.specs}>
              <h3>주요 기능</h3>
              <ul>
                <li>📱 <strong>AR 카메라:</strong> 내 방에 가상 가구를 직접 놓아볼 수 있어요.</li>
                <li>🔄 <strong>3D 가구 조작:</strong> 놓인 가구를 손가락으로 돌려보고 원하는 위치로 옮길 수 있어요.</li>
                <li>🎯 <strong>실제 크기 배치:</strong> 가구가 실제 크기대로 정확하게 보여서, 미리 놓아본 것처럼 느껴져요.</li>
                <li>📏 <strong>공간 길이 측정:</strong> AR로 내 방의 길이를 바로 재볼 수 있어요.</li>
                <li>🔗 <strong>가구 정보 확인:</strong> 가구의 크기나 3D 모델 정보를 바로 불러와서 볼 수 있어요.</li>
                <li>🖐️ <strong>움직이는 메뉴:</strong> 화면에 뜨는 메뉴를 드래그하거나 확대/축소해서 편하게 쓸 수 있어요.</li>
              </ul>
            </div>
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
                    {`${selectedFurniture.width_mm || (selectedFurniture.width || 0) * 1000}mm x ${selectedFurniture.depth_mm || (selectedFurniture.height || 0) * 1000}mm x ${selectedFurniture.height_mm || (selectedFurniture.depth || 0) * 1000}mm`}
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
      
      <ARSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={handleCloseModal}
        items={placedItems}
      />
    </div>
  );
}
