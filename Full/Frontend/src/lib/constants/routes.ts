// ============================================
// 📄 7. src/lib/constants/routes.ts
// ============================================
// 라우트 상수
// ============================================

export const ROUTES = {
  // 공통
  HOME: '/',
  
  // 사용자
  USER: {
    CHAT: (productId: string) => `/chat/${productId}`,
    PRODUCT: (id: string) => `/product/${id}`,
  },
  
  // 관리자
  ADMIN: {
    DASHBOARD: '/dashboard',
    DOCUMENTS: '/documents',
    DOCUMENTS_UPLOAD: '/documents/upload',
    DOCUMENTS_DETAIL: (id: string) => `/documents/${id}`,
    FAQ: '/faq',
    FAQ_AUTO_GENERATE: '/faq/auto-generate',
    LOGS: '/logs',
    PRODUCTS: '/products',
    PRODUCTS_DETAIL: (id: string) => `/products/${id}`,
  },
} as const;