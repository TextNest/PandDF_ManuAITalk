// ============================================
// 📄 1. src/features/chat/hooks/useChat.ts (업데이트)
// ============================================
// 세션 저장 기능이 추가된 채팅 훅
// ============================================

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Message, SendMessageRequest } from '@/types/chat.types';
import apiClient from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { useChatSession } from './useChatSession';

export function useChat(productId: string) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant', // 🆕 type → role, bot → assistant
      content: '안녕하세요! 무엇을 도와드릴까요?',
      timestamp: new Date().toISOString(), // 🆕 Date → string
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 세션 관리 훅
  const {
    sessionId,
    sessions,
    isLoading: isSessionLoading,
    saveMessages,
    loadSession,
    startNewSession,
    deleteSession,
  } = useChatSession(productId);

  // 메시지 변경 시 자동 저장
  useEffect(() => {
    if (messages.length > 1 && sessionId) {
      saveMessages(messages);
    }
  }, [messages, sessionId, saveMessages]);

  // 스크롤 하단으로 이동
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 메시지 전송
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user', // 🆕 type → role
      content: content.trim(),
      timestamp: new Date().toISOString(), // 🆕 Date → string
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const request: SendMessageRequest = {
        productId,
        message: content.trim(),
        sessionId,
      };

      const response = await apiClient.post(
        API_ENDPOINTS.CHAT.SEND_MESSAGE,
        request
      );

      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        role: 'assistant', // 🆕 type → role, bot → assistant
        content: response.data.response,
        timestamp: new Date().toISOString(), // 🆕 Date → string
        sources: response.data.sources,
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      setError(err.response?.data?.message || '오류가 발생했습니다.');
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant', // 🆕 type → role, bot → assistant
        content: '죄송합니다. 응답을 생성하는 중 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date().toISOString(), // 🆕 Date → string
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [productId, sessionId]);

  // 세션 불러오기
  const handleLoadSession = useCallback(async (loadSessionId: string) => {
    const loadedMessages = await loadSession(loadSessionId);
    if (loadedMessages.length > 0) {
      setMessages(loadedMessages);
    }
  }, [loadSession]);

  // 새 대화 시작
  const handleNewSession = useCallback(async () => {
    await startNewSession();
    setMessages([
      {
        id: '1',
        role: 'assistant', // 🆕 type → role, bot → assistant
        content: '안녕하세요! 무엇을 도와드릴까요?',
        timestamp: new Date().toISOString(), // 🆕 Date → string
      }
    ]);
  }, [startNewSession]);

  // 대화 초기화 (현재 세션만)
  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: '1',
        role: 'assistant', // 🆕 type → role, bot → assistant
        content: '안녕하세요! 무엇을 도와드릴까요?',
        timestamp: new Date().toISOString(), // 🆕 Date → string
      }
    ]);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    messagesEndRef,
    // 세션 관련
    sessionId,
    sessions,
    isSessionLoading,
    loadSession: handleLoadSession,
    startNewSession: handleNewSession,
    deleteSession,
  };
}