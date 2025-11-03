// ============================================
// 📄 src/types/auth.types.ts
// ============================================
// 인증 관련 타입 정의 (3단계 권한)
// ============================================

export type UserRole = 'user' | 'company_admin' | 'super_admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId?: string; // company_admin인 경우 소속 기업 ID
  companyName?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// 권한별 접근 가능 경로
export const ACCESS_ROUTES: Record<UserRole, string[]> = {
  user: ['/chat', '/product'],
  company_admin: ['/dashboard', '/documents', '/faq', '/logs', '/products'],
  super_admin: ['/superadmin'],
};