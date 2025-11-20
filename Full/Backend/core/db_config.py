from core.config import load
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from typing import AsyncGenerator
from sqlalchemy.engine import Engine
import contextlib

DB_HOST,DB_USER,DB_PASSWORD,DB_DATABASE,DB_PORT = load.envs()


DATABASE_URL = f"mysql+aiomysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_DATABASE}"
print(DATABASE_URL)

engine: Engine = create_async_engine(
    DATABASE_URL, 
    echo=True,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_timeout=30
)

AsyncSessionFactory = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False, 
)

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionFactory() as session:
        yield session

@contextlib.asynccontextmanager
async def get_session_text() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionFactory() as session:
        yield session