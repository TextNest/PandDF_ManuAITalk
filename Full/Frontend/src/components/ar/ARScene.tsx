// /components/ARScene.tsx
// WebXR을 사용하여 AR 렌더링과 상호작용을 처리하는 핵심 컴포넌트입니다.
// Three.js를 직접 제어하고, 각종 커스텀 훅을 사용하여 기능별 로직을 통합합니다.

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Scene, PerspectiveCamera, WebGLRenderer, HemisphereLight, Mesh, RingGeometry, MeshBasicMaterial, Vector3 } from 'three';
import { useObjectRotation } from '@/features/ar/hooks/useObjectRotation';
import { useMeasurement } from '@/features/ar/hooks/useMeasurement';
import { useFurniturePlacement } from '@/features/ar/hooks/useFurniturePlacement';
import styles from './ARScene.module.css';
import { COLORS } from '@/lib/ar/constants';
import { useARStore } from '@/store/useARStore';
import { Product } from '@/types/product.types';
import { FurnitureItem } from '@/lib/ar/types'; // Import FurnitureItem

interface ARSceneProps {
  uiOverlayRef: React.RefObject<HTMLDivElement | null>;
  lastUITouchTimeRef: React.RefObject<number>;
}

export interface ARSceneHandle {
  startAR: () => void;
}

