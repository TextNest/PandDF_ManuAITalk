// ============================================
// 📄 3. src/types/chat.types.ts
// ============================================
// 채팅 관련 타입 정의
// ============================================

export interface Message {
  id: string;
  role: 'user' | 'assistant'; // 🔥 type → role, bot → assistant
  content: string;
  timestamp: string; // 🔥 Date → string
  sources?: Source[];
  isStreaming?: boolean;
}

export interface Source {
  pageNumber: number; // 🔥 page → pageNumber
  content: string;
  documentName: string;
}

export interface ChatSession {
  id: string;
  productId: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SendMessageRequest {
  productId: string;
  message: string;
  sessionId?: string;
}

export interface SendMessageResponse {
  messageId: string;
  response: string;
  sources?: Source[];
}