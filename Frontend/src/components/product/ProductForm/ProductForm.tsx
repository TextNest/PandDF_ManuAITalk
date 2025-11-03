// ============================================
// 📄 src/components/product/ProductForm/ProductForm.tsx
// ============================================
// 제품 등록/수정 폼 컴포넌트
// ============================================

'use client';

import { useState } from 'react';
import { Save, X } from 'lucide-react';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import { ProductFormData, ProductCategory } from '@/types/product.types';
import styles from './ProductForm.module.css';

interface ProductFormProps {
  initialData?: ProductFormData;
  onSubmit: (data: ProductFormData) => void;
  onCancel?: () => void;
}

const CATEGORIES: ProductCategory[] = [
  '에어컨',
  '냉장고',
  '세탁기',
  'TV',
  '청소기',
  '공기청정기',
  '기타',
];

export default function ProductForm({ 
  initialData, 
  onSubmit, 
  onCancel 
}: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>(
    initialData || {
      name: '',
      model: '',
      category: '에어컨',
      manufacturer: '',
      description: '',
      releaseDate: '',
      status: 'active',
      documentIds: [],
      imageUrl: '',
    }
  );

  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ProductFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = '제품명을 입력해주세요';
    }

    if (!formData.model.trim()) {
      newErrors.model = '모델명을 입력해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      onSubmit(formData);
    }
  };

  const handleChange = (
    field: keyof ProductFormData,
    value: string | string[]
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // 에러 클리어
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* 기본 정보 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>기본 정보</h2>
        
        <div className={styles.row}>
          <Input
            label="제품명"
            placeholder="예: 시스템 에어컨 2024"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={errors.name}
            required
            fullWidth
          />
        </div>

        <div className={styles.row}>
          <Input
            label="모델명"
            placeholder="예: AC-2024-001"
            value={formData.model}
            onChange={(e) => handleChange('model', e.target.value)}
            error={errors.model}
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
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value as ProductCategory)}
              className={styles.select}
            >
              {CATEGORIES.map(category => (
                <option key={category} value={category}>
                  {category}
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

      {/* 추가 정보 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>추가 정보</h2>

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
          <Input
            label="제품 이미지 URL"
            placeholder="https://example.com/product-image.jpg"
            value={formData.imageUrl || ''}
            onChange={(e) => handleChange('imageUrl', e.target.value)}
            fullWidth
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>
              상태 <span className={styles.required}>*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value as any)}
              className={styles.select}
            >
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
              <option value="draft">임시저장</option>
            </select>
          </div>
        </div>
      </div>

      {/* 버튼 */}
      <div className={styles.actions}>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onCancel}
          >
            <X size={20} />
            취소
          </Button>
        )}
        
        <Button
          type="submit"
          variant="primary"
          size="lg"
        >
          <Save size={20} />
          {initialData ? '수정하기' : '등록하기'}
        </Button>
      </div>
    </form>
  );
}