// @ts-nocheck
// ============================================
// 📄 src/app/(admin)/documents/upload/page.tsx
// ============================================
// 문서 업로드 페이지 (제품 선택 방식)
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DocumentUploader from '@/components/document/DocumentUploader/DocumentUploader';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import { Product } from '@/types/product.types';
import styles from './upload-page.module.css';

// TODO: [백엔드] 실제 API로 교체
const mockProducts: Product[] = [
  {
    internal_id: 1,
    product_name: '시스템 에어컨 2024',
    product_id: 'AC-2024-001',
    category: '에어컨',
    is_active: true,
    analysis_status: 'COMPLETED',
    pdf_path: null,
    image_url: undefined,
    model3d_url: undefined,
    width_mm: null,
    height_mm: null,
    depth_mm: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    internal_id: 2,
    product_name: '양문형 냉장고 프리미엄',
    product_id: 'RF-2024-002',
    category: '냉장고',
    is_active: true,
    analysis_status: 'COMPLETED',
    qrCodeUrl: '/chat/product-2',
    pdf_path: null,
    image_url: null,
    model3d_url: null,
    width_mm: null,
    height_mm: null,
    depth_mm: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    internal_id: 3,
    product_name: '드럼세탁기 AI',
    product_id: 'WM-2024-003',
    category: '세탁기',
    is_active: true,
    analysis_status: 'COMPLETED',
    qrCodeUrl: '/chat/product-3',
    pdf_path: null,
    image_url: null,
    model3d_url: null,
    width_mm: null,
    height_mm: null,
    depth_mm: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function DocumentUploadPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // TODO: [백엔드] 제품 목록 API 호출
    setProducts(mockProducts);
  }, []);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile || !selectedProductId) {
      alert('필수 항목을 입력해주세요.');
      return;
    }

    setIsUploading(true);

    // TODO: [백엔드] 실제 API 연동
    console.log('업로드 데이터:', {
      productId: selectedProductId,
      documentName: documentName || undefined,
      file: selectedFile,
    });

    setTimeout(() => {
      setIsUploading(false);
      alert('업로드 완료!');
      router.push('/documents');
    }, 2000);
  };

  const selectedProduct = products.find(p => p.product_id === selectedProductId);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>문서 업로드</h1>
        <p className={styles.subtitle}>새로운 PDF 문서를 업로드하세요</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <DocumentUploader onFileSelect={handleFileSelect} />

        <div className={styles.fields}>
          {/* 제품 선택 */}
          <div className={styles.field}>
            <label className={styles.label}>
              제품 선택 <span className={styles.required}>*</span>
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className={styles.select}
              required
            >
              <option value="">제품을 선택하세요</option>
              {products.map(product => (
                <option key={product.product_id} value={product.product_id}>
                  {product.product_name} ({product.product_id})
                </option>
              ))}
            </select>
            {selectedProduct && (
              <p className={styles.helperText}>
                선택된 제품: {selectedProduct.product_name} - {selectedProduct.product_id}
              </p>
            )}
          </div>

          {/* 문서명 (선택사항) */}
          <Input
            label="문서명 (선택사항)"
            placeholder="예: 사용 설명서, 설치 가이드"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            fullWidth
            helperText="입력하지 않으면 파일명이 사용됩니다"
          />
        </div>

        <div className={styles.actions}>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            취소
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isUploading}
            disabled={!selectedFile || !selectedProductId}
          >
            업로드
          </Button>
        </div>
      </form >
    </div >
  );
}