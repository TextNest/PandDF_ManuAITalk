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
import { Product, ProductUpdate } from '@/types/product.types';
import styles from './edit-page.module.css';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

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
        const response = await fetch(`${apiBaseUrl}/api/products/${product_id}`, {
          headers: {
            'ngrok-skip-browser-warning': 'true',
          },
        });
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('제품을 찾을 수 없습니다.');
          }
          const errorData = await response.json().catch(() => ({ detail: '알 수 없는 오류' }));
          throw new Error(errorData.detail || `제품 정보를 불러오는데 실패했습니다: ${response.status}`);
        }
        const data: Product = await response.json();
        setProduct(data);
      } catch (err: any) {
        console.error('제품 정보 불러오기 실패:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [product_id]);

  const handleSubmit = async (data: Partial<ProductUpdate>) => {
    try {
      console.log('제품 수정 데이터:', data);

      const response = await fetch(`${apiBaseUrl}/api/products/${product_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: '알 수 없는 오류' }));
        throw new Error(errorData.detail || '제품 수정 API 호출 실패');
      }
      
      alert('제품이 성공적으로 수정되었습니다!');
      router.push('/products');
    } catch (err) {
      console.error('제품 수정 실패:', err);
      alert(`제품 수정에 실패했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
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
