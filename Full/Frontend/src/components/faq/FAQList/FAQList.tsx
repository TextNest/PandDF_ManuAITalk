// ============================================
// 📄 4. src/components/faq/FAQList/FAQList.tsx
// ============================================

import FAQCard from '../FAQCard/FAQCard';
import { FAQ } from '@/types/faq.types';
import styles from './FAQList.module.css';

interface FAQListProps {
  faqs: FAQ[];
}

export default function FAQList({ faqs }: FAQListProps) {
  if (faqs.length === 0) {
    return (
      <div className={styles.empty}>
        <p>FAQ가 없습니다</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {faqs.map((faq) => (
        <FAQCard key={faq.id} faq={faq} />
      ))}
    </div>
  );
}