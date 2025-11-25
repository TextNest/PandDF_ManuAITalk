from pydantic import BaseModel, Field
from typing import Optional, List

class RecentSession(BaseModel):
    sessionId: str
    status: str
    productId: str | None = None
    satisfaction: float | None = None
    message: str

class SessionSearchResult(RecentSession):
    endedAt: str

class SessionListResponse(BaseModel):
    total: int
    items: List[SessionSearchResult]

class FilterInfo(BaseModel):
    productId: str

class ReportData(BaseModel):
    is_auto_generated: bool = False
    created_by: Optional[str] = None

class LogDetail(BaseModel):
    is_auto_generated: bool = False
    created_by: Optional[str] = None