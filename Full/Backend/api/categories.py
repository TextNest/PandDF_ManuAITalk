# Full/Backend/api/categories.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from core.db_config import get_session
from models.category import Category
from schemas.product import Category as CategorySchema

router = APIRouter()

@router.get("/categories", response_model=List[CategorySchema])
async def get_all_categories(session: AsyncSession = Depends(get_session)):
    """
    모든 카테고리 목록을 조회합니다.
    """
    print("--- GET /api/categories endpoint hit ---")
    try:
        result = await session.execute(select(Category).order_by(Category.name))
        categories = result.scalars().all()
        return categories
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"카테고리를 불러오는 중 오류가 발생했습니다: {e}")
