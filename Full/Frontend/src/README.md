# ManuAI-Talk - AI 기반 제품 설명서 질의응답 시스템

LLM을 활용한 PDF 문서 요약 및 질의응답 기능 개발 프로젝트

## 📋 프로젝트 개요

**ManuAI-Talk**은 전자제품 설명서를 AI 기반으로 분석하고, 사용자의 질문에 실시간으로 답변하는 RAG(Retrieval-Augmented Generation) 시스템입니다.

- **프로젝트 기간**: 2025.01 ~ 2025.02
- **팀명**: P&DF
- **서비스명 유래**: Manual + AI + Talk = "매뉴얼에 대해 AI와 대화하다"
- **기술 스택**: Next.js 14, TypeScript, CSS Modules, Zustand, IndexedDB, React Query

---

## 🎯 핵심 기능

### 1. 사용자 기능 (모바일 최적화)
- ✅ **제품 검색 시스템**
  - 실시간 자동완성 검색
  - 최근 검색 히스토리 (localStorage)
  - 카테고리별 제품 탐색 (에어컨, 냉장고, 세탁기, TV 등)
  - 인기 제품 추천 (조회수 기반)
- ✅ **QR 기반 접근**: 제품 QR 코드 스캔 → 즉시 챗봇 접속
- ✅ **실시간 대화형 질의응답**: AI 기반 자연어 답변
- ✅ **세션 관리**: IndexedDB 기반 대화 세션 저장/불러오기/삭제
- ✅ **피드백 시스템**: 답변 평가 (👍👎) 및 취소 기능
- ✅ **출처 표시**: PDF 페이지 번호 및 문서명 인용
- ✅ **추천 질문**: 자주 묻는 질문 자동 추천
- ✅ **공간 시뮬레이션**: AR/3D 제품 배치 시뮬레이션 페이지 (구현 예정)
- ✅ **모바일 친화적 UI**: 터치 최적화, Safe Area 대응

### 2. 관리자 기능
- ✅ **대시보드**: 통계, 차트, 실시간 모니터링
- ✅ **문서 관리**: PDF 업로드, 드래그 앤 드롭, 버전 관리
  - 케밥 메뉴 (상세보기, 수정, 다운로드, 복제, 활성화/비활성화, 삭제)
  - 검색 및 필터링
  - 문서 상태 관리 (처리 중, 사용 가능, 오류)
- ✅ **FAQ 자동 생성**: 로그 분석 기반 AI 생성
- ✅ **FAQ 관리**: 목록, 편집, 확장/축소 UI
- ✅ **로그 분석**: Top 질문, 응답 시간, 미답변 질문 추적
- ✅ **제품 관리**: 제품 등록 및 QR 코드 생성

---

