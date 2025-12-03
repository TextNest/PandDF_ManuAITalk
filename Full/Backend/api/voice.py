from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import io
import os
import json

# Google Cloud Text-to-Speech 비동기 클라이언트 임포트
from google.cloud import texttospeech_v1 as texttospeech

# 서비스 계정 키를 환경 변수에서 읽어와 설정
# core.config.py에서 이미 os.environ에 로드했으므로 바로 사용 가능
credentials_json = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")
if credentials_json:
    credentials_info = json.loads(credentials_json)
    tts_client = texttospeech.TextToSpeechAsyncClient.from_service_account_info(credentials_info)
else:
    # 환경 변수가 없을 경우, 로컬 개발 환경 등을 위해 기본 클라이언트 사용 시도
    # (gcloud auth application-default login 필요)
    try:
        tts_client = texttospeech.TextToSpeechAsyncClient()
    except Exception as e:
        # 두 방법 모두 실패 시, 서버 시작 시점에 에러를 발생시키기보다
        # API 호출 시점에 에러를 확인하도록 클라이언트를 None으로 설정
        tts_client = None
        print(f"Warning: Google Cloud TTS client could not be initialized. Error: {e}")


router = APIRouter()

class TTSRequest(BaseModel):
    text: str
    language_code: str = "ko-KR"
    voice_name: str = "ko-KR-Wavenet-B" # 여성 목소리

import re

def split_text_into_chunks(text: str, chunk_size: int = 1000):
    """텍스트를 문장 경계를 존중하며 청크로 나눕니다."""
    chunks = []
    # 문장 분리 (마침표, 물음표, 느낌표 기준)
    sentences = re.split(r'(?<=[.?!])\s+', text)
    current_chunk = ""
    for sentence in sentences:
        if len(current_chunk) + len(sentence) + 1 <= chunk_size:
            current_chunk += sentence + " "
        else:
            chunks.append(current_chunk.strip())
            current_chunk = sentence + " "
    if current_chunk:
        chunks.append(current_chunk.strip())
    return chunks

@router.post("/tts", tags=["Voice"])
async def text_to_speech(request: TTSRequest):
    """
    텍스트를 음성으로 변환하여 오디오 파일(MP3)로 스트리밍합니다.
    긴 텍스트는 자동으로 분할하여 처리합니다.
    """
    if not tts_client:
        raise HTTPException(status_code=500, detail="TTS client is not initialized. Check server credentials.")

    try:
        text = request.text
        # Google TTS API의 권장 제한(5000자)보다 여유있게 4000자로 설정
        if len(text) > 4000:
            text_chunks = split_text_into_chunks(text)
            audio_segments = []

            for chunk in text_chunks:
                synthesis_input = texttospeech.SynthesisInput(text=chunk)
                voice = texttospeech.VoiceSelectionParams(
                    language_code=request.language_code, name=request.voice_name
                )
                audio_config = texttospeech.AudioConfig(
                    audio_encoding=texttospeech.AudioEncoding.MP3
                )
                response = await tts_client.synthesize_speech(
                    input=synthesis_input, voice=voice, audio_config=audio_config
                )
                audio_segments.append(response.audio_content)
            
            combined_audio = b"".join(audio_segments)
            return StreamingResponse(io.BytesIO(combined_audio), media_type="audio/mpeg")
        
        else:
            synthesis_input = texttospeech.SynthesisInput(text=text)
            voice = texttospeech.VoiceSelectionParams(
                language_code=request.language_code, name=request.voice_name
            )
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3
            )
            response = await tts_client.synthesize_speech(
                input=synthesis_input, voice=voice, audio_config=audio_config
            )
            return StreamingResponse(io.BytesIO(response.audio_content), media_type="audio/mpeg")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred during TTS synthesis: {str(e)}")


from fastapi import WebSocket, WebSocketDisconnect
from google.cloud import speech_v1 as speech
import asyncio
from asyncio import Queue

# STT 클라이언트를 비동기(Async) 클라이언트로 설정
if credentials_json:
    try:
        credentials_info = json.loads(credentials_json)
        stt_client = speech.SpeechAsyncClient.from_service_account_info(credentials_info)
    except (json.JSONDecodeError, TypeError) as e:
        stt_client = None
        print(f"Warning: Failed to parse Google Cloud credentials. Error: {e}")
else:
    try:
        stt_client = speech.SpeechAsyncClient()
    except Exception as e:
        stt_client = None
        print(f"Warning: Google Cloud STT client could not be initialized. Error: {e}")

# ... (기존 STT 클라이언트 초기화 코드) ...

# 양방향 스트리밍을 위한 안정적인 패턴 (Queue 사용)
async def receive_audio(websocket: WebSocket, queue: Queue):
    """클라이언트로부터 오디오를 받아 큐에 넣는 작업"""
    try:
        while True:
            data = await websocket.receive_bytes()
            await queue.put(data)
    except WebSocketDisconnect:
        # print("Client disconnected. Finishing receive_audio task.")
        await queue.put(None) # 스트림 종료 신호
    except Exception as e:
        print(f"Error in receive_audio: {e}")
        await queue.put(None)


