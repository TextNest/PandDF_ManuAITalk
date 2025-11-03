// ============================================
// 📄 1. src/types/document.types.ts
// ============================================
// 문서 관련 타입 정의
// ============================================

export interface Document {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  productId?: string;
  productName?: string;
  uploadedAt: Date;
  uploadedBy: string;
  status: 'processing' | 'ready' | 'error';
  pageCount?: number;
  version: number;
}

export interface DocumentUploadRequest {
  file: File;
  productName: string;
  productId?: string;
}