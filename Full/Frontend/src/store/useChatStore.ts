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

// TTS 재생 상태 타입 정의
type TTSState = 'idle' | 'loading' | 'playing' | 'error';
type InputMode = 'text' | 'voice';

interface ChatStore {
  // 상태
  sessions: Record<string, ChatSession>;
  currentProductId: string | null;
  lastInputMode: InputMode;
  
  // TTS 관련 상태
  ttsPlayingMessageId: string | null;
  ttsState: TTSState;
  isAutoPlayEnabled: boolean;

  // STT(녹음) 관련 상태
  isRecording: boolean;

  // 액션
  setCurrentProduct: (productId: string) => void;
  setLastInputMode: (mode: InputMode) => void;
  addMessage: (productId: string, message: Message) => void;
  clearSession: (productId: string) => void;
  getSession: (productId: string) => ChatSession | undefined;
  
  // TTS 관련 액션
  playTTS: (messageId: string) => void;
  stopTTS: () => void;
  setTTSState: (state: TTSState) => void;
  toggleAutoPlay: () => void;

  // STT 관련 액션
  startRecording: () => void;
  stopRecording: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  sessions: {},
  currentProductId: null,
  lastInputMode: 'text',
  
  // TTS 초기 상태
  ttsPlayingMessageId: null,
  ttsState: 'idle',
  isAutoPlayEnabled: true,

  // STT 초기 상태
  isRecording: false,

  setCurrentProduct: (productId) => {
    set({ currentProductId: productId });
  },

  setLastInputMode: (mode) => {
    set({ lastInputMode: mode });
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

    if (get().isAutoPlayEnabled && message.role === 'assistant') {
      get().playTTS(message.id);
    }
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

  // --- TTS 액션 구현 ---
  playTTS: (messageId) => {
    if (get().isRecording) {
      get().stopRecording(); // 녹음 중이면 중지
    }
    if (get().ttsPlayingMessageId) {
      get().stopTTS();
    }
    set({ ttsPlayingMessageId: messageId, ttsState: 'loading' });
  },

  stopTTS: () => {
    set({ ttsPlayingMessageId: null, ttsState: 'idle' });
  },

  setTTSState: (state) => {
    set({ ttsState: state });
  },

  toggleAutoPlay: () => {
    set((state) => ({ isAutoPlayEnabled: !state.isAutoPlayEnabled }));
    if (!get().isAutoPlayEnabled) {
      get().stopTTS();
    }
  },

  // --- STT 액션 구현 ---
  startRecording: () => {
    if (get().ttsState === 'playing') {
      get().stopTTS(); // TTS 재생 중이면 중지
    }
    set({ isRecording: true });
  },

  stopRecording: () => {
    set({ isRecording: false });
  },
}));