## 🏗️ 프로젝트 구조
```
manuai-talk-frontend/
├── public/                          # 정적 파일
│   ├── qr-codes/                   # QR 코드 이미지
│   ├── icons/                      # 아이콘
│   └── images/                     # 이미지
│
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (user)/                # 사용자 영역 (모바일 최적화)
│   │   │   ├── chat/[productId]/ # 제품별 챗봇 페이지
│   │   │   ├── simulation/[productId]/ # 공간 시뮬레이션
│   │   │   ├── my/               # 내 대화 목록
│   │   │   └── layout.tsx        # 사용자 레이아웃 (모바일 헤더)
│   │   │
│   │   ├── (admin)/              # 관리자 영역
│   │   │   ├── dashboard/        # 대시보드
│   │   │   ├── documents/        # 문서 관리
│   │   │   │   ├── upload/       # 문서 업로드
│   │   │   │   └── [id]/         # 문서 상세
│   │   │   ├── faq/              # FAQ 관리
│   │   │   │   ├── auto-generate/ # FAQ 자동 생성
│   │   │   │   └── [id]/edit/    # FAQ 편집
│   │   │   ├── logs/             # 로그 분석
│   │   │   ├── products/         # 제품 관리
│   │   │   ├── profile/          # 프로필 설정
│   │   │   └── layout.tsx        # 관리자 레이아웃 (사이드바)
│   │   │
│   │   ├── (superadmin)/         # 슈퍼 관리자 영역
│   │   │   ├── companies/        # 기업 관리
│   │   │   ├── users/            # 사용자 관리
│   │   │   └── settings/         # 시스템 설정
│   │   │
│   │   ├── layout.tsx            # 루트 레이아웃
│   │   ├── page.tsx              # 홈페이지 (검색 중심)
│   │   └── globals.css           # 전역 스타일
│   │
│   ├── components/               # 재사용 컴포넌트
│   │   ├── ui/                  # 기본 UI 컴포넌트
│   │   │   ├── Button/          # 버튼 컴포넌트
│   │   │   ├── Input/           # 입력 컴포넌트
│   │   │   ├── Card/            # 카드 컴포넌트
│   │   │   ├── Modal/           # 모달 컴포넌트
│   │   │   └── Toast/           # 토스트 알림
│   │   │
│   │   ├── home/                # 홈페이지 전용
│   │   │   ├── SearchBar/       # 검색창 (자동완성)
│   │   │   ├── RecentSearches/  # 최근 검색
│   │   │   ├── CategoryGrid/    # 카테고리별 제품
│   │   │   └── PopularProducts/ # 인기 제품
│   │   │
│   │   ├── chat/                # 채팅 관련
│   │   │   ├── ChatMessage/     # 메시지 버블 (피드백 포함)
│   │   │   ├── SessionHistory/  # 세션 히스토리 사이드바
│   │   │   ├── SuggestedQuestions/ # 추천 질문
│   │   │   └── TypingIndicator/ # 타이핑 인디케이터
│   │   │
│   │   ├── document/            # 문서 관련
│   │   │   ├── DocumentList/    # 문서 목록
│   │   │   ├── DocumentCard/    # 문서 카드 (케밥 메뉴)
│   │   │   └── DocumentUploader/ # 파일 업로더 (드래그 앤 드롭)
│   │   │
│   │   ├── dashboard/           # 대시보드
│   │   │   ├── StatsCard/       # 통계 카드
│   │   │   ├── QueryAnalytics/  # 질의 분석 차트
│   │   │   ├── TopQuestions/    # 자주 묻는 질문
│   │   │   ├── ResponseTimeChart/ # 응답 시간 차트
│   │   │   └── RecentActivity/  # 최근 활동
│   │   │
│   │   ├── faq/                 # FAQ
│   │   │   ├── FAQList/         # FAQ 목록
│   │   │   ├── FAQCard/         # FAQ 카드 (확장/축소)
│   │   │   └── FAQAutoGenerate/ # 자동 생성 결과
│   │   │
│   │   ├── logs/                # 로그 분석
│   │   │   ├── TopQuestionsTable/ # Top 질문 테이블
│   │   │   └── UnansweredQueries/ # 미답변 질문
│   │   │
│   │   └── layout/              # 레이아웃
│   │       ├── Header/          # PC 헤더
│   │       ├── MobileHeader/    # 모바일 헤더 (로그인/로그아웃)
│   │       ├── Sidebar/         # 관리자 사이드바
│   │       └── Footer/          # 푸터
│   │
│   ├── features/                # 기능별 모듈
│   │   ├── auth/
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts         # 인증 훅
│   │   │   └── types/
│   │   │       └── auth.types.ts
│   │   │
│   │   ├── chat/
│   │   │   ├── hooks/
│   │   │   │   ├── useChat.ts         # 채팅 로직
│   │   │   │   ├── useChatSession.ts  # 세션 관리
│   │   │   │   └── useStreamingResponse.ts # 스트리밍 (예정)
│   │   │   └── types/
│   │   │       └── chat.types.ts
│   │   │
│   │   ├── documents/hooks/
│   │   ├── dashboard/hooks/
│   │   └── analytics/hooks/
│   │
│   ├── lib/                     # 유틸리티 및 설정
│   │   ├── api/
│   │   │   ├── client.ts        # Axios 인스턴스
│   │   │   ├── endpoints.ts     # API 엔드포인트
│   │   │   └── websocket.ts     # WebSocket 클라이언트 (예정)
│   │   │
│   │   ├── db/                  # IndexedDB
│   │   │   └── indexedDB.ts     # 세션, 피드백 저장
│   │   │
│   │   ├── hooks/               # 공통 커스텀 훅
│   │   │   ├── useDebounce.ts
│   │   │   └── useMediaQuery.ts
│   │   │
│   │   ├── utils/               # 유틸리티 함수
│   │   │   ├── format.ts        # 날짜, 파일크기 포맷
│   │   │   └── validation.ts    # 유효성 검사
│   │   │
│   │   └── constants/           # 상수
│   │       ├── routes.ts        # 라우트 상수
│   │       ├── config.ts        # 설정 값
│   │       └── messages.ts      # 메시지 상수
│   │
│   ├── store/                   # 전역 상태 (Zustand)
│   │   ├── useAuthStore.ts      # 인증 상태
│   │   ├── useChatStore.ts      # 채팅 상태
│   │   ├── useToastStore.ts     # 토스트 상태
│   │   └── index.ts
│   │
│   ├── types/                   # TypeScript 타입
│   │   ├── auth.types.ts        # 인증 타입
│   │   ├── chat.types.ts        # 채팅 타입
│   │   ├── document.types.ts    # 문서 타입
│   │   ├── faq.types.ts         # FAQ 타입
│   │   ├── log.types.ts         # 로그 타입
│   │   └── common.types.ts      # 공통 타입
│   │
│   └── styles/                  # 전역 스타일
│       ├── globals.css          # 전역 스타일
│       ├── variables.css        # CSS 변수 (색상, 간격 등)
│       ├── reset.css            # CSS 리셋
│       ├── typography.css       # 타이포그래피
│       └── utilities.css        # 유틸리티 클래스
│
├── .env.local                   # 환경 변수 (gitignore)
├── .env.example                 # 환경 변수 예시
├── next.config.js               # Next.js 설정
├── tsconfig.json                # TypeScript 설정
└── package.json                 # 의존성 관리
```

