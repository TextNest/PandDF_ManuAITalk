from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Enum, Index
from sqlalchemy.ext.declarative import declarative_base
import uuid
import base64

Base = declarative_base()

def generate_short_uuid() -> str:
    """Short UUID 생성 (22자)"""
    uid = uuid.uuid4()
    return base64.urlsafe_b64encode(uid.bytes).rstrip(b'=').decode('ascii')

class FAQGenerationLog(Base):
    """FAQ 생성 이력 추적"""
    __tablename__ = "test_faq_generation_log"
    
    internal_id = Column(Integer, primary_key=True, autoincrement=True)
    generation_id = Column(String(22), unique=True, nullable=False, index=True)
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    completed_at = Column(DateTime)
    status = Column(
        Enum('processing', 'completed', 'failed'),
        default='processing',
        nullable=False
    )
    messages_analyzed = Column(Integer, default=0)
    questions_extracted = Column(Integer, default=0)
    faqs_created = Column(Integer, default=0)
    error_message = Column(String(1000))
    created_by = Column(String(255))
    
    __table_args__ = (
        Index('idx_status', 'status'),
        Index('idx_started_at', 'started_at'),
    )
    
    def __init__(self, **kwargs):
        if 'generation_id' not in kwargs:
            kwargs['generation_id'] = generate_short_uuid()
        super().__init__(**kwargs)