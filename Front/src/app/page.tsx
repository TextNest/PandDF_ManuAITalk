'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Sparkles, QrCode, Shield, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import SearchBar from '@/components/home/SearchBar/SearchBar';
import RecentSearches from '@/components/home/RecentSearches/RecentSearches';
import CategoryGrid from '@/components/home/CategoryGrid/CategoryGrid';
import PopularProducts from '@/components/home/PopularProducts/PopularProducts';
import styles from './page.module.css';
import { toast } from '@/store/useToastStore';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [showDevTools, setShowDevTools] = useState(false);

  // 이미 로그인된 경우 자동 리디렉션
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

  const handleGoogleLogin = () => {
    toast.info('구글 로그인 기능은 백엔드 연동 후 활성화됩니다.');
  };

  const handleQRScan = () => {
    toast.info('QR 스캔 기능은 곧 추가됩니다!');
  };

  const handleAdminLogin = () => {
    router.push('/admin/login');
  };

  return (
    <div className={styles.page}>
      {/* 히어로 섹션 */}
      <section className={styles.hero}>
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
            제품을 검색하거나 QR 코드를 스캔하고 AI에게 물어보세요.
          </p>


          {/* 🆕 검색창 */}
          <SearchBar />

          {/* QR 스캔 버튼 */}
          <div className={styles.quickActions}>
            <button
              className={styles.qrButton}
              onClick={handleQRScan}
            >
              <QrCode size={20} />
              QR 코드 스캔
            </button>

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
              로그인
            </button>
          </div>

          <p className={styles.hint}>
            💡 로그인 없이도 사용 가능하지만, 로그인하면 대화 기록이 저장됩니다
          </p>

          {/* 🆕 스크롤 인디케이터 */}
          <div className={styles.scrollIndicator}>
            <span className={styles.scrollText}>아래로 스크롤</span>
            <div className={styles.scrollArrow}>↓</div>
          </div>
        </div>
      </section>


      {/* 🆕 최근 검색 */}
      <RecentSearches />

      {/* 🆕 카테고리 */}
      <CategoryGrid />

      {/* 🆕 인기 제품 */}
      <PopularProducts />

      {/* 푸터 */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p>© 2025 ManuAI-Talk. All rights reserved.</p>
          <button
            className={styles.adminLink}
            onClick={handleAdminLogin}
          >
            <Shield size={16} />
            관리자 로그인
          </button>
        </div>
      </footer>

      {/* 개발자 도구 플로팅 버튼 */}
      <div className={styles.devTools}>
        <button
          className={styles.devToolsButton}
          onClick={() => setShowDevTools(!showDevTools)}
          title="개발자 도구"
        >
          <Settings size={24} />
        </button>

        {showDevTools && (
          <div className={styles.devToolsPanel}>
            <div className={styles.devToolsHeader}>
              <h3>🔧 개발자 도구</h3>
              <button
                className={styles.closeButton}
                onClick={() => setShowDevTools(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.devToolsContent}>
              {/* 인증 */}
              <div className={styles.devSection}>
                <h4>🔐 인증</h4>
                <a href="/admin/login" className={styles.devLink}>
                  관리자 로그인
                </a>
                <a href="/admin/register" className={styles.devLink}>
                  관리자 회원가입
                </a>
                <a href="/login" className={styles.devLink}>
                  일반 사용자 로그인
                </a>
              </div>

              {/* 일반 사용자 */}
              <div className={styles.devSection}>
                <h4>👤 일반 사용자</h4>
                <a href="/chat/test-product" className={styles.devLink}>
                  챗봇 (테스트 제품)
                </a>
                <a href="/my" className={styles.devLink}>
                  내 대화 목록
                </a>
              </div>

              {/* 관리자 */}
              <div className={styles.devSection}>
                <h4>🏢 관리자</h4>
                <a href="/dashboard" className={styles.devLink}>
                  기업 관리자 대시보드
                </a>
                <a href="/documents" className={styles.devLink}>
                  문서 관리
                </a>
                <a href="/faq" className={styles.devLink}>
                  FAQ 관리
                </a>
                <a href="/logs" className={styles.devLink}>
                  로그 분석
                </a>
                <a href="/products" className={styles.devLink}>
                  제품 관리
                </a>
                <a href="/profile" className={styles.devLink}>
                  프로필 설정
                </a>
              </div>

              {/* 슈퍼 관리자 */}
              <div className={styles.devSection}>
                <h4>🔴 슈퍼 관리자</h4>
                <a href="/superadmin" className={styles.devLink}>
                  슈퍼 관리자 대시보드
                </a>
                <a href="/superadmin/companies" className={styles.devLink}>
                  기업 관리
                </a>
                <a href="/superadmin/users" className={styles.devLink}>
                  사용자 관리
                </a>
                <a href="/superadmin/settings" className={styles.devLink}>
                  시스템 설정
                </a>
              </div>
            </div>

            <div className={styles.devToolsFooter}>
              <small>⚠️ 개발 전용 - 프로덕션에서는 제거됩니다</small>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}