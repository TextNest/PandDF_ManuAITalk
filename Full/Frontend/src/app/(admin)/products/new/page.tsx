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

      // 백엔드 스키마에 맞게 데이터 매핑
      const productToCreate = {
        product_name: data.product_name,
        product_id: data.product_id,
        category_id: data.category_id,
        manufacturer: data.manufacturer,
        description: data.description,
        release_date: data.releaseDate ? new Date(data.releaseDate).toISOString() : null,
        is_active: data.is_active,
        pdf_path: data.documentIds && data.documentIds.length > 0 ? data.documentIds[0] : null,
        image_url: data.imageUrl,
        model3d_url: data.model3dUrl,
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productToCreate),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '제품 등록 API 호출 실패');
      }
      
      // 성공 시 제품 목록으로 이동
      alert('제품이 성공적으로 등록되었습니다!');
      router.push('/products');
    } catch (error) {
      console.error('제품 등록 실패:', error);
      alert(`제품 등록에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
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