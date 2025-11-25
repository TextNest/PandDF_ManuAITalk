from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class ChatSession(Base):
    """채팅 세션 테이블"""
    __tablename__ = "test_session"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(255), unique=True, nullable=False, index=True)
    productId = Column(String(100), nullable=False, index=True)  # 제품 코드
    updatedAt = Column(DateTime)