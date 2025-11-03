# SeShat - AI 기반 제품 설명서 질의응답 시스템

LLM을 활용한 PDF 문서 요약 및 질의응답 기능 개발 프로젝트

## 📋 프로젝트 개요

**SeShat**은 전자제품 설명서를 AI 기반으로 분석하고, 사용자의 질문에 실시간으로 답변하는 RAG(Retrieval-Augmented Generation) 시스템입니다.

- **팀명**: P&DF
- **기술 스택**: Next.js 14 (App Router), TypeScript, CSS Modules, Zustand, React Query
- **개발 시작**: 2025년 10월
- **현재 상태**: 프론트엔드 약 80% 완성, 백엔드 연동 대기

---

## 🎯 핵심 기능

### 1. 일반 사용자 기능 (모바일 최적화)
- ✅ **QR 기반 접근**: 제품 QR 코드 스캔 → 즉시 챗봇 접속
- ✅ **비로그인 사용 가능**: 익명으로 챗봇 이용 (로그인 시 히스토리 저장)
- ✅ **구글 로그인**: OAuth 2.0 기반 간편 로그인 (백엔드 연동 대기)
- ✅ **실시간 대화형 질의응답**: AI 기반 자연어 답변
- ✅ **출처 표시**: PDF 페이지 번호 및 문서명 인용
- ✅ **추천 질문**: 자주 묻는 질문 자동 추천
- ✅ **내 대화 목록**: 로그인 사용자의 과거 대화 관리 (`/my`)
- ✅ **로그인 유도 배너**: 비로그인 시 상단 배너 표시
- ✅ **모바일 친화적 UI**: 터치 최적화, Safe Area 대응

### 2. 기업 관리자 기능
- ✅ **회원가입**: 가입 코드 기반 등록 (슈퍼 관리자가 발급)
  - Step 1: 가입 코드 검증
  - Step 2: 사용자 정보 입력 (이름, 이메일, 부서, 언어)
  - 부서: 기존 부서 선택 + 직접 입력 옵션
- ✅ **프로필 관리**: 이름, 부서, 직책(선택), 언어 설정, 비밀번호 변경
- ✅ **대시보드**: 통계, 차트, 실시간 모니터링
- ✅ **문서 관리**: PDF 업로드, 드래그 앤 드롭, 버전 관리
- ✅ **FAQ 관리**: CRUD, 자동생성 UI
- ✅ **로그 분석**: Top 질문, 응답 시간, 미답변 질문
- ✅ **제품 관리**: 제품 등록 및 QR 코드 생성
- ✅ **로그인/로그아웃**: 세션 기반 인증

### 3. 슈퍼 관리자 기능
- ✅ **전체 대시보드**: 전체 기업 통계, 사용량 분석
- ✅ **기업 관리**: 기업 CRUD, 가입 코드 생성/관리, 상태 관리
- ✅ **관리자 계정 관리**: 계정 목록, 검색/필터, 통계
- ✅ **시스템 설정**: LLM API, 기능 토글, 데이터 관리
- ✅ **권한별 접근 제어**: 기업 관리자의 슈퍼 관리자 페이지 접근 차단

---

## 🔐 3단계 권한 시스템

### 권한 구조
```
┌─────────────────────────────────────┐
│  🔴 Super Admin (슈퍼 관리자)       │
│  - 경로: /superadmin/*              │
│  - 전체 기업 관리                    │
│  - 기업 가입 코드 생성               │
│  - 관리자 계정 관리                  │
│  - 시스템 설정                       │
│  - role: 'super_admin'              │
├─────────────────────────────────────┤
│  🟡 Company Admin (기업 관리자)     │
│  - 경로: /dashboard, /documents 등  │
│  - 회원가입 (가입 코드 필요)        │
│  - 자기 회사 데이터만 관리           │
│  - 프로필 관리                       │
│  - role: 'company_admin'            │
├─────────────────────────────────────┤
│  🟢 User (일반 사용자)              │
│  - 경로: /, /chat/*, /my            │
│  - 비로그인 사용 가능 (제한적)      │
│  - 로그인 시 히스토리 저장           │
│  - 구글 OAuth 로그인                │
│  - role: 'user' (또는 없음)         │
└─────────────────────────────────────┘
```

