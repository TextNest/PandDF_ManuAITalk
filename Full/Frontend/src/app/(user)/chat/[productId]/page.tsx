// ============================================
// 📄 src/app/(user)/chat/[productId]/page.tsx
// ============================================
// 세션 기능 + 로그인 유도 배너가 통합된 채팅 페이지
// ============================================

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Mic } from 'lucide-react';
import { playTextToSpeech } from '@/features/chat/utils/tts';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useChat } from '@/features/chat/hooks/useChat';
import ChatMessage from '@/components/chat/ChatMessage/ChatMessage';
import SuggestedQuestions from '@/components/chat/SuggestedQuestions/SuggestedQuestions';
import TypingIndicator from '@/components/chat/TypingIndicator/TypingIndicator';
import SessionHistory from '@/components/chat/SessionHistory/SessionHistory';
import styles from './chat-page.module.css';
import { toast } from '@/store/useToastStore';

const SUGGESTED_QUESTIONS = [
  '제품 사용법이 궁금해요',
  '고장이 났어요',
  'A/S는 어떻게 받나요?',
  '설치 방법을 알려주세요',
];

export default function ChatPage({
  params
}: {
  params: { productId: string }
}) {
  const router = useRouter();

  // 인증 상태
  const { isAuthenticated } = useAuth();

  // 채팅 상태
  const [inputValue, setInputValue] = useState('');
  const {
    messages,
    isLoading,
    sendMessage,
    messagesEndRef,
    // 세션 관련
    sessionId,
    sessions,
    isSessionLoading,
    loadSession,
    startNewSession,
    deleteSession,
    sendFeedback,
    isNewSession,
    suggestedQuestions
  } = useChat(params.productId);

  // STT & TTS 상태
  const [isRecording, setIsRecording] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const audioProcessorRef = useRef<{
    audioContext: AudioContext;
    scriptProcessor: ScriptProcessorNode;
    source: MediaStreamAudioSourceNode;
    stream: MediaStream;
    analyser: AnalyserNode;
  } | null>(null);
  const lastFinalTranscriptRef = useRef('');
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastIsRecordingRef = useRef(false);
  const lastPlayedMessageId = useRef<string | null>(null);
  const isAutoPlayingRef = useRef(false);
  const isUserSpeakingRef = useRef(false);

  // 로그인 배너 상태
  const [showLoginBanner, setShowLoginBanner] = useState(true);

  // --- 함수 정의 (컴포넌트 렌더링 로직보다 위에 정의) ---

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;
    await sendMessage(inputValue);
    setInputValue('');
  }, [inputValue, isLoading, sendMessage]);

  const stopRecording = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (audioProcessorRef.current) {
      const { stream, scriptProcessor, source, audioContext, analyser } = audioProcessorRef.current;
      stream.getTracks().forEach(track => track.stop());
      scriptProcessor.onaudioprocess = null;
      scriptProcessor.disconnect();
      source.disconnect();
      analyser.disconnect();
      if (audioContext.state !== 'closed') {
        audioContext.close().catch(console.error);
      }
      audioProcessorRef.current = null;
    }
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const floatTo16BitPCM = (input: Float32Array): Int16Array => {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
  };

  const downsampleBuffer = (buffer: Float32Array, fromSampleRate: number, toSampleRate: number): Float32Array => {
    if (fromSampleRate === toSampleRate) return buffer;
    const sampleRateRatio = fromSampleRate / toSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0, count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = accum / count;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  };

  const checkForSilence = useCallback(() => {
    if (!audioProcessorRef.current) return;
    const { analyser } = audioProcessorRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;

    const SILENCE_THRESHOLD = 20;
    const LONG_DELAY = 5000;  // 사용자가 말 시작하기 전 대기 시간
    const SHORT_DELAY = 2000; // 사용자가 말한 후 멈춤 대기 시간

    if (average < SILENCE_THRESHOLD) {
      if (!silenceTimerRef.current) {
        const delay = isUserSpeakingRef.current ? SHORT_DELAY : LONG_DELAY;
        silenceTimerRef.current = setTimeout(() => {
          stopRecording();
        }, delay);
      }
    } else {
      isUserSpeakingRef.current = true; // 사용자가 말하기 시작함
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }
    if (audioProcessorRef.current) {
      requestAnimationFrame(checkForSilence);
    }
  }, [stopRecording]);

  const startAudioProcessing = useCallback((stream: MediaStream, audioContext: AudioContext) => {
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    const bufferSize = 2048;
    const scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);
    const TARGET_SAMPLE_RATE = 16000;

    scriptProcessor.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0);
      const downsampledBuffer = downsampleBuffer(inputData, audioContext.sampleRate, TARGET_SAMPLE_RATE);
      const pcmBuffer = floatTo16BitPCM(downsampledBuffer);
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(pcmBuffer);
      }
    };

    source.connect(analyser);
    analyser.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);
    audioProcessorRef.current = { audioContext, scriptProcessor, source, stream, analyser };
    requestAnimationFrame(checkForSilence);
  }, [checkForSilence]);

  const handleMicClick = useCallback(async () => {
    if (isRecording) {
      stopRecording();
      return;
    }
    try {
      // 1. AudioContext를 사용자 제스처 내에서 생성 또는 재개 (모바일 브라우저 정책 대응)
      let audioContext = audioProcessorRef.current?.audioContext;
      if (!audioContext || audioContext.state === 'closed') {
        audioContext = new AudioContext();
      } else if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      isUserSpeakingRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const wsUrl = `${backendUrl.replace(/^http/, 'ws')}/voice/stt`;
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        setIsRecording(true);
        setInputValue('');
        lastFinalTranscriptRef.current = '';
        // 2. 미리 생성된 AudioContext를 전달
        startAudioProcessing(stream, audioContext!);
      };
      socketRef.current.onclose = () => stopRecording();
      socketRef.current.onerror = () => {
        toast.error("음성 인식 연결에 실패했습니다.");
        stopRecording();
      };
      socketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const transcript = data.transcript || '';
        if (data.is_final) {
          lastFinalTranscriptRef.current += transcript.trim() + ' ';
          setInputValue(lastFinalTranscriptRef.current);
        } else {
          setInputValue(lastFinalTranscriptRef.current + transcript);
        }
      };
    } catch (error) {
      toast.error("마이크 접근 권한이 필요합니다.");
    }
  }, [isRecording, startAudioProcessing, stopRecording]);

  // --- useEffect 훅 ---

  useEffect(() => {
    if (isAuthenticated) {
      setShowLoginBanner(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    return () => stopRecording();
  }, [stopRecording]);

  useEffect(() => {
    if (lastIsRecordingRef.current && !isRecording && inputValue.trim()) {
      handleSend();
    }
    lastIsRecordingRef.current = isRecording;
  }, [isRecording, inputValue, handleSend]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (
      messages.length > 2 &&
      lastMessage &&
      lastMessage.role === 'assistant' &&
      !isLoading &&
      lastMessage.id !== lastPlayedMessageId.current &&
      !isAutoPlayingRef.current
    ) {
      isAutoPlayingRef.current = true;
      lastPlayedMessageId.current = lastMessage.id;
      playTextToSpeech(lastMessage.content)
        .then(() => handleMicClick())
        .catch(err => {
          if (err.name === 'NotAllowedError') {
            toast.info("음성 자동 재생이 차단되었습니다. 스피커를 클릭해 들어보세요.", 5000);
          }
        })
        .finally(() => {
          isAutoPlayingRef.current = false;
        });
    }
  }, [messages, isLoading, handleMicClick]);

  const handleGoogleLogin = () => {
    const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    // 리디렉션 URI는 Google Cloud Console에 등록된 주소여야 합니다.
    const REDIRECT_URI = `${window.location.origin}/auth/callback`; 
    const SCOPE = 'openid profile email'; // 요청할 권한
    // 2. 사용자를 Google 인증 페이지로 리디렉션
    const AUTH_URL = 
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}` +
      `&redirect_uri=${REDIRECT_URI}` +
      `&response_type=code` + // 인가 코드를 받기 위함
      `&scope=${SCOPE}` +
      `&access_type=offline` +
      `&prompt=select_account`;
    window.location.href = AUTH_URL;
  };
  // 추천 질문 선택
  const handleSuggestedQuestion = (question: string) => {
    setInputValue(question);
  };

  // Enter 키 전송
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- 렌더링 로직 ---

  if (isSessionLoading) {
    return (
      <div className={styles.chatPage}>
        <div className={styles.loadingContainer}>
          <p>대화를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.chatPage}>
      {/* 세션 히스토리 사이드바 */}
      <SessionHistory
        sessions={sessions}
        currentSessionId={sessionId}
        onSelectSession={loadSession}
        onNewSession={startNewSession}
        onDeleteSession={deleteSession}
      />

      <div className={styles.chatContent}>
        {/* 로그인 유도 배너 (비로그인 시에만 표시) */}
        {!isAuthenticated && showLoginBanner && (
          <div className={styles.loginBanner}>
            <div className={styles.bannerContent}>
              <span>💡 로그인하면 이전 대화 기록을 확인할 수 있어요!</span>
              <button className={styles.loginButton} onClick={handleGoogleLogin}>
                구글로 로그인
              </button>
            </div>
            <button className={styles.closeBanner} onClick={() => setShowLoginBanner(false)} aria-label="배너 닫기">
              ✕
            </button>
          </div>
        )}

        {/* 제품 정보 헤더 - 버튼들 제거 */}
        <div className={styles.productInfo}>
          <p className={styles.productId}>제품: {params.productId}</p>
        </div>

        {/* 메시지 영역 */}
        <div className={styles.messageArea}>
          {messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              sessionId={sessionId}
              productId={params.productId}
              isFirstMessage={isNewSession?(index < 2) : (index === 0)}
              onSendFeedback={sendFeedback}
            />
          ))}

          {isLoading && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>

        {/* 추천 질문 (메시지가 1개일 때만) */}
        {!isLoading && (
          <SuggestedQuestions
            questions={suggestedQuestions.length > 0?suggestedQuestions:SUGGESTED_QUESTIONS}
            onSelect={handleSuggestedQuestion}
          />
        )}

        {/* 입력 영역 */}
        <div className={styles.inputArea}>
          <input
            type="text"
            className={styles.input}
            placeholder={isRecording ? "듣고 있어요..." : "메시지를 입력하세요..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading || isRecording}
          />
          <button
            className={styles.micButton}
            onClick={handleMicClick}
            aria-label="음성으로 입력"
          >
            <Mic size={20} className={isRecording ? styles.recordingIcon : ''} />
          </button>
          <button
            className={styles.sendButton}
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            aria-label="전송"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
