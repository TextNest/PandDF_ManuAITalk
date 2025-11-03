'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import Input from '@/components/ui/Input/Input';
import Button from '@/components/ui/Button/Button';
import { User, Mail, Building2, Briefcase, Lock, Globe } from 'lucide-react';
import styles from './profile-page.module.css';

// Mock 부서 목록 (실제로는 API에서 회사별로 가져옴)
const mockDepartments = [
  '마케팅팀',
  '개발팀',
  '영업팀',
  'CS팀',
  '인사팀',
  '재무팀',
  '기획팀',
  '운영팀',
];

export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 프로필 정보
  const [name, setName] = useState(user?.name || '');
  const [jobTitle, setJobTitle] = useState(''); // 실제로는 user?.jobTitle
  const [department, setDepartment] = useState(user?.companyName || ''); // 임시
  const [customDepartment, setCustomDepartment] = useState('');
  const [languagePreference, setLanguagePreference] = useState('ko');

  // 비밀번호 변경
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    // 유효성 검사
    const finalDepartment = department === '직접 입력' ? customDepartment : department;
    if (!finalDepartment || finalDepartment.trim() === '') {
      setError('부서를 선택하거나 입력해주세요.');
      setIsLoading(false);
      return;
    }

    // 실제로는 API 호출
    setTimeout(() => {
      console.log('프로필 업데이트:', {
        name,
        jobTitle: jobTitle || null,
        department: finalDepartment,
        languagePreference,
      });
      
      setSuccessMessage('프로필이 성공적으로 업데이트되었습니다!');
      setIsEditing(false);
      setIsLoading(false);
      
      // 3초 후 메시지 제거
      setTimeout(() => setSuccessMessage(null), 3000);
    }, 1000);
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // 유효성 검사
    if (newPassword !== confirmNewPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (newPassword.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setIsLoading(true);

    // 실제로는 API 호출
    setTimeout(() => {
      console.log('비밀번호 변경');
      setSuccessMessage('비밀번호가 성공적으로 변경되었습니다!');
      setShowPasswordSection(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setIsLoading(false);
      
      setTimeout(() => setSuccessMessage(null), 3000);
    }, 1000);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>프로필 설정</h1>
        <p>내 정보를 관리합니다</p>
      </div>

      {successMessage && (
        <div className={styles.successMessage}>
          ✓ {successMessage}
        </div>
      )}

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {/* 프로필 정보 카드 */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>기본 정보</h2>
          {!isEditing && (
            <button 
              className={styles.editButton}
              onClick={() => setIsEditing(true)}
            >
              ✏️ 수정
            </button>
          )}
        </div>

        <form onSubmit={handleSaveProfile}>
          <div className={styles.fields}>
            {/* 이메일 (읽기 전용) */}
            <div className={styles.field}>
              <label htmlFor="email">이메일</label>
              <div className={styles.inputWrapper}>
                <Mail size={20} className={styles.icon} />
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  fullWidth
                />
              </div>
              <small className={styles.hint}>이메일은 변경할 수 없습니다</small>
            </div>

            {/* 이름 */}
            <div className={styles.field}>
              <label htmlFor="name">이름 *</label>
              <div className={styles.inputWrapper}>
                <User size={20} className={styles.icon} />
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing}
                  required
                  fullWidth
                />
              </div>
            </div>

            {/* 부서 */}
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
                  disabled={!isEditing}
                  required
                  className={styles.select}
                >
                  <option value="">선택하세요</option>
                  {mockDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                  <option value="직접 입력">➕ 직접 입력</option>
                </select>
              </div>
            </div>

            {/* 직접 입력 필드 */}
            {department === '직접 입력' && isEditing && (
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

            {/* 직책 */}
            <div className={styles.field}>
              <label htmlFor="jobTitle">직책 (선택)</label>
              <div className={styles.inputWrapper}>
                <Briefcase size={20} className={styles.icon} />
                <Input
                  id="jobTitle"
                  type="text"
                  placeholder="예: 팀장, 매니저, 시니어 등"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  disabled={!isEditing}
                  fullWidth
                />
              </div>
              <small className={styles.hint}>직책이 없다면 비워두셔도 됩니다</small>
            </div>

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
                    disabled={!isEditing}
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
                    disabled={!isEditing}
                  />
                  <span>🇺🇸 English</span>
                </label>
              </div>
            </div>

            {/* 소속 기업 (읽기 전용) */}
            <div className={styles.field}>
              <label htmlFor="company">소속 기업</label>
              <div className={styles.inputWrapper}>
                <Building2 size={20} className={styles.icon} />
                <Input
                  id="company"
                  type="text"
                  value={user?.companyName || ''}
                  disabled
                  fullWidth
                />
              </div>
            </div>
          </div>

          {/* 수정 모드 버튼 */}
          {isEditing && (
            <div className={styles.actions}>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => setIsEditing(false)}
              >
                취소
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isLoading}
                style={{ flex: 1 }}
              >
                저장
              </Button>
            </div>
          )}
        </form>
      </div>

      {/* 비밀번호 변경 카드 */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>비밀번호 변경</h2>
          {!showPasswordSection && (
            <button 
              className={styles.editButton}
              onClick={() => setShowPasswordSection(true)}
            >
              🔒 변경
            </button>
          )}
        </div>

        {showPasswordSection ? (
          <form onSubmit={handleChangePassword}>
            <div className={styles.fields}>
              <div className={styles.field}>
                <label htmlFor="currentPassword">현재 비밀번호 *</label>
                <div className={styles.inputWrapper}>
                  <Lock size={20} className={styles.icon} />
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    fullWidth
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="newPassword">새 비밀번호 *</label>
                <div className={styles.inputWrapper}>
                  <Lock size={20} className={styles.icon} />
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="최소 6자 이상"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    fullWidth
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="confirmNewPassword">새 비밀번호 확인 *</label>
                <div className={styles.inputWrapper}>
                  <Lock size={20} className={styles.icon} />
                  <Input
                    id="confirmNewPassword"
                    type="password"
                    placeholder="비밀번호를 다시 입력하세요"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    fullWidth
                  />
                </div>
              </div>
            </div>

            <div className={styles.actions}>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => {
                  setShowPasswordSection(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                }}
              >
                취소
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isLoading}
                style={{ flex: 1 }}
              >
                비밀번호 변경
              </Button>
            </div>
          </form>
        ) : (
          <p className={styles.passwordHint}>
            🔒 비밀번호를 변경하려면 "변경" 버튼을 클릭하세요
          </p>
        )}
      </div>
    </div>
  );
}