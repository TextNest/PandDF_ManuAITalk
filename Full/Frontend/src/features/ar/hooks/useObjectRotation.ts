// /hooks/useObjectRotation.ts
// 3D 객체의 터치 드래그 기반 회전을 관리하는 커스텀 훅입니다.

import { useEffect, useRef } from 'react';
import { Object3D } from 'three';

/**
 * 3D 객체의 터치 기반 회전을 관리하는 커스텀 훅.
 * @param objectRef - 회전시킬 Three.js 객체(주로 미리보기 가구)의 ref.
 * @param isEnabled - 이 훅의 회전 로직을 활성화할지 여부.
 */
export function useObjectRotation(
  objectRef: React.RefObject<Object3D | null>,
  isEnabled: boolean
) {
  const isRotatingRef = useRef(false); // 현재 사용자가 터치하여 회전 중인지 여부를 저장
  const didDragRef = useRef(false); // 탭(tap)과 드래그(drag)를 구분하기 위해, 드래그 동작이 있었는지 여부를 저장
  const touchStartXRef = useRef(0); // 터치 시작 지점의 화면 X 좌표
  const startRotationRef = useRef({ y: 0 }); // 회전 시작 시의 객체의 초기 Y축 회전 값

  useEffect(() => {
    // 터치 시작 이벤트 핸들러
    const handleRotationStart = (e: TouchEvent) => {
      // 한 손가락 터치가 아니거나, 회전시킬 객체가 없으면 무시
      if (e.touches.length !== 1 || !objectRef.current) return;

      // 터치된 대상이 UI 요소(버튼 등)이면 AR 객체 회전을 막음
      const target = e.target as HTMLElement;
      if (target.closest('[style*="pointer-events: auto"]')) {
        return;
      }
      
      isRotatingRef.current = true;
      didDragRef.current = false; // 드래그 상태를 false로 초기화
      touchStartXRef.current = e.touches[0].clientX;
      startRotationRef.current = { y: objectRef.current.rotation.y };
    };

    // 터치 이동 이벤트 핸들러
    const handleRotationMove = (e: TouchEvent) => {
      if (!isRotatingRef.current || e.touches.length !== 1 || !objectRef.current) return;

      const deltaX = e.touches[0].clientX - touchStartXRef.current;

      // 수평 이동 거리가 매우 작으면(5px 미만) 드래그로 간주하지 않음.
      // 이는 사용자가 회전 대신 탭(가구 배치)을 의도했을 수 있기 때문입니다.
      if (Math.abs(deltaX) < 5) {
        return;
      }

      didDragRef.current = true; // 드래그가 발생했음을 기록

      // 수평 이동 거리를 객체의 Y축 회전 값으로 변환합니다.
      // 화면 너비만큼 드래그했을 때 180도(PI 라디안) 회전하도록 설정합니다.
      const rotationY = startRotationRef.current.y + (deltaX / window.innerWidth) * Math.PI;

      objectRef.current.rotation.y = rotationY;
    };

    // 터치 종료 이벤트 핸들러
    const handleRotationEnd = () => {
      isRotatingRef.current = false;
    };

    // 훅이 활성화된 경우에만 이벤트 리스너를 등록합니다.
    if (isEnabled) {
      window.addEventListener('touchstart', handleRotationStart);
      window.addEventListener('touchmove', handleRotationMove);
      window.addEventListener('touchend', handleRotationEnd);
    }

    // 클린업 함수: 컴포넌트가 언마운트되거나 isEnabled가 false가 되면 이벤트 리스너를 제거합니다.
    return () => {
      window.removeEventListener('touchstart', handleRotationStart);
      window.removeEventListener('touchmove', handleRotationMove);
      window.removeEventListener('touchend', handleRotationEnd);
    };
  }, [isEnabled, objectRef]);

  // ARScene에서 탭과 드래그를 구분하기 위해 드래그 발생 여부를 외부로 노출합니다.
  return { didDragRef };
}
