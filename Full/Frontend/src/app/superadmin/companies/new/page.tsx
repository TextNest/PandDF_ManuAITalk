'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X } from 'lucide-react';
import { toast } from '@/store/useToastStore';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import styles from './new-company.module.css';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

export default function NewCompanyPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [contact, setContact] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!name.trim() || !code.trim()) {
      setError('기업명과 기업 코드는 필수 항목입니다.');
      setIsLoading(false);
      return;
    }

    const companyData = {
      name,
      code,
      contact,
    };

    try {
      const response = await fetch(`${apiBaseUrl}/api/superadmin/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '기업 등록에 실패했습니다.');
      }

      toast.success('새 기업이 성공적으로 등록되었습니다.');
      router.push('/superadmin/companies');

    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>새 기업 등록</h1>
        <p>새로운 파트너 기업의 정보를 등록합니다.</p>
      </div>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.card}>
            <Input
              label="기업명"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: (주)세샤트"
              required
              fullWidth
            />
            <Input
              label="기업 코드"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="고유한 코드를 입력하세요 (예: SESHAT_001)"
              required
              fullWidth
            />
            <Input
              label="연락처"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="담당자 연락처 (선택 사항)"
              fullWidth
            />
        </div>
        
        {error && <p className={styles.errorMessage}>{error}</p>}

        <div className={styles.actions}>
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
            <X size={20} />
            취소
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            <Save size={20} />
            {isLoading ? '저장 중...' : '기업 등록'}
          </Button>
        </div>
      </form>
    </div>
  );
}