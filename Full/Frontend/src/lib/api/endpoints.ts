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
    SESSIONS : '/api/chat/history',
    GET_HISTORY: (productId: string) => `/api/chat/history/${productId}`,
    STREAM: '/api/chat/stream',
  },
  
  // 문서
  DOCUMENTS: {
    LIST: '/api/documents',
    UPLOAD: '/api/documents/upload',
    GET: (id: string) => `/api/documents/${id}`,
    DELETE: (id: string) => `/api/documents/${id}`,
  },
  
  // FAQ
  FAQ: {
    LIST: '/api/faqs',
    GET: (faqId: string) => `/api/faqs/${faqId}`,
    CREATE: '/api/faqs',
    UPDATE: (faqId: string) => `/api/faqs/${faqId}`,
    DELETE: (faqId: string) => `/api/faqs/${faqId}`,
    FROM_CHATBOT: '/api/faqs/from-chatbot',
    AUTO_GENERATE: '/api/faqs/auto_generate',
    HELPFUL: (faqId: string) => `/api/faqs/${faqId}/helpful`,
  },
  
  // 제품
  PRODUCTS: {
    LIST: '/api/products',
    GET: (productId: string) => `/api/products/${productId}`,
    CREATE: '/api/products',
  },
  
  // 로그
  LOGS: {
    RECENT:'/api/logs/recent',
    LIST:'/api/logs/session-list',
    INFO: '/api/logs/session-info',
    VIEW_REPORT: (sid: number) => `/api/logs/view/${sid}`,
    VIEW_LOG: (sid: number) => `/api/logs/view-detail/${sid}`,
  },
};