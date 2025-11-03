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
  
  // Actions
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
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
    }),
    {
      name: 'auth-storage', // localStorage key
    }
  )
);