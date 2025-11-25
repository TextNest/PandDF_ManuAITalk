from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, Enum, ForeignKey, Index, func, Boolean
from sqlalchemy.ext.declarative import declarative_base
from .base import Base

class ChatMessage(Base):
    """세션 메시지 내용 저장"""
    __tablename__ = "tb_message"
    
    message_internal_id = Column(Integer, primary_key=True, autoincrement=True, comment='고유 식별자')
    session_internal_id = Column(Integer, ForeignKey("tb_session.session_internal_id", ondelete="SET NULL"), nullable=True, index=True, comment='세션 고유 번호')
    
    role = Column(Enum('user', 'assistant', 'system'), nullable=False, index=True, comment='발신자 유형')
    content = Column(Text, nullable=True, comment='내용')
    feedback = Column(Boolean, nullable=True, index=True, comment='피드백')
    tool_name = Column(String(50), nullable=False, index=True, comment='랭체인 도구')
    
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), index=True, comment='생성 일시')