// ============================================
// 📄 src/components/product/ProductList/ProductList.tsx
// ============================================
// 제품 목록 컴포넌트
// ============================================

import ProductCard from '../ProductCard/ProductCard';
import { Product } from '@/types/product.types';
import styles from './ProductList.module.css';

interface ProductListProps {
  products: Product[];
}

export default function ProductList({ products }: ProductListProps) {
  if (products.length === 0) {
    return (
      <div className={styles.empty}>
        <p>등록된 제품이 없습니다</p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}