// ============================================
// 📄 2. src/lib/api/endpoints.ts
// ============================================
// API 엔드포인트 정의
// ============================================

export const API_ENDPOINTS = {
  // 인증
  AUTH: {
    CODE: '/api/register/code',
    INFO: '/api/register/info',
    OAUTH_CALLBACK: '/api/google/callback',
    LOGIN: '/api/login',
    LOGOUT: '/api/logout',
    ME: '/api/user/me',
  },
  
  // 채팅
  CHAT: {
    SESSIONS : '/chat/history',
    GET_HISTORY: (productId: string) => `/chat/history/${productId}`,
    STREAM: '/chat/stream',
  },
  
  // 문서
  DOCUMENTS: {
    LIST: '/documents',
    UPLOAD: '/documents/upload',
    GET: (id: string) => `/documents/${id}`,
    DELETE: (id: string) => `/documents/${id}`,
  },
  
  // FAQ
  FAQ: {
    LIST: '/api/faqs',
    GET: (faqId: string) => `/api/faqs/${faqId}`,
    CREATE: '/api/faqs',
    UPDATE: (faqId: string) => `/api/faqs/${faqId}`,
    DELETE: (faqId: string) => `/api/faqs/${faqId}`,
    FROM_CHATBOT: '/api/faqs/from-chatbot',
    HELPFUL: (faqId: string) => `/api/faqs/${faqId}/helpful`,
  },
  
  // 제품
  PRODUCTS: {
    LIST: '/products',
    GET: (id: string) => `/products/${id}`,
    CREATE: '/products',
  },
  
  // 로그
  LOGS: {
    ANALYTICS: '/logs/analytics',
    TOP_QUESTIONS: '/logs/top-questions',
    UNANSWERED: '/logs/unanswered',
  },
};