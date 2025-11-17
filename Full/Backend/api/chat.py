from fastapi import APIRouter,WebSocket,WebSocketDisconnect,Request,Depends,Query
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
from core.query import session_search,find_message,add_message,find_session,update_session,add_session,delete_sessions,delete_message,update_feedback,guest_find_message
from schemas.chat import FeedBack


router = APIRouter()


@router.post("/chat/history")
async def history_session(user_info: Dict = Depends(get_current_user),session:AsyncSession=Depends(get_session)):
    user_id = user_info.get("email")

    results = await session.execute(text(session_search),
    params={
        "email":user_id
    })
    code_row = results.mappings().all()
    print(code_row,type(code_row))
    if not code_row:
        return [] 
    json_safe_rows = [dict(row) for row in code_row]
    return json_safe_rows


@router.delete("/chat/history/{session_id}")
async def delete_session(session_id:str,user_info:Dict=Depends(get_current_user),session:AsyncSession=Depends(get_session)):
    user_id = user_info.get("email")
    await session.execute(text(delete_sessions),
    params={
        "email":user_id,
        "session_id":session_id
    })
    await session.commit()
    await session.execute(text(delete_message),
    params={
        "email":user_id,
        "session_id":session_id
    })
    await session.commit()
    print(f"{user_id}의 {session_id}가 삭제 되었습니다.")
    return {"message":"세션이 삭제되었습니다."}

@router.post("/chat/feedback")
async def feedback(feedback_data:FeedBack,user_info:Dict=Depends(get_current_user),session:AsyncSession=Depends(get_session)):
    user_id = user_info.get("email")
    try:
        await session.execute(text(update_feedback),
        params={
            "feedback":feedback_data.feedback,
            "id": feedback_data.message_id,
            "email":user_id
        })
        await session.commit()
        print(f"{feedback_data.id}가 업데이트 되었습니다.")
    except Exception as e:
        await session.rollback()
        
        # # 위에서 발생시킨 HTTPException도 여기서 잡힐 수 있음
        # if isinstance(e, HTTPException):
        #     raise e
        
        # raise HTTPException(
        #     status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        #     detail=f"Database error: {str(e)}"
        # )

    

    




@router.websocket("/ws/{pid}")
async def websocket_endpoint(websocket:WebSocket,pid:str,session_id: Optional[str] = Query(None, alias="session_id")):
    await websocket.accept()
    print("연결 성공")  
    message = None
    user_id = None
    final_answer = None
    try:
        first_message = await websocket.receive_json()
        if first_message.get("token")=="pass":
            print("비회원확인")
            first_message = None
            user_id = None
        if first_message and first_message.get("type") == 'auth' and first_message.get("token"):
            print("회원확인")
            auth_token = first_message["token"]
            authorization_header = f"Bearer {auth_token}"
            user_info = get_current_user(authorization=authorization_header)
            user_id = user_info.get("email")
        if not session_id : 
            print("새 세션 생성")
            session_id = str(random.randint(100000,999999))
            await websocket.send_json({"type":"bot", "message": f"{pid} 상품의 정보 입니다."})
            await asyncio.sleep(0.5)
            await websocket.send_json({"type":"bot","message":"무엇을 도와드릴까요?"})
        else:
            async with get_session_text() as session:
                print(f"기존 세션 ID: {session_id} 로 연결합니다.")
                results = await session.execute(text(find_message),
                params={"session_id":session_id,"user_id":user_id})
                code_row = results.mappings().all()
                print(code_row,type(code_row))
                initial_messages = [dict(row) for row in code_row]
                print(initial_messages,type(initial_messages))
                final_message = []
                for i in initial_messages:
                    if isinstance(i["timestamp"],datetime.datetime):
                        i['timestamp'] = i['timestamp'].isoformat()
                    final_message.append(i)
                message = final_message
                await websocket.send_json({"type":"session_init", "message":final_message})
        agent = ChatBotAgent(product_id = pid,session_id = session_id,initial_messages=message)

        while True:
            data = await websocket.receive_text()
            async with get_session_text() as session:
                
                await session.execute(text(add_message),
                params={
                    "email":user_id,
                    "session_id":session_id,
                    "role":"user",
                    "content":data
                })
                await session.commit()

                start = time.time()
                answer = agent.chat(data,session)
                end  = time.time()
                total_time = end - start 
                print(f"{total_time:0.2f}초 걸렸습니다.")
                print(type(answer["answer"]))
                if isinstance(answer["answer"],list):
                    final_answer = answer["answer"][0]["text"]
                elif isinstance(answer["answer"],str):
                    final_answer = answer["answer"]
                

                
                await session.execute(text(add_message),
                params={
                    "email":user_id,
                    "session_id":session_id,
                    "role":"assistant",
                    "content":final_answer
                })
                result = await session.execute(text("SELECT LAST_INSERT_ID()"))
                new_message_id = result.scalar_one()
                await session.commit()
                if session_id and user_id :
                    await websocket.send_json({"type":"bot","message":final_answer,"message_id":new_message_id})
                else:
                    await websocket.send_json({"type":"bot","message":final_answer})
                # async for token in agent.stream_chat(data):
                #     await websocket.send_json({"type": "token", "message": token}) ## type bot:normal , type token : stream
                await websocket.send_json({"type":"stream_end"})
    except WebSocketDisconnect:
        async with get_session_text() as session:
            if user_id:
                results = await session.execute(text(find_message),
                params={"session_id":session_id,"user_id":user_id})
                code_row = results.mappings().all()
                message_count = len(code_row)
                last_message = code_row[-1]['content']

                find_sessions = await session.execute(text(find_session),params={"email":user_id,"session_id":session_id})
                find_sessions = find_sessions.mappings().one_or_none()
                if find_sessions:
                    await session.execute(text(update_session),params={
                        "email":user_id,
                        "session_id":session_id,
                        "lastMessage":last_message,
                        "messageCount":message_count
                    })
            else:
                results = await session.execute(text(guest_find_message),
                params={"session_id":session_id})
                code_row = results.mappings().all()
                message_count = len(code_row)
                last_message = code_row[-1]['content']
                await session.execute(text(add_session),
                params={
                    "email":user_id,
                    "productId":pid,
                    "session_id":session_id,
                    "lastMessage":last_message,
                    "messageCount":message_count
                })
            await session.commit()

            print(f"{user_id}_{session_id}가 저장되었습니다.")
            print("연결 종료")

                
        
