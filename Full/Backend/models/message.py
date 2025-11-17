from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class ChatMessage(Base):
    """테스트 메시지 테이블"""
    __tablename__ = "test_message"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255))
    session_id = Column(String(255))
    role = Column(Enum('user', 'assistant'), nullable=False)
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    feedback = Column(String(50))  # 'positive', 'negative', NULL