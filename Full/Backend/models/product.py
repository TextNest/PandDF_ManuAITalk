# Full/Backend/models/product.py
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from models.base import Base
import enum

class AnalysisStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class Product(Base):
    __tablename__ = "test_products"

    internal_id = Column(Integer, primary_key=True, index=True)
    product_name = Column(String(255), nullable=False, comment="제품명")
    product_id = Column(String(255), nullable=True, unique=True, comment="모델명")
    
    # category_id = Column(Integer, ForeignKey("test_categories.id"), nullable=False, comment="카테고리 ID")
    # _category = Column('category', String(100), ForeignKey("test_categories.name"), nullable=False, comment="카테고리명")
    category = Column(String(100), nullable=True, comment="카테고리명")
    
    manufacturer = Column(String(255), comment="제조사")
    description = Column(Text, comment="제품 설명")
    release_date = Column(DateTime, comment="출시일")
    is_active = Column(Boolean, nullable=False, default=True, comment="활성 상태 (True: 활성, False: 비활성)")
    analysis_status = Column(Enum(AnalysisStatus), nullable=False, default=AnalysisStatus.PENDING, comment="분석 상태")

    
    # 파일 경로는 문자열로 저장
    image_url = Column(String(1024), comment="제품 이미지 파일 경로")
    pdf_path = Column(String(1024), comment="제품 설명서 PDF 파일 경로")
    model3d_url = Column(String(1024), comment="3D 모델 파일 경로")

    width_mm = Column(Float, nullable=True, comment="제품 가로 길이 (mm)")
    height_mm = Column(Float, nullable=True, comment="제품 세로 길이 (mm)")
    depth_mm = Column(Float, nullable=True, comment="제품 깊이 길이 (mm)")

    created_at = Column(DateTime, server_default=func.now(), comment="생성일")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), comment="수정일")

    # Category 모델과의 관계 설정 (Product 입장에서)
    # category = relationship("Category", foreign_keys=[_category], back_populates="products")

    def __repr__(self):
        return f"<Product(id={self.internal_id}, name='{self.product_name}', model='{self.product_id}')>"
