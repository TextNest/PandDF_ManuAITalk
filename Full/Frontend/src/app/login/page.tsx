'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import styles from './login.module.css';
import { toast } from '@/store/useToastStore';

export default function UserLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // 구글 로그인 (실제로는 OAuth)

  // 💡 사용자 요청에 따라 함수는 에로우 함수로 작성합니다.
  const handleGoogleLogin = () => {
    setIsLoading(true); // 버튼 비활성화 및 로딩 표시

    // 1. Google OAuth 인증 URL 구성
    const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    // 리디렉션 URI는 Google Cloud Console에 등록된 주소여야 합니다.
    const REDIRECT_URI = `${window.location.origin}/auth/callback`; 
    const SCOPE = 'openid profile email'; // 요청할 권한

    const AUTH_URL = 
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}` +
      `&redirect_uri=${REDIRECT_URI}` +
      `&response_type=code` + // 인가 코드를 받기 위함
      `&scope=${SCOPE}` +
      `&access_type=offline` +
      `&prompt=select_account`;

    // 2. 사용자를 Google 인증 페이지로 리디렉션
    window.location.href = AUTH_URL;
  };

  // 로그인 없이 계속
  const handleContinueWithoutLogin = () => {
    router.push('/');
  };

  // 관리자 로그인으로 이동
  const handleGoToAdminLogin = () => {
    router.push('/admin/login');
  };

  return (
    <div className={styles.page}>
      <div className={styles.background}>
        <div className={styles.circle1}></div>
        <div className={styles.circle2}></div>
      </div>

      <div className={styles.container}>
        <div className={styles.logo}>
          <h1>ManuAI-talk</h1>
          <p>AI 기반 제품 설명서 질의응답 시스템</p>
        </div>

        <div className={styles.card}>
          <div className={styles.header}>
            <h2>로그인</h2>
            <p>구글 계정으로 간편하게 시작하세요</p>
          </div>

          {/* 구글 로그인 버튼 */}
          <button
            className={styles.googleButton}
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <svg className={styles.googleIcon} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {isLoading ? '로그인 중...' : 'Google로 로그인'}
          </button>

          {/* 로그인 없이 계속 */}
          <button
            className={styles.guestButton}
            onClick={handleContinueWithoutLogin}
          >
            로그인 없이 계속하기
          </button>

          <div className={styles.divider}>
            <span>또는</span>
          </div>

          {/* 관리자 로그인 */}
          <button
            className={styles.adminButton}
            onClick={handleGoToAdminLogin}
          >
            관리자 로그인 →
          </button>

          {/* 안내 */}
          <div className={styles.info}>
            <p>💡 <strong>로그인 시 추가 기능</strong></p>
            <ul>
              <li>과거 대화기록 확인</li>
              {/* <li>즐겨찾기 관리</li> */}
            </ul>
          </div>
        </div>

        <div className={styles.footer}>
          <button
            onClick={() => router.push('/')}
            className={styles.backButton}
          >
            ← 메인으로
          </button>
        </div>
      </div>
    </div>
  );
}