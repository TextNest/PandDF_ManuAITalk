'use client';

import React, { useRef } from 'react';
import ARScene from '@/components/ar/ARScene';
import ARUI from '@/components/ar/ARUI';

const ARPage = () => {
  const uiOverlayRef = useRef<HTMLDivElement | null>(null);
  const lastUITouchTimeRef = useRef(0);

  return (
    <div>
      <ARScene uiOverlayRef={uiOverlayRef} lastUITouchTimeRef={lastUITouchTimeRef} />
      <div ref={uiOverlayRef}>
        <ARUI lastUITouchTimeRef={lastUITouchTimeRef} />
      </div>
    </div>
  );
};

export default ARPage;
