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

export default function NewProductPage() {
  const router = useRouter();

  const handleSubmit = async (data: ProductFormData) => {
    try {
      console.log('제품 등록 데이터:', data);
      
      // TODO: 백엔드 API 호출
      // const response = await apiClient.post('/api/products', data);
      
      // 성공 시 제품 목록으로 이동
      alert('제품이 성공적으로 등록되었습니다!');
      router.push('/products');
    } catch (error) {
      console.error('제품 등록 실패:', error);
      alert('제품 등록에 실패했습니다. 다시 시도해주세요.');
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
        <ProductForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
}