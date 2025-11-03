'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from './SearchBar.module.css';

interface SearchBarProps {
  onSearch?: (query: string) => void;
}

// Mock 제품 데이터
const mockProducts = [
  { id: 'ac-2024-001', name: '시스템 에어컨 2024', category: '에어컨' },
  { id: 'ac-wall-500', name: '벽걸이 에어컨 500W', category: '에어컨' },
  { id: 'ref-premium-500', name: '프리미엄 냉장고 500L', category: '냉장고' },
  { id: 'ref-side-800', name: '양문형 냉장고 800L', category: '냉장고' },
  { id: 'wash-drum-20', name: '드럼세탁기 20kg', category: '세탁기' },
  { id: 'wash-top-15', name: '통돌이 세탁기 15kg', category: '세탁기' },
  { id: 'tv-oled-65', name: 'OLED TV 65인치', category: 'TV' },
  { id: 'tv-qled-75', name: 'QLED TV 75인치', category: 'TV' },
];

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<typeof mockProducts>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.trim().length > 0) {
      const filtered = mockProducts.filter(
        (product) =>
          product.name.toLowerCase().includes(query.toLowerCase()) ||
          product.id.toLowerCase().includes(query.toLowerCase()) ||
          product.category.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query]);

  const handleSearch = (productId?: string) => {
    const searchQuery = productId || query.trim();
    if (!searchQuery) return;

    // 최근 검색어 저장
    const recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    const newSearches = [
      searchQuery,
      ...recentSearches.filter((s: string) => s !== searchQuery),
    ].slice(0, 5);
    localStorage.setItem('recentSearches', JSON.stringify(newSearches));

    // 채팅 페이지로 이동
    router.push(`/chat/${productId || searchQuery}`);
    setQuery('');
    setShowSuggestions(false);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className={styles.searchBar}>
      <div className={styles.inputWrapper}>
        <Search className={styles.searchIcon} size={20} />
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          placeholder="제품명이나 모델명을 검색하세요..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        {query && (
          <button className={styles.clearButton} onClick={handleClear}>
            <X size={18} />
          </button>
        )}
        <button className={styles.searchButton} onClick={() => handleSearch()}>
          검색
        </button>
      </div>

      {/* 자동완성 */}
      {showSuggestions && suggestions.length > 0 && (
        <div className={styles.suggestions}>
          {suggestions.map((product) => (
            <div
              key={product.id}
              className={styles.suggestionItem}
              onClick={() => handleSearch(product.id)}
            >
              <Search size={16} className={styles.suggestionIcon} />
              <div className={styles.suggestionContent}>
                <div className={styles.suggestionName}>{product.name}</div>
                <div className={styles.suggestionMeta}>
                  {product.category} · {product.id}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}