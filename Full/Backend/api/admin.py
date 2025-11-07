from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text 
from typing import Dict, Any, List
from core.db_config import get_session

router = APIRouter()

# @router.get("/dashboard")