---

## 🎨 디자인 시스템

### CSS Modules 기반 스타일링
- **변수 기반**: `globals.css`에서 색상, 간격, 폰트 정의
- **컴포넌트별 스타일**: 각 컴포넌트 폴더에 `.module.css` 포함
- **재사용 클래스**: `utilities.css`에서 flex, margin 등 제공
- **일관된 디자인**: 그라데이션, 호버 효과, 애니메이션

### 색상 팔레트
```css
/* 메인 컬러 */
--color-primary: #667eea          /* 메인 퍼플 */
--color-primary-hover: #5568d3    /* 호버 퍼플 */
--color-primary-light: #8b9dff    /* 라이트 퍼플 */

/* 서브 컬러 */
--color-secondary: #6c757d        /* 세컨더리 그레이 */
--color-secondary-dark: #5a6268   /* 다크 그레이 */

/* 상태 컬러 */
--color-success: #10b981          /* 성공 그린 */
--color-warning: #f59e0b          /* 경고 오렌지 */
--color-error: #ef4444            /* 에러 레드 */
--color-error-dark: #dc2626       /* 다크 레드 */

/* 텍스트 컬러 */
--text-primary: #1a1a1a           /* 기본 텍스트 */
--text-secondary: #666666         /* 보조 텍스트 */
--text-tertiary: #999999          /* 비활성 텍스트 */
--text-inverse: #ffffff           /* 반전 텍스트 */

/* 배경 컬러 */
--bg-primary: #ffffff             /* 기본 배경 */
--bg-secondary: #f8f9fa           /* 보조 배경 */
--bg-tertiary: #e9ecef            /* 3차 배경 */
```

### 모바일 최적화
- **터치 영역**: 최소 44px 이상
- **Safe Area 대응**: iOS 노치 영역 고려 (`env(safe-area-inset-*)`)
- **하단 고정 입력창**: 채팅 UX 최적화
- **스크롤 인디케이터**: 메인 페이지 UX 개선 (애니메이션)
- **스와이프 제스처**: 모바일 친화적 네비게이션

