import asyncio
from fastapi import FastAPI,Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from api import chat,login,admin,superadmin,ar_models, products, faq
from module import Scheduler_ARP
from core.db_config import engine
from models.base import Base
from models.product import Product


app = FastAPI() 

# 데이터베이스 테이블 생성
async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.on_event("startup")
async def on_startup():
    await create_tables()
    asyncio.create_task(Scheduler_ARP())

# CORS 설정
origins = [
    "http://localhost:3000",  
    "http://127.0.0.1:3000", 
    "https://subnotational-unmodified-myrl.ngrok-free.dev", # ngrok 테스트용
    "https://preactive-beryline-despina.ngrok-free.dev", # ngrok 테스트용 

]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,      
    allow_credentials=True,   
    allow_methods=["*"],       
    allow_headers=["*"],       
)

app.mount("/uploads/models_3d", StaticFiles(directory="uploads/models_3d"), name="models_3d")
app.mount("/uploads/pdfs", StaticFiles(directory="uploads/pdfs"), name="pdfs")
app.mount("/uploads/images", StaticFiles(directory="uploads/images"), name="images")
app.mount("/page_images", StaticFiles(directory="data/page_images"), name="page_images")

templates = Jinja2Templates(directory="templates")

# @app.get("/",response_class=HTMLResponse) # 리액트 연결 후 수정 예정 현재는 MVP를 위해서 임시로 작성 이후 router-> api로 풀더 이름 변경
# async def main_page(request:Request):
#     return templates.TemplateResponse("main.html",{"request":request})

# @app.get("/login",response_class=HTMLResponse) # 리액트 연결 후 수정 예정 현재는 MVP를 위해서 임시로 작성 이후 router-> api로 풀더 이름 변경
# async def main_page(request:Request):
#     return templates.TemplateResponse("login.html",{"request":request})

# @app.get("/register",response_class=HTMLResponse) # 리액트 연결 후 수정 예정 현재는 MVP를 위해서 임시로 작성 이후 router-> api로 풀더 이름 변경
# async def main_page(request:Request):
#     return templates.TemplateResponse("register.html",{"request":request})
# @app.get("/chat/{pid}",response_class=HTMLResponse) # 리액트 연결 후 수정 예정 현재는 MVP를 위해서 임시로 작성 이후 router-> api로 풀더 이름 변경
# async def main_page(request:Request,pid:str):
#     return templates.TemplateResponse("chat.html",{"request":request,"pid":pid})


app.include_router(chat.router, tags=["chat"])
app.include_router(login.router, tags=["login"],prefix="/api")
app.include_router(ar_models.router, tags=["ar_models"], prefix="/api")
app.include_router(products.router, tags=["products"], prefix="/api/products")
app.include_router(faq.router, tags=["faq"])