const ARScene = forwardRef<ARSceneHandle, ARSceneProps>(({ uiOverlayRef, lastUITouchTimeRef }, ref) => {
  // --- Zustand Store ---
  const {
    isARActive,
    setARActive,
    selectedFurniture,
    addPlacedItem,
    clearFurnitureCounter,
    clearMeasurementCounter,
    endARCounter,
    isPreviewing,
    selectFurniture,
    setDebugMessage,
    arStatus,
    setARStatus,
    isPlacing,
    setIsPlacing,
    previewTriggerCounter,
  } = useARStore();

  // --- Refs & State ---
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef<XRSession | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const hitTestSourceRef = useRef<XRHitTestSource | null>(null);
  const xrRefSpaceRef = useRef<XRReferenceSpace | null>(null);

  // --- Custom Hooks ---
  const measurement = useMeasurement(sceneRef);
  const furniture = useFurniturePlacement(
    sceneRef, 
    selectFurniture, 
    isARActive, 
    setDebugMessage, 
    setIsPlacing,
    selectedFurniture,
    addPlacedItem
  );
  const { didDragRef } = useObjectRotation(furniture.previewBoxRef, isPreviewing, lastUITouchTimeRef);

  const placeFurnitureRef = useRef(furniture.placeFurniture);
  useEffect(() => {
    placeFurnitureRef.current = furniture.placeFurniture;
  }, [furniture.placeFurniture]);

  useEffect(() => {
    if (isARActive && selectedFurniture) {
      furniture.createPreviewBox(selectedFurniture);
    } else {
      furniture.clearPreviewBox();
    }
  }, [isARActive, selectedFurniture, previewTriggerCounter, furniture.createPreviewBox, furniture.clearPreviewBox]);

  useEffect(() => {
    if (clearFurnitureCounter > 0) {
      furniture.clearPlacedBoxes();
    }
  }, [clearFurnitureCounter, furniture]);

  useEffect(() => {
    if (clearMeasurementCounter > 0) {
      measurement.clearPoints();
    }
  }, [clearMeasurementCounter, measurement]);

  const cleanupAR = useCallback(() => {
    setDebugMessage('AR 세션 종료됨. 리소스 정리 중...');

    if (rendererRef.current) {
      rendererRef.current.setAnimationLoop(null);
    }
    
    try {
        measurement.clearPoints();
        furniture.clearPlacedBoxes();
    } catch (error) {
        console.error("씬 정리 중 오류:", error);
    }

    if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
            if (object instanceof Mesh) {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    const materials = Array.isArray(object.material) ? object.material : [object.material];
                    materials.forEach(material => material.dispose());
                }
            }
        });
    }

    useARStore.getState().reset();
    
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current = null;
    }

    hitTestSourceRef.current = null;
    xrRefSpaceRef.current = null;
    sceneRef.current = null;
    sessionRef.current = null;
    
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    setDebugMessage('AR이 완전히 종료되었습니다.');
  }, [measurement, furniture, setDebugMessage]);

  const handleEndAR = useCallback(() => {
    setDebugMessage('AR 종료 요청 중...');
    const session = sessionRef.current;
    
    if (session?.end) {
        session.end().catch((error) => {
            console.error("session.end() promise가 거부되었습니다:", error);
            cleanupAR();
        });
    } else {
        cleanupAR();
    }
  }, [cleanupAR]);

  useEffect(() => {
    if (endARCounter > 0) {
      handleEndAR();
    }
  }, [endARCounter, handleEndAR]);

  const startAR = useCallback(async () => {
    useARStore.getState().reset();
    setDebugMessage(null);

    try {
      const session = await (navigator as any).xr.requestSession('immersive-ar', {
        optionalFeatures: ['hit-test', 'local-floor', 'dom-overlay'],
        domOverlay: { root: uiOverlayRef.current! },
      });

      sessionRef.current = session;

      setARActive(true);
      setARStatus('SCANNING');

      const scene = new Scene();
      sceneRef.current = scene;
      const camera = new PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
      const renderer = new WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.xr.enabled = true;

      renderer.xr.addEventListener('sessionend', cleanupAR);

      const light = new HemisphereLight(0xffffff, 0xbbbbff, 1);
      scene.add(light);

      const reticle = new Mesh(
        new RingGeometry(0.06, 0.08, 32),
        new MeshBasicMaterial({ color: COLORS.RETICLE })
      );
      reticle.rotation.x = -Math.PI / 2;
      reticle.visible = false;
      scene.add(reticle);

      const container = containerRef.current!;
      container.innerHTML = '';
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;
      await renderer.xr.setSession(session);

      xrRefSpaceRef.current = await session.requestReferenceSpace('local-floor');

      try {
        const viewerSpace = await session.requestReferenceSpace('viewer');
        hitTestSourceRef.current = await (session as any).requestHitTestSource({ space: viewerSpace });
      } catch (e) {
        console.error("히트 테스트 소스 생성 실패:", e);
        alert('히트 테스트를 시작할 수 없습니다.');
      }

      const onSelect = () => {
        const now = Date.now();
        if (lastUITouchTimeRef.current && now - lastUITouchTimeRef.current < 100) return;
        
        const wasDragging = didDragRef.current;
        didDragRef.current = false;
        if (wasDragging) return;

        if (useARStore.getState().isPlacing) {
          if (reticle.visible) {
            placeFurnitureRef.current();
          }
          return;
        }

        if (reticle.visible) {
          measurement.handleMeasurementSelect(reticle.position);
          return;
        }
      };

      session.addEventListener('select', onSelect);

      const onXRFrame = (_time: number, frame: XRFrame) => {
        if (!frame || !xrRefSpaceRef.current) return;
        const pose = frame.getViewerPose(xrRefSpaceRef.current);
        if (!pose) return;

        const { arStatus, setARStatus, setDebugMessage, hasInitialScanCompleted, setHasInitialScanCompleted } = useARStore.getState();

        if (hitTestSourceRef.current) {
          const hitTestResults = frame.getHitTestResults(hitTestSourceRef.current);
          if (hitTestResults.length > 0) {
            if (arStatus === 'SCANNING') {
              setARStatus('SURFACE_DETECTED');
              setDebugMessage('표면 감지됨. 가구를 선택하고 배치하세요.');
              if (!hasInitialScanCompleted) {
                setHasInitialScanCompleted(true);
              }
            }

            const hit = hitTestResults[0];
            const hitPose = hit.getPose(xrRefSpaceRef.current);
            if(hitPose) {
              reticle.visible = true;
              reticle.position.set(hitPose.transform.position.x, hitPose.transform.position.y, hitPose.transform.position.z);
            }
          } else {
            reticle.visible = false;
            if (arStatus === 'SURFACE_DETECTED') {
              setDebugMessage('표면을 놓쳤습니다. 다시 스캔하세요.');
              setARStatus('SCANNING');
            }
          }
        } else {
          if (arStatus === 'SCANNING') {
            setDebugMessage('히트 테스트 소스를 기다리는 중...');
          }
        }
        
        measurement.update(camera);
        furniture.update(reticle.position);

        renderer.render(scene, camera);
      };
      renderer.setAnimationLoop(onXRFrame);
    } catch (err) {
      console.error('AR 세션 시작 중 오류 발생:', err);
      alert('AR 세션을 시작하지 못했습니다: ' + (err as Error).message);
    }
  }, [cleanupAR, setARActive, setARStatus, uiOverlayRef, lastUITouchTimeRef, didDragRef, furniture, measurement]);

  useImperativeHandle(ref, () => ({
    startAR,
  }));

  return (
    <>
      <div 
        ref={containerRef} 
        className={`${styles.arContainer} ${isARActive ? styles.arContainerActive : styles.arContainerInactive}`}
      />
    </>
  );
});

ARScene.displayName = 'ARScene';

export default ARScene;
