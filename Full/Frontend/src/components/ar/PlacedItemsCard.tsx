// Full/Frontend/src/components/ar/PlacedItemsCard.tsx
'use client';

import { useARStore } from '@/store/useARStore';
import styles from './PlacedItemsCard.module.css';

export default function PlacedItemsCard() {
  const { isARActive, placedItems } = useARStore();

  // Render the card only if AR is active and there are placed items
  if (!isARActive || placedItems.length === 0) {
    return null;
  }

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>배치된 제품 목록</h3>
      <ul className={styles.list}>
        {placedItems.map((item, index) => (
          <li key={item.id || index} className={styles.listItem}>
            <span className={styles.itemName}>{item.name || '알 수 없는 제품'}</span>
            <span className={styles.itemDimensions}>
              (W: {item.width}m, D: {item.depth}m, H: {item.height}m)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
