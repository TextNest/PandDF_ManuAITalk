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

@router.post("/tts", tags=["Voice"])
async def text_to_speech(request: TTSRequest):
    """
    텍스트를 음성으로 변환하여 오디오 파일(MP3)로 스트리밍합니다.
    """
    if not tts_client:
        raise HTTPException(status_code=500, detail="TTS client is not initialized. Check server credentials.")

    try:
        synthesis_input = texttospeech.SynthesisInput(text=request.text)

        # 목소리 설정 (https://cloud.google.com/text-to-speech/docs/voices 참조)
        voice = texttospeech.VoiceSelectionParams(
            language_code=request.language_code,
            name=request.voice_name
        )

        # 오디오 출력 형식 설정
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )

        # API 요청 및 응답
        response = await tts_client.synthesize_speech(
            input=synthesis_input, voice=voice, audio_config=audio_config
        )

        # 오디오 데이터를 스트리밍 응답으로 반환
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

