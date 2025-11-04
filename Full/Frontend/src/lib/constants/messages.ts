// ============================================
// 📄 9. src/lib/constants/messages.ts
// ============================================
// 메시지 상수
// ============================================

export const MESSAGES = {
  // 성공 메시지
  SUCCESS: {
    SAVED: '저장되었습니다.',
    DELETED: '삭제되었습니다.',
    UPLOADED: '업로드되었습니다.',
    COPIED: '복사되었습니다.',
  },
  
  // 에러 메시지
  ERROR: {
    NETWORK: '네트워크 오류가 발생했습니다.',
    SERVER: '서버 오류가 발생했습니다.',
    UNKNOWN: '알 수 없는 오류가 발생했습니다.',
    FILE_TOO_LARGE: '파일 크기가 너무 큽니다.',
    INVALID_FILE_TYPE: '지원하지 않는 파일 형식입니다.',
    REQUIRED_FIELD: '필수 항목입니다.',
    INVALID_EMAIL: '올바른 이메일 주소를 입력하세요.',
    INVALID_PHONE: '올바른 전화번호를 입력하세요.',
  },
  
  // 확인 메시지
  CONFIRM: {
    DELETE: '정말 삭제하시겠습니까?',
    CANCEL: '변경사항이 저장되지 않습니다. 계속하시겠습니까?',
    LOGOUT: '로그아웃하시겠습니까?',
  },
  
  // 빈 상태 메시지
  EMPTY: {
    NO_DATA: '데이터가 없습니다.',
    NO_RESULTS: '검색 결과가 없습니다.',
    NO_DOCUMENTS: '업로드된 문서가 없습니다.',
    NO_FAQ: '등록된 FAQ가 없습니다.',
    NO_PRODUCTS: '등록된 제품이 없습니다.',
  },
} as const;