async def send_transcriptions(websocket: WebSocket, queue: Queue):
    """큐에서 오디오를 꺼내 Google로 보내고, 결과를 클라이언트로 전송하는 작업"""
    
    async def request_generator():
        # 첫 번째 요청: 설정 정보
        streaming_config = speech.StreamingRecognitionConfig(
            config=speech.RecognitionConfig(
                encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
                sample_rate_hertz=16000,
                language_code="ko-KR",
                enable_automatic_punctuation=True,
            ),
            interim_results=True,
        )
        yield speech.StreamingRecognizeRequest(streaming_config=streaming_config)

        # 두 번째 요청부터: 오디오 데이터
        while True:
            data = await queue.get()
            if data is None:
                break
            yield speech.StreamingRecognizeRequest(audio_content=data)

    try:
        responses = await stt_client.streaming_recognize(requests=request_generator())

        async for response in responses:
            if not response.results:
                continue
            result = response.results[0]
            if not result.alternatives:
                continue

            transcript = result.alternatives[0].transcript
            is_final = result.is_final
            
            await websocket.send_json({
                "transcript": transcript,
                "is_final": is_final
            })

    except Exception as e:
        print(f"Error in send_transcriptions: {e}")
        # 클라이언트에 오류를 알리고 연결을 닫을 수 있습니다.
        # await websocket.close(code=1011, reason=f"STT Error: {e}")

@router.websocket("/stt")
async def websocket_stt_endpoint(websocket: WebSocket):
    await websocket.accept()
    audio_queue = Queue()
    
    receive_task = asyncio.create_task(receive_audio(websocket, audio_queue))
    send_task = asyncio.create_task(send_transcriptions(websocket, audio_queue))
    
    # 두 작업 중 하나가 먼저 완료될 때까지 기다림
    done, pending = await asyncio.wait(
        [receive_task, send_task],
        return_when=asyncio.FIRST_COMPLETED,
    )

    # 먼저 끝난 작업이 예외를 발생시켰는지 확인 (디버깅용)
    for task in done:
        if task.exception() is not None:
            print(f"Task finished with exception: {task.exception()}")

    # 나머지 실행 중인 작업을 취소하여 리소스 정리
    for task in pending:
        task.cancel()
    
    # print("STT WebSocket connection closed and tasks cleaned up.")


@router.websocket("/ws/tts")
async def websocket_tts_endpoint(websocket: WebSocket):
    """
    WebSocket을 통해 텍스트를 받아 TTS 스트리밍을 실시간으로 전송합니다.
    """
    await websocket.accept()
    
    if not tts_client:
        await websocket.close(code=1011, reason="TTS client is not initialized.")
        return

    try:
        while True:
            # 클라이언트로부터 텍스트 메시지(JSON) 수신 대기
            message = await websocket.receive_text()
            try:
                data = json.loads(message)
                text = data.get("text")
                if not text:
                    continue

                # Google Cloud TTS 스트리밍 요청 생성
                synthesis_input = texttospeech.SynthesisInput(text=text)
                voice = texttospeech.VoiceSelectionParams(
                    language_code="ko-KR", name="ko-KR-Wavenet-B"
                )
                audio_config = texttospeech.AudioConfig(
                    audio_encoding=texttospeech.AudioEncoding.MP3
                )
                
                # 비동기 스트리밍 호출
                response_stream = await tts_client.synthesize_speech(
                    input=synthesis_input, voice=voice, audio_config=audio_config
                )
                
                # FastAPI에서는 synthesize_speech가 전체 응답을 반환하므로,
                # 스트리밍 효과를 내기 위해 바이트를 직접 전송합니다.
                # 참고: 진정한 스트리밍을 위해서는 google-cloud-texttospeech의 스트리밍 API를 사용해야 하지만,
                # 현재 라이브러리의 비동기 클라이언트는 스트리밍 RPC를 직접 노출하지 않을 수 있습니다.
                # 이 코드는 단일 요청 후 받은 오디오를 스트리밍하는 방식입니다.
                # 만약 라이브러리가 stream-out을 지원한다면 아래 코드를 수정해야 합니다.
                # 현재는 단일 응답을 가정하고 구현합니다.
                await websocket.send_bytes(response_stream.audio_content)

            except json.JSONDecodeError:
                # 간단한 텍스트로 처리할 수도 있음
                pass
            except Exception as e:
                print(f"Error during TTS synthesis: {e}")
                # 클라이언트에 오류 알림 (선택적)
                await websocket.send_json({"error": str(e)})

    except WebSocketDisconnect:
        print("Client disconnected from TTS WebSocket.")
    except Exception as e:
        print(f"An error occurred in TTS WebSocket: {e}")
    finally:
        if websocket.client_state.name != 'DISCONNECTED':
            await websocket.close()

