// /hooks/useObjectRotation.ts
// 3D 객체의 터치 드래그 기반 회전을 관리하는 커스텀 훅입니다.

import { useEffect, useRef } from 'react';
import { Object3D } from 'three';

/**
 * 3D 객체의 터치 기반 회전을 관리하는 커스텀 훅.
 * @param objectRef - 회전시킬 Three.js 객체(주로 미리보기 가구)의 ref.
 * @param isEnabled - 이 훅의 회전 로직을 활성화할지 여부.
 * @param lastUITouchTimeRef - 마지막으로 UI를 터치한 시간의 타임스탬프를 저장하는 ref.
 */
export function useObjectRotation(
  objectRef: React.RefObject<Object3D | null>,
  isEnabled: boolean,
  lastUITouchTimeRef: React.RefObject<number>
) {
  const isRotatingRef = useRef(false);
  const didDragRef = useRef(false);
  const touchStartXRef = useRef(0);
  const startRotationRef = useRef({ y: 0 });

  useEffect(() => {
    const handleRotationStart = (e: TouchEvent) => {
      // UI 터치와 거의 동시에 발생한 이벤트는 무시
      const now = Date.now();
      if (lastUITouchTimeRef.current && now - lastUITouchTimeRef.current < 100) {
        return;
      }
      
      if (e.touches.length !== 1 || !objectRef.current) return;

      isRotatingRef.current = true;
      didDragRef.current = false;
      touchStartXRef.current = e.touches[0].clientX;
      startRotationRef.current = { y: objectRef.current.rotation.y };
    };

    const handleRotationMove = (e: TouchEvent) => {
      if (!isRotatingRef.current || e.touches.length !== 1 || !objectRef.current) return;

      const deltaX = e.touches[0].clientX - touchStartXRef.current;

      if (Math.abs(deltaX) < 5) {
        return;
      }

      didDragRef.current = true;

      const rotationY = startRotationRef.current.y + (deltaX / window.innerWidth) * Math.PI;
      objectRef.current.rotation.y = rotationY;
    };

    const handleRotationEnd = () => {
      isRotatingRef.current = false;
    };

    if (isEnabled) {
      window.addEventListener('touchstart', handleRotationStart);
      window.addEventListener('touchmove', handleRotationMove);
      window.addEventListener('touchend', handleRotationEnd);
    }

    return () => {
      window.removeEventListener('touchstart', handleRotationStart);
      window.removeEventListener('touchmove', handleRotationMove);
      window.removeEventListener('touchend', handleRotationEnd);
    };
  }, [isEnabled, objectRef, lastUITouchTimeRef]);

  return { didDragRef };
}