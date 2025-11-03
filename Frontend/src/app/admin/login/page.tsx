'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import LoginForm from '@/components/auth/LoginForm/LoginForm';
import styles from './login-page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore(); // user 추가!

  // 이미 로그인되어 있으면 역할에 따라 리디렉션
  useEffect(() => {
    if (isAuthenticated && user) {
      // 슈퍼 관리자면 슈퍼 관리자 페이지로
      if (user.role === 'super_admin') {
        router.push('/superadmin');
      } 
      // 기업 관리자면 대시보드로
      else if (user.role === 'company_admin') {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, user, router]);

  return (
    <div className={styles.page}>
      <div className={styles.background}>
        <div className={styles.circle1}></div>
        <div className={styles.circle2}></div>
      </div>

      <div className={styles.container}>
        <div className={styles.logo}>
          <h1>SeShat</h1>
          <p>AI 기반 제품 설명서 질의응답 시스템</p>
        </div>

        <LoginForm />

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