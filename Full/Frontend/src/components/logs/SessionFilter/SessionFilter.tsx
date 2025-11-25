// ============================================
// 📄 2. src/components/logs/SessionFilter/SessionFilter.tsx
// ============================================
// 세션 조회 필터 컴포넌트
// ============================================

'use client';

import {Search, Filter} from 'lucide-react';
import DatePicker from 'react-datepicker';
import {ko} from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import { SessionFilter as FilterType, SessionStatus } from '@/types/log.types';
import styles from './SessionFilter.module.css';

interface ProductOption {
  productId: string;
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

  return (
    <div className={styles.toolbar}>
      {/* 세션 ID 검색 */}
      <div className={styles.searchWrapper}>
        <Search className={styles.searchIcon} size={20} />
        <input
          type='text'
          placeholder='세션 ID로 검색'
          className={styles.sessionIdInput}
          value={filter.sessionId ?? ''}
          onChange={(e) =>
            updateFilter({
              sessionId: e.target.value || undefined,
            })
          }
        />
      </div>

      <div className={styles.filterGroup}>
        <Filter size={18} />

        {/* 제품 선택 */}
        <select
          value={filter.productId ?? 'all'}
          onChange={(e) =>
            updateFilter({
              productId: e.target.value === 'all' ? undefined : e.target.value,
            })
          }
          className={styles.filterSelect}
        >
          <option value='all'>전체 제품</option>
          {products.map((p) => (
            <option key={p.productId} value={p.productId}>
              {p.productId}
            </option>
          ))}
        </select>

        {/* 상태 선택 */}
        <select
          value={filter.status ?? 'all'}
          onChange={(e) =>
            updateFilter({
              status: e.target.value as SessionStatus | 'all',
            })
          }
          className={styles.filterSelect}
        >
          <option value='all'>미분류</option>
          <option value='resolved'>해결</option>
          <option value='unresolved'>미해결</option>
        </select>

        {/* 날짜 from/to */}
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
  );
}
