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
  internal_id: string;
  product_name: string;                    // 제품명
  product_id: string;                   // 모델명
  category: { id: number; name: string; }; // 카테고리 (객체로 변경)
  manufacturer?: string;           // 제조사
  description?: string;            // 설명
  releaseDate?: Date;              // 출시일
  is_active: boolean;              // 활성 상태
  analysis_status: 'PENDING' | 'COMPLETED' | 'FAILED'; // 분석 상태 추가
  qrCodeUrl: string;              // QR 코드 URL (/chat/{productId})
  pdf_path?: string | null;        // PDF 경로 (documentIds에서 변경)
  imageUrl?: string;              // 제품 이미지
  model3dUrl?: string;            // 3D 모델 경로
  width_mm?: number;              // 가로 길이 (mm)
  height_mm?: number;             // 세로 길이 (mm)
  depth_mm?: number;              // 깊이 길이 (mm)
  viewCount: number;              // 조회수
  questionCount: number;          // 질문 수
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;              // 생성자
}

export interface ProductFormData {
  product_name: string;
  product_id: string;
  category_id: number;
  manufacturer?: string;
  description?: string;
  releaseDate?: string;           // ISO string
  is_active: boolean;
  documentIds: string[];
  imageUrl?: string;
  model3dUrl?: string;
}