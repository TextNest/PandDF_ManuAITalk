from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Enum, Boolean, DateTime, Index
from sqlalchemy.ext.declarative import declarative_base
import uuid
import base64

Base = declarative_base()

def generate_short_id() -> str:
    """
    짧은 URL-safe UUID 생성 (22자)
    
    Returns:
        22자 URL-safe 문자열 (예: "VQ6EAOKbQdSnFkRmVUQAAA")
    """
    uid = uuid.uuid4()
    encoded = base64.urlsafe_b64encode(uid.bytes).rstrip(b'=').decode('ascii')
    return encoded

class FAQ(Base):
    __tablename__ = "test_faqs"
    
    # 내부 시스템용 기본키
    internal_id = Column(Integer, primary_key=True, autoincrement=True)
    
    # 외부 노출용 ID (22자, URL-safe)
    faq_id = Column(String(22), unique=True, nullable=False, index=True)
    
    # FAQ 내용
    question = Column(String(1024), nullable=False)
    answer = Column(Text, nullable=False)
    
    # 분류 및 메타데이터
    category = Column(String(255))
    tags = Column(String(255))
    product_id = Column(String(255))
    product_name = Column(String(255))
    
    # 상태 및 생성 정보
    status = Column(Enum('draft', 'published', name='faq_status'), nullable=False, default='draft')
    is_auto_generated = Column(Boolean, default=False)
    source = Column(Enum('pdf', 'chatbot', 'manual', name='faq_source'), nullable=False)
    
    # 통계
    view_count = Column(Integer, default=0)
    helpful_count = Column(Integer, default=0)
    
    # 타임스탬프 (시간순 정렬용)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(255))
    
    # 인덱스
    __table_args__ = (
        Index('idx_status', 'status'),
        Index('idx_category', 'category'),
        Index('idx_source', 'source'),
        Index('idx_created_at', 'created_at'),
    )
    
    def __init__(self, **kwargs):
        # Short UUID 자동 생성
        if 'faq_id' not in kwargs:
            kwargs['faq_id'] = generate_short_id()
        super().__init__(**kwargs)