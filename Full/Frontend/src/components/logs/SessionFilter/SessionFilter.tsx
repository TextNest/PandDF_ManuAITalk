// ============================================
// 📄 2. src/components/logs/SessionFilter/SessionFilter.tsx
// ============================================

'use client';

import { useMemo } from 'react';
import { Search, Filter } from 'lucide-react';
import DatePicker from 'react-datepicker';
import { ko } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import { SessionFilter as FilterType } from '@/types/log.types';
import styles from './SessionFilter.module.css';

interface ProductOption {
  productId: string;
  category: string | null;
}

interface SessionFilterProps {
  filter: FilterType;
  onChangeFilter: (next: FilterType) => void;
  products: ProductOption[];
}

export default function SessionFilterTable({
  filter,
  onChangeFilter,
  products,
}: SessionFilterProps) {
  const updateFilter = (patch: Partial<FilterType>) => {
    onChangeFilter({
      ...filter,
      ...patch,
    });
  };

  const parseDate = (value?: string) => {
    if (!value) return null;
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return undefined;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((p) => p.category)
            .filter((ctg): ctg is string => !!ctg),
        ),
      ),
    [products],
  );

  const filteredProducts = useMemo(
    () =>
      filter.category
        ? products.filter((p) => p.category === filter.category)
        : products,
    [products, filter.category],
  );

  return (
    <div className={styles.toolbar}>
      {/* 세션 ID 검색 */}
      <div className={styles.searchWrapper}>
        <Search className={styles.searchIcon} size={20} />
        <input
          type="text"
          placeholder="세션 ID로 검색"
          className={styles.sessionIdInput}
          value={filter.sessionId ?? ''}
          onChange={(e) =>
            updateFilter({
              sessionId: e.target.value || undefined,
            })
          }
        />
      </div>

      {/* 필터 영역: 아이콘 + 두 줄 */}
      <div className={styles.filterGroup}>
        <div className={styles.leftBlock}>
          <Filter size={18} className={styles.filterIcon} />
        </div>

        <div className={styles.filterColumn}>
          {/* 1줄: 카테고리 + 제품 */}
          <div className={styles.filterRow}>
            <select
              value={filter.category ?? 'all'}
              onChange={(e) =>
                updateFilter({
                  category:
                    e.target.value === 'all' ? undefined : e.target.value,
                  productId: undefined,
                })
              }
              className={styles.filterSelect}
            >
              <option value="all">전체 카테고리</option>
              {categories.map((ctg) => (
                <option key={ctg} value={ctg}>
                  {ctg}
                </option>
              ))}
            </select>

            <select
              value={filter.productId ?? 'all'}
              onChange={(e) =>
                updateFilter({
                  productId:
                    e.target.value === 'all' ? undefined : e.target.value,
                })
              }
              className={styles.filterSelect}
            >
              <option value="all">전체 제품</option>
              {filteredProducts.map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.productId}
                </option>
              ))}
            </select>
          </div>

          {/* 2줄: 상태 + 날짜 범위 */}
          <div className={styles.filterRow}>
            <select
              value={filter.status ?? 'all'}
              onChange={(e) =>
                updateFilter({
                  status:
                    e.target.value === 'all'
                      ? 'all'
                      : (Number(e.target.value) as 1 | 0),
                })
              }
              className={styles.filterSelect}
            >
              <option value="all">전체 상태</option>
              <option value="1">해결</option>
              <option value="0">미해결</option>
            </select>

            <DatePicker
              selected={parseDate(filter.from)}
              onChange={(date) =>
                updateFilter({ from: formatDate(date as Date | null) })
              }
              locale={ko}
              dateFormat="yyyy-MM-dd"
              placeholderText="YYYY-MM-DD"
              className={styles.dateInput}
            />
            <span className={styles.tilde}>~</span>
            <DatePicker
              selected={parseDate(filter.to)}
              onChange={(date) =>
                updateFilter({ to: formatDate(date as Date | null) })
              }
              locale={ko}
              dateFormat="yyyy-MM-dd"
              placeholderText="YYYY-MM-DD"
              className={styles.dateInput}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
