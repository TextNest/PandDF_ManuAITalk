# Full/Backend/schemas/product.py
import enum
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# ==================
# Enums
# ==================
class AnalysisStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

# ==================
# Product Schemas
# ==================
class ProductBase(BaseModel):
    product_name: str
    product_id: Optional[str] = None
    category: Optional[str] = None
    manufacturer: Optional[str] = None
    description: Optional[str] = None
    release_date: Optional[datetime] = None
    is_active: Optional[bool] = True
    analysis_status: Optional[AnalysisStatus] = AnalysisStatus.PENDING
    image_url: Optional[str] = None
    pdf_path: Optional[str] = None
    model3d_url: Optional[str] = None
    width_mm: Optional[float] = None
    height_mm: Optional[float] = None
    depth_mm: Optional[float] = None

# Schema for creating a new product (used in POST requests)
class ProductCreate(ProductBase):
    pass

# Schema for updating an existing product (used in PUT/PATCH requests)
class ProductUpdate(BaseModel):
    product_name: Optional[str] = None
    product_id: Optional[str] = None
    category: Optional[str] = None
    manufacturer: Optional[str] = None
    description: Optional[str] = None
    release_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    analysis_status: Optional[AnalysisStatus] = None
    image_url: Optional[str] = None
    pdf_path: Optional[str] = None
    model3d_url: Optional[str] = None
    width_mm: Optional[float] = None
    height_mm: Optional[float] = None
    depth_mm: Optional[float] = None

# Schema for reading/returning a product (used in GET responses)
class Product(ProductBase):
    internal_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

