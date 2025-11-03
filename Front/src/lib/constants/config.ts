// ============================================
// 📄 8. src/lib/constants/config.ts
// ============================================
// 설정 상수
// ============================================

export const APP_CONFIG = {
  NAME: 'ManuAI-Talk',
  DESCRIPTION: 'LLM 기반 전자제품 설명서 질의응답 시스템',
  VERSION: '1.0.0',
  
  // API
  API_TIMEOUT: 30000, // 30초
  
  // 채팅
  CHAT: {
    MAX_MESSAGE_LENGTH: 500,
    TYPING_INDICATOR_DELAY: 500, // ms
    AUTO_SCROLL_DELAY: 100, // ms
    MAX_HISTORY: 100,
  },
  
  // 파일 업로드
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_EXTENSIONS: ['pdf', 'txt', 'doc', 'docx'],
  },
  
  // 페이지네이션
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  },
  
  // 로컬 스토리지 키
  STORAGE_KEYS: {
    TOKEN: 'manuai-talk_token',
    USER: 'manuai-talk_user',
    THEME: 'manuai-talk_theme',
  },
} as const;