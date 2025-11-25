import { create } from 'zustand';
import { FurnitureItem } from '@/lib/ar/types';

export type ARStatus = 'INITIALIZING' | 'SCANNING' | 'SURFACE_DETECTED';

type ARState = {
  isARActive: boolean;
  setARActive: (isActive: boolean) => void;
  arStatus: ARStatus;
  setARStatus: (status: ARStatus) => void;
  distance: number | null;
  setDistance: (distance: number | null) => void;
  selectedFurniture: FurnitureItem | null;
  selectFurniture: (furniture: FurnitureItem | null) => void;
  placedItems: FurnitureItem[];
  addPlacedItem: (item: FurnitureItem) => void;
  isPreviewing: boolean;
  setIsPreviewing: (isPreviewing: boolean) => void;
  isPlacing: boolean;
  setIsPlacing: (isPlacing: boolean) => void;
  clearFurnitureCounter: number;
  triggerClearFurniture: () => void;
  clearMeasurementCounter: number;
  triggerClearMeasurement: () => void;
  endARCounter: number;
  triggerEndAR: () => void;
  previewTriggerCounter: number; // For re-triggering preview box creation
  reset: () => void;
  debugMessage: string | null;
  setDebugMessage: (message: string | null) => void;
  hasInitialScanCompleted: boolean;
  setHasInitialScanCompleted: (value: boolean) => void;
};

export const useARStore = create<ARState>((set, get) => ({
  isARActive: false,
  setARActive: (isActive) => set({ isARActive: isActive }),
  arStatus: 'INITIALIZING',
  setARStatus: (status) => set({ arStatus: status }),
  distance: null,
  setDistance: (distance) => set({ distance }),
  selectedFurniture: null,
  selectFurniture: (furniture) => {
    set((state) => ({
      selectedFurniture: furniture,
      isPreviewing: !!furniture,
      // Increment counter every time a selection is made to ensure preview box effect re-runs
      previewTriggerCounter: furniture ? state.previewTriggerCounter + 1 : state.previewTriggerCounter,
    }));
  },
  placedItems: [],
  addPlacedItem: (item) => set((state) => {
    const isDuplicate = state.placedItems.some(placedItem => placedItem.id === item.id);
    if (isDuplicate) {
      return {};
    }
    return { placedItems: [...state.placedItems, item] };
  }),
  isPreviewing: false,
  setIsPreviewing: (isPreviewing) => set({ isPreviewing }),
  isPlacing: false,
  setIsPlacing: (isPlacing) => set({ isPlacing }),
  clearFurnitureCounter: 0,
  triggerClearFurniture: () => set((state) => ({ 
    placedItems: [],
    clearFurnitureCounter: state.clearFurnitureCounter + 1 
  })),
  clearMeasurementCounter: 0,
  triggerClearMeasurement: () => set((state) => ({ clearMeasurementCounter: state.clearMeasurementCounter + 1 })),
  endARCounter: 0,
  triggerEndAR: () => set((state) => ({ endARCounter: state.endARCounter + 1 })),
  previewTriggerCounter: 0, // Initial value
  reset: () => set({
    isARActive: false,
    arStatus: 'INITIALIZING',
    isPreviewing: false,
    isPlacing: false,
    selectedFurniture: null,
    placedItems: [],
    distance: null,
    clearFurnitureCounter: 0,
    clearMeasurementCounter: 0,
    endARCounter: 0,
    previewTriggerCounter: 0, // Reset counter
    hasInitialScanCompleted: false,
  }),
  debugMessage: null,
  setDebugMessage: (message) => set({ debugMessage: message }),
  hasInitialScanCompleted: false,
  setHasInitialScanCompleted: (value) => set({ hasInitialScanCompleted: value }),
}));