### 테스트 계정
```typescript
// 슈퍼 관리자
super@seshat.com / super123

// 기업 관리자
admin@samsung.com / admin123  // 삼성전자
admin@lg.com / admin123       // LG전자

// 회원가입 테스트 코드
SAMSUNG24  // 삼성전자
LG2024XY   // LG전자
HYUNDAI8   // 현대자동차
```

---

## 🏗️ 프로젝트 구조 (상세)
```
seshat-frontend/
├── src/
│   ├── app/                          # Next.js 14 App Router
│   │   ├── globals.css               # 🔥 CSS 변수 정의 (필수!)
│   │   ├── layout.tsx                # 루트 레이아웃 (Toast 포함)
│   │   ├── page.tsx                  # 메인 랜딩 페이지
│   │   │
│   │   ├── (user)/                   # 일반 사용자 영역 (라우트 그룹)
│   │   │   ├── layout.tsx            # 사용자 레이아웃 (헤더 없음)
│   │   │   ├── chat/[productId]/    # 동적 라우트: 제품별 챗봇
│   │   │   │   ├── page.tsx
│   │   │   │   └── chat-page.module.css
│   │   │   ├── my/                   # 내 대화 목록 (로그인 필요)
│   │   │   │   ├── page.tsx
│   │   │   │   └── my-page.module.css
│   │   │   └── product/[id]/         # 제품 상세
│   │   │
│   │   ├── (admin)/                  # 기업 관리자 영역 (라우트 그룹)
│   │   │   ├── layout.tsx            # 관리자 레이아웃 (사이드바 + 헤더)
│   │   │   ├── admin-layout.module.css
│   │   │   ├── dashboard/            # 대시보드
│   │   │   ├── documents/            # 문서 관리
│   │   │   ├── faq/                  # FAQ 관리
│   │   │   ├── logs/                 # 로그 분석
│   │   │   ├── products/             # 제품 관리
│   │   │   └── profile/              # 프로필 설정
│   │   │       ├── page.tsx
│   │   │       └── profile-page.module.css
│   │   │
│   │   ├── superadmin/               # 슈퍼 관리자 영역 (일반 폴더)
│   │   │   ├── layout.tsx            # 슈퍼 관리자 레이아웃 (권한 체크!)
│   │   │   ├── superadmin-layout.module.css
│   │   │   ├── page.tsx              # 전체 대시보드
│   │   │   ├── companies/            # 기업 관리
│   │   │   │   └── page.tsx
│   │   │   ├── users/                # 관리자 계정 관리
│   │   │   │   └── page.tsx
│   │   │   └── settings/             # 시스템 설정
│   │   │       └── page.tsx
│   │   │
│   │   ├── admin/                    # 인증 관련 (라우트 그룹 밖)
│   │   │   ├── login/                # 관리자 로그인
│   │   │   │   ├── page.tsx
│   │   │   │   └── login-page.module.css
│   │   │   └── register/             # 관리자 회원가입
│   │   │       ├── page.tsx
│   │   │       └── register-page.module.css
│   │   │
│   │   └── login/                    # 일반 사용자 로그인 (구글)
│   │       ├── page.tsx
│   │       └── login.module.css
│   │
│   ├── components/
│   │   ├── ui/                       # 재사용 가능한 UI 컴포넌트
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   └── Button.module.css
│   │   │   ├── Input/
│   │   │   │   ├── Input.tsx
│   │   │   │   └── Input.module.css
│   │   │   ├── Card/
│   │   │   ├── Modal/
│   │   │   └── Toast/                # 전역 토스트 알림 🆕
│   │   │       ├── Toast.tsx
│   │   │       └── Toast.module.css
│   │   │
│   │   ├── layout/                   # 레이아웃 컴포넌트
│   │   │   ├── Sidebar/              # 기업 관리자 사이드바
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Sidebar.module.css
│   │   │   └── SuperAdminSidebar/    # 슈퍼 관리자 사이드바
│   │   │       ├── SuperAdminSidebar.tsx
│   │   │       └── SuperAdminSidebar.module.css
│   │   │
│   │   ├── auth/                     # 인증 관련 컴포넌트
│   │   │   └── LoginForm/
│   │   │       ├── LoginForm.tsx
│   │   │       └── LoginForm.module.css
│   │   │
│   │   └── chat/                     # 채팅 관련 컴포넌트
│   │       ├── ChatMessage/
│   │       ├── TypingIndicator/
│   │       └── SuggestedQuestions/
│   │
│   ├── features/                     # 기능별 비즈니스 로직
│   │   ├── auth/
│   │   │   └── hooks/
│   │   │       └── useAuth.ts        # 인증 훅 (권한 체크)
│   │   ├── chat/
│   │   │   └── hooks/
│   │   │       └── useChat.ts        # 채팅 훅
│   │   └── ...
│   │
│   ├── store/                        # Zustand 상태 관리
│   │   ├── useAuthStore.ts           # 인증 상태 (persist)
│   │   └── useToastStore.ts          # 토스트 상태 🆕
│   │
│   ├── types/                        # TypeScript 타입 정의
│   │   ├── auth.types.ts             # 인증 관련 타입
│   │   ├── user.types.ts
│   │   └── ...
│   │
│   └── lib/                          # 유틸리티 함수
│
├── public/                           # 정적 파일
├── .env.local                        # 환경 변수 (gitignore)
├── next.config.js
├── tsconfig.json
├── package.json
└── README.md
```

