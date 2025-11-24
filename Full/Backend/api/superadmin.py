from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, update, delete # delete 추가
from core.db_config import get_session
from models.company import Company
from models.admin import Admin as AdminModel # AdminModel 임포트
from schemas.company import CompanyCreate, Company as CompanySchema
from schemas.admin import Admin as AdminSchema
from typing import List
import datetime
from core.query import (
    GET_ADMINS_BY_COMPANY_ID_SQL, 
    GET_COMPANY_BY_ID_SQL, 
    GET_COMPANIES_WITH_ADMIN_COUNT_SQL,
    UPDATE_ADMIN_STATUS_SQL,
    DELETE_ADMIN_BY_ID_SQL,
    UPDATE_ADMIN_DETAILS_SQL # 쿼리 임포트
)
from pydantic import BaseModel
from typing import Optional

class StatusUpdate(BaseModel):
    is_active: int

class AdminUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None


router = APIRouter()

@router.get("/companies", response_model=List[CompanySchema])
async def get_all_companies(
    db: AsyncSession = Depends(get_session),
    skip: int = 0,
    limit: int = 100
):
    """
    모든 기업 목록을 페이지네이션으로 가져옵니다.
    """
    async with db.begin():
        result = await db.execute(
            text(GET_COMPANIES_WITH_ADMIN_COUNT_SQL),
            {"limit": limit, "skip": skip}
        )
        companies = result.mappings().all()
        return companies

@router.get("/companies/{company_id}", response_model=CompanySchema)
async def get_company(
    company_id: int,
    db: AsyncSession = Depends(get_session)
):
    """
    ID로 특정 기업의 정보를 가져옵니다. (순수 SQL 사용)
    """
    async with db.begin():
        result = await db.execute(
            text(GET_COMPANY_BY_ID_SQL),
            {"company_id": company_id}
        )
        db_company = result.mappings().first()
        if not db_company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )
        return db_company

@router.get("/companies/{company_id}/admins", response_model=List[AdminSchema])
async def get_company_admins(
    company_id: int,
    db: AsyncSession = Depends(get_session)
):
    """
    특정 기업에 소속된 관리자 목록을 데이터베이스에서 조회합니다.
    """
    async with db.begin():
        result = await db.execute(
            text(GET_ADMINS_BY_COMPANY_ID_SQL),
            {"company_id": company_id}
        )
        admins = result.mappings().all()
        return admins

@router.put("/admins/{admin_id}/status", status_code=status.HTTP_204_NO_CONTENT)
async def update_admin_status(
    admin_id: int,
    status_update: StatusUpdate,
    db: AsyncSession = Depends(get_session)
):
    """
    특정 관리자의 활성/비활성 상태를 변경합니다. (순수 SQL 사용)
    """
    async with db.begin():
        # 1. 관리자가 존재하는지 확인
        result = await db.execute(select(AdminModel).filter(AdminModel.admin_internal_id == admin_id))
        if not result.scalars().first():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")

        # 2. 상태 업데이트 실행
        await db.execute(
            text(UPDATE_ADMIN_STATUS_SQL),
            {"admin_id": admin_id, "is_active": status_update.is_active}
        )
        await db.commit()
        
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.post("/companies", response_model=CompanySchema, status_code=status.HTTP_201_CREATED)
async def create_company(
    company: CompanyCreate,
    db: AsyncSession = Depends(get_session)
):
    async with db.begin():
        # Check for existing code
        result = await db.execute(select(Company).filter(Company.code == company.code))
        if result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Company with this code already exists"
            )

        # Create new company
        db_company = Company(
            name=company.name,
            code=company.code,
            contact=company.contact
        )
        db.add(db_company)
        await db.flush() # flush to get the new ID
        new_company_id = db_company.company_internal_id
        
        # Re-fetch the newly created company to get all fields including admin_count
        result = await db.execute(
            text(GET_COMPANY_BY_ID_SQL),
            {"company_id": new_company_id}
        )
        created_company_data = result.mappings().first()
        
        await db.commit() # Commit the transaction

        return created_company_data

@router.put("/companies/{company_id}/status", status_code=status.HTTP_204_NO_CONTENT)
async def update_company_status(
    company_id: int,
    status_update: StatusUpdate,
    db: AsyncSession = Depends(get_session)
):
    """
    특정 기업의 활성/비활성 상태를 변경합니다.
    """
    async with db.begin():
        result = await db.execute(
            select(Company).filter(Company.company_internal_id == company_id)
        )
        db_company = result.scalars().first()

        if not db_company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )

        db_company.is_active = status_update.is_active
        await db.commit()
        
        return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.delete("/companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(
    company_id: int,
    db: AsyncSession = Depends(get_session)
):
    async with db.begin():
        result = await db.execute(
            select(Company).filter(Company.company_internal_id == company_id)
        )
        db_company = result.scalars().first()

        if not db_company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )

        await db.delete(db_company)
        await db.commit()

        return None # No content

# --- 새로운 일괄 처리 엔드포인트 ---
class BulkAction(BaseModel):
    admin_ids: List[int]
    
class BulkStatusUpdate(BulkAction):
    is_active: int

@router.put("/admins/status", status_code=status.HTTP_204_NO_CONTENT)
async def bulk_update_admin_status(
    payload: BulkStatusUpdate,
    db: AsyncSession = Depends(get_session)
):
    """
    여러 관리자의 상태를 한 번에 변경합니다.
    """
    if not payload.admin_ids:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
        
    async with db.begin():
        stmt = (
            update(AdminModel)
            .where(AdminModel.admin_internal_id.in_(payload.admin_ids))
            .values(is_active=payload.is_active)
        )
        await db.execute(stmt)
        await db.commit()
        
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.delete("/admins", status_code=status.HTTP_204_NO_CONTENT)
async def bulk_delete_admins(
    payload: BulkAction,
    db: AsyncSession = Depends(get_session)
):
    """
    여러 관리자를 한 번에 삭제합니다.
    """
    if not payload.admin_ids:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    async with db.begin():
        stmt = (
            delete(AdminModel)
            .where(AdminModel.admin_internal_id.in_(payload.admin_ids))
        )
        await db.execute(stmt)
        await db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)