---

## 🚀 시작하기

### 1. 설치
```bash
# 의존성 설치
npm install
```

### 2. 환경 변수 설정
```bash
# .env.local 파일 생성
cp .env.example .env.local

# 환경 변수 수정
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_SERVICE_NAME=ManuAI-Talk
OPENAI_API_KEY=your_api_key_here
```

### 3. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

### 4. 빌드
```bash
npm run build
npm start
```

---

## 📦 주요 의존성

### Core
```json
{
  "next": "^14.2.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "typescript": "^5.4.3"
}
```

### 상태 관리
```json
{
  "zustand": "^4.5.2",
  "@tanstack/react-query": "^5.28.0"
}
```

### API & 통신
```json
{
  "axios": "^1.6.8",
  "socket.io-client": "^4.7.5"
}
```

### 스토리지
```json
{
  "idb": "^8.0.0"
}
```

### 폼 & 유효성 검사
```json
{
  "react-hook-form": "^7.51.2",
  "zod": "^3.22.4"
}
```

### UI & 차트
```json
{
  "lucide-react": "^0.363.0",
  "recharts": "^2.12.3",
  "react-qr-code": "^2.0.12"
}
```

---

## 🔧 개발 가이드

### 컴포넌트 생성 규칙
```
ComponentName/
├── ComponentName.tsx       # 컴포넌트 로직
└── ComponentName.module.css # 스타일
```

### 타입 정의
- 모든 Props는 interface로 정의
- API 응답은 `types/` 폴더에서 관리
- 공통 타입은 `common.types.ts`에 정의

### IndexedDB 사용
```typescript
import { dbManager } from '@/lib/db/indexedDB';

// 세션 저장
await dbManager.saveSession({
  id: 'session-123',
  productId: 'product-1',
  messages: [...],
  createdAt: new Date(),
  updatedAt: new Date()
});

// 세션 불러오기
const session = await dbManager.getSession('session-123');

// 피드백 저장
await dbManager.saveFeedback({
  id: 'feedback-123',
  messageId: 'msg-1',
  sessionId: 'session-123',
  productId: 'product-1',
  feedbackType: 'positive',
  timestamp: new Date().toISOString()
});
```

### API 연동
```typescript
// lib/api/client.ts 사용
import apiClient from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

const response = await apiClient.post(
  API_ENDPOINTS.CHAT.SEND_MESSAGE,
  { 
    message: 'Hello',
    productId: 'product-1',
    sessionId: 'session-123'
  }
);
```

### 스타일링
```typescript
// CSS Modules 사용
import styles from './Component.module.css';

<div className={styles.container}>
  <h1 className={styles.title}>제목</h1>
  <p className={`${styles.text} ${styles.highlight}`}>내용</p>
</div>
```

---

## 📱 주요 페이지

### 사용자 페이지 (모바일 최적화)
| 경로 | 설명 |
|------|------|
| `/` | 홈페이지 (검색, 카테고리, 인기 제품) |
| `/chat/[productId]` | 제품별 챗봇 페이지 |
| `/simulation/[productId]` | 공간 시뮬레이션 |
| `/my` | 내 대화 목록 |

### 관리자 페이지
| 경로 | 설명 |
|------|------|
| `/dashboard` | 대시보드 (통계, 차트) |
| `/documents` | 문서 관리 (목록, 검색) |
| `/documents/upload` | 문서 업로드 (드래그 앤 드롭) |
| `/documents/[id]` | 문서 상세 |
| `/faq` | FAQ 관리 (목록, 편집) |
| `/faq/auto-generate` | FAQ 자동 생성 |
| `/logs` | 로그 분석 (Top 질문, 미답변) |
| `/products` | 제품 관리 |
| `/profile` | 프로필 설정 |

### 슈퍼 관리자 페이지
| 경로 | 설명 |
|------|------|
| `/superadmin` | 슈퍼 관리자 대시보드 |
| `/superadmin/companies` | 기업 관리 |
| `/superadmin/users` | 사용자 관리 |
| `/superadmin/settings` | 시스템 설정 |

