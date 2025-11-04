'use client';

import React, { useState } from 'react';
import styles from './companies-page.module.css';

interface Company {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  documentCount: number;
  questionCount: number;
  adminCount: number;
  createdAt: string;
  registrationCode: string;
}

const mockCompanies: Company[] = [
  {
    id: '1',
    name: '삼성전자',
    status: 'active',
    documentCount: 89,
    questionCount: 543,
    adminCount: 8,
    createdAt: '2024-01-15',
    registrationCode: 'SAMSUNG24',
  },
  {
    id: '2',
    name: 'LG전자',
    status: 'active',
    documentCount: 67,
    questionCount: 421,
    adminCount: 5,
    createdAt: '2024-02-20',
    registrationCode: 'LG2024XY',
  },
  {
    id: '3',
    name: '현대자동차',
    status: 'active',
    documentCount: 52,
    questionCount: 389,
    adminCount: 6,
    createdAt: '2024-03-10',
    registrationCode: 'HYUNDAI8',
  },
  {
    id: '4',
    name: 'SK하이닉스',
    status: 'inactive',
    documentCount: 26,
    questionCount: 194,
    adminCount: 3,
    createdAt: '2024-04-05',
    registrationCode: 'SKHYNIX9',
  },
  {
    id: '5',
    name: '네이버',
    status: 'active',
    documentCount: 45,
    questionCount: 298,
    adminCount: 4,
    createdAt: '2024-04-18',
    registrationCode: 'NAVER123',
  },
];

