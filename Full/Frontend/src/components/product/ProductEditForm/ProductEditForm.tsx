// ============================================ 
// 📄 src/components/product/ProductEditForm/ProductEditForm.tsx
// ============================================ 
// 제품 수정 폼 컴포넌트 (모든 필드 포함)
// ============================================ 

'use client';

import { useState, useRef } from 'react';
import { Save, X, Upload, Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import { Product } from '@/types/product.types';
import { ProductUpdate } from '@/schemas/product';
import styles from '@/styles/Form.module.css';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

interface ProductEditFormProps {
  initialData: Product;
  onSubmit: (data: Partial<ProductUpdate>) => void;
  onCancel?: () => void;
}

export default function ProductEditForm({ initialData, onSubmit, onCancel }: ProductEditFormProps) {
  const [formData, setFormData] = useState({
    product_name: initialData.product_name || '',
    product_id: initialData.product_id || '',
    category: initialData.category || '',
    manufacturer: initialData.manufacturer || '',
    description: initialData.description || '',
    release_date: initialData.release_date ? new Date(initialData.release_date).toISOString().split('T')[0] : '',
    is_active: initialData.is_active,
    pdf_path: initialData.pdf_path || '',
    image_url: initialData.image_url || '',
    model3d_url: initialData.model3d_url || '',
    width_mm: initialData.width_mm || undefined,
    height_mm: initialData.height_mm || undefined,
    depth_mm: initialData.depth_mm || undefined,
    analysis_status: initialData.analysis_status || 'PENDING',
  });

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [generated3DModel, setGenerated3DModel] = useState<Blob | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isConverting3D, setIsConverting3D] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof typeof formData, value: string | boolean | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const trigger3DConversion = async (file: File) => {
    const colabApiBaseUrl = process.env.NEXT_PUBLIC_COLAB_API_URL;
    if (!colabApiBaseUrl) {
      setError('3D 변환 API URL이 설정되지 않았습니다.');
      return;
    }
    setIsConverting3D(true);
    setError(null);
    setGenerated3DModel(null);
    const conversionFormData = new FormData();
    conversionFormData.append('file', file);
    try {
      const response = await fetch(`${colabApiBaseUrl}/convert-2d-to-3d`, {
        method: 'POST',
        body: conversionFormData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: '알 수 없는 3D 변환 서버 오류' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      setGenerated3DModel(blob);
    } catch (err: any) {
      setError(err.message || '3D 모델 변환 중 오류가 발생했습니다.');
    } finally {
      setIsConverting3D(false);
    }
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

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        setError('이미지 파일(JPG, PNG, GIF, WEBP)만 업로드할 수 있습니다.');
        setImageFile(null);
      } else {
        setImageFile(file);
        setError(null);
        trigger3DConversion(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsUploading(true);
    setError(null);

    let updatedData: Partial<ProductUpdate> = { ...formData };

    try {
      // 1. 새 이미지 업로드
      if (imageFile) {
        const formDataForImage = new FormData();
        formDataForImage.append('image_file', imageFile);
        const response = await fetch(`${apiBaseUrl}/api/products/upload-image`, { method: 'POST', body: formDataForImage });
        if (!response.ok) throw new Error('이미지 업로드 실패');
        const result = await response.json();
        updatedData.image_url = result.file_path;
      }

      // 2. 생성된 3D 모델 업로드
      if (generated3DModel) {
        const modelFileName = imageFile ? `${imageFile.name.split('.').slice(0, -1).join('.')}.glb` : 'model.glb';
        const formDataFor3DModel = new FormData();
        formDataFor3DModel.append('model_file', generated3DModel, modelFileName);
        const response = await fetch(`${apiBaseUrl}/api/products/upload-3d-model`, { method: 'POST', body: formDataFor3DModel });
        if (!response.ok) throw new Error('3D 모델 업로드 실패');
        const result = await response.json();
        updatedData.model3d_url = result.file_path;
      }

      // 3. 새 PDF 업로드
      if (pdfFile) {
        const formDataForPdf = new FormData();
        formDataForPdf.append('pdf_file', pdfFile);
        const response = await fetch(`${apiBaseUrl}/api/products/upload-pdf`, { method: 'POST', body: formDataForPdf });
        if (!response.ok) throw new Error('PDF 업로드 실패');
        const result = await response.json();
        updatedData.pdf_path = result.file_path;
      }
      
      // 4. 출시일이 빈 문자열이면 null로 변환
      if (updatedData.release_date === '') {
        updatedData.release_date = null;
      }

      onSubmit(updatedData);

    } catch (err: any) {
      setError(err.message || '제품 수정 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* --- PDF Section --- */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>PDF 문서</h2>
        <div className={styles.field}>
          <label className={styles.label}>제품 설명서 (PDF)</label>
          <div className={styles.fileInputContainer}>
            <input type="file" accept=".pdf" onChange={handlePdfFileChange} className={styles.hiddenInput} ref={pdfInputRef} disabled={isUploading} />
            <Button type="button" variant="outline" onClick={() => pdfInputRef.current?.click()} disabled={isUploading}>
              <Upload size={16} /> 파일 변경
            </Button>
            {pdfFile && <p className={styles.fileName}>{pdfFile.name}</p>}
            {!pdfFile && formData.pdf_path && <p className={styles.fileName}>기존 파일: {formData.pdf_path.split('\\').pop()?.split('/').pop()}</p>}
          </div>
        </div>
      </div>

      {/* --- Basic Info Section --- */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>기본 정보</h2>
        <div className={styles.grid}>
          <div className={`${styles.field} ${styles.fullWidth}`}>
            <Input
              label="제품명"
              value={formData.product_name}
              onChange={(e) => handleChange('product_name', e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <Input
              label="모델명"
              value={formData.product_id || ''}
              onChange={(e) => handleChange('product_id', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <Input
              label="카테고리"
              value={formData.category || ''}
              onChange={(e) => handleChange('category', e.target.value)}
            />
          </div>
          <div className={`${styles.field} ${styles.fullWidth}`}>
            <Input
              label="제조사"
              value={formData.manufacturer || ''}
              onChange={(e) => handleChange('manufacturer', e.target.value)}
            />
          </div>
          <div className={`${styles.field} ${styles.fullWidth}`}>
            <label className={styles.label}>제품 설명</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              className={styles.textarea}
              rows={5}
            />
          </div>
        </div>
      </div>

      {/* --- Additional Info Section --- */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>추가 정보</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <Input
              label="출시일"
              type="date"
              value={formData.release_date || ''}
              onChange={(e) => handleChange('release_date', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>활성 상태</label>
            <select
              value={String(formData.is_active)}
              onChange={(e) => handleChange('is_active', e.target.value === 'true')}
              className={styles.select}
            >
              <option value="true">활성</option>
              <option value="false">비활성</option>
            </select>
          </div>
          <div className={`${styles.field} ${styles.fullWidth}`}>
            <label className={styles.label}>제품 이미지</label>
            <div className={styles.fileInputContainer}>
              <input type="file" accept="image/*" onChange={handleImageFileChange} className={styles.hiddenInput} ref={imageInputRef} disabled={isUploading || isConverting3D} />
              <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()} disabled={isUploading || isConverting3D}>
                <Upload size={16} /> 이미지 변경
              </Button>
              {imageFile && <p className={styles.fileName}>{imageFile.name}</p>}
              {!imageFile && formData.image_url && <p className={styles.fileName}>기존 이미지: {formData.image_url.split('\\').pop()?.split('/').pop()}</p>}
            </div>
            {isConverting3D && <p className={styles.uploadStatus}><Sparkles size={16} /> 3D 모델 변환 중...</p>}
            {generated3DModel && !isConverting3D && <p className={styles.successMessage}>✅ 3D 모델 생성 완료. 등록 시 함께 업로드됩니다.</p>}
          </div>
          <div className={styles.field}>
            <Input
              label="가로 (mm)"
              type="number"
              value={formData.width_mm || ''}
              onChange={(e) => handleChange('width_mm', parseFloat(e.target.value))}
            />
          </div>
          <div className={styles.field}>
            <Input
              label="세로 (mm)"
              type="number"
              value={formData.height_mm || ''}
              onChange={(e) => handleChange('height_mm', parseFloat(e.target.value))}
            />
          </div>
          <div className={styles.field}>
            <Input
              label="깊이 (mm)"
              type="number"
              value={formData.depth_mm || ''}
              onChange={(e) => handleChange('depth_mm', parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>

      {error && <p className={`${styles.errorMessage} ${styles.fullWidth}`}>{error}</p>}

      <div className={styles.actions}>
        {onCancel && (
          <Button type="button" variant="outline" size="lg" onClick={onCancel} disabled={isUploading}>
            <X size={20} />
            취소
          </Button>
        )}
        <Button type="submit" variant="primary" size="lg" disabled={isUploading || isConverting3D}>
          <Save size={20} />
          {isUploading || isConverting3D ? '저장 중...' : '수정하기'}
        </Button>
      </div>
    </form>
  );
}
