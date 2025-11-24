'use client';

import React, { useState, useEffect, useRef } from 'react'; // useRef 추가
import styles from './companies-page.module.css';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/store/useToastStore';

import apiClient from '@/lib/api/client';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

interface Company {
  company_internal_id: number;
  name: string;
  code: string; // 관리 코드로 사용
  contact: string;
  is_active: 0 | 1;
  created_at: string;
  updated_at: string;
  admin_count: number; // 관리자 수 필드 추가
}

// 로딩 상태를 위한 스켈레톤 컴포넌트
const CompanyCardSkeleton = () => (
    <div className={`${styles.companyCard} ${styles.skeleton}`}>
        <div className={styles.cardHeader}>
            <div className={styles.skeletonTitle}></div>
            <div className={styles.skeletonStatus}></div>
        </div>
        <div className={styles.cardBody}>
            <div className={styles.skeletonContact}></div>
        </div>
        <div className={styles.cardFooter}>
            <div className={styles.skeletonDate}></div>
        </div>
    </div>
);

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 0 | 1>('all');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null); // 메뉴 참조를 위한 ref

  // 메뉴 외부 클릭 감지 useEffect
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchCompanies = async () => {
      setLoading(true);
      setError(null);
      try {
        const authStorage = localStorage.getItem('auth-storage');
        const token = authStorage ? JSON.parse(authStorage).state.token : null;
        if (!token) {
          throw new Error('인증 토큰이 없습니다. 먼저 로그인해주세요.');
        }

        const response = await apiClient.get(`/api/superadmin/companies`);

        setCompanies(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);
  
  const filteredCompanies = companies.filter((company) => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || company.is_active === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Company['is_active']) => {
    const badges = {
      1: { text: '활성', color: styles.statusActive },
      0: { text: '비활성', color: styles.statusInactive },
    };
    return badges[status] || { text: '알 수 없음', color: '' };
  };

  const toggleMenu = (companyId: number) => {
    setOpenMenuId(prevId => prevId === companyId ? null : companyId);
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

  const regenerateCode = (companyId: number, companyName: string) => {
    alert(`API 연동 필요: ${companyName}의 코드 재생성`);
  };

  const handleEdit = (company: Company) => {
    alert(`${company.name} 수정 기능은 추후 구현 예정입니다.`);
    setOpenMenuId(null);
  };

  const handleToggleStatus = async (company: Company) => {
    const originalStatus = company.is_active; // 원래 상태 저장
    const newStatus = originalStatus === 1 ? 0 : 1;
    const actionText = newStatus === 1 ? '활성화' : '비활성화';

    // Optimistic UI Update
    setCompanies(prevCompanies => 
      prevCompanies.map(c => 
        c.company_internal_id === company.company_internal_id 
          ? { ...c, is_active: newStatus } 
          : c
      )
    );
    setOpenMenuId(null); // 메뉴 닫기

    try {
      await apiClient.put(`/api/superadmin/companies/${company.company_internal_id}/status`, {
        is_active: newStatus
      });
      
      toast.success(`'${company.name}' 기업이 성공적으로 ${actionText}되었습니다.`);

    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      toast.error(`'${company.name}' 기업 ${actionText}에 실패했습니다. (오류: ${message})`);
      setError(message);

      // Rollback UI on error
      setCompanies(prevCompanies => 
        prevCompanies.map(c => 
          c.company_internal_id === company.company_internal_id 
            ? { ...c, is_active: originalStatus } 
            : c
        )
      );
    }
  };

  const handleDelete = async (company: Company) => {
    // 메뉴를 먼저 닫음
    setOpenMenuId(null);

    // 약간의 딜레이 후 confirm 창 호출
    setTimeout(() => {
      if (confirm(`정말 ${company.name} 기업을 삭제하시겠습니까?`)) {
        const deleteRequest = async () => {
          try {
            await apiClient.delete(`/api/superadmin/companies/${company.company_internal_id}`);
            
            setCompanies(prevCompanies => prevCompanies.filter(c => c.company_internal_id !== company.company_internal_id));
            toast.success(`'${company.name}' 기업이 성공적으로 삭제되었습니다.`);
            
          } catch (err) {
            const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
            toast.error(message);
            setError(message);
          }
        };
        deleteRequest();
      }
    }, 100); // 100ms 딜레이
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>기업 관리</h1>
          <p>등록된 기업을 관리합니다</p>
        </div>
        <Link href="/superadmin/companies/new" className={styles.addButton}>+ 새 기업 등록</Link>
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
            className={`${styles.filterButton} ${statusFilter === 1 ? styles.active : ''}`}
            onClick={() => setStatusFilter(1)}
          >
            활성
          </button>
          <button
            className={`${styles.filterButton} ${statusFilter === 0 ? styles.active : ''}`}
            onClick={() => setStatusFilter(0)}
          >
            비활성
          </button>
        </div>
      </div>

      {error && <div className={styles.errorState}><p>{error}</p></div>}

      <div className={styles.companiesGrid}>
        {loading ? (
            Array.from({ length: 5 }).map((_, index) => <CompanyCardSkeleton key={index} />)
        ) : (
            filteredCompanies.map((company) => {
            const badge = getStatusBadge(company.is_active);
            return (
              <div
                key={company.company_internal_id}
                className={styles.companyCard}
                onClick={() => router.push(`/superadmin/companies/${company.company_internal_id}`)}
              >
                <div className={styles.cardHeader}>
                  <h3>{company.name}</h3>
                  <div className={styles.cardActions}>
                    <span className={`${styles.statusBadge} ${badge.color}`}>
                      {badge.text}
                    </span>
                    <div className={styles.menuWrapper} ref={openMenuId === company.company_internal_id ? menuRef : null}>
                      <button
                        className={styles.menuButton}
                        onClick={(e) => { e.stopPropagation(); toggleMenu(company.company_internal_id); }}
                      >
                        ⋮
                      </button>
                      {openMenuId === company.company_internal_id && (
                        <div className={styles.dropdown}>
                          <button
                            className={styles.dropdownItem}
                            onClick={(e) => { e.stopPropagation(); showCode(company); }}
                          >
                            🔑 가입 코드 보기
                          </button>
                          <button
                            className={styles.dropdownItem}
                            onClick={(e) => { e.stopPropagation(); handleEdit(company); }}
                          >
                            ✏️ 기업 수정
                          </button>
                          <button
                            className={styles.dropdownItem}
                            onClick={(e) => { e.stopPropagation(); handleToggleStatus(company); }}
                          >
                            {company.is_active === 1 ? '⏸️ 비활성화' : '▶️ 활성화'}
                          </button>
                          <button
                            className={`${styles.dropdownItem} ${styles.dropdownDanger}`}
                            onClick={(e) => { 
                              e.preventDefault();
                              e.stopPropagation();
                              handleDelete(company);
                            }}
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
                    <span className={styles.statLabel}>관리자</span>
                    <span className={styles.statValue}>{company.admin_count}</span>
                  </div>
                </div>

                <div className={styles.cardCode}>
                  <span className={styles.cardCodeLabel}>코드:</span>
                  <code className={styles.cardCodeValue}>{company.code}</code>
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.createdDate}>
                    등록일: {new Date(company.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>
            );
            })
        )}
      </div>

      {!loading && filteredCompanies.length === 0 && (
        <div className={styles.emptyState}>
          <p>표시할 기업이 없습니다.</p>
        </div>
      )}
      
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
                  <code className={styles.bigCode}>{selectedCompany.code}</code>
                  <button 
                    className={styles.copyButtonLarge}
                    onClick={() => copyCode(selectedCompany.code)}
                  >
                    {copiedCode === selectedCompany.code ? '✓ 복사됨' : '📋 복사'}
                  </button>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button 
                  className={styles.regenerateButton}
                  onClick={() => regenerateCode(selectedCompany.company_internal_id, selectedCompany.name)}
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
            </div>
          </div>
        </div>
      )}
      
      {/* 메뉴 닫기용 배경 클릭 영역은 useEffect로 대체됨 */}
    </div>
  );
}
