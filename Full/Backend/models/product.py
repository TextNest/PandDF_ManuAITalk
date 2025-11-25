from sqlalchemy import Column, Integer, String, Text, Date, Float, Boolean, TIMESTAMP, ForeignKey, Enum, func
from sqlalchemy.orm import relationship
from .base import Base
import enum

# DB의 enum 값에 맞춰 소문자로 정의
class Status(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"

class Product(Base):
    __tablename__ = "tb_product"

    product_internal_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    product_name = Column(String(50), nullable=True, comment="제품명")
    product_id = Column(String(50), nullable=False, unique=True, comment="모델명")
    
    category = Column(String(50), nullable=True, comment="카테고리명")
    company_internal_id = Column(Integer, ForeignKey("tb_company.company_internal_id"), nullable=False, comment="회사 내부 ID")
    
    description = Column(Text, nullable=True, comment="제품 설명") 
    release_date = Column(Date, nullable=True, comment="출시일") # DateTime -> Date 타입으로 변경 가능, 일단 DateTime 유지
    qr_code = Column(String(255), nullable=True, comment="QR 코드 URL") # 추가
    is_active = Column(Boolean, nullable=False, default=True, comment="활성 상태 (True: 활성, False: 비활성)") # tinyint -> Boolean
    
    # 🔴 기존: status = Column(Enum(Status), nullable=False, default=Status.PENDING, ...)
    # 🟢 변경: 그냥 문자열 컬럼으로 다룸 (DB쪽은 계속 enum('pending','completed','failed') 유지)
    status = Column(
        String(20),
        nullable=False,
        default=Status.PENDING.value,
        comment="분석 상태(pending/completed/failed)",
    )

    image_url = Column(String(255), nullable=True, comment="제품 이미지 파일 경로")
    pdf_path = Column(String(255), nullable=True, comment="제품 설명서 PDF 파일 경로")
    model3d_url = Column(String(255), nullable=True, comment="3D 모델 파일 경로")

    width_mm = Column(Float, nullable=True, comment="제품 가로 길이 (mm)")
    height_mm = Column(Float, nullable=True, comment="제품 세로 길이 (mm)")
    depth_mm = Column(Float, nullable=True, comment="제품 깊이 길이 (mm)")

    created_by = Column(Integer, nullable=True, comment="생성한 관리자 ID") # 추가
    created_at = Column(TIMESTAMP, server_default=func.now(), comment="생성일")
    updated_by = Column(Integer, nullable=True, comment="수정한 관리자 ID") # 추가
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), comment="수정일")

    company = relationship("Company", back_populates="products") # Company 모델과의 관계 설정

    def __repr__(self):
        return f"<Product(id={self.product_internal_id}, name='{self.product_name}', model='{self.product_id}')>"