// /hooks/useMeasurement.ts
// AR 환경에서 두 지점 사이의 거리를 측정하는 로직을 관리하는 커스텀 훅입니다.

import { useRef, useCallback, useMemo } from 'react';
import { Scene, Vector3, Mesh, Sprite, Line, SphereGeometry, MeshStandardMaterial, Material, BufferGeometry, LineBasicMaterial, Camera } from 'three';
import { makeTextSprite } from '@/lib/ar/utils';
import { COLORS } from '@/lib/ar/constants';
import { useARStore } from '@/store/useARStore';

/**
 * AR 환경에서 두 지점 사이의 거리를 측정하는 로직을 관리하는 커스텀 훅.
 * @param sceneRef - 3D 객체들을 추가하거나 제거할 Scene의 ref.
 */
export function useMeasurement(sceneRef: React.RefObject<Scene | null>) {
    // Zustand store에서 setDistance 액션을 가져옵니다.
    const setDistance = useARStore((state) => state.setDistance);

    const pointsRef = useRef<Vector3[]>([]);
    const pointMeshesRef = useRef<Mesh[]>([]);
    const distanceSpriteRef = useRef<Sprite | null>(null);
    const lineRef = useRef<Line | null>(null);

    const pointGeometry = useRef(new SphereGeometry(0.03, 16, 16)).current;
    const pointMaterial = useRef(new MeshStandardMaterial({ color: COLORS.MEASUREMENT_POINT })).current;

    const clearPoints = useCallback(() => {
        const scene = sceneRef.current;
        if (!scene) return;

        pointMeshesRef.current.forEach(p => {
            scene.remove(p);
            p.geometry.dispose();
            (p.material as Material).dispose();
        });
        pointMeshesRef.current = [];
        pointsRef.current = [];

        if (distanceSpriteRef.current) {
            scene.remove(distanceSpriteRef.current);
            distanceSpriteRef.current.material.map?.dispose();
            distanceSpriteRef.current.material.dispose();
            distanceSpriteRef.current = null;
        }
        if (lineRef.current) {
            scene.remove(lineRef.current);
            lineRef.current.geometry.dispose();
            (lineRef.current.material as Material).dispose();
            lineRef.current = null;
        }
    }, [sceneRef]);

      const handleMeasurementSelect = useCallback((position: Vector3) => {
        const scene = sceneRef.current;
        if (!scene) return;
        if (pointMeshesRef.current.length >= 2) {
            clearPoints();
        }

        const sphere = new Mesh(pointGeometry, pointMaterial);
        sphere.position.copy(position);
        scene.add(sphere);
        pointMeshesRef.current.push(sphere);
        pointsRef.current.push(sphere.position.clone());

        if (pointsRef.current.length >= 2) {
            const p1 = pointsRef.current[0];
            const p2 = pointsRef.current[1];
            const d = p1.distanceTo(p2);
            setDistance(d);

            const lineGeometry = new BufferGeometry().setFromPoints([p1, p2]);
            const lineMaterial = new LineBasicMaterial({ color: COLORS.MEASUREMENT_LINE });
            const line = new Line(lineGeometry, lineMaterial);
            scene.add(line);
            lineRef.current = line;

            const textSprite = makeTextSprite(`${d.toFixed(2)} m`, { fontsize: 24, fontface: 'Arial', borderColor: {r:0,g:0,b:0,a:1}, backgroundColor: {r:255,g:255,b:255,a:0.8} });
            textSprite.position.copy(p1).lerp(p2, 0.5).add(new Vector3(0, 0.05, 0));
            scene.add(textSprite);
            distanceSpriteRef.current = textSprite;
        }
    }, [sceneRef, clearPoints, pointGeometry, pointMaterial, setDistance]);

    const update = useCallback((camera: Camera) => {
        if (distanceSpriteRef.current) {
            distanceSpriteRef.current.quaternion.copy(camera.quaternion);
        }
    }, []);

    // distance 상태는 더 이상 반환하지 않습니다.
    return useMemo(() => ({ handleMeasurementSelect, clearPoints, update }), [handleMeasurementSelect, clearPoints, update]);
}
