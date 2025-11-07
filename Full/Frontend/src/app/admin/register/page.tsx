'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input/Input';
import Button from '@/components/ui/Button/Button';
import { Lock, Mail, User, Key, Building2 } from 'lucide-react';
import styles from './register-page.module.css';
import { toast } from '@/store/useToastStore';
import apiClient from '@/lib/api/client'; // apiClient는 세션 로딩에 필요
import { API_ENDPOINTS } from '@/lib/api/endpoints';


// Mock 기업 데이터
const mockCompanies = [
  {
    id: 'company-001',
    name: '삼성전자',
    code: 'SAMSUNG24',
    // 실제로는 API에서 기존 사용자들의 부서 목록을 가져옴
    existingDepartments: ['무선사업부', 'DS부문', 'SDC', '경영지원팀', 'Global마케팅']
  },
  {
    id: 'company-002',
    name: 'LG전자',
    code: 'LG2024XY',
    existingDepartments: ['H&A사업본부', 'BS사업본부', 'VS사업본부', '경영관리']
  },
  {
    id: 'company-003',
    name: '현대자동차',
    code: 'HYUNDAI8',
    existingDepartments: ['상품개발본부', '생산본부', '영업본부', '디자인센터']
  },
  {
    id: 'company-004',
    name: 'SK하이닉스',
    code: 'SKHYNIX9',
    existingDepartments: ['DRAM개발', 'NAND개발', '생산기술', 'Quality']
  },
  {
    id: 'company-005',
    name: '네이버',
    code: 'NAVER123',
    existingDepartments: ['Search', 'AI Lab', 'Clova', 'Webtoon', 'Cloud']
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'code' | 'info'>('code');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: 가입 코드
  const [registrationCode, setRegistrationCode] = useState('');
  const [verifiedCompany, setVerifiedCompany] = useState<{
    id: string;
    name: string;
    existingDepartments: string[];
  } | null>(null);

  // Step 2: 사용자 정보
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [customDepartment, setCustomDepartment] = useState('');
  const [languagePreference, setLanguagePreference] = useState('ko');

  // 가입 코드 검증
  const handleVerifyCode = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true); 
    try{
      console.log(registrationCode);
      const company =  await apiClient.post(API_ENDPOINTS.AUTH.CODE,{code:registrationCode});
      console.log(company.data);
      if (company) {
        setVerifiedCompany({
          id: company.data.id,
          name: company.data.name,
          existingDepartments: company.data.existingDepartments
        });
        setStep('info');  
        setError(null);
      } else {
        setError('유효하지 않은 가입 코드입니다. 슈퍼 관리자에게 문의하세요.');
      }
      
    }catch{
      console.error('Code verification failed:', error);
        const errorMessage = error.response?.data?.message || '코드 확인 중 오류가 발생했습니다.';
        setError(errorMessage);
    }finally{
      setIsLoading(false);
    }
  };

  // 회원가입 처리
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // 유효성 검사
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    // 부서 검증
    const finalDepartment = department === '직접 입력' ? customDepartment : department;
    if (!finalDepartment || finalDepartment.trim() === '') {
      setError('부서를 선택하거나 입력해주세요.');
      return;
    }

    setIsLoading(true);

    // 실제로는 API 호출
    const userData = {
        name,
        email,
        companyId: verifiedCompany?.id,
        companyName: verifiedCompany?.name,
        department: finalDepartment,
        languagePreference,
        password,
        role: 'company_admin',
      };
      
      console.log('회원가입 데이터:', userData);
      try{
        const response =  await apiClient.post(API_ENDPOINTS.AUTH.INFO,userData);
        if (response){
          toast.success(`${verifiedCompany?.name} 관리자로 가입되었습니다!`);
          setTimeout(()=>{
            router.push('/admin/login');
          },1500);
          }
        else{
          setError('회원가입에 실패했습니다. 다시 시도해주세요.');
        }
      }catch (error) {
        
        console.error('회원가입 실패:', error);
        
        
        const errorMessage = error.response?.data?.message || '회원가입에 실패했습니다. 다시 시도해 주세요.';
        setError(errorMessage);
    
  
      }finally{
        setIsLoading(false);
      }
    };

  // Step 1 재설정
  const handleBackToCode = () => {
    setStep('code');
    setVerifiedCompany(null);
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDepartment('');
    setCustomDepartment('');
    setLanguagePreference('ko');
  };

  return (
    <div className={styles.page}>
      <div className={styles.background}>
        <div className={styles.circle1}></div>
        <div className={styles.circle2}></div>
      </div>

      <div className={styles.container}>
        <div className={styles.logo}>
          <h1>SeShat</h1>
          <p>기업 관리자 회원가입</p>
        </div>

        {step === 'code' ? (
          // Step 1: 가입 코드 입력
          <form className={styles.form} onSubmit={handleVerifyCode}>
            <div className={styles.stepHeader}>
              <div className={styles.stepBadge}>Step 1</div>
              <h2>가입 코드 입력</h2>
              <p>슈퍼 관리자로부터 받은 가입 코드를 입력하세요</p>
            </div>

            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="code">가입 코드</label>
              <div className={styles.inputWrapper}>
                <Key size={20} className={styles.icon} />
                <Input
                  id="code"
                  type="text"
                  placeholder="예: SAMSUNG24"
                  value={registrationCode}
                  onChange={(e) => setRegistrationCode(e.target.value.toUpperCase())}
                  required
                  fullWidth
                />
              </div>
              <small className={styles.hint}>
                가입 코드가 없다면 슈퍼 관리자에게 문의하세요
              </small>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
            >
              코드 확인
            </Button>

            <div className={styles.footer}>
              <button
                type="button"
                onClick={() => router.push('/admin/login')}
                className={styles.backButton}
              >
                ← 로그인으로 돌아가기
              </button>
            </div>
          </form>
        ) : (
          // Step 2: 사용자 정보 입력
          <form className={styles.form} onSubmit={handleRegister}>
            <div className={styles.stepHeader}>
              <div className={styles.stepBadge}>Step 2</div>
              <h2>사용자 정보 입력</h2>
              <div className={styles.companyBadge}>
                🏢 {verifiedCompany?.name}
              </div>
            </div>

            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}

            <div className={styles.fields}>
              {/* 기본 정보 */}
              <div className={styles.field}>
                <label htmlFor="name">이름 *</label>
                <div className={styles.inputWrapper}>
                  <User size={20} className={styles.icon} />
                  <Input
                    id="name"
                    type="text"
                    placeholder="홍길동"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    fullWidth
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="email">이메일 *</label>
                <div className={styles.inputWrapper}>
                  <Mail size={20} className={styles.icon} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    fullWidth
                  />
                </div>
              </div>

              {/* 부서 선택 */}
              <div className={styles.field}>
                <label htmlFor="department">부서 *</label>
                <div className={styles.inputWrapper}>
                  <Building2 size={20} className={styles.icon} />
                  <select
                    id="department"
                    value={department}
                    onChange={(e) => {
                      setDepartment(e.target.value);
                      if (e.target.value !== '직접 입력') {
                        setCustomDepartment('');
                      }
                    }}
                    required
                    className={styles.select}
                  >
                    <option value="">선택하세요</option>
                    {verifiedCompany?.existingDepartments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                    <option value="직접 입력">➕ 직접 입력</option>
                  </select>
                </div>
                <small className={styles.hint}>
                  {department === '직접 입력'
                    ? '새로운 부서명을 입력하세요'
                    : '기존 부서를 선택하거나 직접 입력하세요'}
                </small>
              </div>

              {/* 직접 입력 필드 */}
              {department === '직접 입력' && (
                <div className={styles.field}>
                  <label htmlFor="customDepartment">부서명 입력 *</label>
                  <div className={styles.inputWrapper}>
                    <Building2 size={20} className={styles.icon} />
                    <Input
                      id="customDepartment"
                      type="text"
                      placeholder="예: 신규사업팀"
                      value={customDepartment}
                      onChange={(e) => setCustomDepartment(e.target.value)}
                      required
                      fullWidth
                    />
                  </div>
                </div>
              )}

              {/* 선호 언어 */}
              <div className={styles.field}>
                <label>선호 언어 *</label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="language"
                      value="ko"
                      checked={languagePreference === 'ko'}
                      onChange={(e) => setLanguagePreference(e.target.value)}
                    />
                    <span>🇰🇷 한국어</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="language"
                      value="en"
                      checked={languagePreference === 'en'}
                      onChange={(e) => setLanguagePreference(e.target.value)}
                    />
                    <span>🇺🇸 English</span>
                  </label>
                </div>
              </div>

              {/* 비밀번호 */}
              <div className={styles.field}>
                <label htmlFor="password">비밀번호 *</label>
                <div className={styles.inputWrapper}>
                  <Lock size={20} className={styles.icon} />
                  <Input
                    id="password"
                    type="password"
                    placeholder="최소 6자 이상"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    fullWidth
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="confirmPassword">비밀번호 확인 *</label>
                <div className={styles.inputWrapper}>
                  <Lock size={20} className={styles.icon} />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="비밀번호를 다시 입력하세요"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    fullWidth
                  />
                </div>
              </div>

              {/* 추가 정보 안내 */}
              <div className={styles.infoBox}>
                <p>💡 직책 정보는 회원가입 후 프로필 설정에서 추가할 수 있습니다.</p>
              </div>
            </div>

            <div className={styles.actions}>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={handleBackToCode}
              >
                ← 이전
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isLoading}
                style={{ flex: 1 }}
              >
                가입하기
              </Button>
            </div>

            <div className={styles.footer}>
              <button
                type="button"
                onClick={() => router.push('/admin/login')}
                className={styles.backButton}
              >
                ← 로그인으로 돌아가기
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}