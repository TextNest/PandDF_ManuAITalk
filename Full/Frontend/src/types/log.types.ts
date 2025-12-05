// ============================================
// 📄 src/types/log.types.ts
// ============================================
// 로그 관련 타입 재정의 (ver.2.0)
// ============================================

export type MessageFeedback = "positive" | "negative";

// 최근 문의
export interface SessionRecent {
  sid: number; // session_internal_id
  productId: string | null;
  message: string;
  status: number;
  endedAt: string;
}

export interface ProductInfo {
  category: string | null;
  productId: string;
}

// 필터
export interface SessionFilter {
  from?: string;
  to?: string;
  category?: string | "all";
  productId?: string;
  status?: number | "all";
  sessionId?: string; // session_id
}

// 세션
export interface SessionList {
  sid: number;
  sessionId: string;
  productId: string | null;
  message: string;
  status: number;
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
  productName: string | null;
  productId: string | null;
  category: string | null;
  status: number;
  summary: string;
  startedAt: string;
  endedAt: string;
  positive: number;
  negative: number;
  satisfaction: number;
}

// 상세 로그
export interface SessionLog {
  createdAt: string;
  userMessage: string | null;
  botMessage: string | null;
  feedback: MessageFeedback | null;
}