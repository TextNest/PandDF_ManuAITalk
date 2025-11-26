// ============================================
// 📄 1. src/lib/api/client.ts
// ============================================
// Axios 클라이언트 설정
// ============================================

import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// 요청 인터셉터
apiClient.interceptors.request.use(
  (config) => {
    // const token = localStorage.getItem('token');
    // Zustand persist 스토리지에서 인증 정보 가져오기
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const authData = JSON.parse(authStorage);
      const token = authData?.state?.token;
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// // 응답 인터셉터
// apiClient.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       // 인증 오류 처리
//       localStorage.removeItem('token');
//       window.location.href = '/login';
//     }
//     return Promise.reject(error);
//   }
// );

// 응답 인터셉터
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
      if (error.response && error.response.status === 401) {
      // 인증 오류 처리
      localStorage.removeItem('auth-storage'); 
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;