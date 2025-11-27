'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Building2, Grid, Box } from 'lucide-react';
import apiClient from '@/lib/api/client';
import styles from './ProductSelector.module.css';

interface Product {
  product_id: string;
  product_name: string;
  category: string;
  company_name: string;
}

export default function ProductSelector() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // 선택된 상태
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');

  // 필터링된 목록
  const [companies, setCompanies] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  // 1. 초기 데이터 로드
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await apiClient.get('/api/products');
        const allProducts = response.data;
        setProducts(allProducts);

        // 유니크한 회사 목록 추출
        const uniqueCompanies = Array.from(new Set(allProducts.map((p: Product) => p.company_name)))
          .filter(Boolean) as string[];
        setCompanies(uniqueCompanies);
      } catch (error) {
        console.error('제품 목록 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // 2. 회사 선택 시 카테고리 필터링
  useEffect(() => {
    if (!selectedCompany) {
      setCategories([]);
      setSelectedCategory('');
      return;
    }

    const companyProducts = products.filter(p => p.company_name === selectedCompany);
    const uniqueCategories = Array.from(new Set(companyProducts.map(p => p.category)))
      .filter(Boolean) as string[];
    setCategories(uniqueCategories);
    setSelectedCategory(''); // 회사 변경 시 카테고리 초기화
  }, [selectedCompany, products]);

  // 3. 카테고리 선택 시 제품 필터링
  useEffect(() => {
    if (!selectedCompany || !selectedCategory) {
      setFilteredProducts([]);
      setSelectedProduct('');
      return;
    }

    const filtered = products.filter(
      p => p.company_name === selectedCompany && p.category === selectedCategory
    );
    setFilteredProducts(filtered);
    setSelectedProduct(''); // 카테고리 변경 시 제품 초기화
  }, [selectedCategory, selectedCompany, products]);

  // 4. 제품 선택 시 채팅방 이동
  const handleProductSelect = (productId: string) => {
    if (!productId) return;
    router.push(`/chat/${productId}`);
  };

  if (loading) return <div className={styles.loading}>제품 목록을 불러오는 중...</div>;

  return (
    <div className={styles.container}>
      {/* 상단: 회사 및 카테고리 선택 (2열 그리드) */}
      <div className={styles.topRow}>
        <div className={styles.selectWrapper}>
          <Building2 className={styles.icon} size={18} />
          <select 
            value={selectedCompany} 
            onChange={(e) => setSelectedCompany(e.target.value)}
            className={styles.select}
          >
            <option value="">회사 선택</option>
            {companies.map(company => (
              <option key={company} value={company}>{company}</option>
            ))}
          </select>
        </div>

        <div className={styles.selectWrapper}>
          <Grid className={styles.icon} size={18} />
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={styles.select}
            disabled={!selectedCompany}
          >
            <option value="">카테고리</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 하단: 제품 선택 (검색창 대체) */}
      <div className={`${styles.selectWrapper} ${styles.productSelect} ${
        selectedCategory ? styles.activeCategory : styles.inactiveCategory
      }`}>
        <Box className={styles.icon} size={20} />
        <select 
          value={selectedProduct} 
          onChange={(e) => handleProductSelect(e.target.value)}
          className={styles.mainSelect}
          disabled={!selectedCategory}
        >
          <option value="">
            {selectedCategory ? '제품을 선택하세요' : '카테고리를 먼저 선택해주세요'}
          </option>
          {filteredProducts.map(product => (
            <option key={product.product_id} value={product.product_id}>
              {product.product_name} ({product.product_id})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}