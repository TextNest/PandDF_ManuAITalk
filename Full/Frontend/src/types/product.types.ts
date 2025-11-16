// ============================================
// 📄 src/types/product.types.ts
// ============================================
// 제품 관련 타입 정의
// ============================================

export type ProductCategory = 
  | '에어컨'
  | '냉장고'
  | '세탁기'
  | 'TV'
  | '청소기'
  | '공기청정기'
  | '기타';

export interface Product {
  internal_id: number;
  product_name: string;
  product_id: string | null;
  category: string | null;
  manufacturer?: string | null;
  description?: string | null;
  release_date?: string | null; // Changed from Date to string
  is_active: boolean;
  analysis_status: 'PENDING' | 'COMPLETED' | 'FAILED';
  pdf_path?: string | null;
  image_url?: string | null;
  model3d_url?: string | null;
  width_mm?: number | null;
  height_mm?: number | null;
  depth_mm?: number | null;
  created_at: string; // Changed from Date to string
  updated_at: string; // Changed from Date to string
}

export interface ProductFormData {
  product_name: string;
  pdf_path: string;
}

export type ProductUpdate = Partial<Omit<Product, 'internal_id' | 'created_at' | 'updated_at'>>;