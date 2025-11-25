import { useRef, useCallback, useMemo } from 'react';
import { Scene, Mesh, BoxGeometry, MeshStandardMaterial, Vector3, Group, Box3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { COLORS } from '@/lib/ar/constants';
import { FurnitureItem } from '@/lib/ar/types';

type SelectFurnitureAction = (furniture: FurnitureItem | null) => void;
type SetDebugMessageAction = (message: string | null) => void;
type SetIsPlacingAction = (isPlacing: boolean) => void;
type AddPlacedItemAction = (item: FurnitureItem) => void;

export function useFurniturePlacement(
    sceneRef: React.RefObject<Scene | null>,
    selectFurniture: SelectFurnitureAction,
    isARActive: boolean,
    setDebugMessage: SetDebugMessageAction,
    setIsPlacing: SetIsPlacingAction,
    selectedFurniture: FurnitureItem | null,
    addPlacedItem: AddPlacedItemAction
) {
    const previewModelRef = useRef<Group | Mesh | null>(null);
    const placedModelsRef = useRef<(Group | Mesh)[]>([]);

    const clearPreviewBox = useCallback(() => {
        if (previewModelRef.current) {
            sceneRef.current?.remove(previewModelRef.current);
            if (previewModelRef.current instanceof Mesh) {
                previewModelRef.current.geometry.dispose();
                if (previewModelRef.current.material) {
                    const materials = Array.isArray(previewModelRef.current.material) ? previewModelRef.current.material : [previewModelRef.current.material];
                    materials.forEach(material => material.dispose());
                }
            } else if (previewModelRef.current instanceof Group) {
                previewModelRef.current.traverse((child) => {
                    if (child instanceof Mesh) {
                        child.geometry.dispose();
                        if (child.material) {
                            const materials = Array.isArray(child.material) ? child.material : [child.material];
                            materials.forEach(material => material.dispose());
                        }
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
        setDebugMessage(null);

        const model3dUrl = item.model3dUrl;
        const itemWidthMeters = (item.width_mm || 1000) / 1000;
        const itemHeightMeters = (item.height_mm || 1000) / 1000;
        const itemDepthMeters = (item.depth_mm || 1000) / 1000;

        if (model3dUrl) {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
            const absoluteUrl = model3dUrl.startsWith('http') 
                ? model3dUrl 
                : `${baseUrl.replace(/\/$/, '')}/${model3dUrl.replace(/^\//, '')}`;
            
            setDebugMessage(`모델 로딩 중: ${absoluteUrl}`);
            const loader = new GLTFLoader();
            loader.setRequestHeader({ 'ngrok-skip-browser-warning': 'true' });

            loader.load(absoluteUrl, (gltf) => {
                setDebugMessage('모델 로딩 성공!');
                const model = gltf.scene;

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
                
                const scaleX = size.x > 0 ? itemWidthMeters / size.x : 1;
                const scaleY = size.y > 0 ? itemHeightMeters / size.y : 1;
                const scaleZ = size.z > 0 ? itemDepthMeters / size.z : 1;
                model.scale.set(scaleX, scaleY, scaleZ);

                model.visible = false;
                previewModelRef.current = model;
                sceneRef.current?.add(model);
            }, undefined, (error) => {
                console.error('모델 로딩 오류 상세:', error);
                const errorMessage = error instanceof ErrorEvent 
                    ? error.message 
                    : (typeof error === 'object' && error !== null ? JSON.stringify(error) : String(error));
                setDebugMessage(`모델 로딩 실패. URL: ${absoluteUrl}, 에러: ${errorMessage}`);
                
                const geometry = new BoxGeometry(itemWidthMeters, itemHeightMeters, itemDepthMeters);
                const material = new MeshStandardMaterial({ color: COLORS.FURNITURE_PREVIEW, transparent: true, opacity: 0.5 });
                const box = new Mesh(geometry, material);
                box.visible = false;
                previewModelRef.current = box;
                sceneRef.current?.add(box);
            });
        } else {
            setDebugMessage('모델 URL이 없습니다. 상자로 대체합니다.');
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
        if (!previewModelRef.current || !sceneRef.current || !selectedFurniture) return;

        const placedModel = previewModelRef.current.clone(true);

        placedModel.position.copy(previewModelRef.current.position);
        placedModel.rotation.copy(previewModelRef.current.rotation);

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

        addPlacedItem(selectedFurniture);

        clearPreviewBox();
        setDebugMessage('가구가 배치되었습니다.');
        setIsPlacing(false);

    }, [sceneRef, clearPreviewBox, selectFurniture, setDebugMessage, setIsPlacing, selectedFurniture, addPlacedItem]);

    const clearPlacedBoxes = useCallback(() => {
        if (!sceneRef.current) return;
        placedModelsRef.current.forEach(model => {
            sceneRef.current?.remove(model);
            
            model.traverse((child) => {
                if (child instanceof Mesh) {
                    child.geometry.dispose();

                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach(material => {
                        const textureKeys = [
                            'map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap', 
                            'envMap', 'aoMap', 'displacementMap', 'emissiveMap', 
                            'metalnessMap', 'roughnessMap'
                        ];

                        textureKeys.forEach(key => {
                            const texture = (material as any)[key];
                            if (texture && typeof texture.dispose === 'function') {
                                texture.dispose();
                            }
                        });

                        material.dispose();
                    });
                }
            });
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