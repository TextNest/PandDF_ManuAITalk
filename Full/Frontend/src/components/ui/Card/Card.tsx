// ============================================
// 📄 5. src/components/ui/Card/Card.tsx
// ============================================
// 재사용 가능한 카드 컴포넌트
// ============================================

import { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'sm' | 'md' | 'lg';
  clickable?: boolean;
}

export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  clickable = false,
  className = '',
  ...props
}: CardProps) {
  const classNames = [
    styles.card,
    styles[variant],
    styles[`padding-${padding}`],
    clickable && styles.clickable,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classNames} {...props}>
      {children}
    </div>
  );
}