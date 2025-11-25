from datetime import datetime
from sqlalchemy import Column, Integer, String, TIMESTAMP, Enum, Index, ForeignKey, func, BINARY, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from .base import Base
from .faq import generate_short_id

class FAQGenerationLog(Base):
    """FAQ 생성 이력 추적"""
    __tablename__ = "tb_faq_generation_log"
    
    generation_internal_id = Column(Integer, primary_key=True, autoincrement=True, comment='고유 식별자')
    generation_id = Column(BINARY(16), nullable=False, comment='FAQ 생성 로그 ID')
    
    started_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), comment='시작 시간')
    completed_at = Column(TIMESTAMP, nullable=True, server_default=func.now(), onupdate=func.now(), comment='종료 시간')
    
    status = Column(Enum('pending', 'completed', 'failed'), nullable=False, default='pending', comment='분석 상태')
    
    messages_analyzed = Column(Integer, default=0, comment='분석 수')
    messages_extracted = Column(Integer, default=0, comment='추출 수')
    faq_created = Column(Integer, default=0, comment='최종 후보 생성 수')
    
    error_message = Column(Text, nullable=True, comment='에러 메시지')
    is_scheduled = Column(Boolean, default=False, comment='생성 방법')
    
    created_by = Column(Integer, ForeignKey("tb_admin.admin_internal_id", ondelete="SET NULL"), nullable=True, comment='생성자')
    
    def __init__(self, **kwargs):
        if 'generation_id' not in kwargs:
            kwargs['generation_id'] = generate_short_id()
        super().__init__(**kwargs)