# ManuAI-Talk - AI 기반 제품 설명서 질의응답 시스템

LLM을 활용한 PDF 문서 요약 및 질의응답 기능 개발 프로젝트

## 📋 프로젝트 개요

**ManuAI-Talk**은 전자제품 설명서를 AI 기반으로 분석하고, 사용자의 질문에 실시간으로 답변하는 RAG(Retrieval-Augmented Generation) 시스템입니다.

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
super@manuai-talk.com / super123

// 기업 관리자
admin@samsung.com / admin123  // 삼성전자
admin@lg.com / admin123       // LG전자

// 회원가입 테스트 코드
SAMSUNG24  // 삼성전자
LG2024XY   // LG전자
HYUNDAI8   // 현대자동차
```

---

<<<<<<< HEAD
## 🧾 포맷 예시

### ❓ (미확정) elements.json
```json
[
  {
    "doc_id": "12c1bd20-da56-4e72-8362-29ac2a66bace",
    "page_id": "12c1bd20-da56-4e72-8362-29ac2a66bace_p5",
    "element_id": "12c1bd20-da56-4e72-8362-29ac2a66bace_p5_tb-2-3",
    "origin_page": 5,
    "page": 5,
    "type": "table",
    "bbox": [120, 300, 480, 500],
    "caption": "표 2-3. 주요 스펙 비교",
    "ref_id": "tb-2-3"
  },
  {
    "doc_id": "12c1bd20-da56-4e72-8362-29ac2a66bace",
    "page_id": "12c1bd20-da56-4e72-8362-29ac2a66bace_p7",
    "element_id": "12c1bd20-da56-4e72-8362-29ac2a66bace_p7_tb-2-3",
    "origin_page": 7,
    "page": 7,
    "type": "figure",
    "bbox": [100, 200, 500, 650],
    "caption": "그림 3-1. 배선도",
    "ref_id": "fig-3-1"
  }
]
```
### 📌 meta.page.json
```json
[
  {
    "doc_id": "0003040d-0f71-4729-bd3b-733f3c8962bf",
    "page": 1,
    "slice_index": 0,
    "language":"ko",
    "source": "../ex_data/TEST-ALPHA01.pdf",
    "image": "../artifacts/0003040d-0f71-4729-bd3b-733f3c8962bf/TEST-ALPHA01_ko_p1_0.png",
    "modified_at": "2024-09-06T01:57:29Z"
  },
  {
    "doc_id": "0003040d-0f71-4729-bd3b-733f3c8962bf",
    "page": 2,
    "slice_index": 0,
    "language":"ko",
    "source": "../ex_data/TEST-ALPHA01.pdf",
    "image": "../artifacts/0003040d-0f71-4729-bd3b-733f3c8962bf/TEST-ALPHA01_ko_p2_0.png",
    "modified_at": "2024-09-06T01:57:29Z"
  },
  {
    "doc_id": "0003040d-0f71-4729-bd3b-733f3c8962bf",
    "page": 2,
    "slice_index": 1,
    "language":"ko",
    "source": "../ex_data/TEST-ALPHA01.pdf",
    "image": "../artifacts/0003040d-0f71-4729-bd3b-733f3c8962bf/TEST-ALPHA01_ko_p2_1.png",
    "modified_at": "2024-09-06T01:57:29Z"
  }
]
```
=======
## 🏗️ 프로젝트 구조 (상세)
```
manuai-talk-frontend/
├── src/
│   ├── app/
│   │   ├── globals.css                        # ⭐ CSS 변수 정의 (필수!)
│   │   ├── layout.tsx                         # 루트 레이아웃 (Toast 포함)
│   │   ├── page.tsx                           # 메인 랜딩 페이지 (검색 중심)
│   │   └── page.module.css                    # 메인 페이지 스타일
│   │
│   ├── (user)/                                # 일반 사용자 영역 (라우트 그룹)
│   │   ├── layout.tsx                         # 사용자 레이아웃 (모바일 헤더)
│   │   ├── chat/
│   │   │   └── [productId]/                   # 동적 라우트: 제품별 챗봇
│   │   │       ├── page.tsx
│   │   │       └── chat-page.module.css
│   │   ├── simulation/
│   │   │   └── [productId]/                   # 공간 시뮬레이션
│   │   │       ├── page.tsx
│   │   │       └── simulation-page.module.css
│   │   ├── my/                                # 내 대화 목록 (로그인 필요)
│   │   │   ├── page.tsx
│   │   │   └── my-page.module.css
│   │   └── product/
│   │       └── [id]/                          # 제품 상세
│   │           ├── page.tsx
│   │           └── product-page.module.css
│   │
│   ├── (admin)/                               # 기업 관리자 영역 (라우트 그룹)
│   │   ├── layout.tsx                         # 관리자 레이아웃 (사이드바 + 헤더)
│   │   ├── admin-layout.module.css
│   │   ├── dashboard/                         # 대시보드
│   │   │   ├── page.tsx
│   │   │   └── dashboard-page.module.css
│   │   ├── documents/                         # 문서 관리
│   │   │   ├── page.tsx
│   │   │   ├── documents-page.module.css
│   │   │   ├── upload/                        # 문서 업로드
│   │   │   │   ├── page.tsx
│   │   │   │   └── upload-page.module.css
│   │   │   └── [id]/                          # 문서 상세
│   │   │       ├── page.tsx
│   │   │       └── document-detail-page.module.css
│   │   ├── faq/                               # FAQ 관리
│   │   │   ├── page.tsx
│   │   │   ├── faq-page.module.css
│   │   │   ├── auto-generate/                 # FAQ 자동 생성
│   │   │   │   ├── page.tsx
│   │   │   │   └── auto-generate-page.module.css
│   │   │   └── [id]/
│   │   │       └── edit/                      # FAQ 편집
│   │   │           ├── page.tsx
│   │   │           └── edit-page.module.css
│   │   ├── logs/                              # 로그 분석 (✨ 10/28 UI/UX 개선)
│   │   │   ├── page.tsx
│   │   │   └── logs-page.module.css
│   │   ├── products/                          # 🆕 제품 관리 (10/28 신규)
│   │   │   ├── page.tsx                       # 제품 목록
│   │   │   ├── products-page.module.css
│   │   │   └── new/                           # 제품 등록
│   │   │       ├── page.tsx
│   │   │       └── new-page.module.css
│   │   └── profile/                           # 프로필 설정
│   │       ├── page.tsx
│   │       └── profile-page.module.css
│   │
│   ├── admin/                                 # 관리자 인증 영역
│   │   ├── login/                             # 관리자 로그인
│   │   │   ├── page.tsx
│   │   │   └── login.module.css
│   │   └── register/                          # 관리자 회원가입
│   │       ├── page.tsx
│   │       └── register.module.css
│   │
│   ├── login/                                 # 일반 사용자 로그인 (구글)
│   │   ├── page.tsx
│   │   └── login.module.css
│   │
│   ├── superadmin/                            # 슈퍼 관리자 영역
│   │   ├── layout.tsx                         # 슈퍼 관리자 레이아웃 (권한 체크!)
│   │   ├── superadmin-layout.module.css
│   │   ├── page.tsx                           # 전체 대시보드
│   │   ├── companies/                         # 기업 관리
│   │   │   ├── page.tsx
│   │   │   └── companies-page.module.css
│   │   ├── users/                             # 관리자 계정 관리
│   │   │   ├── page.tsx
│   │   │   └── users-page.module.css
│   │   └── settings/                          # 시스템 설정
│   │       ├── page.tsx
│   │       └── settings-page.module.css
│   │
│   ├── api/                                   # Next.js API 라우트
│   │   └── (API 엔드포인트들)
│   │
│   ├── components/
│   │   ├── ui/                                # 재사용 가능한 UI 컴포넌트
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   └── Button.module.css
│   │   │   ├── Input/
│   │   │   │   ├── Input.tsx
│   │   │   │   └── Input.module.css
│   │   │   ├── Card/
│   │   │   │   ├── Card.tsx
│   │   │   │   └── Card.module.css
│   │   │   ├── Modal/
│   │   │   │   ├── Modal.tsx
│   │   │   │   └── Modal.module.css
│   │   │   └── Toast/                         # 전역 토스트 알림
│   │   │       ├── Toast.tsx
│   │   │       └── Toast.module.css
│   │   │
│   │   ├── home/                              # 홈페이지 전용 컴포넌트
│   │   │   ├── SearchBar/                     # 검색창 (자동완성)
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   └── SearchBar.module.css
│   │   │   ├── RecentSearches/                # 최근 검색
│   │   │   │   ├── RecentSearches.tsx
│   │   │   │   └── RecentSearches.module.css
│   │   │   ├── CategoryGrid/                  # 카테고리별 제품
│   │   │   │   ├── CategoryGrid.tsx
│   │   │   │   └── CategoryGrid.module.css
│   │   │   └── PopularProducts/               # 인기 제품
│   │   │       ├── PopularProducts.tsx
│   │   │       └── PopularProducts.module.css
│   │   │
│   │   ├── chat/                              # 채팅 관련 컴포넌트
│   │   │   ├── ChatMessage/                   # 메시지 버블 (피드백 포함)
│   │   │   │   ├── ChatMessage.tsx
│   │   │   │   └── ChatMessage.module.css
│   │   │   ├── SessionHistory/                # 세션 히스토리 사이드바
│   │   │   │   ├── SessionHistory.tsx
│   │   │   │   └── SessionHistory.module.css
│   │   │   ├── TypingIndicator/
│   │   │   │   ├── TypingIndicator.tsx
│   │   │   │   └── TypingIndicator.module.css
│   │   │   └── SuggestedQuestions/
│   │   │       ├── SuggestedQuestions.tsx
│   │   │       └── SuggestedQuestions.module.css
│   │   │
│   │   ├── document/                          # 문서 관련 컴포넌트
│   │   │   ├── DocumentList/
│   │   │   │   ├── DocumentList.tsx
│   │   │   │   └── DocumentList.module.css
│   │   │   ├── DocumentCard/                  # 케밥 메뉴 포함
│   │   │   │   ├── DocumentCard.tsx
│   │   │   │   └── DocumentCard.module.css
│   │   │   └── DocumentUploader/              # 드래그 앤 드롭
│   │   │       ├── DocumentUploader.tsx
│   │   │       └── DocumentUploader.module.css
│   │   │
│   │   ├── dashboard/                         # 대시보드 컴포넌트
│   │   │   ├── StatsCard/                     # 통계 카드
│   │   │   │   ├── StatsCard.tsx
│   │   │   │   └── StatsCard.module.css
│   │   │   ├── QueryAnalytics/                # 질의 분석 차트
│   │   │   │   ├── QueryAnalytics.tsx
│   │   │   │   └── QueryAnalytics.module.css
│   │   │   ├── TopQuestions/                  # 자주 묻는 질문
│   │   │   │   ├── TopQuestions.tsx
│   │   │   │   └── TopQuestions.module.css
│   │   │   ├── ResponseTimeChart/             # 응답 시간 차트
│   │   │   │   ├── ResponseTimeChart.tsx
│   │   │   │   └── ResponseTimeChart.module.css
│   │   │   └── RecentActivity/                # 최근 활동
│   │   │       ├── RecentActivity.tsx
│   │   │       └── RecentActivity.module.css
│   │   │
│   │   ├── faq/                               # FAQ 컴포넌트
│   │   │   ├── FAQList/
│   │   │   │   ├── FAQList.tsx
│   │   │   │   └── FAQList.module.css
│   │   │   ├── FAQCard/                       # 확장/축소 UI
│   │   │   │   ├── FAQCard.tsx
│   │   │   │   └── FAQCard.module.css
│   │   │   └── FAQAutoGenerate/               # 자동 생성 결과
│   │   │       ├── FAQAutoGenerate.tsx
│   │   │       └── FAQAutoGenerate.module.css
│   │   │
│   │   ├── logs/                              # 로그 분석 컴포넌트 (✨ 10/28 개선)
│   │   │   ├── TopQuestionsTable/             # Top 질문 테이블
│   │   │   │   ├── TopQuestionsTable.tsx
│   │   │   │   └── TopQuestionsTable.module.css
│   │   │   └── UnansweredQueries/             # 미답변 질문 (✨ 우선순위 시스템)
│   │   │       ├── UnansweredQueries.tsx
│   │   │       └── UnansweredQueries.module.css
│   │   │
│   │   ├── product/                           # 🆕 제품 관련 컴포넌트 (10/28 신규)
│   │   │   ├── ProductCard/                   # 제품 카드 (케밥 메뉴)
│   │   │   │   ├── ProductCard.tsx
│   │   │   │   └── ProductCard.module.css
│   │   │   ├── ProductForm/                   # 제품 등록 폼
│   │   │   │   ├── ProductForm.tsx
│   │   │   │   └── ProductForm.module.css
│   │   │   ├── ProductList/                   # 제품 목록
│   │   │   │   ├── ProductList.tsx
│   │   │   │   └── ProductList.module.css
│   │   │   └── QRCodeDisplay/                 # QR 코드 표시/다운로드
│   │   │       ├── QRCodeDisplay.tsx
│   │   │       └── QRCodeDisplay.module.css
│   │   │
│   │   ├── auth/                              # 인증 관련 컴포넌트
│   │   │   └── LoginForm/
│   │   │       ├── LoginForm.tsx
│   │   │       └── LoginForm.module.css
│   │   │
│   │   ├── common/                            # 공통 컴포넌트
│   │   │   └── (공통 UI 요소들)
│   │   │
│   │   ├── superadmin/                        # 슈퍼 관리자 컴포넌트
│   │   │   └── (슈퍼 관리자 전용 컴포넌트들)
│   │   │
│   │   └── layout/                            # 레이아웃 컴포넌트
│   │       ├── Header/                        # PC 헤더
│   │       │   ├── Header.tsx
│   │       │   └── Header.module.css
│   │       ├── MobileHeader/                  # 모바일 헤더 (로그인/로그아웃)
│   │       │   ├── MobileHeader.tsx
│   │       │   └── MobileHeader.module.css
│   │       ├── Sidebar/                       # 관리자 사이드바
│   │       │   ├── Sidebar.tsx
│   │       │   └── Sidebar.module.css
│   │       ├── SuperAdminSidebar/             # 슈퍼 관리자 사이드바
│   │       │   ├── SuperAdminSidebar.tsx
│   │       │   └── SuperAdminSidebar.module.css
│   │       └── Footer/                        # 푸터
│   │           ├── Footer.tsx
│   │           └── Footer.module.css
│   │
│   ├── features/                              # 기능별 비즈니스 로직
│   │   ├── auth/
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts                 # 인증 훅 (권한 체크)
│   │   │   └── types/
│   │   │       └── auth.types.ts
│   │   ├── chat/
│   │   │   ├── hooks/
│   │   │   │   ├── useChat.ts                 # 채팅 로직
│   │   │   │   ├── useChatSession.ts          # 세션 관리
│   │   │   │   └── useStreamingResponse.ts    # 스트리밍 (예정)
│   │   │   └── types/
│   │   │       └── chat.types.ts
│   │   ├── documents/
│   │   │   └── hooks/
│   │   │       └── (문서 관련 훅들)
│   │   ├── dashboard/
│   │   │   └── hooks/
│   │   │       ├── useDashboardData.ts
│   │   │       └── (대시보드 훅들)
│   │   ├── analytics/
│   │   │   └── hooks/
│   │   │       └── (분석 관련 훅들)
│   │   ├── faq/
│   │   │   └── hooks/
│   │   │       └── (FAQ 관련 훅들)
│   │   └── superadmin/                        # 슈퍼 관리자 기능
│   │       └── hooks/
│   │           └── (슈퍼 관리자 훅들)
│   │
│   ├── lib/                                   # 유틸리티 함수 및 설정
│   │   ├── api/
│   │   │   ├── client.ts                      # Axios 인스턴스
│   │   │   ├── endpoints.ts                   # API 엔드포인트
│   │   │   └── websocket.ts                   # WebSocket 클라이언트 (예정)
│   │   ├── db/                                # IndexedDB
│   │   │   └── indexedDB.ts                   # 세션, 피드백 저장
│   │   ├── hooks/                             # 공통 커스텀 훅
│   │   │   ├── useDebounce.ts
│   │   │   └── useMediaQuery.ts
│   │   ├── utils/                             # 유틸리티 함수
│   │   │   ├── format.ts                      # 날짜, 파일크기 포맷
│   │   │   └── validation.ts                  # 유효성 검사
│   │   └── constants/                         # 상수
│   │       ├── routes.ts                      # 라우트 상수
│   │       ├── config.ts                      # 설정 값
│   │       └── messages.ts                    # 메시지 상수
│   │
│   ├── store/                                 # Zustand 상태 관리
│   │   ├── useAuthStore.ts                    # 인증 상태 (persist)
│   │   ├── useChatStore.ts                    # 채팅 상태
│   │   ├── useToastStore.ts                   # 토스트 상태
│   │   └── index.ts
│   │
│   └── types/                                 # TypeScript 타입 정의
│       ├── auth.types.ts                      # 인증 관련 타입
│       ├── chat.types.ts                      # 채팅 타입
│       ├── document.types.ts                  # 문서 타입
│       ├── faq.types.ts                       # FAQ 타입
│       ├── log.types.ts                       # 로그 타입
│       ├── product.types.ts                   # 🆕 제품 타입 (10/28 신규)
│       ├── user.types.ts                      # 사용자 타입
│       └── common.types.ts                    # 공통 타입
│
├── public/                                    # 정적 파일
│   ├── qr-codes/                              # QR 코드 이미지
│   ├── icons/                                 # 아이콘
│   └── images/                                # 이미지
│
├── .env.local                                 # 환경 변수 (gitignore)
├── .env.example                               # 환경 변수 예시
├── .gitignore                                 # Git 무시 파일
├── next.config.js                             # Next.js 설정
├── next-env.d.ts                              # Next.js 타입 정의
├── tsconfig.json                              # TypeScript 설정
├── tsconfig.tsbuildinfo                       # TypeScript 빌드 정보
├── package.json                               # 의존성 관리
├── package-lock.json                          # 의존성 잠금 파일
└── README.md                                  # 프로젝트 문서
```

---

## 🆕 **10월 28일 추가된 파일**
```
📁 제품 관리 시스템 (신규)
├── src/app/(admin)/products/page.tsx
├── src/app/(admin)/products/products-page.module.css
├── src/app/(admin)/products/new/page.tsx
├── src/app/(admin)/products/new/new-page.module.css
├── src/components/product/ProductCard/ProductCard.tsx
├── src/components/product/ProductCard/ProductCard.module.css
├── src/components/product/ProductForm/ProductForm.tsx
├── src/components/product/ProductForm/ProductForm.module.css
├── src/components/product/ProductList/ProductList.tsx
├── src/components/product/ProductList/ProductList.module.css
├── src/components/product/QRCodeDisplay/QRCodeDisplay.tsx
├── src/components/product/QRCodeDisplay/QRCodeDisplay.module.css
└── src/types/product.types.ts

