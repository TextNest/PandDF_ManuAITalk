'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
// 1. 아이콘 추가 (History, Building 등)
import { Sparkles, QrCode, Shield, Settings, History, Building, Box, LogOut } from 'lucide-react'; 
import { useState, useEffect } from 'react';
// import SearchBar from '@/components/home/SearchBar/SearchBar';
import ProductSelector from '@/components/home/ProductSelector/ProductSelector';
import styles from './page.module.css';
import { toast } from '@/store/useToastStore';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth(); // logout 함수 가져오기
  const [showDevTools, setShowDevTools] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 🛑 1. 자동 리디렉션 useEffect는 주석 처리 (또는 삭제)
  // (로그인해도 이 페이지에 머무름)
  /*
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'super_admin') {
        router.push('/superadmin');
      } else if (user.role === 'company_admin') {
        router.push('/dashboard');
      } else {
        router.push('/my');
      }
    }
  }, [isAuthenticated, user, router]);
  */

  // --- 검색창 핸들러 (기존과 동일) ---
  // const handleSearchChange = (query) => {
  //   setSearchQuery(query);
  // };

  // const handleSearchSubmit = (query) => {
  //   const trimmedQuery = query.trim();
  //   if (!trimmedQuery) {
  //     toast.warning('제품 ID 또는 이름을 입력해주세요.');
  //     return;
  //   }
  //   // 검색 쿼리(제품 ID 또는 슬러그)를 기반으로 채팅 페이지로 바로 이동
  //   console.log('채팅 페이지로 이동:', trimmedQuery);
  //   router.push(`/chat/${encodeURIComponent(trimmedQuery)}`);
  // };

  // --- 버튼 핸들러 (기존과 동일) ---
  const handleGoogleLogin = () => {
    // 1. Google OAuth 인증 URL 구성
    const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
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

  const handleStartAR = () => {
    // AR 시뮬레이션 페이지로 이동 (ID 없이)
    router.push('/simulation');
  };

  const handleAdminLogin = () => {
    router.push('/admin/login');
  };

  const handleLogout = () => {
    logout();
    // router.push('/login');
  };

  // 🛑 2. 로그인 상태에 따라 버튼을 렌더링하는 함수
  const renderAuthButton = () => {
    
    // 2a. 로그인 상태일 때 (역할 분기)
    if (isAuthenticated && user) {
      switch (user.role) {
        case 'super_admin':
          return (
            <button
              className={styles.loginButton} // 스타일 재활용
              onClick={() => router.push('/superadmin')}
            >
              <Shield size={20} />
              슈퍼관리자
            </button>
          );
        case 'company_admin':
          return (
            <button
              className={styles.loginButton} // 스타일 재활용
              onClick={() => router.push('/dashboard')}
            >
              <Building size={20} />
              기업 관리자
            </button>
          );
        default: // 'user' 역할 (일반 사용자)
          return (
            <button
              className={styles.loginButton} // 스타일 재활용
              onClick={() => router.push('/my')}
            >
              <History size={20} />
              대화 기록
            </button>
          );
      }
    }
    
    // 2b. 비로그인 상태일 때 (위에 해당하지 않으면)
    return (
      <button
        className={styles.loginButton}
        onClick={handleGoogleLogin}
      >
        <svg className={styles.googleIcon} viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        <span className={styles.googleText}>구글</span>
        <span className={styles.loginText}>로그인</span>
      </button>
    );
  };

  return (
    <div className={styles.page}>
      {/* 히어로 섹션 */}
      <section className={styles.hero}>
        {isAuthenticated && user && (
          <div className={styles.topActions}>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user.name || '사용자'}님</span>
            </div>
            <button
              className={styles.logoutButton}
              onClick={handleLogout}
              title="로그아웃"
            >
              <LogOut size={18} />
              <span className={styles.logoutText}>로그아웃</span>
            </button>
          </div>
        )}
        <div className={styles.heroBackground}>
          <div className={styles.circle1}></div>
          <div className={styles.circle2}></div>
        </div>

        <div className={styles.heroContent}>
          <div className={styles.logo}>
            <Sparkles size={48} className={styles.logoIcon} />
            <h1>ManuAI-Talk</h1>
          </div>

          <p className={styles.tagline}>
            AI가 제품 설명서를 읽어드립니다
          </p>

          <p className={styles.description}>
            복잡한 설명서는 이제 그만!<br />
            제품을 고르고 AI에게 물어보세요.
          </p>

          <ProductSelector />
          {/* 
          <SearchBar
            value={searchQuery}
            onChange={handleSearchChange}
            onSubmit={handleSearchSubmit}
          /> */}

          {/* QR 스캔 버튼 */}
          <div className={styles.quickActions}>
            <button
              className={styles.qrButton} // Keep the style for now, can rename later if needed
              onClick={handleStartAR}
            >
              <Box size={20} />
              AR 시작
            </button>

            {/* 🛑 3. 위에서 만든 함수를 호출해 버튼 표시 */}
            {renderAuthButton()}
            

            
          </div>
        </div>
      </section>
      
      {/* 푸터 (기존과 동일) */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p>© 2025 ManuAI-Talk. All rights reserved.</p>
          {!isAuthenticated && (
            <button
              className={styles.adminLink}
              onClick={handleAdminLogin}
            >
              <Shield size={14} />
              admin
            </button>
          )}
        </div>
      </footer>

      {/* 개발자 도구 (기존과 동일) */}
    </div>
  );
}