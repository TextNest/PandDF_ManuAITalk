// ============================================
// 📄 src/store/useAuthStore.ts
// ============================================
// 인증 상태 관리 (Zustand)
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/auth.types';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean; // 초기화 상태 추가
  
  // Actions
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  setInitialized: (isInitialized: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isInitialized: false, // 초기값 false

      login: (user, token) => 
        set({ 
          user, 
          token, 
          isAuthenticated: true 
        }),
      
      logout: () => 
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false 
        }),
      
      setUser: (user) => 
        set({ user }),
      
      setInitialized: (isInitialized) => set({ isInitialized }),
    }),
    {
      name: 'auth-storage', // localStorage key
      onRehydrateStorage: () => (state) => {
        // Zustand persist v4 uses a function that returns a function
        if (state) {
          state.setInitialized(true);
        }
      },
    }
  )
);