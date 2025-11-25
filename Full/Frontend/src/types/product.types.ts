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
  product_internal_id: number; // DB의 product_internal_id에 맞춤
  product_name?: string | null;
  product_id: string; // 제품 코드를 필수로 받도록 변경
  category?: string | null; // DB에 맞춰 string으로 변경
  company_internal_id: number; // DB에 맞춰 추가
  discription?: string | null; // DB의 오타 discription에 맞춤
  release_date?: string | null;
  qr_code?: string | null; // DB에 맞춰 추가
  is_active?: boolean; // DB의 tinyint에 맞춰 boolean
  status: 'pending' | 'completed' | 'failed'; // DB의 enum에 맞춤
  image_url?: string | null;
  pdf_path?: string | null;
  model3d_url?: string | null;
  width_mm?: number | null;
  height_mm?: number | null;
  depth_mm?: number | null;
  created_by?: number | null; // DB에 맞춰 추가
  created_at: string;
  updated_by?: number | null; // DB에 맞춰 추가
  updated_at: string;
}

export interface ProductFormData {
  product_id: string; // 제품 코드를 필수로 받도록 변경
  product_name?: string; // 제품명을 선택 사항으로 변경
  category?: string; // 추가
  company_internal_id: number; // 추가
  discription?: string; // DB의 오타 반영
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