// ============================================
// 📄 src/components/auth/LoginForm/LoginForm.tsx
// ============================================
// 로그인 폼 컴포넌트
// ============================================

'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import Input from '@/components/ui/Input/Input';
import Button from '@/components/ui/Button/Button';
import { Lock, Mail } from 'lucide-react';
import styles from './LoginForm.module.css';

export default function LoginForm() {
  const router = useRouter();
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await login({ email, password });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <h1>관리자 로그인</h1>
        <p>ManuAI-Talk 관리자 대시보드에 접속하세요</p>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <div className={styles.fields}>
        <div className={styles.field}>
          <label htmlFor="email">이메일</label>
          <div className={styles.inputWrapper}>
            <Mail size={20} className={styles.icon} />
            <Input
              id="email"
              type="email"
              placeholder="admin@manuai-talk.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
            />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="password">비밀번호</label>
          <div className={styles.inputWrapper}>
            <Lock size={20} className={styles.icon} />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
            />
          </div>
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={isLoading}
      >
        로그인
      </Button>

      {/* 회원가입 링크 */}
      <div className={styles.registerSection}>
        <p>아직 계정이 없으신가요?</p>
        <button
          type="button"
          onClick={() => router.push('/admin/register')}
          className={styles.registerButton}
        >
          회원가입하기 →
        </button>
      </div>

      <div className={styles.footer}>
        <div className={styles.hint}>
          <p className={styles.hintTitle}>💡 테스트 계정</p>
          <ul className={styles.accounts}>
            <li><strong>슈퍼 관리자:</strong> super@manuai-talk.com / super123</li>
            <li><strong>삼성전자:</strong> admin@samsung.com / admin123</li>
            <li><strong>LG전자:</strong> admin@lg.com / admin123</li>
          </ul>
        </div>
      </div>
    </form>
  );
}