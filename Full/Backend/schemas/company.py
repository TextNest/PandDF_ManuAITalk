from typing import Optional
from pydantic import BaseModel
import datetime

class CompanyBase(BaseModel):
    name: str
    code: str
    contact: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class Company(CompanyBase):
    company_internal_id: int
    is_active: int
    created_at: datetime.datetime
    updated_at: datetime.datetime
    admin_count: int

    class Config:
        from_attributes = True