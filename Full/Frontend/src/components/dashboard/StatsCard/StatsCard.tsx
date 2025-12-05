// ============================================
// 📄 3. src/components/dashboard/StatsCard/StatsCard.tsx
// ============================================
// 통계 카드 컴포넌트
// ============================================


import { FileText, MessageSquare, Clock, HelpCircle, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import styles from './StatsCard.module.css';

interface StatsCardProps {
  title: string;
  value: string | number;
    change?: number; // 변화율 (%)
    icon: 'file' | 'message' | 'bar' | 'help';
    color: 'primary' | 'success' | 'secondary' | 'warning';
}



const iconMap = {
  file: FileText,
  message: MessageSquare,
  clock: Clock,
  help: HelpCircle,
  bar: BarChart3, 
};

export default function StatsCard({ 
  title, 
  value, 
    change,
    icon,
    color 
  }: StatsCardProps) {  const Icon = iconMap[icon];

  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div className={`${styles.card} ${styles[color]}`}>
      <div className={styles.header}>

        <div className={styles.iconWrapper}>
          <Icon size={24} />
        </div>
        <div className={styles.title}>{title}</div>
      </div>
      
      <div className={styles.content}>
        <div className={styles.value}>{value}</div>
        
        {/* change가 undefined가 아니고, 0이 아닐 때만 증감 표시 */}
        {change !== undefined && change !== 0 ? (
          <div className={`${styles.change} ${isPositive ? styles.positive : isNegative ? styles.negative : ''}`}>
            {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>{Math.abs(change)}%</span>
          </div>
        ) : (
          // change가 없거나 0일 때는 '-' 표시
          <div className={styles.change}>
            <span style={{ color: '#9CA3AF' }}>-</span>
          </div>
        )}
        
      </div>
    </div>
  );
}