---

## 🎨 CSS 변수 시스템 (중요!)

### globals.css - 모든 CSS 변수 정의

**`src/app/globals.css`** 파일은 **프로젝트 전체의 CSS 변수**를 정의합니다. 
이 파일이 없거나 변수가 누락되면 모든 스타일이 깨집니다!
```css
:root {
  /* Layout - 레이아웃 크기 */
  --sidebar-width: 240px;
  --header-height: 64px;

  /* Z-Index - 레이어 순서 */
  --z-index-dropdown: 1000;
  --z-index-sticky: 1020;
  --z-index-fixed: 1030;
  --z-index-modal: 1050;
  --z-index-tooltip: 1070;

  /* Spacing - 간격 */
  --spacing-xs: 0.25rem;    /* 4px */
  --spacing-sm: 0.5rem;     /* 8px */
  --spacing-md: 1rem;       /* 16px */
  --spacing-lg: 1.5rem;     /* 24px */
  --spacing-xl: 2rem;       /* 32px */
  --spacing-2xl: 2.5rem;    /* 40px */

  /* Font Sizes */
  --font-size-xs: 0.75rem;   /* 12px */
  --font-size-sm: 0.875rem;  /* 14px */
  --font-size-base: 1rem;    /* 16px */
  --font-size-lg: 1.125rem;  /* 18px */
  --font-size-xl: 1.25rem;   /* 20px */
  --font-size-2xl: 1.5rem;   /* 24px */
  --font-size-3xl: 2rem;     /* 32px */
  --font-size-4xl: 2.5rem;   /* 40px */

  /* Font Weights */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Colors - 주요 색상 */
  --color-primary: #667eea;
  --color-primary-hover: #5568d3;
  --color-secondary: #6c757d;
  --color-error: #ef4444;

  /* Text Colors */
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --text-tertiary: #999999;
  --text-inverse: #ffffff;

  /* Background Colors */
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;

  /* Borders */
  --border-light: #e0e0e0;
  --border-radius-sm: 0.25rem;
  --border-radius-md: 0.5rem;
  --border-radius-lg: 1rem;
  --border-radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);

  /* Transitions */
  --transition-fast: 0.15s ease;
  --transition-base: 0.2s ease;
  --transition-slow: 0.3s ease;
}
```

### CSS 변수 사용 예시
```css
/* ✅ 올바른 사용 */
.button {
  padding: var(--spacing-md);
  font-size: var(--font-size-base);
  background: var(--color-primary);
  border-radius: var(--border-radius-md);
}

/* ❌ 잘못된 사용 */
.button {
  padding: var(--spacing-medium); /* 변수명 오타 */
}
```

