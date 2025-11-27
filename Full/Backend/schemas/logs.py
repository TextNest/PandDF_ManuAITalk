from pydantic import BaseModel, Field
from typing import Optional, List

class RecentSession_v2(BaseModel):
    sid: int
    status: int
    productId: Optional[str] = None
    message: str
    endedAt: str

class RecentSession(BaseModel):
    sessionId: str
    status: str
    productId: str | None = None
    satisfaction: float | None = None
    message: str

class SessionSearchResult_v2(RecentSession_v2):
    sessionId: Optional[str] = None
    category: Optional[str] = None
    satisfaction: float

class SessionSearchResult(RecentSession):
    endedAt: str

class SessionListResponse(BaseModel):
    total: int
    items: List[SessionSearchResult_v2]

class FilterInfo_v2(BaseModel):
    category: str | None = None
    productId: str

class FilterInfo(BaseModel):
    productId: str

class ReportData(BaseModel):
    is_auto_generated: bool = False
    created_by: Optional[str] = None

class LogDetail(BaseModel):
    is_auto_generated: bool = False
    created_by: Optional[str] = None