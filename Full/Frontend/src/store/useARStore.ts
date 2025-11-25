import { create } from 'zustand';
import { FurnitureItem } from '@/lib/ar/types';

type ARState = {
  isARActive: boolean;
  setARActive: (isActive: boolean) => void;
  isScanning: boolean;
  setIsScanning: (isScanning: boolean) => void;
  distance: number | null;
  setDistance: (distance: number | null) => void;
  selectedFurniture: FurnitureItem | null;
  selectFurniture: (furniture: FurnitureItem | null) => void;
  isPreviewing: boolean;
  setIsPreviewing: (isPreviewing: boolean) => void;
  clearFurnitureCounter: number;
  triggerClearFurniture: () => void;
  clearMeasurementCounter: number;
  triggerClearMeasurement: () => void;
  endARCounter: number;
  triggerEndAR: () => void;
  reset: () => void;
  debugMessage: string | null;
  setDebugMessage: (message: string | null) => void;
};

export const useARStore = create<ARState>((set, get) => ({
  isARActive: false,
  setARActive: (isActive) => set({ isARActive: isActive }),
  isScanning: false,
  setIsScanning: (isScanning) => set({ isScanning }),
  distance: null,
  setDistance: (distance) => set({ distance }),
  selectedFurniture: null,
  selectFurniture: (furniture) => {
    set({ selectedFurniture: furniture, isPreviewing: !!furniture });
  },
  isPreviewing: false,
  setIsPreviewing: (isPreviewing) => set({ isPreviewing }),
  clearFurnitureCounter: 0,
  triggerClearFurniture: () => set((state) => ({ clearFurnitureCounter: state.clearFurnitureCounter + 1 })),
  clearMeasurementCounter: 0,
  triggerClearMeasurement: () => set((state) => ({ clearMeasurementCounter: state.clearMeasurementCounter + 1 })),
  endARCounter: 0,
  triggerEndAR: () => set((state) => ({ endARCounter: state.endARCounter + 1 })),
  reset: () => set({
    isARActive: false,
    isPreviewing: false,
    selectedFurniture: null,
    distance: null,
    clearFurnitureCounter: 0,
    clearMeasurementCounter: 0,
    endARCounter: 0,
  }),
  debugMessage: null,
  setDebugMessage: (message) => set({ debugMessage: message }),
}));
