// ============================================ 
// 📄 src/components/product/ProductEditForm/ProductEditForm.tsx
// ============================================ 
// 제품 수정 폼 컴포넌트 (모든 필드 포함)
// ============================================ 

'use client';

import { useState, useRef } from 'react';
import { Save, X, Upload, Sparkles, Info } from 'lucide-react';
import { toast } from '@/store/useToastStore';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import { Product, ProductUpdate } from '@/types/product.types';
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
    category: initialData.category || '',
    company_name: initialData.company_name || '', // 회사명 추가
    description: initialData.description || '',
    release_date: initialData.release_date ? new Date(initialData.release_date).toISOString().split('T')[0] : '',
    pdf_path: initialData.pdf_path || '',
    image_url: initialData.image_url || '',
    model3d_url: initialData.model3d_url || '',
    width_mm: initialData.width_mm || undefined,
    height_mm: initialData.height_mm || undefined,
    depth_mm: initialData.depth_mm || undefined,
    status: initialData.status || 'pending',
  });

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [generated3DModel, setGenerated3DModel] = useState<Blob | null>(null);

  const [activeTab, setActiveTab] = useState<'product' | 'ar'>('product');

  const [isUploading, setIsUploading] = useState(false);
  const [isConverting3D, setIsConverting3D] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof typeof formData, value: string | boolean | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const trigger3DConversion = async (file: File) => {
    // 1. 환경 변수에서 URL 목록 가져오기 (빈 값 필터링)
    const apiUrls = [
      process.env.NEXT_PUBLIC_COLAB_NG_API_URL, // 1순위 (예: Ngrok)
      process.env.NEXT_PUBLIC_COLAB_CF_API_URL   // 2순위 (예: Cloudflare)
    ].filter((url): url is string => !!url); // TypeScript: null/undefined 제거

    if (apiUrls.length === 0) {
      setError('3D 변환 API URL이 설정되지 않았습니다.');
      return;
    }

    setIsConverting3D(true);
    setError(null);
    setGenerated3DModel(null);

    const conversionFormData = new FormData();
    conversionFormData.append('file', file);

    // 고품질 설정을 위한 파라미터 추가
    conversionFormData.append('bake_resolution', '2048'); // 텍스처 해상도
    conversionFormData.append('vertex_count', '30000'); // 모델 정점 수
    conversionFormData.append('remesh', 'Triangle');    // 메시 재구성 방식

    let lastError: any = null;
    let isSuccess = false;

    // 2. URL 목록을 순회하며 요청 시도 (Failover 로직)
    for (const baseUrl of apiUrls) {
      try {
        console.log(`Trying API connection to: ${baseUrl}`); // 디버깅용 로그

        const response = await fetch(`${baseUrl}/convert-2d-to-3d`, {
          method: 'POST',
          headers: {
            'ngrok-skip-browser-warning': 'true',
          },
          body: conversionFormData,
        });

        if (!response.ok) {
          // 서버가 응답은 했지만 에러인 경우 (예: 500, 404)
          const errorData = await response.json().catch(() => ({ detail: '알 수 없는 3D 변환 서버 오류' }));
          throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        // 성공 시 처리
        const blob = await response.blob();
        setGenerated3DModel(blob);
        isSuccess = true;
        console.log(`Success! Connected via: ${baseUrl}`);
        
        break; // 성공했으므로 루프(반복문) 종료

      } catch (err: any) {
        console.warn(`Failed to connect to ${baseUrl}:`, err.message);
        lastError = err;
        // 여기서 return 하지 않고 다음 URL(continue)로 넘어갑니다.
      }
    }

    // 3. 모든 URL 시도가 실패했을 경우 최종 에러 처리
    if (!isSuccess) {
      const errorMessage = lastError?.message || '모든 AI 서버 연결에 실패했습니다.';
      setError(errorMessage);
      toast.error(errorMessage);
    }

    // 4. 마무리 (로딩 상태 해제)
    setIsConverting3D(false);
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
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        setError('이미지 파일(JPG, PNG, WEBP)만 업로드할 수 있습니다.');
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
      <div className={styles.infoBox}>
        <Info size={20} />
        <p>
          {activeTab === 'product'
            ? '제품의 기본 정보(제품명, 카테고리 등)와 PDF 설명서를 수정합니다.'
            : '제품의 AR(증강 현실) 관련 정보 (이미지, 3D 모델, 크기 등)를 수정합니다.'}
        </p>
      </div>

      {/* --- Tab Buttons --- */}
      <div className={styles.tabContainer}>
        <Button
          type="button"
          variant={activeTab === 'product' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('product')}
        >
          제품 정보 수정
        </Button>
        <Button
          type="button"
          variant={activeTab === 'ar' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('ar')}
        >
          AR 정보 수정
        </Button>
      </div>

      {activeTab === 'product' && (
        <div className={styles.section}>
          <div className={styles.field}>
            <label className={styles.label}>제품 설명서 (PDF)<span className={styles.required}>*</span></label>
              <div className={styles.fileInputContainer}>
                <input type="file" accept=".pdf" onChange={handlePdfFileChange} className={styles.hiddenInput} ref={pdfInputRef} disabled={isUploading} />
                <Button type="button" variant="outline" onClick={() => pdfInputRef.current?.click()} disabled={isUploading}>
                  <Upload size={16} /> 파일 변경
                </Button>
                {pdfFile && <p className={styles.fileName}>{pdfFile.name}</p>}
              </div>
              <p className={styles.fieldDescription}>
                <Info size={14} />
                <span>파일변경 시 해당제품의 챗봇 정보가 업데이트됩니다!</span>
              </p>
          </div>
          <div className={styles.grid}>
            <div className={styles.field}>
              <Input
                label="제품명"
                value={formData.product_name}
                onChange={(e) => handleChange('product_name', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <Input
                label="회사명"
                value={formData.company_name}
                disabled // 읽기 전용으로 설정
              />
            </div>
            <div className={styles.field}>
              <Input
                label="카테고리"
                value={formData.category || ''}
                onChange={(e) => handleChange('category', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <Input
                label="출시일"
                type="date"
                value={formData.release_date || ''}
                onChange={(e) => handleChange('release_date', e.target.value)}
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
      )}

      {activeTab === 'ar' && (
        <div className={styles.section}>
          <div className={styles.grid}>
            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label className={styles.label}>제품 이미지 (JPG, PNG, WEBP)</label>
              <div className={styles.fileInputContainer}>
                <input type="file" accept="image/*" onChange={handleImageFileChange} className={styles.hiddenInput} ref={imageInputRef} disabled={isUploading || isConverting3D} />
                <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()} disabled={isUploading || isConverting3D}>
                  <Upload size={16} /> 이미지 변경
                </Button>
                {imageFile && <p className={styles.fileName}>{imageFile.name}</p>}

              </div>
              <p className={styles.fieldDescription}>
                <Info size={14} />
                <span>이미지 등록시 3D모델 생성 및 AR에서 확인 가능합니다!</span>
              </p>
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
                label="높이 (mm)"
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
      )}

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
