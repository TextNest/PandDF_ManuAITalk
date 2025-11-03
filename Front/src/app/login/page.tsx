'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import styles from './login.module.css';
import { toast } from '@/store/useToastStore';

export default function UserLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // 구글 로그인 (실제로는 OAuth)
  const handleGoogleLogin = async () => {
    setIsLoading(true);

    // TODO: 실제 Google OAuth 연동
    // window.location.href = '/api/auth/google';

    // 임시: Mock 로그인
    setTimeout(() => {
      toast.info('구글 로그인 기능은 백엔드 연동 후 활성화됩니다.');
      setIsLoading(false);
    }, 1000);
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
          <h1>ManuAI-Talk</h1>
          <p>AI 제품 설명서 도우미</p>
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
              <li>대화 기록 저장</li>
              <li>즐겨찾기 관리</li>
              <li>맞춤형 추천</li>
            </ul>
          </div>
        </div>

        <div className={styles.footer}>
          <button
            onClick={() => router.push('/')}
            className={styles.backButton}
          >
            ← 메인으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}