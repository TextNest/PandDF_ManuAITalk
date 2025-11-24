// components/superadmin/AdminEditModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './AdminEditModal.module.css';
import Button from '@/components/ui/Button/Button';

interface Admin {
  admin_internal_id: number;
  name: string;
  email: string;
  department: string | null;
  job_title: string | null;
  is_active: 0 | 1;
  created_at: string;
}

interface AdminEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  admin: Admin | null;
  onSave: (adminId: number, data: any) => Promise<void>;
}

const AdminEditModal: React.FC<AdminEditModalProps> = ({ isOpen, onClose, admin, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    job_title: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (admin) {
      setFormData({
        name: admin.name,
        email: admin.email,
        department: admin.department || '',
        job_title: admin.job_title || '',
      });
    }
  }, [admin]);

  if (!isOpen || !admin) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(admin.admin_internal_id, formData);
    setIsSaving(false);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className={styles.header}>
            <h2>관리자 정보 수정</h2>
            <button type="button" onClick={onClose} className={styles.closeButton}>
              <X size={24} />
            </button>
          </div>
          <div className={styles.content}>
            <div className={styles.formGroup}>
              <label htmlFor="name">이름</label>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="email">이메일</label>
              <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="department">부서</label>
              <input type="text" id="department" name="department" value={formData.department} onChange={handleChange} />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="job_title">직책</label>
              <input type="text" id="job_title" name="job_title" value={formData.job_title} onChange={handleChange} />
            </div>
          </div>
          <div className={styles.footer}>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              취소
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminEditModal;
