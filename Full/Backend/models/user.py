from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, func
from .base import Base

class User(Base):
    __tablename__ = "tb_user"

    user_internal_id = Column(Integer, primary_key=True, autoincrement=True, comment='고유 식별자')
    email = Column(String(100), nullable=False, index=True, comment='이메일')
    name = Column(String(50), nullable=False, comment='이름')
    is_active = Column(Boolean, nullable=False, default=True, index=True, comment='활성 상태')
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), index=True, comment='생성 일시')