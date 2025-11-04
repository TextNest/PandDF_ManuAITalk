// ============================================
// 📄 src/features/auth/hooks/useAuth.ts
// ============================================
// 인증 관련 커스텀 훅 (3단계 권한)
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import apiClient from '@/lib/api/client';
import type { LoginCredentials, UserRole, User } from '@/types/auth.types';

export function useAuth() {
  const router = useRouter();
  const { user, token, isAuthenticated, login: setLogin, logout: setLogout, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 로그인
  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      setError(null);

      // 실제로는 API 호출
      const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
      
      // // Mock 로그인 (개발용)
      // await new Promise(resolve => setTimeout(resolve, 1000));
      
      // // 테스트 계정들
      // const testAccounts = [
      //   {
      //     email: 'super@manuai-talk.com',
      //     password: 'super123',
      //     user: {
      //       id: '1',
      //       email: 'super@manuai-talk.com',
      //       name: '슈퍼 관리자',
      //       role: 'super_admin' as UserRole,
      //     },
      //     redirectTo: '/superadmin',
      //   },
      //   {
      //     email: 'admin@samsung.com',
      //     password: 'admin123',
      //     user: {
      //       id: '2',
      //       email: 'admin@samsung.com',
      //       name: '삼성전자 관리자',
      //       role: 'company_admin' as UserRole,
      //       companyId: 'company-001',
      //       companyName: '삼성전자',
      //     },
      //     redirectTo: '/dashboard',
      //   },
      //   {
      //     email: 'admin@lg.com',
      //     password: 'admin123',
      //     user: {
      //       id: '3',
      //       email: 'admin@lg.com',
      //       name: 'LG전자 관리자',
      //       role: 'company_admin' as UserRole,
      //       companyId: 'company-002',
      //       companyName: 'LG전자',
      //     },
      //     redirectTo: '/dashboard',
      //   },
      // ];

      // const account = testAccounts.find(
      //   acc => acc.email === credentials.email && acc.password === credentials.password
      // );

      if (response) {
        console.log(response.data)
        const account = response.data;
        const Token = account.access_token;
        
        // Zustand 스토어에 저장
        setLogin(account.user, Token);
        
        // 권한별 페이지로 이동
        ////router.push(account.redirectTo);
        
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
    localStorage.removeItem('token');
    localStorage.removeItem('auth-storage');
    setLogout();
    router.push('/');
  };

  // 현재 사용자 정보 조회 (JWT로)
  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return null;
      }

      const response = await apiClient.post(API_ENDPOINTS.AUTH.ME);
      
      const user = response.data
      console.log(user)
      setUser(user as User);
      return user;
    } catch (err) {
      console.error('사용자 정보 조회 실패:', err);
      // 토큰이 유효하지 않으면 로그아웃 처리
      logout();
      return null;
    } 
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
    fetchCurrentUser, // JWT로 현재 사용자 정보 조회
    hasRole,
    isSuperAdmin,
    isCompanyAdmin,
  };
}