---

## 🧩 컴포넌트 작성 가이드

### 1. 파일 구조
```
ComponentName/
├── ComponentName.tsx           # 컴포넌트 로직
└── ComponentName.module.css    # 스타일 (CSS Modules)
```

### 2. 컴포넌트 템플릿
```typescript
// ComponentName.tsx
'use client'; // 클라이언트 컴포넌트인 경우

import styles from './ComponentName.module.css';

interface ComponentNameProps {
  title: string;
  onSubmit?: () => void;
}

export default function ComponentName({ 
  title, 
  onSubmit 
}: ComponentNameProps) {
  return (
    <div className={styles.container}>
      <h1>{title}</h1>
    </div>
  );
}
```

### 3. CSS Modules 네이밍
```css
/* ComponentName.module.css */

/* 컨테이너 */
.container {
  padding: var(--spacing-lg);
}

/* 헤더 */
.header {
  margin-bottom: var(--spacing-md);
}

/* 버튼 */
.button {
  /* ... */
}

/* 상태 변형 */
.button.active {
  /* ... */
}

/* 반응형 */
@media (max-width: 768px) {
  .container {
    padding: var(--spacing-md);
  }
}
```

---

## 🔄 새로운 페이지 추가 방법

### 예시: 새로운 관리자 페이지 추가

#### 1. 폴더 및 파일 생성
```powershell
New-Item -ItemType Directory -Path "src/app/(admin)/new-feature" -Force
New-Item -ItemType File -Path "src/app/(admin)/new-feature/page.tsx" -Force
New-Item -ItemType File -Path "src/app/(admin)/new-feature/new-feature.module.css" -Force
```

#### 2. 페이지 코드 작성
```typescript
// src/app/(admin)/new-feature/page.tsx
'use client';

import { useAuth } from '@/features/auth/hooks/useAuth';
import styles from './new-feature.module.css';

export default function NewFeaturePage() {
  const { user } = useAuth();

  return (
    <div className={styles.container}>
      <h1>새로운 기능</h1>
      <p>{user?.name}님 환영합니다!</p>
    </div>
  );
}
```

#### 3. 사이드바 메뉴 추가
```typescript
// src/components/layout/Sidebar/Sidebar.tsx

const menuItems = [
  { icon: LayoutDashboard, label: '대시보드', href: '/dashboard' },
  { icon: FileText, label: '문서 관리', href: '/documents' },
  { icon: Star, label: '새로운 기능', href: '/new-feature' }, // 🆕 추가!
];
```

#### 4. 라우트 자동 생성
Next.js App Router는 폴더 구조를 기반으로 자동으로 라우트를 생성합니다.
```
src/app/(admin)/new-feature/page.tsx → /new-feature
```

---

## 🎯 권한 체크 구현

### 페이지 레벨 권한 체크
```typescript
// src/app/superadmin/layout.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function SuperAdminLayout({ children }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    // 로그인 체크
    if (!isAuthenticated) {
      router.push('/admin/login');
      return;
    }

    // 권한 체크
    if (user?.role !== 'super_admin') {
      alert('접근 권한이 없습니다.');
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, router]);

  // 권한 없으면 로딩 표시
  if (!isAuthenticated || user?.role !== 'super_admin') {
    return <div>권한 확인 중...</div>;
  }

  return <>{children}</>;
}
```

### 컴포넌트 레벨 권한 체크
```typescript
import { useAuth } from '@/features/auth/hooks/useAuth';

function MyComponent() {
  const { isSuperAdmin, isCompanyAdmin } = useAuth();

  return (
    <>
      {isSuperAdmin() && <div>슈퍼 관리자 전용</div>}
      {isCompanyAdmin() && <div>기업 관리자 전용</div>}
    </>
  );
}
```

---

## 🍞 토스트 알림 사용법

### 토스트 호출
```typescript
import { toast } from '@/store/useToastStore';

// 성공
toast.success('저장되었습니다!');

// 에러
toast.error('저장에 실패했습니다.');

// 경고
toast.warning('비밀번호는 6자 이상이어야 합니다.');

// 정보
toast.info('구글 로그인 기능은 준비 중입니다.');

// 지속 시간 커스터마이징 (기본 3초)
toast.success('저장 완료!', 5000); // 5초
```

