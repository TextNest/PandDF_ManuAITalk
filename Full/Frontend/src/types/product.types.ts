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
  product_internal_id: number;
  product_name?: string | null;
  product_id: string;
  category?: string | null;
  company_internal_id: number;
  company_name?: string | null; // 회사명 필드 추가
  description?: string | null;
  release_date?: string | null;
  qr_code?: string | null;
  is_active?: boolean;
  status: 'pending' | 'completed' | 'failed';
  image_url?: string | null;
  pdf_path?: string | null;
  model3d_url?: string | null;
  width_mm?: number | null;
  height_mm?: number | null;
  depth_mm?: number | null;
  created_by?: number | null;
  created_at: string;
  updated_by?: number | null;
  updated_at: string;
}

export interface ProductFormData {
  product_id: string; // 제품 코드를 필수로 받도록 변경
  product_name?: string; // 제품명을 선택 사항으로 변경
  category?: string; // 추가

  description?: string; 
  release_date?: string;
  is_active?: boolean;
  status?: 'pending' | 'completed' | 'failed'; // 추가
  image_url?: string;
  pdf_path: string;
  model3d_url?: string;
  width_mm?: number;
  height_mm?: number;
  depth_mm?: number;
  created_by?: number;
  updated_by?: number;
}

export type ProductUpdate = Partial<Omit<Product, 'product_internal_id' | 'created_at' | 'updated_at' | 'company_internal_id'>>; // company_internal_id 제외