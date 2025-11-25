// ============================================
// 📄 src/types/log.types.ts
// ============================================
// 로그 관련 타입 정의 (ver.0.1)
// ============================================

export interface ChatLog {
  id: string;
  productId: string;
  productName: string;
  question: string;
  answer: string;
  responseTime: number; // ms
  wasHelpful: boolean | null;
  timestamp: Date;
  userId?: string;
}

// ============================================
// 로그 관련 타입 재정의 (ver.1.1)
// ============================================

export type SessionStatus = "resolved" | "unresolved";
export type MessageFeedback = "positive" | "negative";

// 최근 문의
export interface SessionRecent {
  sessionId: string;
  productId: string | null;
  message: string;
  status: SessionStatus;
  satisfaction: number;
}

// 필터
export interface SessionFilter {
  from?: string;
  to?: string;
  productId?: string;
  status?: SessionStatus | "all";
  sessionId?: string;
}

// 세션
export interface SessionList {
  sessionId: string;
  productId: string | null;
  message: string;
  status: SessionStatus;
  endedAt: string;
  satisfaction: number;
}

// 세션 통합
export interface SessionListResponse {
  total: number;
  items: SessionList[];
}

// 상세 리포트
export interface SessionReport {
  sessionId: string;
  productId: string | null;
  status: SessionStatus;
  summary: string;
  timestamp_s: string;
  timestamp_e: string;
  positive: number;
  negative: number;
  satisfaction: number;
}

// 상세 로그
export interface SessionLog {
  sessionId: string;
  role: string;
  message: string;
  timestamp: string;
  feedback: MessageFeedback;
}