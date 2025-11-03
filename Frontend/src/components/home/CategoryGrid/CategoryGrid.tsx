'use client';

import { useRouter } from 'next/navigation';
import styles from './CategoryGrid.module.css';

const categories = [
  { id: 'air-conditioner', name: '에어컨', icon: '❄️', count: 24 },
  { id: 'refrigerator', name: '냉장고', icon: '🧊', count: 18 },
  { id: 'washing-machine', name: '세탁기', icon: '🌀', count: 15 },
  { id: 'tv', name: 'TV', icon: '📺', count: 32 },
  { id: 'vacuum', name: '청소기', icon: '🧹', count: 12 },
  { id: 'microwave', name: '전자레인지', icon: '🔥', count: 8 },
];

export default function CategoryGrid() {
  const router = useRouter();

  const handleCategoryClick = (categoryId: string) => {
    // 카테고리 검색 페이지로 이동 (임시로 채팅 페이지로)
    router.push(`/chat/${categoryId}`);
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>카테고리별 제품</h3>
      
      <div className={styles.grid}>
        {categories.map((category) => (
          <div
            key={category.id}
            className={styles.card}
            onClick={() => handleCategoryClick(category.id)}
          >
            <div className={styles.iconWrapper}>
              <span className={styles.icon}>{category.icon}</span>
            </div>
            <div className={styles.content}>
              <div className={styles.name}>{category.name}</div>
              <div className={styles.count}>{category.count}개 제품</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}