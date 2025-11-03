'use client';

import { useState, useEffect } from 'react';
import { Clock, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from './RecentSearches.module.css';

export default function RecentSearches() {
  const [searches, setSearches] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    // localStorage에서 최근 검색어 불러오기
    const recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    setSearches(recentSearches);
  }, []);

  const handleClick = (search: string) => {
    router.push(`/chat/${search}`);
  };

  const handleDelete = (e: React.MouseEvent, search: string) => {
    e.stopPropagation();
    const updated = searches.filter((s) => s !== search);
    setSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const handleClearAll = () => {
    setSearches([]);
    localStorage.removeItem('recentSearches');
  };

  if (searches.length === 0) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>
          <Clock size={18} />
          최근 검색
        </h3>
        <button className={styles.clearButton} onClick={handleClearAll}>
          전체 삭제
        </button>
      </div>

      <div className={styles.searchList}>
        {searches.map((search, index) => (
          <div
            key={index}
            className={styles.searchItem}
            onClick={() => handleClick(search)}
          >
            <span className={styles.searchText}>{search}</span>
            <button
              className={styles.deleteButton}
              onClick={(e) => handleDelete(e, search)}
              aria-label="삭제"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}