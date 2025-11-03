// ============================================
// 📄 5. src/components/dashboard/QueryAnalytics/QueryAnalytics.tsx
// ============================================
// 질의 분석 차트 컴포넌트
// ============================================

'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './QueryAnalytics.module.css';

type AnalyticsPoint = { name?: string; date?: string; queries: number };

const defaultData: AnalyticsPoint[] = [
  { name: '월', queries: 120 },
  { name: '화', queries: 185 },
  { name: '수', queries: 156 },
  { name: '목', queries: 203 },
  { name: '금', queries: 178 },
  { name: '토', queries: 95 },
  { name: '일', queries: 87 },
];

export default function QueryAnalytics({ data }: { data?: { date: string; queries: number }[] }) {
  const chartData = data && data.length > 0 ? data.map(d => ({ name: d.date, queries: d.queries })) : defaultData;
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>질의 추이</h3>
        <select className={styles.select}>
          <option>최근 7일</option>
          <option>최근 30일</option>
          <option>최근 90일</option>
        </select>
      </div>
      
      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="name" 
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="queries" 
              stroke="#3B82F6" 
              strokeWidth={3}
              dot={{ fill: '#3B82F6', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}