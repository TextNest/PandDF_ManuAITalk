# schemas/admin.py
from pydantic import BaseModel, EmailStr
import datetime
from typing import Optional

class AdminBase(BaseModel):
    email: EmailStr
    name: str
    department: Optional[str] = None
    job_title: Optional[str] = None
    is_super: bool = False
    is_active: bool = True

class AdminCreate(AdminBase):
    password: str
    company_internal_id: int

class Admin(AdminBase):
    admin_internal_id: int
    company_internal_id: int
    created_at: datetime.datetime
    updated_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True