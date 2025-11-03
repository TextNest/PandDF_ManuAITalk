// ============================================
// 📄 src/types/feedback.types.ts
// ============================================

export interface MessageFeedback {
  messageId: string;
  sessionId: string;
  productId: string;
  feedbackType: 'positive' | 'negative';
  timestamp: string;
  comment?: string; // 선택적 코멘트
}

export interface FeedbackStats {
  total: number;
  positive: number;
  negative: number;
  positiveRate: number;
}