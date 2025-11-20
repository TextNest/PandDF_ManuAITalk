import { useEffect, useState } from 'react';
import { usePanelInteraction } from '@/features/ar/hooks/usePanelInteraction';
import { FurnitureItem } from '@/lib/ar/types';
import styles from './ARUI.module.css';
import { useARStore } from '@/store/useARStore';
import apiClient from '@/lib/api/client';
import { Product } from '@/types/product.types';

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

export default function ARUI({ lastUITouchTimeRef }: { lastUITouchTimeRef: React.MutableRefObject<number> }) {
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
    setDebugMessage, // Get setDebugMessage from the store
    hasInitialScanCompleted, // Get the new state
  } = useARStore();

  const { panelRef, panelStyle, handleInteractionStart } = usePanelInteraction(lastUITouchTimeRef);
  const [dbItems, setDbItems] = useState<FurnitureItem[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    async function fetchDbItems() {
      setDebugMessage('가구 목록 로딩 중...');
      try {
        const response = await apiClient.get<Product[]>('/api/products', { signal });
        const mappedItems: FurnitureItem[] = response.data
          .map(p => ({
            id: p.product_id || '',
            name: p.product_name || '',
            model3dUrl: p.model3d_url || undefined,
            width_mm: p.width_mm || 0,
            height_mm: p.height_mm || 0,
            depth_mm: p.depth_mm || 0,
            width: (p.width_mm || 0) / 1000,
            height: (p.depth_mm || 0) / 1000, // 높이는 depth_mm
            depth: (p.height_mm || 0) / 1000,  // 깊이는 height_mm
          }));
        setDbItems(mappedItems);
        setDebugMessage('가구 목록 로딩 완료.');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error("가구 목록을 불러오는 데 실패했습니다:", error);
          setDebugMessage("제품 목록을 가져올 수 없습니다.");
        }
      }
    }

    fetchDbItems();

    return () => {
      abortController.abort();
    };
  }, [setDebugMessage]);

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
                  <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className={styles.dropdownButton} disabled={arStatus === 'SCANNING'}>
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
                        const identifier = item.id?.toString() || item.name; // Use id or name as identifier
                        return (
                          <button
                            key={item.id || item.name || index} // Prioritize id, then name, then index for key
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
