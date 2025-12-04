import { create } from 'zustand';
import { Product } from '@/types/product.types';
import apiClient from '@/lib/api/client';

interface ProductState {
  product: Product | null;
  isLoading: boolean;
  error: string | null;
  fetchProduct: (id: string) => Promise<void>;
}

export const useProductStore = create<ProductState>((set, get) => ({
  product: null,
  isLoading: false,
  error: null,
  fetchProduct: async (id: string) => {
    // If we are already fetching or the correct product is already loaded, do nothing.
    if (get().isLoading || get().product?.product_id === id) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get<Product>(`/api/products/${id}`);
      set({ product: response.data, isLoading: false });
    } catch (err) {
      const errorMessage = '제품 정보를 불러오는 데 실패했습니다.';
      set({ error: errorMessage, isLoading: false, product: null });
      console.error(err);
    }
  },
}));
