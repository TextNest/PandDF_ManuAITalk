from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text 
from typing import Dict, Any, List
import os
import httpx

from core.auth import create_access_token,verify_password,get_password_hash,get_current_user
from core.db_config import get_session
from dotenv import load_dotenv
load_dotenv()
client_id = os.getenv("clinet_id")
client_secret = os.getenv("clinet_secret")
router = APIRouter()
class LoginRequest(BaseModel):
    user_id: str
    pw: str

class Register(BaseModel):
    company_name:str
    name:str
    user_id:str
    department:str
    preferred_language:str
    pw:str
class FindCode(BaseModel):
    company_code:str

find_company= """
SELECT company_name 
FROM company
WHERE company_code = :code
"""
regist_query = """
INSERT INTO user (user_id ,pw_hash,name,company_name,department,preferred_language)VALUES (:user_id,:pw_hash,:name,:company_name,:department,:preferred_language)
"""
@router.post("/register/code")
async def regist_with_code(code:FindCode,session:AsyncSession=Depends(get_session)):
    result = await session.execute(text(find_company),
    params={"code":code.company_code})
    code_row = result.mappings().one_or_none()
    if not code_row:
        raise HTTPException(status_code=401,detail="현재 등록된 코드가 없습니다.")
    return {"company_name":code_row["company_name"]}
@router.post("/register/info")
async def regist_with_hash_pw(write_info:Register,session:AsyncSession=Depends(get_session)):
    print(write_info.pw)
    pw_hash = get_password_hash(write_info.pw)
    params = {
        "company_name":write_info.company_name,
        "user_id":write_info.user_id,
        "department":write_info.department,
        "preferred_language":write_info.preferred_language,
        "pw_hash":pw_hash,
        "name":write_info.name
    }
    try:
        await session.execute(text(regist_query),params=params)
        await session.commit()
        return {"message":f"{write_info.user_id}가 등록되었습니다."}
    except Exception as e:
        await session.rollback()
        print(f"사용자 등록 실패했습니다.(오류:{e})")
        raise HTTPException(status_code=400,detail=f"사용자 등록 실패했습니다.(오류:{e})")

login_query = """
SELECT company_name,pw_hash,name
FROM user
WHERE user_id = :user_id
"""

@router.post("/login")
async def login_with_token(login_data:LoginRequest,session:AsyncSession=Depends(get_session)):
    result = await session.execute(text(login_query),params={"user_id":login_data.user_id})
    user_row = result.mappings().one_or_none()
    if not user_row:
        raise HTTPException(status_code=401,detail="아이디를 찾을 수 없습니다.")
    
    if not verify_password(login_data.pw,user_row["pw_hash"]):
        raise HTTPException(status_code=401,detail="비밀번호가 일치하지 않습니다.")
    
    from datetime import timedelta
    access_token = create_access_token(
        data ={
            "id":login_data.user_id,    
            "company_name":user_row["company_name"],
            "name":user_row["name"],
            "role":"company_admin"
        } # expire 미 작성시 30분  작성법  expires_delta = timedelta(days=1)
    )
    return {
        "user":{"name":user_row["name"],"company_name":user_row["company_name"],"role":"company_admin"},
        "access_token":access_token,
        "token_type":"Bearer"
    }
companyInfo = Dict[str,str]

@router.post("/user/me", response_model=companyInfo)
async def get_admin_info_from_token_post(
    current_admin_info: companyInfo = Depends(get_current_user)
):
    print("보냈습니다.",current_admin_info)
    return current_admin_info




class AuthCodeRequest(BaseModel):
    code: str
    redirect_uri: str

user_query = """
SELECT name
FROM google_login
WHERE email = :email
"""

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
    print("데이터확인")
    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, data=token_data)
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
        google_unique_id = user_info.get("sub")
        google_email = user_info.get("email")
        google_name = user_info.get("name")

    except Exception as e:
        print("ID Token Verification Failed:", e)
        raise HTTPException(status_code=400, detail="Invalid Google ID Token.")
    result = await session.execute(text(user_query),params={"email":google_email})
    user_row = result.mappings().one_or_none()
    if not user_row:
        await session.execute(text("""INSERT INTO google_login(name,email) VALUES (:name,:email)"""),params={"name":google_name,"email":google_email})
        await session.commit()
        from datetime import timedelta
        data ={
            "id":google_email,    
            "name":google_name,
            "role":"user"
        } 
    else:
        data ={
            "id":google_email,    
            "name":user_row["name"],
            "role":"user"
        } 
    
    access_token = create_access_token(
        data=data
    )
    return {
        "user":{"name":google_name,"role":"user"},
        "access_token":access_token,
        "token_type":"Bearer"
    }
