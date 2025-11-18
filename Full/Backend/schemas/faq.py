from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class FAQBase(BaseModel):
    question: str
    answer: str
    category: Optional[str] = None
    tags: Optional[str] = None
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    status: str = 'draft'
    source: str

class FAQCreate(FAQBase):
    is_auto_generated: bool = False
    created_by: Optional[str] = None

class FAQUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    status: Optional[str] = None

class FAQResponse(FAQBase):
    faq_id: str  # 외부 노출용 ID만 반환
    is_auto_generated: bool
    view_count: int
    helpful_count: int
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str]
    
    class Config:
        from_attributes = True