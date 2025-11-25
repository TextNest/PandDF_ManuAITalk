# Full/Backend/schemas/product.py
import enum
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date

# ==================
# Enums
# ==================
class Status(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"

# ==================
# Product Schemas
# ==================
class ProductBase(BaseModel):
    product_id: str
    product_name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    release_date: Optional[date] = None
    is_active: Optional[bool] = True
    status: Optional[Status] = Status.PENDING
    image_url: Optional[str] = None
    model3d_url: Optional[str] = None
    width_mm: Optional[float] = None
    height_mm: Optional[float] = None
    depth_mm: Optional[float] = None
    qr_code: Optional[str] = None # 추가
    created_by: Optional[int] = None # 추가
    updated_by: Optional[int] = None # 추가

# Schema for creating a new product (used in POST requests)
class ProductCreate(ProductBase):
    pdf_path: str

# Schema for updating an existing product (used in PUT/PATCH requests)
class ProductUpdate(BaseModel):
    product_name: Optional[str] = None
    product_id: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    release_date: Optional[date] = None
    is_active: Optional[bool] = None
    status: Optional[Status] = None
    image_url: Optional[str] = None
    pdf_path: Optional[str] = None
    model3d_url: Optional[str] = None
    width_mm: Optional[float] = None
    height_mm: Optional[float] = None
    depth_mm: Optional[float] = None
    updated_by: Optional[int] = None

# Schema for reading/returning a product (used in GET responses)
class Product(ProductBase):
    product_internal_id: int
    company_internal_id: int
    company_name: Optional[str] = None # 회사명 필드 추가
    created_at: datetime
    updated_at: datetime
    pdf_path: Optional[str] = None

    class Config:
        from_attributes = True