---

## 🔑 핵심 커스텀 훅

### useChat
```typescript
const { 
  messages,           // 메시지 배열
  isLoading,          // 로딩 상태
  error,              // 에러 메시지
  sendMessage,        // 메시지 전송
  clearMessages,      // 메시지 초기화
  messagesEndRef,     // 스크롤 참조
  // 세션 관련
  sessionId,          // 현재 세션 ID
  sessions,           // 세션 목록
  loadSession,        // 세션 불러오기
  startNewSession,    // 새 세션 시작
  deleteSession       // 세션 삭제
} = useChat(productId);
```
채팅 메시지 관리 및 API 통신, 세션 관리

### useDebounce
```typescript
const debouncedValue = useDebounce(searchQuery, 500);
```
검색 입력 디바운싱 (500ms)

### useMediaQuery
```typescript
const isMobile = useIsMobile();     // < 768px
const isTablet = useIsTablet();     // 769px ~ 1024px
const isDesktop = useIsDesktop();   // > 1025px
```
반응형 레이아웃 감지

### useAuth
```typescript
const {
  isAuthenticated,    // 로그인 여부
  user,               // 사용자 정보
  login,              // 로그인
  logout              // 로그아웃
} = useAuth();
```
인증 상태 관리

---

## 🧩 주요 컴포넌트

### Button
```typescript
<Button 
  variant="primary"   // primary, secondary, outline, ghost, danger
  size="lg"          // sm, md, lg
  loading={true}     // 로딩 상태
  disabled={false}   // 비활성화
  fullWidth={false}  // 전체 너비
>
  저장
</Button>
```
- variant: primary, secondary, outline, ghost, danger
- size: sm, md, lg

### Input
```typescript
<Input 
  label="이메일"
  placeholder="email@example.com"
  error="필수 항목입니다"
  required
  fullWidth
  type="email"
/>
```

### Modal
```typescript
<Modal 
  isOpen={true} 
  onClose={() => {}} 
  title="제목"
  size="md"         // sm, md, lg
>
  내용
</Modal>
```

### DocumentUploader
```typescript
<DocumentUploader 
  onFileSelect={(file) => {
    console.log('선택된 파일:', file);
  }}
  maxSize={10}      // MB 단위
  accept=".pdf"
/>
```
드래그 앤 드롭 파일 업로드

### ChatMessage
```typescript
<ChatMessage 
  message={{
    id: 'msg-1',
    role: 'user',
    content: '안녕하세요',
    timestamp: '2025-01-28T10:00:00Z'
  }}
  sessionId="session-123"
  productId="product-1"
  isFirstMessage={false}
/>
```
메시지 버블 (피드백 포함)

---

## 🎯 개발 현황

### ✅ 완료된 기능
- [x] 프로젝트 초기 설정
- [x] 폴더 구조 및 아키텍처 구성
- [x] 전역 스타일 시스템 (CSS Modules)
- [x] 기본 UI 컴포넌트 (Button, Input, Card, Modal, Toast)
- [x] 레이아웃 (사용자/관리자/슈퍼관리자)
- [x] **메인 페이지 검색 시스템**
  - [x] 실시간 검색 (자동완성)
  - [x] 최근 검색 히스토리 (localStorage)
  - [x] 카테고리별 제품 탐색 (3열 그리드)
  - [x] 인기 제품 추천 (3열 그리드)
  - [x] 스크롤 인디케이터 (애니메이션)
- [x] **사용자 채팅 페이지**
  - [x] 세션 관리 (IndexedDB 저장/불러오기/삭제)
  - [x] 피드백 시스템 (👍👎 및 취소)
  - [x] 세션 히스토리 사이드바
  - [x] 로그인/로그아웃 (헤더, 사이드바)
  - [x] 추천 질문
  - [x] 타이핑 인디케이터