### alert() 대신 toast 사용
```typescript
// ❌ 기존
alert('로그인에 성공했습니다!');

// ✅ 개선
toast.success('로그인에 성공했습니다!');
```

---

## 🗄️ 상태 관리 (Zustand)

### 인증 상태 (useAuthStore)
```typescript
import { useAuthStore } from '@/store/useAuthStore';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuthStore();

  const handleLogin = async (email: string, password: string) => {
    const success = await login(email, password);
    if (success) {
      toast.success('로그인 성공!');
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>안녕하세요, {user?.name}님</p>
          <button onClick={logout}>로그아웃</button>
        </>
      ) : (
        <button onClick={() => handleLogin('test@test.com', 'password')}>
          로그인
        </button>
      )}
    </div>
  );
}
```

### 새로운 Store 추가
```typescript
// src/store/useMyStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MyState {
  count: number;
  increment: () => void;
}

export const useMyStore = create<MyState>()(
  persist(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
    }),
    {
      name: 'my-storage', // localStorage 키
    }
  )
);
```

---

## 🚀 개발 워크플로우

### 1. 개발 서버 시작
```bash
npm run dev
```

### 2. 브랜치 전략 (권장)
```
main          # 프로덕션
├── develop   # 개발 메인
    ├── feature/login      # 기능 개발
    ├── feature/dashboard  # 기능 개발
    └── fix/css-bug        # 버그 수정
```

### 3. 커밋 메시지 컨벤션
```
feat: 새로운 기능 추가
fix: 버그 수정
style: 코드 스타일 변경 (기능 변경 없음)
refactor: 코드 리팩토링
docs: 문서 수정
chore: 빌드, 설정 변경
```

예시:
```
feat: 프로필 페이지 추가
fix: 사이드바 레이아웃 겹침 수정
style: 로그인 버튼 색상 변경
docs: README 업데이트
```

---

## 🐛 트러블슈팅 가이드

### 1. CSS가 깨졌을 때

**증상**: 페이지 스타일이 전혀 적용되지 않음

**원인**: `globals.css`의 CSS 변수 누락

**해결**:
1. `src/app/globals.css` 파일 확인
2. `:root` 안에 모든 CSS 변수가 정의되어 있는지 확인
3. `src/app/layout.tsx`에서 `import './globals.css'` 있는지 확인

### 2. 사이드바와 컨텐츠가 겹칠 때

**증상**: 사이드바가 메인 컨텐츠 위에 표시됨

**원인**: `margin-left: var(--sidebar-width)` 미적용

**해결**:
1. `globals.css`에 `--sidebar-width: 240px;` 정의 확인
2. 레이아웃 CSS에서 `.mainContent { margin-left: var(--sidebar-width); }` 확인
3. `.next` 폴더 삭제 후 재시작

### 3. 빌드 캐시 문제

**증상**: 코드를 수정했는데 반영되지 않음

**해결**:
```powershell
# 서버 중지 (Ctrl + C)
Remove-Item -Recurse -Force .next
npm run dev
```

브라우저에서 **Ctrl + Shift + R** (강력 새로고침)

### 4. 라우트 404 오류

**증상**: 페이지 접속 시 404 Not Found

**원인**: 
- 파일명이 `page.tsx`가 아님
- 폴더 구조 오류

**해결**:
- 폴더 안에 반드시 `page.tsx` 파일 필요
- 라우트 그룹 `(admin)` 괄호는 URL에 포함되지 않음
- 서버 재시작

### 5. TypeScript 에러

**증상**: 타입 에러 발생

**해결**:
```bash
# 타입 체크
npm run type-check

# 타입 정의 재생성
rm -rf node_modules
npm install
```

---

## 📊 프로젝트 진행 상황

### 완료된 페이지 (2025.10.23 기준)

