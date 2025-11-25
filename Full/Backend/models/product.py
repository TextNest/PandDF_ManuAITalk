from sqlalchemy import Column, Integer, String, Text, Date, Float, Boolean, TIMESTAMP, ForeignKey, Enum, func
from .base import Base
import enum

class AnalysisStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"

class Product(Base):
    __tablename__ = "tb_product"
    
    product_internal_id = Column(Integer, primary_key=True, autoincrement=True, comment='고유 식별자')
    product_name = Column(String(50), nullable=True, index=True, comment='제품명')
    product_id = Column(String(50), nullable=False, index=True, comment='모델명')
    category = Column(String(50), nullable=True, index=True, comment='카테고리')
    company_internal_id = Column(Integer, ForeignKey("tb_company.company_internal_id", ondelete="SET NULL"), nullable=True, index=True, comment='기업 고유 식별자')
    
    description = Column(Text, nullable=True, comment='제품 설명')
    release_date = Column(Date, nullable=True, comment='발매일')
    qr_code = Column(String(255), unique=True, nullable=True, comment='챗봇 QR 코드')
    
    is_active = Column(Boolean, nullable=False, default=True, index=True, comment='활성 상태')
    status = Column(Enum(AnalysisStatus), nullable=False, default=AnalysisStatus.pending, index=True, comment='분석 상태')
    
    image_url = Column(String(255), nullable=True, comment='제품 이미지 파일 경로')
    pdf_path = Column(String(255), nullable=True, comment='제품 PDF 파일 경로')
    model3d_url = Column(String(255), nullable=True, comment='3D 모델 파일 경로')
    
    width_mm = Column(Float, nullable=True, comment='가로 길이(mm)')
    depth_mm = Column(Float, nullable=True, comment='세로 길이(mm)')
    height_mm = Column(Float, nullable=True, comment='높이 길이(mm)')
    
    created_by = Column(Integer, ForeignKey("tb_admin.admin_internal_id", ondelete="SET NULL"), nullable=True, comment='생성자')
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), index=True, comment='생성 일시')
    updated_by = Column(Integer, ForeignKey("tb_admin.admin_internal_id", ondelete="SET NULL"), nullable=True, comment='변경자')
    updated_at = Column(TIMESTAMP, nullable=True, server_default=func.now(), onupdate=func.now(), comment='변경 일시')
