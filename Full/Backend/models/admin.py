# models/admin.py
from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship
from .base import Base # base.py에서 Base를 임포트합니다.

class Admin(Base):
    __tablename__ = "tb_admin"

    admin_internal_id = Column(Integer, primary_key=True, autoincrement=True, comment='고유 식별자')
    email = Column(String(100), nullable=False, comment='이메일')
    password_hash = Column(String(100), nullable=False, comment='비밀번호')
    name = Column(String(50), nullable=False, comment='이름')
    company_internal_id = Column(Integer, ForeignKey("tb_company.company_internal_id", ondelete="SET NULL"), nullable=True, index=True, comment='기업 고유 식별자')
    
    department = Column(String(50), nullable=False, comment='부서')
    job_title = Column(String(50), nullable=True, comment='직책')
    
    is_super = Column(Boolean, nullable=False, default=False, comment='슈퍼 관리자 여부')
    is_active = Column(Boolean, nullable=False, default=True, index=True, comment='활성 상태')
    
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), index=True, comment='생성 일시')
    updated_at = Column(TIMESTAMP, nullable=True, server_default=func.now(), onupdate=func.now(), comment='변경 일시')

    # 관계 설정
    # relationship에는 다시 문자열을 사용합니다.
    company = relationship("Company", back_populates="admins")