#### 인증 (100% 완료)
- [x] 관리자 로그인 (`/admin/login`)
- [x] 관리자 회원가입 (`/admin/register`)
- [x] 일반 사용자 로그인 (`/login`) - 구글 OAuth UI만
- [x] 프로필 설정 (`/profile`)

#### 일반 사용자 (90% 완료)
- [x] 메인 랜딩 페이지 (`/`)
- [x] 채팅 페이지 (`/chat/[productId]`)
- [x] 내 대화 목록 (`/my`)
- [x] 로그인 유도 배너
- [ ] 북마크 기능 (미구현)
- [ ] 피드백 시스템 (미구현)

#### 기업 관리자 (100% 완료)
- [x] 대시보드 (`/dashboard`)
- [x] 문서 관리 (`/documents`)
- [x] FAQ 관리 (`/faq`)
- [x] 로그 분석 (`/logs`)
- [x] 제품 관리 (`/products`)
- [x] 프로필 설정 (`/profile`)

#### 슈퍼 관리자 (100% 완료)
- [x] 전체 대시보드 (`/superadmin`)
- [x] 기업 관리 (`/superadmin/companies`)
- [x] 관리자 관리 (`/superadmin/users`)
- [x] 시스템 설정 (`/superadmin/settings`)

#### 공통 시스템 (100% 완료)
- [x] 토스트 알림 시스템
- [x] 권한별 레이아웃
- [x] CSS 변수 시스템
- [x] 3단계 권한 체크

---

## 📝 백엔드 연동 대기 목록

### API 엔드포인트 (미구현)

#### 인증
- `POST /api/auth/login` - 로그인
- `POST /api/auth/register` - 회원가입 (가입 코드 검증)
- `POST /api/auth/logout` - 로그아웃
- `GET /api/auth/me` - 현재 사용자 정보
- `GET /api/auth/google` - 구글 OAuth 시작
- `GET /api/auth/google/callback` - 구글 OAuth 콜백

#### 사용자
- `GET /api/users/sessions` - 내 대화 목록
- `GET /api/users/profile` - 프로필 조회
- `PUT /api/users/profile` - 프로필 수정

#### 채팅
- `POST /api/chat/message` - 메시지 전송 (RAG 응답)
- `GET /api/chat/sessions` - 세션 목록
- `DELETE /api/chat/sessions/:id` - 세션 삭제

#### 관리자
- `GET /api/admin/dashboard/stats` - 대시보드 통계
- `GET /api/admin/documents` - 문서 목록
- `POST /api/admin/documents` - 문서 업로드
- `GET /api/admin/faq` - FAQ 목록
- `POST /api/admin/faq` - FAQ 생성
- `GET /api/admin/logs` - 로그 분석

#### 슈퍼 관리자
- `GET /api/superadmin/companies` - 기업 목록
- `POST /api/superadmin/companies` - 기업 생성 (가입 코드 발급)
- `PUT /api/superadmin/companies/:id` - 기업 수정
- `GET /api/superadmin/users` - 관리자 목록
- `PUT /api/superadmin/settings` - 시스템 설정

---

## 🗄️ DB 스키마

### Users 테이블
```sql
CREATE TABLE users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  
  -- 시스템 권한
  role VARCHAR(20) NOT NULL, -- 'super_admin', 'company_admin', 'user'
  
  -- 소속 정보
  company_id INT,
  department VARCHAR(50), -- 부서 (기존 목록 + 직접 입력)
  job_title VARCHAR(50),  -- 직책 (선택)
  
  -- 환경 설정
  language_preference VARCHAR(10) DEFAULT 'ko', -- 'ko', 'en'
  
  -- 구글 OAuth
  google_id VARCHAR(100),
  profile_image VARCHAR(255),
  
  -- 상태
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive'
  
  -- 타임스탬프
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at DATETIME,
  
  FOREIGN KEY (company_id) REFERENCES companies(company_id),
  INDEX idx_email (email),
  INDEX idx_google_id (google_id),
  INDEX idx_role (role)
);
```

