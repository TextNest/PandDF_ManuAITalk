// ============================================
// 📄 src/components/superadmin/CompanyCard/CompanyCard.tsx
// ============================================
// 기업 카드 컴포넌트
// ============================================

'use client';

import { useState } from 'react';
import type { Company } from '@/types/company.types';
import { Building2, Users, FileText, MessageSquare, MoreVertical, Edit, Trash2, Power } from 'lucide-react';
import Button from '@/components/ui/Button/Button';
import styles from './CompanyCard.module.css';

interface CompanyCardProps {
  company: Company;
  onEdit?: (company: Company) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: Company['status']) => void;
}

export default function CompanyCard({ 
  company, 
  onEdit, 
  onDelete,
  onStatusChange 
}: CompanyCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const getStatusColor = () => {
    switch (company.status) {
      case 'active': return 'success';
      case 'inactive': return 'warning';
      case 'suspended': return 'error';
      default: return 'secondary';
    }
  };

  const getStatusLabel = () => {
    switch (company.status) {
      case 'active': return '활성';
      case 'inactive': return '비활성';
      case 'suspended': return '정지';
      default: return company.status;
    }
  };

  const getPlanLabel = () => {
    switch (company.plan) {
      case 'basic': return 'Basic';
      case 'premium': return 'Premium';
      case 'enterprise': return 'Enterprise';
      default: return company.plan;
    }
  };

  return (
    <div className={styles.card}>
      {/* 헤더 */}
      <div className={styles.header}>
        <div className={styles.icon}>
          <Building2 size={24} />
        </div>
        <div className={styles.headerInfo}>
          <h3 className={styles.name}>{company.name}</h3>
          <p className={styles.domain}>{company.domain}</p>
        </div>
        <div className={styles.actions}>
          <span className={`${styles.status} ${styles[getStatusColor()]}`}>
            {getStatusLabel()}
          </span>
          <button 
            className={styles.menuButton}
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreVertical size={20} />
          </button>
          
          {showMenu && (
            <div className={styles.menu}>
              <button onClick={() => {
                onEdit?.(company);
                setShowMenu(false);
              }}>
                <Edit size={16} />
                <span>수정</span>
              </button>
              <button onClick={() => {
                const newStatus = company.status === 'active' ? 'inactive' : 'active';
                onStatusChange?.(company.id, newStatus);
                setShowMenu(false);
              }}>
                <Power size={16} />
                <span>{company.status === 'active' ? '비활성화' : '활성화'}</span>
              </button>
              <button 
                className={styles.danger}
                onClick={() => {
                  if (confirm(`${company.name}을(를) 삭제하시겠습니까?`)) {
                    onDelete?.(company.id);
                  }
                  setShowMenu(false);
                }}
              >
                <Trash2 size={16} />
                <span>삭제</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 플랜 */}
      <div className={styles.plan}>
        <span className={styles.planBadge}>{getPlanLabel()}</span>
      </div>

      {/* 통계 */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <FileText size={16} />
          <div>
            <span className={styles.statValue}>{company.stats?.totalDocuments || 0}</span>
            <span className={styles.statLabel}>문서</span>
          </div>
        </div>
        <div className={styles.stat}>
          <MessageSquare size={16} />
          <div>
            <span className={styles.statValue}>
              {company.stats?.totalQueries.toLocaleString() || 0}
            </span>
            <span className={styles.statLabel}>질문</span>
          </div>
        </div>
        <div className={styles.stat}>
          <Users size={16} />
          <div>
            <span className={styles.statValue}>{company.stats?.totalAdmins || 0}</span>
            <span className={styles.statLabel}>관리자</span>
          </div>
        </div>
      </div>

      {/* 연락처 */}
      <div className={styles.contact}>
        <p>{company.contactEmail}</p>
        {company.contactPhone && <p>{company.contactPhone}</p>}
      </div>
    </div>
  );
}