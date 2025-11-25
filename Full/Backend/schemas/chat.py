from typing import Dict, Any, List,Literal
from pydantic import BaseModel, Field

class FeedBack(BaseModel):
    message_id:str|int
    feedback: str | None = Field(default=None) 