// ============================================
// 📄 src/components/product/ProductForm/ProductForm.tsx
// ============================================
// 제품 등록/수정 폼 컴포넌트
// ============================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { Save, X, Upload, Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import { ProductFormData } from '@/types/product.types';
import styles from './ProductForm.module.css';

// API 기본 URL을 환경 변수에서 가져오도록 설정
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

interface ProductFormProps {
  initialData?: ProductFormData;
  onSubmit: (data: ProductFormData) => void;
  onCancel?: () => void;
}

interface Category {
  id: number;
  name: string;
}

export default function ProductForm({ initialData, onSubmit, onCancel }: ProductFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<ProductFormData>(
    initialData || {
      product_name: '', product_id: '', category_id: 0, manufacturer: '',
      description: '', releaseDate: '', is_active: true,
      documentIds: [], imageUrl: '', model3dUrl: '', // model3dUrl 추가
    }
  );

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/categories`, {
          headers: {
            'ngrok-skip-browser-warning': 'true',
          },
        });
        if (!response.ok) {
          throw new Error('카테고리 목록을 불러오는데 실패했습니다.');
        }
        const data: Category[] = await response.json();
        setCategories(data);
        if (!initialData && data.length > 0) {
          setFormData(prev => ({ ...prev, category_id: data[0].id }));
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchCategories();
  }, [initialData]);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [pdfUploadError, setPdfUploadError] = useState<string | null>(null);
  const [uploadedPdfPath, setUploadedPdfPath] = useState<string | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [uploadedImagePath, setUploadedImagePath] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // 3D 모델 변환 상태 추가
  const [isConverting3D, setIsConverting3D] = useState(false);
  const [generated3DModel, setGenerated3DModel] = useState<Blob | null>(null);
  const [conversion3DError, setConversion3DError] = useState<string | null>(null);

  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ProductFormData, string>> = {};
    if (!formData.product_name.trim()) newErrors.product_name = '제품명을 입력해주세요';
    if (!formData.product_id.trim()) newErrors.product_id = '모델명을 입력해주세요';
    if (!formData.category_id) newErrors.category_id = '카테고리를 선택해주세요';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof ProductFormData, value: string | string[] | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const trigger3DConversion = async (file: File) => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_COLAB_API_URL;
    if (!apiBaseUrl) {
      setConversion3DError('API URL이 설정되지 않았습니다. .env.local 파일을 확인해주세요.');
      return;
    }

    setIsConverting3D(true);
    setConversion3DError(null);
    setGenerated3DModel(null);

    const conversionFormData = new FormData();
    conversionFormData.append('file', file);

    try {
      const response = await fetch(`${apiBaseUrl}/convert-2d-to-3d`, {
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
      setConversion3DError(err.message || '3D 모델 변환 중 오류가 발생했습니다.');
    } finally {
      setIsConverting3D(false);
    }
  };

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        setPdfUploadError('PDF 파일만 업로드할 수 있습니다.');
        setPdfFile(null);
      } else {
        setPdfFile(file);
        setPdfUploadError(null);
        setUploadedPdfPath(null);
      }
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        setImageUploadError('이미지 파일(JPG, PNG, GIF, WEBP)만 업로드할 수 있습니다.');
        setImageFile(null);
      } else {
        setImageFile(file);
        setImageUploadError(null);
        setUploadedImagePath(null);
        // 3D 변환 시작
        trigger3DConversion(file);
      }
    }
  };

  const handlePdfButtonClick = () => pdfInputRef.current?.click();
  const handleImageButtonClick = () => imageInputRef.current?.click();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    let finalFormData: ProductFormData = { ...formData };

    if (imageFile) {
      setIsUploadingImage(true);
      setImageUploadError(null);
      try {
        const formDataForImage = new FormData();
        formDataForImage.append('image_file', imageFile);
        const response = await fetch(`${apiBaseUrl}/api/products/upload-image`, { method: 'POST', body: formDataForImage });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || '이미지 업로드 실패');
        }
        const result = await response.json();
        setUploadedImagePath(result.file_path);
        finalFormData.imageUrl = result.file_path;
      } catch (error: any) {
        setImageUploadError(error.message);
        setIsUploadingImage(false);
        return;
      } finally {
        setIsUploadingImage(false);
      }
    }

    if (generated3DModel) {
      try {
        const formDataFor3DModel = new FormData();
        const modelFileName = imageFile ? `${imageFile.name.split('.').slice(0, -1).join('.')}.glb` : 'model.glb';
        formDataFor3DModel.append('model_file', generated3DModel, modelFileName);

        const response = await fetch(`${apiBaseUrl}/api/products/upload-3d-model`, {
          method: 'POST',
          body: formDataFor3DModel,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || '3D 모델 업로드 실패');
        }
        const result = await response.json();
        finalFormData.model3dUrl = result.file_path;
      } catch (error: any) {
        console.error('3D 모델 업로드 실패:', error.message);
      }
    }

    if (pdfFile) {
      setIsUploadingPdf(true);
      setPdfUploadError(null);
      try {
        const formDataForPdf = new FormData();
        formDataForPdf.append('pdf_file', pdfFile);
        const response = await fetch(`${apiBaseUrl}/api/products/upload-pdf`, { method: 'POST', body: formDataForPdf });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'PDF 업로드 실패');
        }
        const result = await response.json();
        setUploadedPdfPath(result.file_path);
        finalFormData.documentIds = [...(finalFormData.documentIds || []), result.file_path];
      } catch (error: any) {
        setPdfUploadError(error.message);
        setIsUploadingPdf(false);
        return;
      } finally {
        setIsUploadingPdf(false);
      }
    }
    
    onSubmit(finalFormData);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* PDF 문서 업로드 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>PDF 문서 업로드</h2>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>제품 설명서 (PDF)</label>
            <div className={styles.fileInputContainer}>
              <input
                type="file"
                accept=".pdf"
                onChange={handlePdfFileChange}
                className={styles.hiddenInput}
                ref={pdfInputRef}
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={handlePdfButtonClick}
              >
                <Upload size={16} />
                파일 선택
              </Button>
              {pdfFile && <p className={styles.fileName}>{pdfFile.name}</p>}
            </div>
            {isUploadingPdf && <p className={styles.uploadStatus}>PDF 업로드 중...</p>}
            {pdfUploadError && <p className={styles.errorMessage}>{pdfUploadError}</p>}
            {uploadedPdfPath && <p className={styles.successMessage}>업로드 완료: {uploadedPdfPath}</p>}
          </div>
        </div>
      </div>

      {/* 기본 정보 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>기본 정보</h2>
        <div className={styles.row}>
          <Input
            label="제품명"
            placeholder="예: 시스템 에어컨 2024"
            value={formData.product_name}
            onChange={(e) => handleChange('product_name', e.target.value)}
            error={errors.product_name}
            required
            fullWidth
          />
        </div>
        <div className={styles.row}>
          <Input
            label="모델명"
            placeholder="예: AC-2024-001"
            value={formData.product_id}
            onChange={(e) => handleChange('product_id', e.target.value)}
            error={errors.product_id}
            required
            fullWidth
          />
        </div>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>
              카테고리 <span className={styles.required}>*</span>
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => handleChange('category_id', parseInt(e.target.value, 10))}
              className={styles.select}
              disabled={categories.length === 0}
            >
              <option value={0} disabled>카테고리를 선택하세요</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.row}>
          <Input
            label="제조사"
            placeholder="예: LG전자"
            value={formData.manufacturer || ''}
            onChange={(e) => handleChange('manufacturer', e.target.value)}
            fullWidth
          />
        </div>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>제품 설명</label>
            <textarea
              placeholder="제품에 대한 간단한 설명을 입력하세요"
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              className={styles.textarea}
              rows={4}
            />
          </div>
        </div>
      </div>

      {/* 추가 정보 (드롭다운) */}
      <details className={styles.detailsSection} open>
        <summary className={styles.sectionTitle}>추가 정보 (선택)</summary>
        <div className={styles.sectionContent}>
          <div className={styles.row}>
            <Input
              label="출시일"
              type="date"
              value={formData.releaseDate || ''}
              onChange={(e) => handleChange('releaseDate', e.target.value)}
              fullWidth
            />
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>제품 이미지</label>
              <div className={styles.fileInputContainer}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className={styles.hiddenInput}
                  ref={imageInputRef}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleImageButtonClick}
                >
                  <Upload size={16} />
                  파일 선택
                </Button>
                {imageFile && <p className={styles.fileName}>{imageFile.name}</p>}
              </div>
              {isUploadingImage && <p className={styles.uploadStatus}>이미지 업로드 중...</p>}
              {imageUploadError && <p className={styles.errorMessage}>{imageUploadError}</p>}
              {uploadedImagePath && <p className={styles.successMessage}>업로드 완료: {uploadedImagePath}</p>}
              
              {/* 3D 변환 상태 UI */}
              {isConverting3D && <p className={styles.uploadStatus}><Sparkles size={16} /> 3D 모델 변환 중...</p>}
              {conversion3DError && <p className={styles.errorMessage}>{conversion3DError}</p>}
              {generated3DModel && !isConverting3D && <p className={styles.successMessage}>✅ 3D 모델 생성 완료. 등록 시 함께 업로드됩니다.</p>}
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>
                상태 <span className={styles.required}>*</span>
              </label>
              <select
                value={String(formData.is_active)}
                onChange={(e) => handleChange('is_active', e.target.value === 'true')}
                className={styles.select}
              >
                <option value="true">활성</option>
                <option value="false">비활성</option>
              </select>
            </div>
          </div>
        </div>
      </details>

      {/* 버튼 */}
      <div className={styles.actions}>
        {onCancel && (
          <Button type="button" variant="outline" size="lg" onClick={onCancel}>
            <X size={20} />
            취소
          </Button>
        )}
        <Button type="submit" variant="primary" size="lg" disabled={isUploadingPdf || isUploadingImage || isConverting3D}>
          <Save size={20} />
          {initialData ? '수정하기' : '등록하기'}
        </Button>
      </div>
    </form>
  );
}
