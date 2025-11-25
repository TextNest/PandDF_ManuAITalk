# models/company.py
from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, func
from sqlalchemy.orm import relationship
from .base import Base # base.py에서 Base를 임포트합니다.

class Company(Base):
    __tablename__ = "tb_company"

    company_internal_id = Column(Integer, primary_key=True, autoincrement=True, comment='고유 식별자')
    name = Column(String(50), nullable=False, index=True, comment='기업명')
    code = Column(String(50), nullable=False, index=True, comment='가입 코드')
    contact = Column(String(50), nullable=True, comment='연락처')
    is_active = Column(Boolean, nullable=False, default=True, index=True, comment='활성 상태')
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), index=True, comment='생성 일시')
    updated_at = Column(TIMESTAMP, nullable=True, server_default=func.now(), onupdate=func.now(), comment='변경 일시')

    # 관계 설정
    # relationship에는 다시 문자열을 사용합니다.
    admins = relationship("Admin", back_populates="company")
    products = relationship("Product", back_populates="company") # products 관계 추가
