// ============================================
// 📄 src/app/(admin)/products/new/page.tsx
// ============================================
// 제품 등록 페이지
// ============================================

'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ProductForm from '@/components/product/ProductForm/ProductForm';
import { ProductFormData } from '@/types/product.types';
import styles from './new-page.module.css';
import apiClient from '@/lib/api/client';

export default function NewProductPage() {
  const router = useRouter();

  const handleSubmit = async (data: Omit<ProductFormData, 'company_internal_id'>) => {
    try {
      console.log('제품 등록 데이터:', data);

      // apiClient를 사용하여 인증된 요청 전송
      await apiClient.post('/api/products/', data);
      
      // 성공 시 제품 목록으로 이동
      alert('제품이 성공적으로 등록되었습니다! AI 분석이 시작됩니다.');
      router.push('/products');
      router.refresh(); // 페이지를 새로고침하여 목록에 새 제품이 보이도록 함
      
    } catch (error: any) {
      console.error('제품 등록 실패:', error);
      
      // API 에러 응답에서 상세 메시지 추출
      let errorMessage = '알 수 없는 오류가 발생했습니다.';
      if (error.response && error.response.data && error.response.data.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          // FastAPI 유효성 검사 오류 처리
          errorMessage = detail.map(d => `${d.loc.join('.')} - ${d.msg}`).join('\n');
        } else {
          errorMessage = JSON.stringify(detail);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`제품 등록에 실패했습니다:\n${errorMessage}`);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/products" className={styles.backButton}>
          <ArrowLeft size={20} />
          제품 목록으로
        </Link>
        <h1>제품 등록</h1>
        <p className={styles.subtitle}>
          새로운 제품을 등록하고 QR 코드를 생성하세요
        </p>
      </div>

      <div className={styles.formWrapper}>
        <ProductForm onSubmit={handleSubmit} onCancel={() => router.push('/products')} />
      </div>
    </div>
  );
}