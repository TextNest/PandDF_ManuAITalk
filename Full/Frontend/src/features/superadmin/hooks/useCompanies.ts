// ============================================
// 📄 src/features/superadmin/hooks/useCompanies.ts
// ============================================
// 기업 관리 훅
// ============================================

import { useState, useEffect } from 'react';
import type { Company } from '@/types/company.types';

interface UseCompaniesOptions {
  searchQuery?: string;
  statusFilter?: 'all' | 'active' | 'inactive' | 'suspended';
}

export function useCompanies(options: UseCompaniesOptions = {}) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, [options.searchQuery, options.statusFilter]);

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      
      // Mock 데이터 (1초 딜레이)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockCompanies: Company[] = [
        {
          id: 'company-001',
          name: '삼성전자',
          domain: 'samsung.com',
          contactEmail: 'admin@samsung.com',
          contactPhone: '02-2255-0114',
          status: 'active',
          plan: 'enterprise',
          createdAt: '2024-10-01T00:00:00Z',
          updatedAt: '2024-10-20T00:00:00Z',
          stats: {
            totalDocuments: 128,
            totalProducts: 45,
            totalQueries: 5847,
            totalAdmins: 8,
          },
        },
        {
          id: 'company-002',
          name: 'LG전자',
          domain: 'lg.com',
          contactEmail: 'admin@lg.com',
          contactPhone: '02-3777-1114',
          status: 'active',
          plan: 'premium',
          createdAt: '2024-10-05T00:00:00Z',
          updatedAt: '2024-10-19T00:00:00Z',
          stats: {
            totalDocuments: 98,
            totalProducts: 32,
            totalQueries: 4523,
            totalAdmins: 6,
          },
        },
        {
          id: 'company-003',
          name: '현대자동차',
          domain: 'hyundai.com',
          contactEmail: 'admin@hyundai.com',
          contactPhone: '02-3464-1114',
          status: 'active',
          plan: 'enterprise',
          createdAt: '2024-09-20T00:00:00Z',
          updatedAt: '2024-10-18T00:00:00Z',
          stats: {
            totalDocuments: 76,
            totalProducts: 28,
            totalQueries: 3201,
            totalAdmins: 5,
          },
        },
        {
          id: 'company-004',
          name: 'SK하이닉스',
          domain: 'skhynix.com',
          contactEmail: 'admin@skhynix.com',
          status: 'inactive',
          plan: 'basic',
          createdAt: '2024-09-10T00:00:00Z',
          updatedAt: '2024-10-01T00:00:00Z',
          stats: {
            totalDocuments: 54,
            totalProducts: 18,
            totalQueries: 2156,
            totalAdmins: 3,
          },
        },
        {
          id: 'company-005',
          name: '포스코',
          domain: 'posco.com',
          contactEmail: 'admin@posco.com',
          status: 'suspended',
          plan: 'basic',
          createdAt: '2024-08-15T00:00:00Z',
          updatedAt: '2024-09-30T00:00:00Z',
          stats: {
            totalDocuments: 43,
            totalProducts: 12,
            totalQueries: 1834,
            totalAdmins: 2,
          },
        },
      ];

      // 필터 적용
      let filtered = mockCompanies;
      
      if (options.statusFilter && options.statusFilter !== 'all') {
        filtered = filtered.filter(c => c.status === options.statusFilter);
      }
      
      if (options.searchQuery) {
        const query = options.searchQuery.toLowerCase();
        filtered = filtered.filter(c => 
          c.name.toLowerCase().includes(query) ||
          c.domain.toLowerCase().includes(query)
        );
      }

      setCompanies(filtered);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const createCompany = async (data: any) => {
    // Mock 생성
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, id: 'company-new' };
  };

  const updateCompany = async (id: string, data: any) => {
    // Mock 수정
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  };

  const deleteCompany = async (id: string) => {
    // Mock 삭제
    await new Promise(resolve => setTimeout(resolve, 500));
    setCompanies(prev => prev.filter(c => c.id !== id));
    return { success: true };
  };

  const updateStatus = async (id: string, status: Company['status']) => {
    // Mock 상태 변경
    await new Promise(resolve => setTimeout(resolve, 500));
    setCompanies(prev => prev.map(c => 
      c.id === id ? { ...c, status } : c
    ));
    return { success: true };
  };

  return {
    companies,
    isLoading,
    error,
    refetch: fetchCompanies,
    createCompany,
    updateCompany,
    deleteCompany,
    updateStatus,
  };
}