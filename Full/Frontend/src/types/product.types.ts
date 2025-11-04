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

export type ProductStatus = 
  | 'active'      // 활성
  | 'inactive'    // 비활성
  | 'draft';      // 임시저장

export interface Product {
  id: string;
  name: string;                    // 제품명
  model: string;                   // 모델명
  category: ProductCategory;       // 카테고리
  manufacturer?: string;           // 제조사
  description?: string;            // 설명
  releaseDate?: Date;              // 출시일
  status: ProductStatus;           // 상태
  qrCodeUrl: string;              // QR 코드 URL (/chat/{productId})
  documentIds: string[];          // 연결된 문서 ID들
  imageUrl?: string;              // 제품 이미지
  viewCount: number;              // 조회수
  questionCount: number;          // 질문 수
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;              // 생성자
}

export interface ProductFormData {
  name: string;
  model: string;
  category: ProductCategory;
  manufacturer?: string;
  description?: string;
  releaseDate?: string;           // ISO string
  status: ProductStatus;
  documentIds: string[];
  imageUrl?: string;
}