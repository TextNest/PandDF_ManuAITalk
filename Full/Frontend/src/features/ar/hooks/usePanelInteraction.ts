// /hooks/usePanelInteraction.ts
// UI 패널(메뉴)의 드래그 이동 및 핀치 줌 확대/축소를 관리하는 커스텀 훅입니다.

import { useState, useEffect, useRef } from 'react';
import React from 'react';

/**
 * UI 패널(메뉴)의 드래그 이동 및 핀치 줌 확대/축소를 관리하는 커스텀 훅.
 * @param lastUITouchTimeRef - AR 객체와의 상호작용과 UI 터치를 구분하기 위한 마지막 터치 시간 ref.
 */
export function usePanelInteraction(lastUITouchTimeRef: React.RefObject<number>) {
    const panelRef = useRef<HTMLDivElement>(null); // 상호작용할 패널 div에 대한 ref
    const [isInteracting, setIsInteracting] = useState(false); // 사용자가 패널과 상호작용(드래그 또는 핀치) 중인지 여부
    const [panelPosition, setPanelPosition] = useState({ top: 20, left: 20 }); // 패널의 위치 (CSS top, left 값)
    const [panelScale, setPanelScale] = useState(1); // 패널의 확대/축소 배율 (CSS scale 값)

    const dragStartRef = useRef({ startX: 0, startY: 0, panelX: 0, panelY: 0 }); // 드래그 시작 시의 정보 (터치 시작 좌표, 패널 초기 위치)
    const pinchStartDistanceRef = useRef(0); // 핀치 줌 시작 시 두 손가락 사이의 거리
    const pinchStartScaleRef = useRef(1); // 핀치 줌 시작 시의 패널 배율

    useEffect(() => {
        // 상호작용 중일 때 마우스/터치 이동 및 종료 이벤트를 window에 등록
        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!isInteracting) return;

            const event = 'touches' in e ? e : e;
            const touches = 'touches' in event ? (event as TouchEvent).touches : [];

            // 핀치 줌 (두 손가락 터치)
            if (touches.length === 2) {
                const panel = panelRef.current;
                if (!panel) return;

                // 두 손가락 사이의 현재 거리를 계산
                const dx = touches[0].clientX - touches[1].clientX;
                const dy = touches[0].clientY - touches[1].clientY;
                const currentDistance = Math.sqrt(dx * dx + dy * dy);

                if (pinchStartDistanceRef.current > 0) {
                    // 시작 거리 대비 현재 거리의 비율을 기반으로 새로운 배율 계산
                    const rawScale = pinchStartScaleRef.current * (currentDistance / pinchStartDistanceRef.current);
                    
                    // 패널이 화면을 벗어나지 않도록 최대 배율을 계산
                    const maxScaleX = window.innerWidth / panel.offsetWidth;
                    const maxScaleY = window.innerHeight / panel.offsetHeight;
                    const maxScale = Math.min(maxScaleX, maxScaleY);

                    // 최소/최대 배율(0.5배 ~ maxScale)을 적용하여 최종 배율 결정
                    const newScale = Math.min(Math.max(0.5, rawScale), maxScale);
                    
                    setPanelScale(newScale);
                }
            } else if (touches.length === 1 || !('touches' in e)) {
                // 드래그 (한 손가락 터치 또는 마우스)
                e.preventDefault(); // 페이지 스크롤 등 기본 동작 방지
                const clientX = 'touches' in event ? (event as TouchEvent).touches[0].clientX : (event as MouseEvent).clientX;
                const clientY = 'touches' in event ? (event as TouchEvent).touches[0].clientY : (event as MouseEvent).clientY;
                const dx = clientX - dragStartRef.current.startX; // 시작점으로부터의 X 이동량
                const dy = clientY - dragStartRef.current.startY; // 시작점으로부터의 Y 이동량
                
                const panel = panelRef.current;
                if (!panel) return;

                const newLeft = dragStartRef.current.panelX + dx;
                const newTop = dragStartRef.current.panelY + dy;

                // 패널의 현재 시각적 크기 (배율 적용)
                const panelWidth = panel.offsetWidth * panelScale;
                const panelHeight = panel.offsetHeight * panelScale;

                // 패널이 창 경계를 벗어나지 않도록 위치를 제한
                const constrainedLeft = Math.max(0, Math.min(newLeft, window.innerWidth - panelWidth));
                const constrainedTop = Math.max(0, Math.min(newTop, window.innerHeight - panelHeight));

                setPanelPosition({
                  top: constrainedTop,
                  left: constrainedLeft,
                });
            }
        };

        // 상호작용 종료 핸들러
        const handleEnd = () => {
            setIsInteracting(false);
        };

        if (isInteracting) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('touchmove', handleMove, { passive: false });
            window.addEventListener('mouseup', handleEnd);
            window.addEventListener('touchend', handleEnd);
        }

        // 클린업 함수: 이벤트 리스너 제거
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [isInteracting, panelScale]);

    // 패널 헤더에서 마우스/터치 다운 시 상호작용 시작
    const handleInteractionStart = (e: React.MouseEvent | React.TouchEvent) => {
        lastUITouchTimeRef.current = Date.now(); // UI 터치 시간 기록
        const target = e.target as HTMLElement;
        // 패널 내의 input, button 등 다른 UI 요소와 상호작용할 때는 패널 이동/확대 로직을 실행하지 않음
        if (target.tagName === 'INPUT' || (target.tagName === 'BUTTON' && !target.closest('.panel-header-button'))) {
            return;
        }
        e.preventDefault();

        const event = 'touches' in e ? e.nativeEvent : e;
        const touches = 'touches' in event ? (event as TouchEvent).touches : [];

        // 드래그 또는 핀치 줌 시작 정보 기록
        dragStartRef.current = {
            startX: ('touches' in event ? touches[0]?.clientX : (event as MouseEvent).clientX) || 0,
            startY: ('touches' in event ? touches[0]?.clientY : (event as MouseEvent).clientY) || 0,
            panelX: panelPosition.left,
            panelY: panelPosition.top,
        };
        
        if (touches.length === 2) {
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            pinchStartDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
            pinchStartScaleRef.current = panelScale;
        }
        
        setIsInteracting(true);
    };

    // 외부(Home 컴포넌트)에서 사용할 값들을 반환
    return {
        panelRef,
        panelStyle: { // 패널에 적용할 동적 CSS 스타일
            position: 'absolute',
            top: panelPosition.top,
            left: panelPosition.left,
            transform: `scale(${panelScale})`,
            transformOrigin: 'top left',
            cursor: isInteracting ? 'grabbing' : 'grab',
        } as React.CSSProperties,
        isInteracting,
        handleInteractionStart,
    };
}
