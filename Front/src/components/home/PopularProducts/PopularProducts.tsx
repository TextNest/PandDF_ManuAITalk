'use client';

import { useRouter } from 'next/navigation';
import { TrendingUp, ArrowRight } from 'lucide-react';
import styles from './PopularProducts.module.css';

const popularProducts = [
  { 
    id: 'ac-2024-001', 
    name: '시스템 에어컨 2024', 
    category: '에어컨',
    views: 1245,
    badge: '인기'
  },
  { 
    id: 'ref-premium-500', 
    name: '프리미엄 냉장고 500L', 
    category: '냉장고',
    views: 982,
    badge: 'NEW'
  },
  { 
    id: 'wash-drum-20', 
    name: '드럼세탁기 20kg', 
    category: '세탁기',
    views: 856,
    badge: '인기'
  },
  { 
    id: 'tv-oled-65', 
    name: 'OLED TV 65인치', 
    category: 'TV',
    views: 1520,
    badge: '인기'
  },
  { 
    id: 'ac-wall-500', 
    name: '벽걸이 에어컨 500W', 
    category: '에어컨',
    views: 743,
    badge: null
  },
  { 
    id: 'ref-side-800', 
    name: '양문형 냉장고 800L', 
    category: '냉장고',
    views: 612,
    badge: 'NEW'
  },
];

export default function PopularProducts() {
  const router = useRouter();

  const handleProductClick = (productId: string) => {
    router.push(`/chat/${productId}`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <TrendingUp size={24} />
          인기 제품
        </h3>
        <p className={styles.subtitle}>많은 사용자가 찾는 제품을 만나보세요</p>
      </div>

      <div className={styles.grid}>
        {popularProducts.map((product) => (
          <div
            key={product.id}
            className={styles.card}
            onClick={() => handleProductClick(product.id)}
          >
            {product.badge && (
              <span className={`${styles.badge} ${product.badge === 'NEW' ? styles.badgeNew : styles.badgeHot}`}>
                {product.badge}
              </span>
            )}

            <div className={styles.content}>
              <div className={styles.category}>{product.category}</div>
              <div className={styles.name}>{product.name}</div>
              <div className={styles.meta}>
                <span className={styles.views}>👁 {product.views.toLocaleString()} 조회</span>
              </div>
            </div>

            <div className={styles.footer}>
              <span className={styles.link}>
                자세히 보기
                <ArrowRight size={16} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}