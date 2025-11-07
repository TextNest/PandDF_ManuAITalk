// ============================================
// 📄 src/app/(admin)/products/page.tsx
// ============================================
// 제품 관리 목록 페이지
// ============================================

'use client';

import { useState } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button/Button';
import ProductList from '@/components/product/ProductList/ProductList';
import { Product, ProductCategory } from '@/types/product.types';
import styles from './products-page.module.css';

// ============================================
// 📄 Mock 데이터 (TODO: 백엔드 연동)
// ============================================
const mockProducts: Product[] = [
  {
    id: 'product-1',
    name: '시스템 에어컨 2024',
    model: 'AC-2024-001',
    category: '에어컨',
    manufacturer: 'LG전자',
    description: '에너지 효율 1등급 인버터 시스템 에어컨',
    status: 'active',
    qrCodeUrl: '/chat/product-1',
    documentIds: ['doc-1', 'doc-2'],
    imageUrl: '/images/products/ac-2024.jpg',
    viewCount: 1234,
    questionCount: 89,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-20'),
    createdBy: 'admin@example.com',
  },
  {
    id: 'product-2',
    name: '양문형 냉장고 프리미엄',
    model: 'RF-2024-002',
    category: '냉장고',
    manufacturer: '삼성전자',
    description: '대용량 양문형 냉장고 (800L)',
    status: 'active',
    qrCodeUrl: '/chat/product-2',
    documentIds: ['doc-3'],
    viewCount: 856,
    questionCount: 67,
    createdAt: new Date('2025-01-10'),
    updatedAt: new Date('2025-01-18'),
    createdBy: 'admin@example.com',
  },
  {
    id: 'product-3',
    name: '드럼세탁기 AI',
    model: 'WM-2024-003',
    category: '세탁기',
    manufacturer: 'LG전자',
    description: 'AI 자동세탁 드럼세탁기 (21kg)',
    status: 'inactive',
    qrCodeUrl: '/chat/product-3',
    documentIds: ['doc-4', 'doc-5'],
    viewCount: 645,
    questionCount: 45,
    createdAt: new Date('2025-01-05'),
    updatedAt: new Date('2025-01-15'),
    createdBy: 'admin@example.com',
  },
];

const CATEGORIES: ProductCategory[] = [
  '에어컨',
  '냉장고',
  '세탁기',
  'TV',
  '청소기',
  '공기청정기',
  '기타',
];

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [products] = useState<Product[]>(mockProducts);

  // 필터링
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.model.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === 'all' || product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

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
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as ProductCategory | 'all')}
            className={styles.categorySelect}
          >
            <option value="all">전체 카테고리</option>
            {CATEGORIES.map(category => (
              <option key={category} value={category}>
                {category}
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
            {products.filter(p => p.status === 'active').length}
          </span>
          <span className={styles.statLabel}>활성 제품</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>
            {products.reduce((sum, p) => sum + p.viewCount, 0)}
          </span>
          <span className={styles.statLabel}>총 조회수</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>
            {products.reduce((sum, p) => sum + p.questionCount, 0)}
          </span>
          <span className={styles.statLabel}>총 질문수</span>
        </div>
      </div>

      {/* 제품 목록 */}
      <ProductList products={filteredProducts} />
    </div>
  );
}