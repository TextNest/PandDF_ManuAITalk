'use client';

import React, { useRef } from 'react';
import ARScene from '@/components/ar/ARScene';
import ARUI from '@/components/ar/ARUI';
import PlacedItemsCard from '@/components/ar/PlacedItemsCard';
import styles from './ar-page.module.css';

const ARPage = () => {
  const uiOverlayRef = useRef<HTMLDivElement | null>(null);
  const lastUITouchTimeRef = useRef(0);

  return (
    <div className={styles.page}>
      {/* 씬 렌더링 */}
      <ARScene uiOverlayRef={uiOverlayRef} lastUITouchTimeRef={lastUITouchTimeRef} />

      {/* UI 오버레이 */}
      <div ref={uiOverlayRef} className={styles.arOverlayContainer}>
        <ARUI lastUITouchTimeRef={lastUITouchTimeRef} />
        <PlacedItemsCard />
      </div>
    </div>
  );
};

export default ARPage;
