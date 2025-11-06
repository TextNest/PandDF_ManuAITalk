import os
from datetime import datetime, timedelta,timezone
from typing import  Dict, Any, Optional
from fastapi import Depends, Header, HTTPException
from jose import jwt
from jose.exceptions import JWTError
from passlib.context import CryptContext
from dotenv import load_dotenv
load_dotenv()
SECRET_KEY = os.getenv("secret_key","your_default_secret_key")
ALGORITHM = "HS256"
Access_Token_Expire = 60

pwd_context = CryptContext(schemes=["bcrypt"],deprecated = "auto")
companyInfo = Dict[str,str]

def create_access_token(data:dict,expires_delta:Optional[timedelta]=None):
    to_encode = data.copy()
    now_utc = datetime.now(timezone.utc).replace(tzinfo=timezone.utc)
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=Access_Token_Expire)
    expire_utc = expire.replace(tzinfo=timezone.utc)
    

    print("\n--- JWT 시간 디버깅 정보 ---")
    print(f"현재 시각 (UTC): {now_utc.isoformat()}")
    print(f"만료 시각 (UTC): {expire_utc.isoformat()}")
    print(f"만료 시간 차이: {expire_utc - now_utc}")
    print("----------------------------\n")
    to_encode.update({"exp":expire.timestamp()})
    encode_jwt = jwt.encode(to_encode,SECRET_KEY,algorithm=ALGORITHM)
    return encode_jwt

def verify_password(plain_password:str,hashed_password:str)->bool:
    return pwd_context.verify(plain_password,hashed_password)

def get_password_hash(password:str):
    return pwd_context.hash(password)

def get_current_user(authorization: Optional[str] = Header(None))-> companyInfo:
    if not authorization :
        return None
    if  not authorization.startswith("Bearer"):
        raise HTTPException(status_code =401, detail ="인증 실패 : 토큰 누락이 되었거나 인증이 실패되었습니다.")
        
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token,SECRET_KEY,algorithms=[ALGORITHM])
        role = payload.get("role")
        if role == "user":
            return {"name":payload.get("name"),"email":payload.get("id")}
        elif role == "company_admin":
            return {"id":payload.get("id"),"name":payload.get("name"),"company_name":payload.get("company_name")}
        if not role :
            raise HTTPException(status_code=401,detail="인증 오류 : 토큰에 필수 정보가 없습니다.")
    except JWTError:
        raise HTTPException(status_code=401,detail="인증 오류 : 토큰이 유효하지 않거나 만료되었습니다.")
