'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Message } from '@/types/chat.types';
import { useAuth } from '@/features/auth/hooks/useAuth'; 
import { connect } from 'http2';
import { useRouter, useSearchParams } from 'next/navigation';
// ChatSession 타입은 백엔드 응답을 위한 타입이므로 그대로 유지합니다.
type ChatSession = {
    id: string;
    productId: string;
    lastMessage: string;
    updatedAt: number;
    messages?: Message[];
}; 

// 🚨 백엔드 주소 설정 (실제 도메인으로 변경 필요)4
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL; 

// 💡 사용자 요청: 모든 함수는 에로우 함수로 작성합니다.
export const useChat = (initialProductId: string) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    // 🔑 useAuth에서 토큰을 가져와 세션 목록 로드에 사용
    const { isAuthenticated, token: jwtToken } = useAuth(); 
    const [productId, setProductId] = useState<string>(initialProductId);
    const initialSessionIdFromUrl = searchParams.get('session_id') || '';
    // --- 상태 ---
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const ws = useRef<WebSocket | null>(null);
    
    // 🚩 [수정]: sessionId 상태를 URL에서 읽어온 값으로 초기화합니다.
    const [sessionId, setSessionId] = useState<string>(initialSessionIdFromUrl);
    const [sessions, setSessions] = useState<ChatSession[]>([]); 
    const [isSessionLoading, setIsSessionLoading] = useState(true); 
    const [isNewSession, setIsNewSession] = useState<boolean>(
    () => !initialSessionIdFromUrl
  );
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);

    // ----------------------------------------------------
    // 1. HTTP REST API: 회원 세션 목록 로드 (변경 없음)
    // ----------------------------------------------------

    const fetchSessions = useCallback(async () => {
        if (!isAuthenticated || !jwtToken) {
            setSessions([]); 
            setIsSessionLoading(false);
            return;
        }

        setIsSessionLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/chat/history`, {
                method: 'POST', 
                headers: { 'Authorization': `Bearer ${jwtToken}` }, // 🔑 JWT 인증
            });
            
            if (response.ok) {
                console.log(response)
                const data: ChatSession[] = await response.json();
                setSessions(data); 
                
            }
        } catch (error) {
            console.error('세션 기록 로드 실패:', error);
        } finally {
            setIsSessionLoading(false);
        }
    }, [isAuthenticated, jwtToken]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);


    // ----------------------------------------------------
    // 2. WebSocket 연결 로직 (원래 코드로 복구 및 세션ID 수신 로직만 통합)
    // ----------------------------------------------------

    // 🚨 connectWebSocket은 이제 세션 ID를 파라미터로 받지 않습니다.
    const connectWebSocket = useCallback((targetSessionId?: string) => {
        const wsUrlBase = process.env.NEXT_PUBLIC_WS_URL;
        let wsUrl = `${wsUrlBase}/ws/${productId}`;
        if (targetSessionId) {
          wsUrl += `?session_id=${targetSessionId}`; 
        }
        const protocols: string[] = []; 

        if (ws.current) {
            console.log('기존 WebSocket 연결 정리 (재연결)');
            ws.current.close();
            ws.current = null;
        }
        
        const wsInstance = new WebSocket(wsUrl, protocols);
        ws.current = wsInstance;

        // --- 이벤트 핸들러 ---
        wsInstance.onopen = () => {
            console.log('WebSocket 연결 성공');
            if (isAuthenticated && jwtToken) {
               wsInstance.send(JSON.stringify({ type: 'auth', token: jwtToken }));
              console.log("메세지보냄");

            }else{
              wsInstance.send(JSON.stringify({ type: 'auth', token: "pass" }))
            }
            // setError(null);
        };

        wsInstance.onclose = (event) => {
            console.log('WebSocket 연결 종료');
            setIsLoading(false);
            // 💡 세션 저장 후 목록 갱신은 유지
            if (isAuthenticated) {
                fetchSessions(); 
            }
        };

        wsInstance.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                switch (data.type) {
                    // 💡 [통합된 로직]: 백엔드에서 세션 ID 수신
                    case 'session_init': 
                        console.log(data.message);
                        setSessionId(data.sessionId);
                        setIsSessionLoading(false); 
                        if (data.message) {
                            setMessages(data.message);
                        }
                        break;
                    
                    case 'stream_end':
                        // 스트림 종료 신호
                        setIsLoading(false);
                        break;

                    case 'bot_stream':
                        // 텍스트 스트림 조각 수신 로직 (유지)
                        setMessages(prev => {
                            const lastMessage = prev[prev.length - 1];
                            if (lastMessage && lastMessage.role === 'assistant') {
                                return [ ...prev.slice(0, -1), { ...lastMessage, content: lastMessage.content + data.token } ];
                            }
                            return [ ...prev, { id: `bot-${Date.now()}`, role: 'assistant', content: data.token, timestamp: new Date().toISOString() } ];
                        });
                        break;
                        
                    case 'bot':
                        const message_id= data.message_id?data.message_id:`bot-${Date.now()}`;
                        const botMessage: Message = { id: message_id, role: 'assistant', content: data.message, timestamp: new Date().toISOString(),feedback:null };
                        
                        setMessages(prev => [...prev, botMessage]);
                        break;
                    
                }
            } catch (e) {
                console.error('수신 데이터 처리 오류:', e);
            }
        };
        
        wsInstance.onerror = (event) => {
             console.error('WebSocket 오류:', event);
             setError('WebSocket 연결 오류가 발생했습니다.');
             setIsLoading(false);
        };

    }, [isAuthenticated, fetchSessions, productId]); // 🚨 의존성에서 jwtToken 제거 (연결 시 사용하지 않음)

    // 🚨 초기 연결: 컴포넌트 마운트 시
    useEffect(() => {
        if (productId) {
            connectWebSocket(initialSessionIdFromUrl); // 🚨 세션 ID 없이 순수 연결
        }
        
        return () => {
             if (ws.current) { ws.current.close(); ws.current = null; }
        };
    }, [productId, connectWebSocket]); 


    // ----------------------------------------------------
    // 3. 세션 핸들러 함수들 (API 기반 로직)
    // ----------------------------------------------------

    const handleLoadSession = useCallback(async (loadSessionId: string, newProductId: string) => {
      if (productId !== newProductId) {
          setProductId(newProductId); 
          setIsNewSession(false);
          router.push(`/chat/${newProductId}?session_id=${loadSessionId}`); 
        

        }else {

        connectWebSocket(loadSessionId); 
    }

      // 2. UI 상태 업데이트
      setMessages([]); 
      setSessionId(loadSessionId); 
      setIsSessionLoading(true);

    }, [isAuthenticated, jwtToken, connectWebSocket, productId]);

    // 새 세션 시작: WebSocket 재연결 (원래 코드 유지)
    const handleNewSession = useCallback(async () => {
        setMessages([]); 
        setIsSessionLoading(true);
        setIsNewSession(true);
        connectWebSocket(); 
        
    }, [connectWebSocket]);

    const handleDeleteSession = useCallback(async (deleteSessionId: string) => {

        if (!isAuthenticated || !jwtToken) return;
        
        try {
            const response = await fetch(`${BACKEND_URL}/chat/history/${deleteSessionId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${jwtToken}` },
            });
            
            if (response.ok) {
                await fetchSessions();
                
                if (deleteSessionId === sessionId) {
                    await handleNewSession(); 
                }
            }
        } catch (e) {
            console.error('세션 삭제 API 오류:', e);
        }
    }, [isAuthenticated, jwtToken, sessionId, fetchSessions, handleNewSession]);


    // ----------------------------------------------------
    // 4. 메시지 전송 및 유틸리티
    // ----------------------------------------------------

    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim() || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;

        const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', content: content.trim(), timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true); 
        setError(null);

        try {
            ws.current.send(content.trim()); 
        } catch (err: any) {
             setError('메시지 전송 중 오류가 발생했습니다.');
             setIsLoading(false);
        }
    }, []); 
    
    const scrollToBottom = useCallback(() => { /* ... */ }, []);
    useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

    const sendFeedback = useCallback(async (
    messageId: string | number, 
    feedbackType: 'positive' | 'negative' | null
    ) => {


    try {
        const response = await fetch(`${BACKEND_URL}/chat/feedback`, { 
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify({
        message_id: messageId,      
        feedback: feedbackType,

        }),
        });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '피드백 서버 전송 실패');
        }
        console.log('피드백 전송 성공');

    } catch (err) {
        console.error('Failed to send feedback:', err);
        throw err; // ⭐️ ChatMessage 컴포넌트가 롤백할 수 있게 에러를 다시 던짐
    }
    }, [isAuthenticated, jwtToken]);

    const fetchSuggestedQuestions = useCallback(async () => {
        if (!productId) return;
        try {
            const response = await fetch(`${BACKEND_URL}/chat/suggestions/${productId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',}
        });

        if (response.ok){
            const data = await response.json();
            setSuggestedQuestions(data.question || []);
        }}
        catch (error) {
            console.error('추천 질문 로드 실패:', error);
            // 에러 발생 시 빈 배열로 두어 UI가 깨지지 않게 함
            setSuggestedQuestions([]); 
        }
        }, [productId]); 
        useEffect(() => {

        fetchSuggestedQuestions();

    }, [fetchSuggestedQuestions]);


    return {
        messages, isLoading, error, sendMessage, messagesEndRef,
        // 세션 관련 (백엔드 기반)
        sessionId, sessions, isSessionLoading,
        loadSession: handleLoadSession,
        startNewSession: handleNewSession,
        deleteSession: handleDeleteSession,
        sendFeedback: sendFeedback,
        isNewSession: isNewSession,
        suggestedQuestions,
        refreshSuggestedQuestions: fetchSuggestedQuestions,
    };
};