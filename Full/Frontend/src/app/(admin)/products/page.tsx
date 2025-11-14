// ============================================
// 📄 src/app/(admin)/products/page.tsx
// ============================================
// 제품 관리 목록 페이지
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button/Button';
import ProductList from '@/components/product/ProductList/ProductList';
import { Product } from '@/types/product.types';
import styles from './products-page.module.css';

interface Category {
  id: number;
  name: string;
}

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProductsAndCategories = async () => {
      const fetchOptions = {
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      };

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        
        // 카테고리 불러오기
        console.log("Fetching categories from:", `${apiUrl}/api/categories`);
        const categoriesResponse = await fetch(`${apiUrl}/api/categories`, fetchOptions);
        if (!categoriesResponse.ok) {
          throw new Error('카테고리 목록을 불러오는데 실패했습니다.');
        }
        const categoriesText = await categoriesResponse.text();
        console.log("Raw categories response:", categoriesText);
        const categoriesData: Category[] = JSON.parse(categoriesText);
        setCategories(categoriesData);

        // 제품 목록 불러오기
        console.log("Fetching products from:", `${apiUrl}/api/products/`);
        const productsResponse = await fetch(`${apiUrl}/api/products/`, fetchOptions);
        if (!productsResponse.ok) {
          throw new Error('제품 목록을 불러오는데 실패했습니다.');
        }
        const productsText = await productsResponse.text();
        console.log("Raw products response:", productsText);
        const productsData: Product[] = JSON.parse(productsText);
        setProducts(productsData);

      } catch (err: any) {
        console.error("Error in fetchProductsAndCategories:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProductsAndCategories();
  }, []);

  // 필터링
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.product_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = 
      selectedCategoryId === 'all' || product.category.id === selectedCategoryId;

    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <div className={styles.page}>로딩 중...</div>;
  }

  if (error) {
    return <div className={styles.page}>오류: {error}</div>;
  }

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
            onChange={(e) => setSelectedCategoryId(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
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
      <ProductList products={filteredProducts} />
    </div>
  );
}