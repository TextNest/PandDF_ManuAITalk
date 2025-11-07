// ============================================
// 📄 3. src/components/dashboard/StatsCard/StatsCard.tsx
// ============================================
// 통계 카드 컴포넌트
// ============================================

import { FileText, MessageSquare, Clock, HelpCircle, TrendingUp, TrendingDown } from 'lucide-react';
import styles from './StatsCard.module.css';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number; // 변화율 (%)
  icon: 'file' | 'message' | 'clock' | 'help';
  color: 'primary' | 'success' | 'secondary' | 'warning';
}

const iconMap = {
  file: FileText,
  message: MessageSquare,
  clock: Clock,
  help: HelpCircle,
};

export default function StatsCard({ 
  title, 
  value, 
  change, 
  icon, 
  color 
}: StatsCardProps) {
  const Icon = iconMap[icon];
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
        
        {change !== undefined && (
          <div className={`${styles.change} ${isPositive ? styles.positive : isNegative ? styles.negative : ''}`}>
            {isPositive ? <TrendingUp size={16} /> : isNegative ? <TrendingDown size={16} /> : null}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
