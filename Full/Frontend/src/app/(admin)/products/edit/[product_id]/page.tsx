// ============================================
// 📄 src/app/(admin)/products/edit/[product_id]/page.tsx
// ============================================
// 제품 수정 페이지
// ============================================

'use client';

import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import ProductEditForm from '@/components/product/ProductEditForm/ProductEditForm';
import apiClient from '@/lib/api/client';
import { Product, ProductUpdate } from '@/types/product.types';
import styles from './edit-page.module.css';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const product_id = params.product_id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!product_id) return;

    const fetchProduct = async () => {
      try {
        const response = await apiClient.get(`/api/products/${product_id}`);
        if (response.status !== 200) {
          throw new Error('제품 정보를 불러오는데 실패했습니다.');
        }
        setProduct(response.data);
      } catch (err: any) {
        console.error('[ProductEdit] fetch failed:', err);
        setError(err.response?.data?.detail || err.message || '알 수 없는 오류');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [product_id]);

  const handleSubmit = async (data: Partial<ProductUpdate>) => {
    try {
      const response = await apiClient.put(`/api/products/${product_id}`, data);

      if (response.status !== 200) {
        throw new Error(response.data.detail || '제품 수정 API 호출 실패');
      }
      
      alert('제품이 성공적으로 수정되었습니다!');
      router.push('/products');
    } catch (err: any) {
      console.error('[ProductEdit] update failed:', err);
      alert(`제품 수정에 실패했습니다: ${err.response?.data?.detail || err.message || '알 수 없는 오류'}`);
    }
  };

  if (loading) {
    return <div className={styles.page}>로딩 중...</div>;
  }

  if (error) {
    return <div className={styles.page}>오류: {error}</div>;
  }

  if (!product) {
    return <div className={styles.page}>제품을 찾을 수 없습니다.</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/products" className={styles.backButton}>
          <ArrowLeft size={20} />
          제품 목록으로
        </Link>
        <h1>제품 수정</h1>
        <p className={styles.productCode}>제품 코드: {product_id}</p>
      </div>

      <div className={styles.formWrapper}>
        <ProductEditForm onSubmit={handleSubmit} initialData={product} />
      </div>
    </div>
  );
}
