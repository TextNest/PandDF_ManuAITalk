// ============================================
// 📄 src/components/superadmin/CompanyForm/CompanyForm.tsx
// ============================================
// 기업 등록/수정 폼
// ============================================

'use client';

import { useState, FormEvent } from 'react';
import type { Company, CompanyFormData } from '@/types/company.types';
import Input from '@/components/ui/Input/Input';
import Button from '@/components/ui/Button/Button';
import Modal from '@/components/ui/Modal/Modal';
import styles from './CompanyForm.module.css';

interface CompanyFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CompanyFormData) => Promise<any>;
  company?: Company | null; // 수정 모드
}

export default function CompanyForm({ 
  isOpen, 
  onClose, 
  onSubmit,
  company 
}: CompanyFormProps) {
  const [formData, setFormData] = useState<CompanyFormData>({
    name: company?.name || '',
    domain: company?.domain || '',
    contactEmail: company?.contactEmail || '',
    contactPhone: company?.contactPhone || '',
    plan: company?.plan || 'basic',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      setError('');
      
      await onSubmit(formData);
      
      // 성공 시 폼 초기화 및 닫기
      setFormData({
        name: '',
        domain: '',
        contactEmail: '',
        contactPhone: '',
        plan: 'basic',
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '등록에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof CompanyFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={company ? '기업 정보 수정' : '새 기업 등록'}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        <div className={styles.fields}>
          <div className={styles.field}>
            <Input
              label="기업명"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              fullWidth
              placeholder="예: 삼성전자"
            />
          </div>

          <div className={styles.field}>
            <Input
              label="도메인"
              value={formData.domain}
              onChange={(e) => handleChange('domain', e.target.value)}
              required
              fullWidth
              placeholder="예: samsung.com"
            />
          </div>

          <div className={styles.field}>
            <Input
              label="담당자 이메일"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => handleChange('contactEmail', e.target.value)}
              required
              fullWidth
              placeholder="예: admin@samsung.com"
            />
          </div>

          <div className={styles.field}>
            <Input
              label="담당자 전화번호 (선택)"
              type="tel"
              value={formData.contactPhone}
              onChange={(e) => handleChange('contactPhone', e.target.value)}
              fullWidth
              placeholder="예: 02-1234-5678"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>플랜</label>
            <select
              className={styles.select}
              value={formData.plan}
              onChange={(e) => handleChange('plan', e.target.value as any)}
              required
            >
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>

        <div className={styles.actions}>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isLoading}
          >
            {company ? '수정' : '등록'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}