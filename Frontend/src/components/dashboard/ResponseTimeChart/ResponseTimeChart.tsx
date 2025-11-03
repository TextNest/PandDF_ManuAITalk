// ============================================
// 📄 4. src/components/dashboard/ResponseTimeChart/ResponseTimeChart.tsx
// ============================================
// 응답 시간 차트 컴포넌트
// ============================================

'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './ResponseTimeChart.module.css';

const data = [
  { time: '00:00', responseTime: 2.1 },
  { time: '04:00', responseTime: 1.8 },
  { time: '08:00', responseTime: 2.5 },
  { time: '12:00', responseTime: 3.2 },
  { time: '16:00', responseTime: 2.8 },
  { time: '20:00', responseTime: 2.3 },
  { time: '24:00', responseTime: 1.9 },
];

export default function ResponseTimeChart() {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>평균 응답 시간 추이</h3>
      </div>
      
      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorResponseTime" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="time" 
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
              label={{ value: '초', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="responseTime" 
              stroke="#8B5CF6" 
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorResponseTime)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
