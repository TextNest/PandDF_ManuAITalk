'use client';

import React, { useRef } from 'react';
import ARScene from '@/components/ar/ARScene';
import ARUI from '@/components/ar/ARUI';

const ARPage = () => {
  const uiOverlayRef = useRef<HTMLDivElement | null>(null);
  const lastUITouchTimeRef = useRef(0);

  return (
    <div>
<<<<<<< HEAD
      <ARScene uiOverlayRef={uiOverlayRef} lastUITouchTimeRef={lastUITouchTimeRef} />
=======
      <ARScene uiOverlayRef={uiOverlayRef} lastUITouchTimeRef={lastUITouchTimeRef} product={null} />
>>>>>>> main
      <div ref={uiOverlayRef}>
        <ARUI lastUITouchTimeRef={lastUITouchTimeRef} />
      </div>
    </div>
  );
};

export default ARPage;
