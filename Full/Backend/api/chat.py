from fastapi import APIRouter,WebSocket,WebSocketDisconnect,Request,Depends
from fastapi.responses import HTMLResponse
import asyncio
import random
from fastapi.templating import Jinja2Templates
from module.chat_agent import ChatBotAgent
import time
from core.db_config import get_session
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel


router = APIRouter()
class history(BaseModel):
    name:str

## 추후 작성예정
# session_query = """
# SELECT 

# """
@router.post("/chat/history")
async def history_session(data:history,session:AsyncSession=Depends(get_session)):
    name = data.name
    print(name)
    if name != "정국호":
        return []
    else:
        return [
    {
        "id": 'session-1',
        "productId": 'samsung-wf123',
        "productName": '삼성 세탁기 WF-123',
        "lastMessage": '세탁기 소음이 너무 심한데 어떻게 해야 하나요?',
        "messageCount": 5,
        "createdAt": '2025-01-20T15:30:00',
        "updatedAt": '2025-01-20T15:45:00',
    },
    {
        "id": 'session-2',
        "productId": 'samsung-wf123',
        "productName": '삼성 세탁기 WF-123',
        "lastMessage": '세탁기 설치 방법을 알려주세요',
        "messageCount": 3,
        "createdAt": '2025-01-15T10:20:00',
        "updatedAt": '2025-01-15T10:35:00',
    }
]




@router.websocket("/ws/{pid}")
async def websocket_endpoint(websocket:WebSocket,pid:str):
    await websocket.accept()
    print("연결 성공")  
    try:
        session_id = str(random.randint(100000,999999))
        agent = ChatBotAgent(product_id = pid,session_id = session_id)
        await websocket.send_json({"type":"bot", "message": f"{pid} 상품의 정보 입니다."})
        await asyncio.sleep(0.5)
        await websocket.send_json({"type":"bot","message":"무엇을 도와드릴까요?"})
        while True:
            data = await websocket.receive_text()
            start = time.time()
            answer = agent.chat(data)
            end  = time.time()
            total_time = end - start 
            print(f"{total_time:0.2f}초 걸렸습니다.")
            await websocket.send_json({"type":"bot","message":answer["answer"]})

            # async for token in agent.stream_chat(data):
            #     await websocket.send_json({"type": "token", "message": token}) ## type bot:normal , type token : stream
            await websocket.send_json({"type":"stream_end"})
    except WebSocketDisconnect:
        print("연결 종료")

