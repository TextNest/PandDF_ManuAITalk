// ============================================
// 📄 5. src/features/chat/hooks/useStreamingResponse.ts
// ============================================
// 스트리밍 응답 커스텀 훅
// ============================================

'use client';

import { useState, useCallback } from 'react';
import { Message } from '@/types/chat.types';

export function useStreamingResponse() {
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const startStreaming = useCallback((initialContent = '') => {
    const message: Message = {
      id: `streaming-${Date.now()}`,
      type: 'bot',
      content: initialContent,
      timestamp: new Date(),
      isStreaming: true,
    };
    
    setStreamingMessage(message);
    setIsStreaming(true);
  }, []);

  const appendContent = useCallback((chunk: string) => {
    setStreamingMessage(prev => {
      if (!prev) return null;
      return {
        ...prev,
        content: prev.content + chunk,
      };
    });
  }, []);

  const finishStreaming = useCallback(() => {
    setIsStreaming(false);
    const finalMessage = streamingMessage;
    setStreamingMessage(null);
    return finalMessage;
  }, [streamingMessage]);

  const cancelStreaming = useCallback(() => {
    setStreamingMessage(null);
    setIsStreaming(false);
  }, []);

  return {
    streamingMessage,
    isStreaming,
    startStreaming,
    appendContent,
    finishStreaming,
    cancelStreaming,
  };
}
