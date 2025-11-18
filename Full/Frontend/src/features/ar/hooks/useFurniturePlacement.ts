import { useRef, useCallback, useMemo } from 'react';
import { Scene, Mesh, Material, BoxGeometry, MeshStandardMaterial, Vector3, Group, Box3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { COLORS } from '@/lib/ar/constants';
import { FurnitureItem } from '@/lib/ar/types';

type SelectFurnitureAction = (furniture: FurnitureItem | null) => void;
type SetDebugMessageAction = (message: string | null) => void;
type SetIsPlacingAction = (isPlacing: boolean) => void;

export function useFurniturePlacement(
    sceneRef: React.RefObject<Scene | null>,
    selectFurniture: SelectFurnitureAction,
    isARActive: boolean,
    setDebugMessage: SetDebugMessageAction,
    setIsPlacing: SetIsPlacingAction
) {
    const previewModelRef = useRef<Group | Mesh | null>(null);
    const placedModelsRef = useRef<(Group | Mesh)[]>([]);

    const clearPreviewBox = useCallback(() => {
        if (previewModelRef.current) {
            sceneRef.current?.remove(previewModelRef.current);
            if (previewModelRef.current instanceof Mesh) {
                previewModelRef.current.geometry.dispose();
                (previewModelRef.current.material as Material).dispose();
            } else if (previewModelRef.current instanceof Group) {
                previewModelRef.current.traverse((child) => {
                    if (child instanceof Mesh) {
                        child.geometry.dispose();
                        (child.material as Material).dispose();
                    }
                });
            }
            previewModelRef.current = null;
        }
    }, [sceneRef]);

  const createPreviewBox = useCallback((item: FurnitureItem) => {
    if (!isARActive) {
      return;
    }
        clearPreviewBox();
        setDebugMessage(null); // Reset debug message

        // Use model3dUrl and default to 1000mm (1 meter) if not provided
        const model3dUrl = item.model3dUrl;
        const itemWidthMeters = (item.width_mm || 1000) / 1000; // Convert mm to meters
        const itemHeightMeters = (item.height_mm || 1000) / 1000; // Convert mm to meters
        const itemDepthMeters = (item.depth_mm || 1000) / 1000; // Convert mm to meters


        if (model3dUrl) {
            let absoluteUrl = model3dUrl.startsWith('/') ? model3dUrl : '/' + model3dUrl;
            setDebugMessage(`모델 로딩 중: ${absoluteUrl}`);
            const loader = new GLTFLoader();
            loader.load(absoluteUrl, (gltf) => {
                setDebugMessage('모델 로딩 성공!');
                const model = gltf.scene;

                // Make preview model semi-transparent
                model.traverse((child) => {
                    if (child instanceof Mesh) {
                        const newMaterial = (child.material as MeshStandardMaterial).clone();
                        newMaterial.transparent = true;
                        newMaterial.opacity = 0.7;
                        child.material = newMaterial;
                    }
                });
                
                const box = new Box3().setFromObject(model);
                const size = box.getSize(new Vector3());
                
                // Calculate scale based on desired item dimensions in meters
                const scaleX = itemWidthMeters / size.x;
                const scaleY = itemHeightMeters / size.y;
                const scaleZ = itemDepthMeters / size.z;
                model.scale.set(scaleX, scaleY, scaleZ);

                model.visible = false;
                previewModelRef.current = model;
                sceneRef.current?.add(model);
            }, undefined, (error) => {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                setDebugMessage(`모델 로딩 실패. 상자로 대체합니다. 에러: ${errorMessage}`)
                console.error('모델 로딩 오류:', error);
                // Fallback to a box if model loading fails, using the calculated dimensions
                const geometry = new BoxGeometry(itemWidthMeters, itemHeightMeters, itemDepthMeters);
                const material = new MeshStandardMaterial({ color: COLORS.FURNITURE_PREVIEW, transparent: true, opacity: 0.5 });
                const box = new Mesh(geometry, material);
                box.visible = false;
                previewModelRef.current = box;
                sceneRef.current?.add(box);
            });
        } else {
            setDebugMessage('모델 URL이 없습니다. 상자로 대체합니다.');
            // Use the calculated dimensions for the fallback box
            const geometry = new BoxGeometry(itemWidthMeters, itemHeightMeters, itemDepthMeters);
            const material = new MeshStandardMaterial({ color: COLORS.FURNITURE_PREVIEW, transparent: true, opacity: 0.5 });
            const box = new Mesh(geometry, material);
            box.visible = false;
            previewModelRef.current = box;
            if (sceneRef.current) {
                sceneRef.current.add(box);
            }
        }
    }, [isARActive, sceneRef, clearPreviewBox, setDebugMessage]);

    const placeFurniture = useCallback(() => {
        if (!previewModelRef.current || !sceneRef.current) return;

        const placedModel = previewModelRef.current.clone(true);

        placedModel.position.copy(previewModelRef.current.position);
        placedModel.rotation.copy(previewModelRef.current.rotation);

        // Make placed model fully opaque
        placedModel.traverse((child) => {
            if (child instanceof Mesh) {
                const newMaterial = (child.material as MeshStandardMaterial).clone();
                newMaterial.transparent = false;
                newMaterial.opacity = 1;
                child.material = newMaterial;
            }
        });

        sceneRef.current.add(placedModel);
        placedModelsRef.current.push(placedModel);

        clearPreviewBox();
        setDebugMessage('가구가 배치되었습니다.');
        setIsPlacing(false); // Exit placement mode

    }, [sceneRef, clearPreviewBox, selectFurniture, setDebugMessage, setIsPlacing]);

    const clearPlacedBoxes = useCallback(() => {
        if (!sceneRef.current) return;
        placedModelsRef.current.forEach(model => {
            sceneRef.current?.remove(model);
            if (model instanceof Mesh) {
                model.geometry.dispose();
                (model.material as Material).dispose();
            } else if (model instanceof Group) {
                model.traverse((child) => {
                    if (child instanceof Mesh) {
                        child.geometry.dispose();
                        (child.material as Material).dispose();
                    }
                });
            }
        });
        placedModelsRef.current = [];
    }, [sceneRef]);

    const update = useCallback((reticlePosition: Vector3 | null) => {
        if (previewModelRef.current) {
            if (reticlePosition) {
                previewModelRef.current.position.copy(reticlePosition);
                
                const box = new Box3().setFromObject(previewModelRef.current);
                const height = box.getSize(new Vector3()).y;
                previewModelRef.current.position.y += height / 2;

                previewModelRef.current.visible = true;
            } else {
                previewModelRef.current.visible = false;
            }
        }
    }, []);

    return useMemo(() => ({
        previewBoxRef: previewModelRef,
        createPreviewBox,
        placeFurniture,
        clearPlacedBoxes,
        clearPreviewBox,
        update,
    }), [createPreviewBox, placeFurniture, clearPlacedBoxes, clearPreviewBox, update]);
}
