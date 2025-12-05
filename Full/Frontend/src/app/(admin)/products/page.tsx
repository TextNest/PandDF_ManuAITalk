// ============================================
// 📄 src/app/(admin)/products/page.tsx
// ============================================
// 제품 관리 목록 페이지
// ============================================

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button/Button';
import ProductList from '@/components/product/ProductList/ProductList';
import { Product } from '@/types/product.types';
import styles from './products-page.module.css';
import apiClient from '@/lib/api/client'; // apiClient 임포트

// 카테고리 타입을 문자열 기반으로 변경
interface Category {
  id: string;
  name: string;
}

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'all'>('all'); // 타입을 string으로 변경
  const [products, setProducts] = useState<Product[] | null>(null); // Change initial state to null
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    const fetchProducts = async () => {
      try {
        // apiClient를 사용하여 인증된 요청 전송
        const response = await apiClient.get('/api/products/admin', { signal });
        
        if (response.status !== 200) {
          // apiClient는 에러를 자동으로 처리하지만, 만약을 위한 방어 코드
          throw new Error('제품 목록을 불러오는데 실패했습니다.');
        }

        const productsData: Product[] = response.data;
        setProducts(productsData);

        // 제품 목록에서 카테고리 목록 동적 생성
        const uniqueCategoryNames = [...new Set(productsData.map(p => p.category).filter(Boolean))];
        const categoryObjects: Category[] = uniqueCategoryNames.map(name => ({ id: name as string, name: name as string }));
        setCategories(categoryObjects);

      } catch (err: any) {
        // AbortError(fetch) 또는 CanceledError(axios)는 정상적인 취소이므로 무시
        if (err.name === 'AbortError' || err.name === 'CanceledError') {
          return;
        } else {
          console.error("[fetchProducts] fetch failed:", err);
          setError(err.message || '알 수 없는 오류가 발생했습니다.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();

    return () => {
      abortController.abort();
    };
  }, []);

  // 필터링
  const handleProductDelete = (deletedProductId: string) => {
    setProducts(prevProducts =>
      (prevProducts || []).filter(p => p.product_id !== deletedProductId) // internal_id -> product_id
    );
  };

  const handleProductUpdate = (updatedProduct: Product) => {
    setProducts(prevProducts =>
      (prevProducts || []).map(p =>
        p.product_id === updatedProduct.product_id ? updatedProduct : p // internal_id -> product_id
      )
    );
  };

  const filteredProducts = useMemo(() => {
    return (products || []).filter(product => { // Handle products being null
            const matchesSearch =
              (product.product_name && product.product_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
              (product.product_id && product.product_id.toLowerCase().includes(searchQuery.toLowerCase()));    
      // 카테고리 필터링 로직을 문자열 비교로 변경
      const matchesCategory = 
        selectedCategoryId === 'all' || product.category === selectedCategoryId;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategoryId]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>제품 관리</h1>
          <p className={styles.subtitle}>제품을 등록하고 QR 코드를 생성하세요</p>
        </div>
        <Link href="/products/new">
          <Button variant="primary" size="lg">
            <Plus size={20} />
            제품 등록
          </Button>
        </Link>
      </div>

      <div className={styles.toolbar}>
        {/* 검색 */}
        <div className={styles.searchWrapper}>
          <Search className={styles.searchIcon} size={20} />
          <input
            type="text"
            placeholder="제품명 또는 모델명 검색..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* 카테고리 필터 */}
        <div className={styles.categoryFilter}>
          <Filter size={18} />
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)} // parseInt 제거
            className={styles.categorySelect}
          >
            <option value="all">전체 카테고리</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading || products === null ? ( // Adjust loading condition
        <div className={styles.loading}>로딩 중...</div>
      ) : error ? (
        <div className={styles.error}>오류: {error}</div>
      ) : (
        <>
          {/* 통계 */}
          <div className={styles.stats}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{products.length}</span>
              <span className={styles.statLabel}>전체 제품</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {products.filter(p => p.is_active).length}
              </span>
              <span className={styles.statLabel}>활성 제품</span>
            </div>
          </div>

          {/* 제품 목록 */}
          <ProductList products={filteredProducts} onProductUpdate={handleProductUpdate} onProductDelete={handleProductDelete} />
        </>
      )}
    </div>
  );
}