- [x] **공간 시뮬레이션 페이지** (UI 준비)
- [x] **관리자 대시보드** (통계, 차트)
- [x] **문서 관리 시스템**
  - [x] 드래그 앤 드롭 업로드
  - [x] 문서 목록 및 검색
  - [x] 케밥 메뉴 (상세/수정/다운로드/복제/활성화/삭제)
  - [x] 문서 상태 관리
- [x] **FAQ 관리 시스템**
  - [x] FAQ 목록 (확장/축소)
  - [x] FAQ 자동 생성
- [x] **로그 분석**
  - [x] Top 질문
  - [x] 응답 시간 분석
  - [x] 미답변 질문

### 🔄 진행 중
- [ ] 제품 관리 시스템
- [ ] QR 코드 생성 기능
- [ ] 백엔드 API 연동

### 📝 예정
- [ ] 실시간 스트리밍 응답 구현
- [ ] WebSocket 연동
- [ ] 문서 버전 관리
- [ ] AR/3D 시뮬레이션 구현
- [ ] 다국어 지원
- [ ] 음성 질의응답 (ASR/TTS)

---

## 🆕 최근 업데이트 (2025.01.28)

### 서비스명 변경
- **SeShat** → **ManuAI-Talk** (Manual AI Talk)
- 의미: "매뉴얼에 대해 AI와 대화하다"
- 전체 코드베이스 일괄 업데이트

### 메인 페이지 전면 개편
- 검색 중심 UI로 전환
- 실시간 자동완성 검색 (mock 제품 데이터)
- 카테고리별 제품 탐색 (3열 그리드)
- 인기 제품 추천 (3열 그리드, 조회수 표시)
- 최근 검색 히스토리 (localStorage 저장)
- 스크롤 인디케이터 추가 (애니메이션)
- 개발자 도구 플로팅 버튼

### 채팅 페이지 대폭 개선
- **세션 관리 시스템** (IndexedDB 기반)
  - 대화 세션 자동 저장
  - 세션 히스토리 사이드바
  - 새 대화 시작
  - 세션 불러오기/삭제
- **메시지 피드백 시스템**
  - 👍 도움됨 / 👎 아쉬워요
  - 같은 버튼 재클릭 시 취소
  - IndexedDB에 피드백 저장
  - 첫 메시지(환영 메시지) 제외
- **UI/UX 개선**
  - 햄버거 메뉴 위치 최적화
  - 사용자 메시지 오른쪽 정렬
  - AI 메시지 왼쪽 정렬
  - 로그인/로그아웃 버튼 (헤더, 사이드바)
  - 타임스탬프 표시

### 공간 시뮬레이션 페이지
- UI 레이아웃 구성
- 제품 정보 표시
- 사용 가이드
- AR/3D 구현 준비 완료

### 문서 관리 개선
- **케밥 메뉴 통합**
  - 상세보기
  - 수정하기
  - 다운로드
  - 복제하기
  - 활성화/비활성화
  - 삭제
- 호버 시 나타나는 버튼 제거
- 외부 클릭 시 메뉴 자동 닫힘
- 드롭다운 애니메이션

### 대시보드 아이콘 수정
- 통계 카드 아이콘 색상 수정
- 자주 묻는 질문 바 차트 복구
- CSS 변수 추가 (--color-success, --color-warning, --bg-tertiary)

---

## 🐛 알려진 이슈

1. **API 연동 대기**: 현재 목 데이터(mock data) 사용 중
2. **WebSocket 미구현**: 실시간 스트리밍 응답 준비 중
3. **인증/인가**: 관리자 로그인 기능 미구현
4. **AR/3D 시뮬레이션**: UI만 준비, 실제 구현 예정

---

## 📚 참고 문서

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Recharts Documentation](https://recharts.org/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Lucide React Icons](https://lucide.dev/)

---

## 👥 팀원

- **이수현**: 설계 및 DB 구축
- **김현태**: Back-end 리드
- **서현수**: Front-end 리드
- **이동인**: PM
- **이도훈**: Front-end
- **정국호**: Back-end 리드

---

## 📄 라이선스

This project is private and confidential.

---

## 📞 문의

프로젝트 관련 문의: [프로젝트 담당자 이메일]

---

**Last Updated**: 2025.01.28