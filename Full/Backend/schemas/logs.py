from pydantic import BaseModel, Field
from typing import Optional, List

class RecentSession_v2(BaseModel):
    sid: int
    status: int
    productId: Optional[str] = None
    message: str
    endedAt: str

class SessionSearchResult_v2(RecentSession_v2):
    sessionId: Optional[str] = None
    category: Optional[str] = None
    satisfaction: float

class SessionListResponse(BaseModel):
    total: int
    items: List[SessionSearchResult_v2]

class FilterInfo_v2(BaseModel):
    category: str | None = None
    productId: str

class ReportData(BaseModel):
    sessionId: str
    productName: Optional[str] = None
    productId: Optional[str] = None
    category: Optional[str] = None
    status: int
    summary: str
    startedAt: str
    endedAt: str
    positive: int
    negative: int
    satisfaction: float

class LogDetail(BaseModel):
    is_auto_generated: bool = False
    created_by: Optional[str] = None