import { useEffect, useRef, useState } from 'react';
import { usePanelInteraction } from '@/features/ar/hooks/usePanelInteraction';
import { FurnitureItem } from '@/lib/ar/types';
import styles from './ARUI.module.css';
import { useARStore } from '@/store/useARStore';

export default function ARUI({ lastUITouchTimeRef }: { lastUITouchTimeRef: React.RefObject<number> }) {
  const {
    isARActive,
    selectedFurniture,
    selectFurniture,
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
    async function fetchDbItems() {
      try {
        const response = await fetch('/api/ar/furniture');
        if (!response.ok) throw new Error(`HTTP 오류! 상태: ${response.status}`);
        const data = await response.json();
        console.log('Fetched furniture data:', data);
        if (Array.isArray(data)) {
          setDbItems(data);
        } else {
          console.error("API 응답이 배열이 아닙니다:", data);
          setDbItems([]);
        }
      } catch (error) {
        console.error("DB 아이템 가져오기 실패:", error);
      }
    }
    fetchDbItems();
  }, []);

  const handleSelectItem = (itemId: string) => {
    const item = dbItems.find((i) => i.id.toString() === itemId);
    selectFurniture(item || null);
    setIsDropdownOpen(false);
  };

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
                      ? `${selectedFurniture.name} (W:${selectedFurniture.width}, D:${selectedFurniture.depth}, H:${selectedFurniture.height})`
                      : '-- 아이템 선택 --'}
                  </button>
                  {isDropdownOpen && (
                    <div className={styles.dropdownMenu}>
                      <button onClick={() => handleSelectItem('')} className={styles.dropdownItem}>
                        -- 아이템 선택 --
                      </button>
                      {dbItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleSelectItem(item.id.toString())}
                          className={`${styles.dropdownItem} ${selectedFurniture?.id === item.id ? styles.dropdownItemSelected : ''}`}>
                          {item.name} (W:{item.width}, D:{item.depth}, H:{item.height})
                        </button>
                      ))}
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
