export interface FurnitureItem {
  id: number | string;
  name: string;
  width: number;
  depth: number;
  height: number;
  modelUrl?: string;
  model3dUrl?: string;
  width_mm?: number;
  depth_mm?: number;
  height_mm?: number;
}
