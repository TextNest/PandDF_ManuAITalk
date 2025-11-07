'use client';

import React, { useState } from 'react';
import styles from './users-page.module.css';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'company_admin';
  companyName?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

const mockUsers: User[] = [
  {
    id: '1',
    name: '슈퍼 관리자',
    email: 'super@seshat.com',
    role: 'super_admin',
    status: 'active',
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    name: '김철수',
    email: 'admin@samsung.com',
    role: 'company_admin',
    companyName: '삼성전자',
    status: 'active',
    createdAt: '2024-01-15',
  },
  {
    id: '3',
    name: '이영희',
    email: 'admin2@samsung.com',
    role: 'company_admin',
    companyName: '삼성전자',
    status: 'active',
    createdAt: '2024-02-10',
  },
  {
    id: '4',
    name: '박민수',
    email: 'admin@lg.com',
    role: 'company_admin',
    companyName: 'LG전자',
    status: 'active',
    createdAt: '2024-02-20',
  },
  {
    id: '5',
    name: '최지원',
    email: 'admin2@lg.com',
    role: 'company_admin',
    companyName: 'LG전자',
    status: 'inactive',
    createdAt: '2024-03-05',
  },
  {
    id: '6',
    name: '정현우',
    email: 'admin@hyundai.com',
    role: 'company_admin',
    companyName: '현대자동차',
    status: 'active',
    createdAt: '2024-03-10',
  },
  {
    id: '7',
    name: '강미래',
    email: 'admin@skhynix.com',
    role: 'company_admin',
    companyName: 'SK하이닉스',
    status: 'inactive',
    createdAt: '2024-04-05',
  },
  {
    id: '8',
    name: '윤서준',
    email: 'admin@naver.com',
    role: 'company_admin',
    companyName: '네이버',
    status: 'active',
    createdAt: '2024-04-18',
  },
];

export default function UsersPage() {
  const [users] = useState<User[]>(mockUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'super_admin' | 'company_admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadge = (role: User['role']) => {
    const badges = {
      super_admin: { text: '슈퍼 관리자', color: styles.roleSuperAdmin },
      company_admin: { text: '기업 관리자', color: styles.roleCompanyAdmin },
    };
    return badges[role];
  };

  const getStatusBadge = (status: User['status']) => {
    const badges = {
      active: { text: '활성', color: styles.statusActive },
      inactive: { text: '비활성', color: styles.statusInactive },
    };
    return badges[status];
  };

  // 통계 계산
  const stats = {
    total: users.length,
    superAdmins: users.filter(u => u.role === 'super_admin').length,
    companyAdmins: users.filter(u => u.role === 'company_admin').length,
    active: users.filter(u => u.status === 'active').length,
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>관리자 관리</h1>
          <p>시스템의 모든 관리자 계정을 관리합니다</p>
        </div>
        <button className={styles.addButton}>+ 새 관리자 추가</button>
      </div>

      {/* 통계 카드 */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>👥</div>
          <div className={styles.statContent}>
            <h3>전체 사용자</h3>
            <p className={styles.statNumber}>{stats.total}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>⭐</div>
          <div className={styles.statContent}>
            <h3>슈퍼 관리자</h3>
            <p className={styles.statNumber}>{stats.superAdmins}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>👔</div>
          <div className={styles.statContent}>
            <h3>기업 관리자</h3>
            <p className={styles.statNumber}>{stats.companyAdmins}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>✅</div>
          <div className={styles.statContent}>
            <h3>활성 사용자</h3>
            <p className={styles.statNumber}>{stats.active}</p>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className={styles.controls}>
        <input
          type="text"
          placeholder="이름, 이메일, 기업명 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        
        <div className={styles.filters}>
          <select 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className={styles.select}
          >
            <option value="all">모든 역할</option>
            <option value="super_admin">슈퍼 관리자</option>
            <option value="company_admin">기업 관리자</option>
          </select>

          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className={styles.select}
          >
            <option value="all">모든 상태</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </select>
        </div>
      </div>

      {/* 사용자 테이블 */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>이름</th>
              <th>이메일</th>
              <th>역할</th>
              <th>소속 기업</th>
              <th>상태</th>
              <th>가입일</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => {
              const roleBadge = getRoleBadge(user.role);
              const statusBadge = getStatusBadge(user.status);

              return (
                <tr key={user.id}>
                  <td>
                    <div className={styles.userCell}>
                      <div className={styles.avatar}>
                        {user.name.charAt(0)}
                      </div>
                      <span className={styles.userName}>{user.name}</span>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`${styles.roleBadge} ${roleBadge.color}`}>
                      {roleBadge.text}
                    </span>
                  </td>
                  <td>{user.companyName || '-'}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${statusBadge.color}`}>
                      {statusBadge.text}
                    </span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString('ko-KR')}</td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.actionButton}>수정</button>
                      <button className={styles.menuButton}>⋮</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className={styles.emptyState}>
            <p>검색 결과가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}