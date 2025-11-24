# models/admin.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, func, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base # base.py에서 Base를 임포트합니다.

class Admin(Base):
    __tablename__ = "tb_admin"

    admin_internal_id = Column(Integer, primary_key=True, autoincrement=True)
    company_internal_id = Column(Integer, ForeignKey("tb_company.company_internal_id"))
    
    email = Column(String(100), nullable=False, unique=True)
    password_hash = Column(String(100), nullable=False)
    name = Column(String(50), nullable=False)
    
    department = Column(String(50))
    job_title = Column(String(50))
    
    is_super = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    updated_by = Column(Integer)

    # relationship에는 다시 문자열을 사용합니다.
    company = relationship("Company", back_populates="admins")