✨ 로그 분석 개선 (수정)
├── src/app/(admin)/logs/page.tsx (대폭 개선)
├── src/app/(admin)/logs/logs-page.module.css (대폭 개선)
└── src/components/logs/UnansweredQueries/UnansweredQueries.tsx (우선순위 시스템 추가)

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

## 📊## 📊 프로젝트 진행 상황

### 완료된 페이지 (2025.10.28 기준)

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
- [x] 로그 분석 (`/logs`) - **UI/UX 개선 완료 (10/28)** ✨
- [x] 제품 관리 (`/products`) - **신규 완성 (10/28)** ✨
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

## 📅 일자별 주요 업데이트 내역

### 2025년 10월 28일
**제품 관리 시스템 완성 & 로그 분석 페이지 대폭 개선** 🎉

#### 제품 관리 시스템 (신규 완성)
- ✅ **제품 목록 페이지** (`/products`)
  - 검색 기능 (제품명, 모델명, 제조사)
  - 필터 기능 (카테고리, 상태)
  - 통계 카드 (총 제품 수, 활성 제품, 문서 수, QR 조회수)
  - 반응형 그리드 레이아웃
  
- ✅ **제품 카드 컴포넌트** (`ProductCard`)
  - 케밥 메뉴 (QR 코드 보기, 수정, 활성화/비활성화, 삭제)
  - 제품 정보 표시 (이름, 모델명, 제조사, 카테고리)
  - 통계 표시 (조회수, 질문 수, 문서 개수)
  - 상태 표시 (활성/비활성/임시저장)

