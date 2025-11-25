    // src/app/auth/callback/page.tsx (또는 .jsx)

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import apiClient from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { useAuthStore } from '@/store/useAuthStore';
import type { User } from '@/types/auth.types';

// 💡 사용자 요청에 따라 함수는 에로우 함수로 작성합니다.
const AuthCallbackPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const processed = useRef(false); // 중복 실행 방지용 ref

  useEffect(() => {
    if (processed.current) return; // 이미 처리했으면 중단
    processed.current = true;
    
    // 💡 사용자 요청에 따라 함수는 에로우 함수로 작성합니다.
    const processAuthCode = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setLoading(false);
        setError('Google 인증 과정에서 오류가 발생했습니다: ' + errorParam);
        setTimeout(() => router.push('/login'), 3000);
        return;
      }
      
      if (!code) {
        setLoading(false);
        setError('인가 코드를 찾을 수 없습니다.');
        setTimeout(() => router.push('/login'), 3000);
        return;
      }

      try {
        // ✅ 백엔드로 code 전송 및 JWT 받기
        const response = await apiClient.post(API_ENDPOINTS.AUTH.OAUTH_CALLBACK, {
          code,
          redirect_uri: `${window.location.origin}/auth/callback`,
        });

        const { user, access_token } = response.data;

        // JWT 토큰 저장 (localStorage)
        localStorage.setItem('token', access_token);

        // 인증 스토어에 사용자 정보와 토큰 저장
        login(user as User, access_token);

        // 로그인 성공 후 사용자 페이지로 리디렉션
        router.push('/');
        
      } catch (err: any) {
        console.error('OAuth callback 에러:', err);
        setError(
          err.response?.data?.detail || 
          err.message || 
          '로그인 처리 중 오류가 발생했습니다.'
        );
        setLoading(false); // 에러일 때 로딩 끄기
        setTimeout(() => router.push('/login'), 5000);
      } 
      // finally {setLoading(false);}
    };

    processAuthCode();
  }, [searchParams, router, login]);

  // 로딩 UI
  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Google 로그인 처리 중...</h1>
        <p>잠시만 기다려 주세요.</p>
      </div>
    );
  }

  // 에러 UI
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1 style={{ color: '#e53e3e' }}>로그인 실패</h1>
      <p style={{ color: '#666', marginTop: '10px' }}>{error}</p>
      <p style={{ color: '#999', marginTop: '20px', fontSize: '14px' }}>
        잠시 후 로그인 페이지로 이동합니다...
      </p>
    </div>
  );
};

export default AuthCallbackPage;