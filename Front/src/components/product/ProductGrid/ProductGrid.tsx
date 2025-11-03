// ============================================
// 📄 4. src/components/product/ProductGrid/ProductGrid.tsx
// ============================================
// 제품 그리드 뷰
// ============================================

import ProductCard from '../ProductCard/ProductCard';
import { Product } from '@/types/product.types';
import styles from './ProductGrid.module.css';

interface ProductGridProps {
  products: Product[];
}

export default function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className={styles.empty}>
        <p>제품이 없습니다</p>
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