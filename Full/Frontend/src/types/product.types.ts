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
  product_id: string; // 제품 코드를 필수로 받도록 변경
  product_name?: string | null; // 제품명을 선택 사항으로 변경
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
  product_id: string; // 제품 코드를 필수로 받도록 변경
  product_name?: string; // 제품명을 선택 사항으로 변경
  pdf_path: string;
}

export type ProductUpdate = Partial<Omit<Product, 'internal_id' | 'created_at' | 'updated_at'>>;