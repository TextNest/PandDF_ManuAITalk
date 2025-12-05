import asyncio
from fastapi import FastAPI,Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from api import chat,login,superadmin,ar_models, products,faq,logs,dashboard,voice
from module import Scheduler_ARP
from core.db_config import engine
import os

from models.base import Base
from models.user import User
from models.company import Company
from models.admin import Admin
from models.product import Product
from models.faq import FAQ
from models.faq_generation_log import FAQGenerationLog
from models.session import ChatSession
from models.message import ChatMessage
from models.report import Report

from contextlib import asynccontextmanager
from core.scheduler import start_scheduler

# 데이터베이스 테이블 생성
async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    # 앱 시작 시 스케줄러 가동
    start_scheduler()
    asyncio.create_task(Scheduler_ARP())
    yield
    # 앱 종료 시 정리 로직 (필요 시)

app = FastAPI(lifespan=lifespan)

app.mount("/uploads/models_3d", StaticFiles(directory="uploads/models_3d"), name="models_3d")
app.mount("/uploads/pdfs", StaticFiles(directory="uploads/pdfs"), name="pdfs")
app.mount("/uploads/images", StaticFiles(directory="uploads/images"), name="images")
app.mount("/page_images", StaticFiles(directory="data/page_images"), name="page_images")
app.mount("/images", StaticFiles(directory="data/caption_images"), name="caption_images")
# CORS 설정
origins = [
    "http://localhost:3000",  
    "http://127.0.0.1:3000", 
    # "https://subnotational-unmodified-myrl.ngrok-free.dev", # ngrok 테스트용
    # "https://preactive-beryline-despina.ngrok-free.dev", # ngrok 테스트용 
]

from fastapi.responses import FileResponse

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      
    allow_credentials=True,   
    allow_methods=["*"],       
    allow_headers=["*"],       
)

@app.middleware("http")
async def add_cors_header(request: Request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

app.include_router(voice.router, prefix="/voice", tags=["Voice"])
app.include_router(chat.router, tags=["chat"])
app.include_router(login.router, tags=["login"],prefix="/api")
app.include_router(ar_models.router, tags=["ar_models"], prefix="/api")
app.include_router(products.router, tags=["products"], prefix="/api/products")
app.include_router(faq.router, tags=["faq"])
app.include_router(superadmin.router, tags=["superadmin"], prefix="/api/superadmin")
app.include_router(logs.router, tags=["logs"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])