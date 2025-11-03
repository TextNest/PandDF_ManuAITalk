// ============================================
// 📄 2. src/features/chat/hooks/useChatSession.ts
// ============================================
// 채팅 세션 관리 훅
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { dbManager, ChatSession } from '@/lib/db/indexedDB';
import { Message } from '@/types/chat.types';

export function useChatSession(productId: string) {
  const [sessionId, setSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  // 세션 ID 생성
  const generateSessionId = useCallback(() => {
    return `${productId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, [productId]);

  // 초기화: 기존 세션 불러오기 또는 새 세션 생성
  useEffect(() => {
    const initSession = async () => {
      try {
        await dbManager.init();
        const existingSessions = await dbManager.getSessionsByProduct(productId);
        
        setSessions(existingSessions);

        // 가장 최근 세션 사용 또는 새로 생성
        if (existingSessions.length > 0) {
          setSessionId(existingSessions[0].id);
        } else {
          const newSessionId = generateSessionId();
          setSessionId(newSessionId);
          
          // 새 세션 저장
          const newSession: ChatSession = {
            id: newSessionId,
            productId,
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          await dbManager.saveSession(newSession);
        }
      } catch (error) {
        console.error('세션 초기화 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();
  }, [productId, generateSessionId]);

  // 메시지 저장
  const saveMessages = useCallback(async (messages: Message[]) => {
    if (!sessionId) return;

    try {
      const session = await dbManager.getSession(sessionId);
      if (session) {
        const updatedSession: ChatSession = {
          ...session,
          messages,
          updatedAt: Date.now(),
        };
        await dbManager.saveSession(updatedSession);
      }
    } catch (error) {
      console.error('메시지 저장 실패:', error);
    }
  }, [sessionId]);

  // 세션 불러오기
  const loadSession = useCallback(async (loadSessionId: string) => {
    try {
      const session = await dbManager.getSession(loadSessionId);
      if (session) {
        setSessionId(loadSessionId);
        return session.messages;
      }
      return [];
    } catch (error) {
      console.error('세션 불러오기 실패:', error);
      return [];
    }
  }, []);

  // 새 세션 시작
  const startNewSession = useCallback(async () => {
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);

    const newSession: ChatSession = {
      id: newSessionId,
      productId,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      await dbManager.saveSession(newSession);
      const updatedSessions = await dbManager.getSessionsByProduct(productId);
      setSessions(updatedSessions);
    } catch (error) {
      console.error('새 세션 생성 실패:', error);
    }
  }, [productId, generateSessionId]);

  // 세션 삭제
  const deleteSession = useCallback(async (deleteSessionId: string) => {
    try {
      await dbManager.deleteSession(deleteSessionId);
      const updatedSessions = await dbManager.getSessionsByProduct(productId);
      setSessions(updatedSessions);

      // 현재 세션이 삭제되면 새 세션 시작
      if (deleteSessionId === sessionId) {
        await startNewSession();
      }
    } catch (error) {
      console.error('세션 삭제 실패:', error);
    }
  }, [productId, sessionId, startNewSession]);

  return {
    sessionId,
    sessions,
    isLoading,
    saveMessages,
    loadSession,
    startNewSession,
    deleteSession,
  };
}