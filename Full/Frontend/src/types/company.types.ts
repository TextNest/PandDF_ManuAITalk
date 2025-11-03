// ============================================
// 📄 src/types/company.types.ts
// ============================================
// 기업 관련 타입 정의
// ============================================

export interface Company {
  id: string;
  name: string;
  domain: string; // 예: samsung.com
  logo?: string;
  contactEmail: string;
  contactPhone?: string;
  status: 'active' | 'inactive' | 'suspended';
  plan: 'basic' | 'premium' | 'enterprise';
  createdAt: string;
  updatedAt: string;
  
  // 통계
  stats?: {
    totalDocuments: number;
    totalProducts: number;
    totalQueries: number;
    totalAdmins: number;
  };
}

export interface CompanyFormData {
  name: string;
  domain: string;
  contactEmail: string;
  contactPhone?: string;
  plan: 'basic' | 'premium' | 'enterprise';
}