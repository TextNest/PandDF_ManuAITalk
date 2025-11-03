// ============================================
// 📄 2. src/store/useChatStore.ts
// ============================================
// 채팅 전역 상태 관리 (Zustand)
// ============================================

import { create } from 'zustand';
import { Message } from '@/types/chat.types';

interface ChatSession {
  productId: string;
  messages: Message[];
  lastActivity: Date;
}

interface ChatStore {
  // 상태
  sessions: Record<string, ChatSession>;
  currentProductId: string | null;
  
  // 액션
  setCurrentProduct: (productId: string) => void;
  addMessage: (productId: string, message: Message) => void;
  clearSession: (productId: string) => void;
  getSession: (productId: string) => ChatSession | undefined;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  sessions: {},
  currentProductId: null,
  
  setCurrentProduct: (productId) => {
    set({ currentProductId: productId });
  },
  
  addMessage: (productId, message) => {
    set((state) => ({
      sessions: {
        ...state.sessions,
        [productId]: {
          productId,
          messages: [
            ...(state.sessions[productId]?.messages || []),
            message,
          ],
          lastActivity: new Date(),
        },
      },
    }));
  },
  
  clearSession: (productId) => {
    set((state) => {
      const newSessions = { ...state.sessions };
      delete newSessions[productId];
      return { sessions: newSessions };
    });
  },
  
  getSession: (productId) => {
    return get().sessions[productId];
  },
}));