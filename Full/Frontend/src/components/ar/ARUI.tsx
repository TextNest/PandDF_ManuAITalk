import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePanelInteraction } from '@/features/ar/hooks/usePanelInteraction';
import { FurnitureItem } from '@/lib/ar/types';
import styles from './ARUI.module.css';
import { useARStore } from '@/store/useARStore';
import apiClient from '@/lib/api/client';
import { Product } from '@/types/product.types';
import { DEFAULT_3D_MODEL_URL } from '@/lib/ar/constants'; // DEFAULT_3D_MODEL_URL import

// Moved outside the component to avoid stale closures
const handleSelectItemExternal = (
  identifier: string,
  selectFurniture: (furniture: FurnitureItem | null) => void,
  setIsPlacing: (isPlacing: boolean) => void,
  dbItems: FurnitureItem[],
  setIsDropdownOpen: (isOpen: boolean) => void,
  setDebugMessage: (message: string) => void, // Added for debugging
) => {
  if (!identifier) {
    selectFurniture(null);
    setIsPlacing(false); // Exit placement mode
    setDebugMessage('가구 선택 해제됨.');
    setIsDropdownOpen(false);
    return;
  }

  const item = dbItems.find((i) => i.id?.toString() === identifier || i.name === identifier);
  if (item) {
    selectFurniture(item);
    setIsPlacing(true); // Enter placement mode
    setDebugMessage(`${item.name || '알 수 없는 제품'} 선택됨. 배치를 위해 화면을 터치하세요.`);
  } else {
    setDebugMessage('선택된 아이템을 찾을 수 없습니다.');
  }
  setIsDropdownOpen(false);
};

