import { useEffect, useState } from 'react';
import { usePanelInteraction } from '@/features/ar/hooks/usePanelInteraction';
import { FurnitureItem } from '@/lib/ar/types';
import styles from './ARUI.module.css';
import { useARStore } from '@/store/useARStore';

// Moved outside the component to avoid stale closures
const handleSelectItemExternal = (
  identifier: string,
  selectFurniture: (furniture: FurnitureItem | null) => void,
  setIsPlacing: (isPlacing: boolean) => void,
  dbItems: FurnitureItem[],
  setIsDropdownOpen: (isOpen: boolean) => void
) => {
  if (!identifier) {
    selectFurniture(null);
    setIsPlacing(false); // Exit placement mode
    setIsDropdownOpen(false);
    return;
  }

  const item = dbItems.find((i) => i.id?.toString() === identifier || i.name === identifier);
  selectFurniture(item || null);
  setIsPlacing(true); // Enter placement mode
  setIsDropdownOpen(false);
};

export default function ARUI({ lastUITouchTimeRef }: { lastUITouchTimeRef: React.MutableRefObject<number> }) {
  const {
    isARActive,
    selectedFurniture,
    selectFurniture,
    setIsPlacing, // Get setIsPlacing from the store
    triggerClearFurniture,
    triggerClearMeasurement,
    triggerEndAR,
    debugMessage,
    isScanning,
  } = useARStore();

  const { panelRef, panelStyle, handleInteractionStart } = usePanelInteraction(lastUITouchTimeRef);
  const [dbItems, setDbItems] = useState<FurnitureItem[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    async function fetchDbItems() {
      try {
        const response = await fetch('/api/ar/furniture', { signal });
        if (!response.ok) throw new Error(`HTTP 오류! 상태: ${response.status}`);
        const data = await response.json();
        console.log('Fetched furniture data:', data);
        if (Array.isArray(data)) {
          setDbItems(data);
        } else {
          console.error("API 응답이 배열이 아닙니다:", data);
          setDbItems([]);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted');
        }
        else {
          console.error("DB 아이템 가져오기 실패:", error);
        }
      }
    }
    fetchDbItems();

    return () => {
      abortController.abort();
    };
  }, []);

  // handleSelectItem is now external, so it's not defined here
  // const handleSelectItem = (itemId: string) => { ... };

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
                  <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className={styles.dropdownButton} disabled={isScanning}>
                    {selectedFurniture
                      ? `${selectedFurniture.name || '알 수 없는 제품'} (W:${selectedFurniture.width || 0}, D:${selectedFurniture.depth || 0}, H:${selectedFurniture.height || 0})`
                      : '-- 아이템 선택 --'}
                  </button>
                  {isDropdownOpen && (
                    <div className={styles.dropdownMenu}>
                      <button onClick={() => handleSelectItemExternal('', selectFurniture, setIsPlacing, dbItems, setIsDropdownOpen)} className={styles.dropdownItem}>
                        -- 아이템 선택 --
                      </button>
                      {dbItems.map((item, index) => {
                        const identifier = item.id?.toString() || item.name; // Use id or name as identifier
                        return (
                          <button
                            key={item.id || item.name || index} // Prioritize id, then name, then index for key
                            onClick={() => identifier && handleSelectItemExternal(identifier, selectFurniture, setIsPlacing, dbItems, setIsDropdownOpen)}
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
                <button onClick={handleClearFurniture} className={`${styles.button} ${styles.buttonSecondary}`} disabled={isScanning}>
                  가구 삭제
                </button>
                <button onClick={handleClearMeasurement} className={`${styles.button} ${styles.buttonSecondary}`} disabled={isScanning}>
                  측정 삭제
                </button>
              </div>
              <button onClick={handleEndAR} className={`${styles.button} ${styles.buttonDanger}`}>
                AR 종료
              </button>
              {debugMessage && <p>{debugMessage}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
