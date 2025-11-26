// ============================================
// 📄 src/components/product/ProductForm/ProductForm.tsx
// ============================================
// 제품 등록/수정 폼 컴포넌트
// ============================================

'use client';

import { useState, useRef } from 'react';
import { Save, X, Upload } from 'lucide-react';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import { ProductFormData } from '@/types/product.types';
import styles from '@/styles/Form.module.css';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

interface ProductFormProps {
  onSubmit: (data: ProductFormData) => void;
  onCancel?: () => void;
}

export default function ProductForm({ onSubmit, onCancel }: ProductFormProps) {
  const [productId, setProductId] = useState(''); // 제품 코드로 변경
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const validate = (): boolean => {
    if (!productId.trim()) { // 제품 코드 유효성 검사
      setError('제품 코드를 입력해주세요.');
      return false;
    }
    if (!pdfFile) {
      setError('PDF 파일을 선택해주세요.');
      return false;
    }
    setError(null);
    return true;
  };

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        setError('PDF 파일만 업로드할 수 있습니다.');
        setPdfFile(null);
      } else {
        setPdfFile(file);
        setError(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !pdfFile) return;

    setIsUploading(true);
    setError(null);

    try {
      // 1. PDF 업로드
      const formDataForPdf = new FormData();
      formDataForPdf.append('pdf_file', pdfFile);
      const response = await fetch(`${apiBaseUrl}/api/products/upload-pdf`, { 
        method: 'POST', 
        body: formDataForPdf 
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'PDF 업로드 실패' }));
        throw new Error(errorData.detail);
      }
      const result = await response.json();
      const pdfPath = result.file_path;

      // 2. 최종 데이터 전송
      onSubmit({
        product_id: productId, // 제품 코드로 변경
        pdf_path: pdfPath,
      });

    } catch (err: any) {
      setError(err.message || '제품 등록 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>제품 정보</h2>
        <div className={styles.field}>
            <Input
              label="제품 코드" // 라벨 변경
              placeholder="예: AC2024-001" // 플레이스홀더 변경
              value={productId} // 값 변경
              onChange={(e) => setProductId(e.target.value)} // 핸들러 변경
              required
              disabled={isUploading}
            />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>제품 설명서 (PDF) <span className={styles.required}>*</span></label>
          <div className={styles.fileInputContainer}>
            <input
              type="file"
              accept=".pdf"
              onChange={handlePdfFileChange}
              className={styles.hiddenInput}
              ref={pdfInputRef}
              disabled={isUploading}
            />
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => pdfInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload size={16} />
              파일 선택
            </Button>
            {pdfFile && <p className={styles.fileName}>{pdfFile.name}</p>}
          </div>
        </div>
      </div>

      {error && <p className={styles.errorMessage}>{error}</p>}

      <div className={styles.actions}>
        <Button type="submit" variant="primary" size="lg" disabled={isUploading}>
          <Save size={20} />
          {isUploading ? '저장 중...' : '등록하기'}
        </Button>
      </div>
    </form>
  );
}
