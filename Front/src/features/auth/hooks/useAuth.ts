// ============================================
// 📄 src/features/auth/hooks/useAuth.ts
// ============================================
// 인증 관련 커스텀 훅 (3단계 권한)
// ============================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import type { LoginCredentials, UserRole } from '@/types/auth.types';

export function useAuth() {
  const router = useRouter();
  const { user, token, isAuthenticated, login: setLogin, logout: setLogout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 로그인
  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      setError(null);

      // 실제로는 API 호출
      // const response = await apiClient.post('/api/auth/login', credentials);
      
      // Mock 로그인 (개발용)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 테스트 계정들
      const testAccounts = [
        {
          email: 'super@manuai-talk.com',
          password: 'super123',
          user: {
            id: '1',
            email: 'super@manuai-talk.com',
            name: '슈퍼 관리자',
            role: 'super_admin' as UserRole,
          },
          redirectTo: '/superadmin',
        },
        {
          email: 'admin@samsung.com',
          password: 'admin123',
          user: {
            id: '2',
            email: 'admin@samsung.com',
            name: '삼성전자 관리자',
            role: 'company_admin' as UserRole,
            companyId: 'company-001',
            companyName: '삼성전자',
          },
          redirectTo: '/dashboard',
        },
        {
          email: 'admin@lg.com',
          password: 'admin123',
          user: {
            id: '3',
            email: 'admin@lg.com',
            name: 'LG전자 관리자',
            role: 'company_admin' as UserRole,
            companyId: 'company-002',
            companyName: 'LG전자',
          },
          redirectTo: '/dashboard',
        },
      ];

      const account = testAccounts.find(
        acc => acc.email === credentials.email && acc.password === credentials.password
      );

      if (account) {
        const mockToken = 'mock-jwt-token-' + Date.now();
        
        // Zustand 스토어에 저장
        setLogin(account.user, mockToken);
        
        // 권한별 페이지로 이동
        router.push(account.redirectTo);
        
        return { success: true };
      } else {
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '로그인에 실패했습니다.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // 로그아웃
  const logout = () => {
    setLogout();
    router.push('/');
  };

  // 권한 확인
  const hasRole = (allowedRoles: UserRole[]) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  // 슈퍼 관리자 확인
  const isSuperAdmin = () => {
    return user?.role === 'super_admin';
  };

  // 기업 관리자 확인
  const isCompanyAdmin = () => {
    return user?.role === 'company_admin';
  };

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    hasRole,
    isSuperAdmin,
    isCompanyAdmin,
  };
}