export default function ARUI({
  lastUITouchTimeRef,
  productId,
}: {
  lastUITouchTimeRef: React.MutableRefObject<number>;
  productId?: string;
}) {
  const {
    isARActive,
    selectedFurniture,
    selectFurniture,
    setIsPlacing,
    triggerClearFurniture,
    triggerClearMeasurement,
    triggerEndAR,
    debugMessage,
    arStatus,
    setDebugMessage,
    hasInitialScanCompleted,
  } = useARStore();

  const { panelRef, panelStyle, handleInteractionStart } = usePanelInteraction(lastUITouchTimeRef);
  const [dbItems, setDbItems] = useState<FurnitureItem[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  const mapProductToFurnitureItem = (p: Product): FurnitureItem => ({
    id: p.product_id || '',
    name: p.product_name || '',
    model3dUrl: p.model3d_url || undefined,
    width_mm: p.width_mm || 0,
    height_mm: p.height_mm || 0,
    depth_mm: p.depth_mm || 0,
    width: (p.width_mm || 0) / 1000,
    height: (p.height_mm || 0) / 1000,
    depth: (p.depth_mm || 0) / 1000,
    status: p.status,
  });

  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    async function fetchAllItems() {
      setDebugMessage('가구 정보 로딩 중...');
      try {
        const response = await apiClient.get<Product[]>('/api/products', { signal });
        const mappedItems = response.data
          .filter(p => p.model3d_url && p.status === 'completed')
          .map(mapProductToFurnitureItem);
        setDbItems(mappedItems);
        setDebugMessage('가구 목록 로딩 완료. 배치할 가구를 선택하세요.');
      } catch (error: any) {
        // AbortError나 CanceledError는 요청 취소 시 정상적으로 발생할 수 있으므로 오류로 처리하지 않음
        if (error.name !== 'AbortError' && error.name !== 'CanceledError') {
          console.error("가구 정보를 불러오는 데 실패했습니다:", error);
          setDebugMessage(`오류: ${error.message}`);
        }
      }
    }

    // productId가 존재하면, 해당 제품이 selectedFurniture에 설정될 때까지 기다립니다.
    // selectedFurniture가 이미 설정되어 있다면, 해당 제품만 AR에 표시합니다.
    if (productId && !selectedFurniture) {
      // 특정 제품을 로딩 중이므로, 추가적인 전체 아이템 fetch를 하지 않고 기다립니다.
      setDebugMessage('제품 정보 로딩 중...');
      return; 
    }

    if (selectedFurniture) {
      const itemWithDefaultModel = {
        ...selectedFurniture,
        model3dUrl: selectedFurniture.model3dUrl || DEFAULT_3D_MODEL_URL,
      };
      setDbItems([itemWithDefaultModel]);
      // 무한 루프 방지: model3dUrl이 실제로 변경되었을 때만 스토어를 업데이트합니다.
      if (selectedFurniture.model3dUrl !== itemWithDefaultModel.model3dUrl) {
        selectFurniture(itemWithDefaultModel); // 스토어에도 기본 모델 URL 업데이트
      }
      setIsPlacing(true);
      let debugMsg = `${selectedFurniture.name}이(가) 선택되었습니다. 표면을 스캔하고 배치하세요.`;
      if (!selectedFurniture.model3dUrl) {
        debugMsg = `${selectedFurniture.name}의 3D 모델이 없어 기본 모델로 대체되었습니다.`;
      }
      setDebugMessage(debugMsg);
    } else {
      // productId가 없거나, selectedFurniture가 null일 경우 전체 목록을 불러옴
      fetchAllItems();
    }

    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFurniture, productId]);

  const handleClearFurniture = () => {
    triggerClearFurniture();
  };

  const handleClearMeasurement = () => {
    triggerClearMeasurement();
  };

  const handleEndAR = () => {
    triggerEndAR();
  };

  return (
    <div className={styles.uiOverlay}>
      {isARActive && arStatus === 'SCANNING' && !hasInitialScanCompleted && (
        <div className={`${styles.centerContainer} ${styles.scanMessage}`}>
          <span>표면을 찾기 위해 휴대폰을 움직여주세요...</span>
        </div>
      )}
      {isARActive && (
        <div
          ref={panelRef}
          onMouseDown={handleInteractionStart}
          onTouchStart={handleInteractionStart}
          style={panelStyle}
          className={styles.panel}
        >
          <div className={`${styles.panelHeader} ${isPanelCollapsed ? styles.panelHeaderCollapsed : ''}`}>
            <div className={styles.panelTitle}>메뉴</div>
            <button onClick={() => setIsPanelCollapsed(!isPanelCollapsed)} className={styles.headerButton}>
              {isPanelCollapsed ? '▼' : '▲'}
            </button>
          </div>
          {!isPanelCollapsed && (
            <>
              <h2 className={styles.sectionTitle}>가구 배치(m)</h2>
              <div className={styles.section}>
                <h3 className={styles.subSectionTitle}>DB 아이템 선택 ({dbItems.length}개)</h3>
                <div className={styles.dropdownContainer}>
                  <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className={styles.dropdownButton} disabled={arStatus === 'SCANNING' || (!!selectedFurniture && dbItems.length === 1)}>
                    {selectedFurniture
                      ? `${selectedFurniture.name || '알 수 없는 제품'} (W:${selectedFurniture.width || 0}, D:${selectedFurniture.depth || 0}, H:${selectedFurniture.height || 0})`
                      : '-- 아이템 선택 --'}
                  </button>
                  {isDropdownOpen && (
                    <div className={styles.dropdownMenu}>
                      <button onClick={() => handleSelectItemExternal('', selectFurniture, setIsPlacing, dbItems, setIsDropdownOpen, setDebugMessage)} className={styles.dropdownItem}>
                        -- 아이템 선택 --
                      </button>
                      {dbItems.map((item, index) => {
                        const identifier = item.id?.toString() || item.name;
                        return (
                          <button
                            key={item.id || item.name || index}
                            onClick={() => identifier && handleSelectItemExternal(identifier, selectFurniture, setIsPlacing, dbItems, setIsDropdownOpen, setDebugMessage)}
                            className={`${styles.dropdownItem} ${selectedFurniture?.id === item.id ? styles.dropdownItemSelected : ''}`}>
                            {item.name || '알 수 없는 제품'} (W:{item.width || 0}, D:{item.depth || 0}, H:{item.height || 0})
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.buttonGrid}>
                <button onClick={handleClearFurniture} className={`${styles.button} ${styles.buttonSecondary}`} disabled={arStatus === 'SCANNING'}>
                  가구 삭제
                </button>
                <button onClick={handleClearMeasurement} className={`${styles.button} ${styles.buttonSecondary}`} disabled={arStatus === 'SCANNING'}>
                  측정 삭제
                </button>
              </div>
              <button onClick={handleEndAR} className={`${styles.button} ${styles.buttonDanger}`}>
                AR 종료
              </button>
              {debugMessage && <p className={styles.debugMessage}>{debugMessage}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
