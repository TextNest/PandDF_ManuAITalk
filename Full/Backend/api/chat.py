from fastapi import APIRouter,WebSocket,WebSocketDisconnect,Depends,Query
import asyncio
import random
from module.chat_agent import ChatBotAgent
import time
from core.db_config import get_session,get_session_text
from sqlalchemy.ext.asyncio import AsyncSession
from core.auth import get_current_user
from typing import  Dict,Optional
from sqlalchemy import text 
import datetime
import json
from core.query import session_search,find_message,add_message,find_session,update_session,add_session,delete_sessions,delete_message,update_feedback,find_questions
from schemas.chat import FeedBack
import logging

logging.basicConfig(
    level=logging.INFO, # INFO 레벨 이상만 출력 (DEBUG는 무시)
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/chat/history")
async def history_session(user_info: Dict = Depends(get_current_user),session:AsyncSession=Depends(get_session)):
    user_id = user_info.get("unique_id")

    results = await session.execute(text(session_search),
    params={
        "user_internal_id":user_id
    })
    code_row = results.mappings().all()
    if not code_row:
        return [] 
    json_safe_rows = [dict(row) for row in code_row]
    return json_safe_rows


@router.delete("/chat/history/{session_id}")
async def delete_session(session_id:str,user_info:Dict=Depends(get_current_user),session:AsyncSession=Depends(get_session)):
    user_id = user_info.get("email")
    await session.execute(text(delete_sessions),
    params={
        "user_internal_id":user_id,
        "session_id":session_id
    })
    await session.commit()
    await session.execute(text(delete_message),
    params={
        "session_id":session_id
    })
    await session.commit()
    logger.info(f"{user_id}의 {session_id}가 삭제 되었습니다.")
    return {"message":"세션이 삭제되었습니다."}

@router.post("/chat/feedback")
async def feedback(feedback_data:FeedBack,session:AsyncSession=Depends(get_session)):
    try:
        await session.execute(text(update_feedback),
        params={
            "feedback":feedback_data.feedback,
            "id": feedback_data.message_id,
        })
        await session.commit()
        logger.info(f"{feedback_data.id}가 업데이트 되었습니다.")
    except Exception as e:
        await session.rollback()
        

    
@router.get("/chat/suggestions/{productId}")
async def get_suggestions(productId:str,session:AsyncSession=Depends(get_session)):
    result = await session.execute(text(find_questions),
    params={
        "productId":productId
    })
    code_row = result.mappings().all()
    if not code_row:
        return []
    questions_list = [row['question'] for row in code_row]
    return {"question": questions_list }
    




@router.websocket("/ws/{pid}")
async def websocket_endpoint(websocket:WebSocket,pid:str,session_id: Optional[str] = Query(None, alias="session_id")):
    await websocket.accept()
    logger.info("연결 성공")  
    pid = pid.upper()
    message = None
    user_id = None
    final_answer = None
    Issession = False
    try:
        first_message = await websocket.receive_json()
        if first_message.get("token")=="pass" :
            logger.info("비회원확인")
            first_message = None
            user_id = None
        if first_message and first_message.get("type") == 'auth' and first_message.get("token"):
            logger.info("회원확인")
            auth_token = first_message["token"]
            authorization_header = f"Bearer {auth_token}"
            user_info = get_current_user(authorization=authorization_header)
            if user_info.get("role") == 'user':
                user_id = user_info.get("unique_id")
            else:
                logger.info("admin이상의 등급은 user_id를 제공하지 않습니다.")
                user_id = None
            
        if not session_id : 
            logger.info("새 세션 생성")

            session_id = str(random.randint(100000,999999))

            await websocket.send_json({"type":"bot", "message": f"{pid} 상품의 정보 입니다."})
            await asyncio.sleep(0.5)
            await websocket.send_json({"type":"bot","message":"무엇을 도와드릴까요?"})
        else:
            async with get_session_text() as session:
                logger.info(f"기존 세션 ID: {session_id} 로 연결합니다.")
                results = await session.execute(text(find_message),
                params={"session_id":session_id,"user_id":user_id})
                code_row = results.mappings().all()
                initial_messages = [dict(row) for row in code_row]
                final_message = []
                for i in initial_messages:
                    if isinstance(i["timestamp"],datetime.datetime):
                        i['timestamp'] = i['timestamp'].isoformat() 
                    final_message.append(i)
                message = final_message
                await websocket.send_json({"type":"session_init", "message":final_message})
                Issession = True
        agent = ChatBotAgent(product_id = pid,session_id = session_id,initial_messages=message)

        while True:
            data = await websocket.receive_text()
            async with get_session_text() as session:      
                start = time.time()
                answer = await agent.chat(data,session)
                if isinstance(answer["answer"],list):
                    final_answer = answer["answer"][0]["text"]
                elif isinstance(answer["answer"],str):
                    final_answer = answer["answer"]
                end  = time.time()
                total_time = end - start 
                logger.info(f"{total_time:0.2f}초 걸렸습니다.")


                
                #Human Message가 들어오고 AI메세지를 생성완료 했을 때 세션 생성
                if not Issession:
                    await session.execute(text(add_session),
                        params={
                            "user_internal_id":user_id,
                            "productId":pid,
                            "session_id":session_id
                        })
                    Issession = True
                await session.execute(text(add_message),
                params={
                    "session_id":session_id,
                    "role":"user",
                    "content":data, 
                    "tool_name":answer["tool_name"]
                })
                
                
                await session.execute(text(add_message),
                params={
                    "session_id":session_id,
                    "role":"assistant",
                    "content":final_answer,
                    "tool_name":answer["tool_name"]
                })
                result = await session.execute(text("SELECT LAST_INSERT_ID()"))
                message_id = result.scalar_one()
                await session.commit()
                await websocket.send_json({"type":"bot","message":final_answer ,"message_id":message_id})
                await websocket.send_json({"type":"stream_end"})
                
    except WebSocketDisconnect:
        async with get_session_text() as session:
            
            results = await session.execute(text(find_message),
            params={"session_id":session_id})
            code_row = results.mappings().all()
            message_count = len(code_row)
            last_message = code_row[-1]['content']

            find_sessions = await session.execute(text(find_session),params={"session_id":session_id})
            find_sessions = find_sessions.mappings().one_or_none()
            if find_sessions:
                await session.execute(text(update_session),params={
                    "user_internal_id":user_id,
                    "session_id":session_id,
                    "lastMessage":last_message,
                    "messageCount":message_count
                })
            await session.commit()

            logger.info(f"{user_id}_{session_id}가 저장되었습니다. \n\n 연결종료")

                
        