const generateRegistrationCode = (companyName: string): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  const prefix = companyName.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase();
  code += prefix;
  for (let i = 0; i < 5; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>(mockCompanies);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const filteredCompanies = companies.filter((company) => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || company.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Company['status']) => {
    const badges = {
      active: { text: '활성', color: styles.statusActive },
      inactive: { text: '비활성', color: styles.statusInactive },
      suspended: { text: '정지', color: styles.statusSuspended },
    };
    return badges[status];
  };

  const toggleMenu = (companyId: string) => {
    setOpenMenuId(openMenuId === companyId ? null : companyId);
  };

  const showCode = (company: Company) => {
    setSelectedCompany(company);
    setShowCodeModal(true);
    setOpenMenuId(null);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const regenerateCode = (companyId: string, companyName: string) => {
    const newCode = generateRegistrationCode(companyName);
    setCompanies(companies.map(c => 
      c.id === companyId ? { ...c, registrationCode: newCode } : c
    ));
    setSelectedCompany(prev => prev ? { ...prev, registrationCode: newCode } : null);
    alert(`새로운 가입 코드가 생성되었습니다: ${newCode}`);
  };

  const handleEdit = (company: Company) => {
    alert(`${company.name} 수정 기능은 추후 구현 예정입니다.`);
    setOpenMenuId(null);
  };

  const handleToggleStatus = (company: Company) => {
    const newStatus = company.status === 'active' ? 'inactive' : 'active';
    setCompanies(companies.map(c => 
      c.id === company.id ? { ...c, status: newStatus } : c
    ));
    setOpenMenuId(null);
  };

  const handleDelete = (company: Company) => {
    if (confirm(`정말 ${company.name}를 삭제하시겠습니까?`)) {
      setCompanies(companies.filter(c => c.id !== company.id));
      setOpenMenuId(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>기업 관리</h1>
          <p>등록된 기업을 관리합니다</p>
        </div>
        <button className={styles.addButton}>+ 새 기업 등록</button>
      </div>

      <div className={styles.controls}>
        <input
          type="text"
          placeholder="기업명 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        <div className={styles.filterButtons}>
          <button
            className={`${styles.filterButton} ${statusFilter === 'all' ? styles.active : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            전체
          </button>
          <button
            className={`${styles.filterButton} ${statusFilter === 'active' ? styles.active : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            활성
          </button>
          <button
            className={`${styles.filterButton} ${statusFilter === 'inactive' ? styles.active : ''}`}
            onClick={() => setStatusFilter('inactive')}
          >
            비활성
          </button>
        </div>
      </div>

      <div className={styles.companiesGrid}>
        {filteredCompanies.map((company) => {
          const badge = getStatusBadge(company.status);
          return (
            <div key={company.id} className={styles.companyCard}>
              <div className={styles.cardHeader}>
                <h3>{company.name}</h3>
                <div className={styles.cardActions}>
                  <span className={`${styles.statusBadge} ${badge.color}`}>
                    {badge.text}
                  </span>
                  <div className={styles.menuWrapper}>
                    <button 
                      className={styles.menuButton}
                      onClick={() => toggleMenu(company.id)}
                    >
                      ⋮
                    </button>
                    {openMenuId === company.id && (
                      <div className={styles.dropdown}>
                        <button 
                          className={styles.dropdownItem}
                          onClick={() => showCode(company)}
                        >
                          🔑 가입 코드 보기
                        </button>
                        <button 
                          className={styles.dropdownItem}
                          onClick={() => handleEdit(company)}
                        >
                          ✏️ 기업 수정
                        </button>
                        <button 
                          className={styles.dropdownItem}
                          onClick={() => handleToggleStatus(company)}
                        >
                          {company.status === 'active' ? '⏸️ 비활성화' : '▶️ 활성화'}
                        </button>
                        <button 
                          className={`${styles.dropdownItem} ${styles.dropdownDanger}`}
                          onClick={() => handleDelete(company)}
                        >
                          🗑️ 삭제
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.cardStats}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>문서</span>
                  <span className={styles.statValue}>{company.documentCount}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>질문</span>
                  <span className={styles.statValue}>{company.questionCount}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>관리자</span>
                  <span className={styles.statValue}>{company.adminCount}</span>
                </div>
              </div>

              <div className={styles.cardFooter}>
                <span className={styles.createdDate}>
                  등록일: {new Date(company.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCompanies.length === 0 && (
        <div className={styles.emptyState}>
          <p>검색 결과가 없습니다.</p>
        </div>
      )}

      {/* 가입 코드 모달 */}
      {showCodeModal && selectedCompany && (
        <div className={styles.modalOverlay} onClick={() => setShowCodeModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>🔑 가입 코드 관리</h2>
              <button 
                className={styles.closeButton}
                onClick={() => setShowCodeModal(false)}
              >
                ×
              </button>
            </div>

            <div className={styles.modalContent}>
              <div className={styles.modalCompanyInfo}>
                <h3>{selectedCompany.name}</h3>
                <p>이 코드로 새로운 관리자가 회원가입할 수 있습니다</p>
              </div>

              <div className={styles.modalCodeDisplay}>
                <label>현재 가입 코드</label>
                <div className={styles.codeBox}>
                  <code className={styles.bigCode}>{selectedCompany.registrationCode}</code>
                  <button 
                    className={styles.copyButtonLarge}
                    onClick={() => copyCode(selectedCompany.registrationCode)}
                  >
                    {copiedCode === selectedCompany.registrationCode ? '✓ 복사됨' : '📋 복사'}
                  </button>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button 
                  className={styles.regenerateButton}
                  onClick={() => regenerateCode(selectedCompany.id, selectedCompany.name)}
                >
                  🔄 새 코드 생성
                </button>
                <button 
                  className={styles.cancelButton}
                  onClick={() => setShowCodeModal(false)}
                >
                  닫기
                </button>
              </div>

              <div className={styles.modalWarning}>
                <p>⚠️ 주의사항</p>
                <ul>
                  <li>가입 코드는 관리자에게만 공유하세요</li>
                  <li>코드를 재생성하면 기존 코드는 사용할 수 없습니다</li>
                  <li>이미 가입한 관리자는 영향을 받지 않습니다</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 메뉴 닫기용 배경 클릭 영역 */}
      {openMenuId && (
        <div 
          className={styles.menuBackdrop}
          onClick={() => setOpenMenuId(null)}
        />
      )}
    </div>
  );
}