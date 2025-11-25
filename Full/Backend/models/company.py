# models/company.py
from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship
from .base import Base # base.py에서 Base를 임포트합니다.

class Company(Base):
    __tablename__ = "tb_company"

    company_internal_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)
    code = Column(String(50), nullable=False, unique=True)
    contact = Column(String(50))
    is_active = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # relationship에는 다시 문자열을 사용합니다.
    admins = relationship("Admin", back_populates="company")
    products = relationship("Product", back_populates="company") # products 관계 추가
