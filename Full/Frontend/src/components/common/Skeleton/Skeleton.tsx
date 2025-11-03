// ============================================
// 📄 1. src/components/common/Skeleton/Skeleton.tsx
// ============================================
// 기본 스켈레톤 컴포넌트
// ============================================

import styles from './Skeleton.module.css';

import type { CSSProperties } from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
  className?: string;
  style?: CSSProperties;
}

export default function Skeleton({ 
  width, 
  height, 
  variant = 'text',
  className = '' 
}: SkeletonProps) {
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={`${styles.skeleton} ${styles[variant]} ${className}`}
      style={{ ...style }}
    />
  );
}