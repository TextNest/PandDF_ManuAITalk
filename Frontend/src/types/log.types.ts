// ============================================
// 📄 1. src/types/log.types.ts
// ============================================
// 로그 관련 타입 정의
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

export interface TopQuestion {
  question: string;
  count: number;
  averageResponseTime: number;
  helpfulRate: number;
}

export interface UnansweredQuery {
  id: string;
  question: string;
  productId: string;
  productName: string;
  timestamp: Date;
  attemptCount: number;
}

export interface AnalyticsData {
  totalQueries: number;
  averageResponseTime: number;
  successRate: number;
  helpfulRate: number;
  topQuestions: TopQuestion[];
  unansweredQueries: UnansweredQuery[];
}