- ✅ **제품 등록 페이지** (`/products/new`)
  - 단계별 입력 폼 (기본 정보, 카테고리, 제조사, 제품 설명)
  - 실시간 유효성 검사
  - 드래프트 저장 기능

- ✅ **QR 코드 시스템** (`QRCodeDisplay`)
  - QR 코드 자동 생성
  - 다운로드 기능 (PNG)
  - 인쇄 기능
  - URL 복사 기능
  - 모달 방식 표시

#### 로그 분석 페이지 UI/UX 개선
- ✅ **미답변 질문 우선순위화**
  - 페이지 최상단으로 이동 (시급성 강조)
  - 긴급 알림 배너 추가
  - 우선순위 3단계 분류:
    - 🔴 긴급 (24시간 이상 미답변)
    - 🟡 주의 (6-24시간 미답변)
    - 🔵 최근 (6시간 미만)
  - 우선순위 기준 가이드 표시

- ✅ **미답변 질문 카드 개선**
  - 경과 시간 자동 계산 및 표시
  - 우선순위별 색상 코딩 (배경, 테두리, 배지)
  - 빠른 액션 버튼 (답변하기, 제품 보기, 보류)
  - 제품명, 시도 횟수 표시
  - Empty State (미답변 없을 때)

- ✅ **검색 & 필터 기능 추가**
  - 질문 내용 검색창
  - 제품별 필터 드롭다운
  - 날짜 범위 선택 (24시간, 7일, 30일, 90일)

