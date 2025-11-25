from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text 
import os
import httpx
import json
from core.auth import create_access_token, verify_password, get_password_hash, get_current_user
from core.db_config import get_session
from schemas.login import LoginRequest, Register, FindCode, CompayCodeResponse, companyInfo, AuthCodeRequest
from core.query import (
    find_company_and_department, regist_query, login_query,
    user_query, user_regist_query
)

client_id = os.environ["client_id"]
client_secret = os.environ["client_secret"]
router = APIRouter()

@router.post("/register/code",response_model=CompayCodeResponse)
async def regist_with_code(code:FindCode,session:AsyncSession=Depends(get_session)):
    print(code)
    result = await session.execute(text(find_company_and_department),
    params={"code":code.code})
    code_row = result.mappings().one_or_none()
    code_row_dict = dict(code_row)
    print(code_row_dict['existingDepartments'][0])
    if 'existingDepartments' in code_row_dict and code_row_dict['existingDepartments']:
        departments_str = str(code_row_dict['existingDepartments']).strip()
        try:
            if departments_str:
                code_row_dict['existingDepartments'] = departments_str.split(',')
            else:
                code_row_dict['existingDepartments'] = []
        except json.JSONDecodeError as e:
            print(f"JSON 파싱 실패 (Data was not valid JSON string): {e}") 
            code_row_dict['existingDepartments'] = []
    if not code_row:
        raise HTTPException(status_code=401,detail="현재 등록된 코드가 없습니다.")
    print(code_row_dict)
    return code_row_dict

@router.post("/register/info")
async def regist_with_hash_pw(write_info:Register,session:AsyncSession=Depends(get_session)):
    print(write_info.password)
    pw_hash = get_password_hash(write_info.password)
    params = {
        "email":write_info.email,
        "password_hash":pw_hash,
        "name":write_info.name,
        "company_internal_id":write_info.companyId,
        "department":write_info.department
    }
    try:
        await session.execute(text(regist_query),params=params)
        await session.commit()
        return {"message":f"{write_info.name}가 등록되었습니다."}
    except Exception as e:
        await session.rollback()
        print(f"사용자 등록 실패했습니다.(오류:{e})")
        raise HTTPException(status_code=400,detail=f"사용자 등록 실패했습니다.(오류:{e})")



@router.post("/login")
async def login_with_token(login_data:LoginRequest,session:AsyncSession=Depends(get_session)):
    result = await session.execute(text(login_query),params={"email":login_data.email})
    user_row = result.mappings().one_or_none()
    if not user_row:
        raise HTTPException(status_code=401,detail="아이디를 찾을 수 없습니다.")
    if user_row["role"] == 1:
        if user_row["pw_hash"] != login_data.password:
            raise HTTPException(status_code=401,detail="비밀번호가 일치하지 않습니다.")
    else:
        if not verify_password(login_data.password, user_row["pw_hash"]):
            raise HTTPException(status_code=401,detail="비밀번호가 일치하지 않습니다.")
    
    # from datetime import timedelta
    internal_id = user_row["admin_internal_id"]
    prefixed_id = f"admin_{internal_id}"
    access_token = create_access_token(
        data ={
            "id": prefixed_id,
            "email": login_data.email,    
            "company_name": user_row["company_name"],
            "name": user_row["name"],
            "role": "super_admin" if user_row["role"] == 1 else "company_admin"
        } # expire 미 작성시 30분  작성법  expires_delta = timedelta(days=1)
    )
    return {
        "user": {
            "id": prefixed_id,
            "name":user_row["name"],
            "company_name":user_row["company_name"],
            "role": "super_admin" if user_row["role"] == 1 else "company_admin"
        },
        "access_token":access_token,
        "token_type":"Bearer"
    }


@router.post("/user/me", response_model=companyInfo)
async def get_admin_info_from_token_post(
    current_admin_info: companyInfo = Depends(get_current_user)
):
    print("보냈습니다.",current_admin_info)
    return current_admin_info

@router.post("/google/callback")
async def google_login_call_back(code_data:AuthCodeRequest,session:AsyncSession=Depends(get_session)):
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": code_data.code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": code_data.redirect_uri,
        "grant_type": "authorization_code", 
    }
    print("데이터 확인")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(token_url, data=token_data)
    except httpx.RequestError as e:
        # 백엔드 서버가 외부(구글)로 요청을 보낼 수 없는 경우 (네트워크, 방화벽, DNS 문제 등)
        raise HTTPException(status_code=503, detail=f"Could not connect to Google's authentication server: {e}")

    print("서버 비교 중")
    if response.status_code != 200:
        print("Google Token Exchange Failed:", response.json())
        raise HTTPException(status_code=400, detail="Failed to get token from Google.")

    google_tokens = response.json()
    google_id_token = google_tokens.get("id_token")
    try:
        import jwt
        user_info =jwt.decode(
            jwt = google_id_token,
            options ={"verify_signature":False},
            audience=client_id,
            algorithms=["RS256"]
            )
        # google_unique_id = user_info.get("sub")
        google_email = user_info.get("email")
        google_name = user_info.get("name")

    except Exception as e:
        print("ID Token Verification Failed:", e)
        raise HTTPException(status_code=400, detail="Invalid Google ID Token.")

    result = await session.execute(
        text(user_query),
        params = {"email": google_email}
    )
    user_row = result.mappings().one_or_none()

    if not user_row:
        await session.execute(
            text(user_regist_query),
            params={"name": google_name, "email": google_email}
        )
        await session.commit()

        result = await session.execute(text("SELECT LAST_INSERT_ID()"))
        new_id = result.scalar_one()
        prefixed_id = f"user_{new_id}"

        # from datetime import timedelta
        data = {
            "id": prefixed_id,
            "email": google_email,    
            "name": google_name,
            "role": "user"
        } 
    else:
        internal_id = user_row["user_internal_id"]
        prefixed_id = f"user_{internal_id}"
        data = {
            "id": prefixed_id,
            "email": google_email,    
            "name": user_row["name"],
            "role": "user"
        } 
    
    access_token = create_access_token(
        data = data
    )
    return {
        "user": {"id": prefixed_id, "name": google_name, "role": "user"},
        "access_token": access_token,
        "token_type": "Bearer"  
    }