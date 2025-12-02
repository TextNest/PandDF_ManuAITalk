from fastapi import APIRouter,HTTPException,Depends,Query
from core.db_config import get_session
from sqlalchemy.ext.asyncio import AsyncSession
from core.auth import get_current_user
from typing import  Dict
from sqlalchemy import text 
from datetime import date
from schemas.logs import RecentSession_v2,FilterInfo_v2,SessionListResponse,ReportData,LogDetail
from core.query import LogQuery_v2 as LQ

router = APIRouter()

def code_fetch(results):
    code_row = results.mappings().all()
    print(code_row,type(code_row))
    if not code_row:
        return [] 
    json_safe_rows = [dict(row) for row in code_row]
    return json_safe_rows

@router.get("/logs/recent", response_model=list[RecentSession_v2])
async def view_recent(user_info:Dict = Depends(get_current_user), session:AsyncSession = Depends(get_session)):
    results = await session.execute(text(LQ.view_recent))
    return code_fetch(results)

@router.get("/logs/session-info", response_model=list[FilterInfo_v2])
async def get_info(user_info:Dict = Depends(get_current_user), session:AsyncSession = Depends(get_session)):
    results = await session.execute(text(LQ.product_info))
    return code_fetch(results)

@router.get("/logs/session-list", response_model=SessionListResponse)
async def view_session(
    user_info:Dict = Depends(get_current_user),
    session:AsyncSession = Depends(get_session),
    session_id:str | None = Query(None, alias="sessionId"),
    category:str | None = Query(None),
    product_id:str | None = Query(None, alias="productId"),
    status:int | None = Query(None),
    from_date:date | None = Query(None, alias="from"),
    to_date:date | None = Query(None, alias="to"),
    limit:int | None = Query(50, ge=1, le=200),
    offset:int | None = Query(0, ge=0)):

    query_front = LQ.view_session_head
    query_end = LQ.view_session_tail
    conditions = []
    params={
        "limit":limit,
        "offset":offset
    }

    if session_id:
        conditions.append("RP.session_id LIKE :session_id")
        params["session_id"] = f"%{session_id}%"
    if category:
        conditions.append("RP.category = :category")
        params["category"] = category
    if product_id:
        conditions.append("RP.product_id = :product_id")
        params["product_id"] = product_id
    if status is not None:
        conditions.append("RP.is_resolved = :status")
        params["status"] = status
    if from_date:
        conditions.append("DATE(RP.completed_at) >= :from_date")
        params["from_date"] = from_date
    if to_date:
        conditions.append("DATE(RP.completed_at) <= :to_date")
        params["to_date"] = to_date

    count_query = "SELECT COUNT(*) FROM tb_report AS RP"
    if conditions:
        count_query += " WHERE " + " AND ".join(conditions)

    count_result = await session.execute(text(count_query), params)
    total = count_result.scalar_one()

    data_query = query_front
    if conditions:
        data_query += " WHERE " + " AND ".join(conditions)
    data_query += query_end
    data_params = {
        **params,
        "limit": limit,
        "offset": offset,
    }

    rows = await session.execute(text(data_query), data_params)
    items = code_fetch(rows)
    return {"total": total, "items": items}

@router.get("/logs/view/{sid}", response_model=ReportData)
async def get_report(sid:int, user_info:Dict = Depends(get_current_user), session:AsyncSession = Depends(get_session)):
    results = await session.execute(text(LQ.view_report), {"sid":sid})
    items = code_fetch(results)
    if not items:
        raise HTTPException(status_code=404,detail="해당 세션의 리포트가 존재하지 않습니다.")
    return items[0]

@router.get("/logs/view-detail/{session_id}", response_model=list[LogDetail])
async def get_info(user_info: Dict = Depends(get_current_user),session:AsyncSession=Depends(get_session)):
    recent_session ="""
SELECT DISTINCT product_id FROM test_products;
"""
    user_id = user_info.get("email")

    results = await session.execute(text(recent_session),
    params={
        "email":user_id
    })
    return code_fetch(results)