- ✅ **레이아웃 재구성**
```
  [긴급 알림 배너]
  [검색 & 필터]
  [🚨 미답변 질문] ← 최상단으로 이동
  [📊 간소화된 통계 카드]
  [📈 자주 묻는 질문 Top 10]
  [⏱️ 응답 시간 추이]
```

#### UI 개선
- 📱 모바일 반응형 완벽 대응 (미답변 질문, 제품 카드)
- 🎨 일관된 디자인 시스템 적용
- ⚡ 호버 효과 및 트랜지션 추가

#### 코드 품질
- 🔧 CSS Modules 구조 최적화
- 📝 타입 안정성 강화 (TypeScript)
- ♻️ 재사용 가능한 컴포넌트 설계

---

### 2025년 10월 23일
**프론트엔드 핵심 기능 80% 완성**

#### 완성된 주요 기능
- ✅ 3단계 권한 시스템 (일반/기업/슈퍼 관리자)
- ✅ 관리자 회원가입 (가입 코드 검증)
- ✅ 프로필 관리 (부서 선택/직접입력)
- ✅ 대시보드 (통계 카드, 차트)
- ✅ 문서 관리 (업로드, 목록, 케밥 메뉴)
- ✅ FAQ 관리 (CRUD, 자동생성 UI)
- ✅ 로그 분석 (기본 구조)
- ✅ 슈퍼 관리자 전체 페이지
- ✅ 토스트 알림 시스템
- ✅ CSS 변수 시스템

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
NEXT_PUBLIC_API_URL=https://api.manuai-talk.com
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

**Last Updated**: 2025년 10월 28일  
**Current Status**: 프론트엔드 약 85% 완성, 백엔드 연동 대기  
**Next Sprint**: 백엔드 API 연동, 피드백 시스템, 북마크 기능

---

## 🔗 참고 문서

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [CSS Modules](https://github.com/css-modules/css-modules)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [요구사항 정의서](https://www.hancomdocs.com/open?fileId=eGzPDScXbTnPiGbQyKmGh7DOiHcZiLvT)
- [프로젝트 기획서](https://www.hancomdocs.com/open?fileId=iHcXbMd8zMuKiKmIbPF5B2h5E1p8l9F8)
>>>>>>> backend