### Companies 테이블
```sql
CREATE TABLE companies (
  company_id INT PRIMARY KEY AUTO_INCREMENT,
  company_name VARCHAR(100) NOT NULL,
  registration_code VARCHAR(20) UNIQUE NOT NULL, -- 가입 코드 (슈퍼 관리자 발급)
  status VARCHAR(20) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_registration_code (registration_code)
);
```

### Chat_Sessions 테이블
```sql
CREATE TABLE chat_sessions (
  session_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT, -- NULL 가능 (비로그인 사용자)
  product_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(product_id),
  INDEX idx_user_id (user_id),
  INDEX idx_product_id (product_id)
);
```

### Chat_Messages 테이블
```sql
CREATE TABLE chat_messages (
  message_id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL,
  role VARCHAR(20) NOT NULL, -- 'user', 'assistant'
  content TEXT NOT NULL,
  sources JSON, -- 출처 정보 (PDF 페이지 등)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
  INDEX idx_session_id (session_id)
);
```

---

## 🎓 코딩 컨벤션

### TypeScript
```typescript
// ✅ 함수형 컴포넌트
export default function MyComponent() { }

// ✅ Props 타입 정의
interface MyComponentProps {
  title: string;
  count?: number; // 선택적
}

// ✅ 이벤트 핸들러
const handleClick = () => { };
const handleSubmit = (e: FormEvent) => { };

// ❌ 피해야 할 것
// - any 타입 사용
// - 인라인 스타일 (CSS Modules 사용)
```

### CSS Modules
```css
/* ✅ 명확한 클래스명 */
.container { }
.header { }
.button { }
.buttonPrimary { }

/* ✅ CSS 변수 사용 */
.button {
  padding: var(--spacing-md);
  font-size: var(--font-size-base);
}

/* ❌ 피해야 할 것 */
.btn { } /* 축약 금지 */
.wrapper { } /* 모호한 이름 */
padding: 16px; /* 하드코딩 금지 */
```

### 파일명
```
✅ kebab-case
- my-component.tsx
- login-page.module.css
- use-auth.ts

✅ PascalCase (컴포넌트)
- Button.tsx
- LoginForm.tsx

❌ camelCase (파일명에 사용 금지)
- myComponent.tsx
```

---

## 📦 주요 라이브러리

| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| next | 14.2.33 | React 프레임워크 |
| react | 18.x | UI 라이브러리 |
| typescript | 5.x | 타입 시스템 |
| zustand | ^4.x | 상태 관리 |
| lucide-react | ^0.x | 아이콘 |
| react-query | ^5.x | 서버 상태 관리 (사용 예정) |

---

## 🚀 배포 가이드 (작성 예정)

### Vercel 배포
```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel
```

### 환경 변수 설정
```
NEXT_PUBLIC_API_URL=https://api.seshat.com
NEXTAUTH_SECRET=your-secret-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

---

## 📞 문의 및 기여

- **팀명**: P&DF
- **프로젝트 리드**: [서현수 → 이도훈]
- **프론트엔드 완성도**: 약 80%
- **전체 시스템 완성도**: 약 55% (백엔드 연동 대기)

### 새로운 기여자를 위한 가이드

1. **README 정독** - 이 문서를 처음부터 끝까지 읽어주세요
2. **프로젝트 구조 파악** - 폴더 구조와 컨벤션 확인
3. **로컬 환경 구축** - `npm install` → `npm run dev`
4. **테스트 계정으로 모든 페이지 탐색**
5. **작업 시작 전** - 기존 코드 스타일 준수
6. **의문점** - 주석이나 문서 확인, 팀원에게 질문

---

**Last Updated**: 2025년 10월 23일  
**Current Status**: 프론트엔드 약 80% 완성, 백엔드 연동 대기  
**Next Sprint**: 백엔드 API 연동, 피드백 시스템, 북마크 기능

---

## 🔗 참고 문서

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [CSS Modules](https://github.com/css-modules/css-modules)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [요구사항 정의서](https://www.hancomdocs.com/open?fileId=eGzPDScXbTnPiGbQyKmGh7DOiHcZiLvT)
- [프로젝트 기획서](https://www.hancomdocs.com/open?fileId=iHcXbMd8zMuKiKmIbPF5B2h5E1p8l9F8)