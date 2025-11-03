// ============================================
// 📄 src/components/layout/SuperAdminSidebar/SuperAdminSidebar.tsx
// ============================================
// 슈퍼 관리자 사이드바
// ============================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { LayoutDashboard, Building2, Users, Settings, LogOut } from 'lucide-react';
import styles from './SuperAdminSidebar.module.css';

export default function SuperAdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const menuItems = [
    { 
      icon: LayoutDashboard, 
      label: '대시보드', 
      href: '/superadmin' 
    },
    { 
      icon: Building2, 
      label: '기업 관리', 
      href: '/superadmin/companies' 
    },
    { 
      icon: Users, 
      label: '관리자 관리', 
      href: '/superadmin/users' 
    },
    { 
      icon: Settings, 
      label: '시스템 설정', 
      href: '/superadmin/settings' 
    },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h1 className={styles.logo}>ManuAI-Talk</h1>
        <p className={styles.subtitle}>슈퍼 관리자</p>
      </div>

      {/* 사용자 정보 */}
      <div className={styles.userInfo}>
        <div className={styles.avatar}>
          {user?.name.charAt(0)}
        </div>
        <div className={styles.userDetails}>
          <p className={styles.userName}>{user?.name}</p>
          <p className={styles.userRole}>Super Admin</p>
        </div>
      </div>

      {/* 메뉴 */}
      <nav className={styles.nav}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* 로그아웃 */}
      <button className={styles.logoutButton} onClick={logout}>
        <LogOut size={20} />
        <span>로그아웃</span>
      </button>
    </aside>
  );
}