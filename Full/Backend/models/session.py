from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey, func, Text
from sqlalchemy.ext.declarative import declarative_base
from .base import Base

class ChatSession(Base):
    """채팅 세션 테이블"""
    __tablename__ = "tb_session"
    
    session_internal_id = Column(Integer, primary_key=True, autoincrement=True, comment='고유 식별자')
    session_id = Column(String(45), unique=True, nullable=False, index=True, comment='세션 ID')
    
    user_internal_id = Column(Integer, ForeignKey("tb_user.user_internal_id", ondelete="SET NULL"), nullable=True, index=True, comment='일반 회원 고유 식별자')
    product_internal_id = Column(Integer, ForeignKey("tb_product.product_internal_id", ondelete="SET NULL"), nullable=True, index=True, comment='제품 고유 식별자')
    
    last_message = Column(Text, nullable=True, comment='마지막 메시지')
    message_count = Column(Integer, nullable=True, comment='메시지 개수')
    
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), index=True, comment='생성 일시')
    updated_at = Column(TIMESTAMP, nullable=True, server_default=func.now(), onupdate=func.now(), comment='갱신 일시')