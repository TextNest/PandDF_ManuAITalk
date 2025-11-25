// ============================================
// 📄 10. src/components/layout/Sidebar/Sidebar.tsx
// ============================================
// 관리자 사이드바
// ============================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  MessageCircle, 
  BarChart3, 
  Package,
  Settings,
  X // X 아이콘 추가
} from 'lucide-react';
import styles from './Sidebar.module.css';

const menuItems = [
  {
    icon: LayoutDashboard,
    label: '대시보드',
    href: '/dashboard',
  },
  {
    icon: Package,
    label: '제품 관리',
    href: '/products',
  },
  // {
  //   icon: FileText,
  //   label: '문서 관리',
  //   href: '/documents',
  // },
  {
    icon: MessageCircle,
    label: 'FAQ 관리',
    href: '/faq',
  },
  {
    icon: BarChart3,
    label: '로그 분석',
    href: '/logs',
  },
  {
    icon: Settings,
    label: '설정',
    href: '/profile',
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  
  return (
    <>
      {/* 모바일에서 사이드바 열렸을 때 배경 */}
      <div 
        className={`${styles.backdrop} ${isOpen ? styles.backdropVisible : ''}`}
        onClick={onClose}
      />
      <aside className={`${styles.sidebar} ${isOpen ? styles.mobileOpen : ''}`}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <h2>ManuAI-Talk</h2>
            <span className={styles.badge}>Admin</span>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <nav className={styles.nav}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link 
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                onClick={onClose} // 메뉴 클릭 시 사이드바 닫기
              >
                <Icon className={styles.icon} size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
