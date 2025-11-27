from fastapi import APIRouter,Depends,Query
import asyncio
import time
from core.db_config import get_session,get_session_text
from sqlalchemy.ext.asyncio import AsyncSession
from core.auth import get_current_user
from typing import  Dict,Optional
from sqlalchemy import text 
from datetime import date
import json
from schemas.logs import RecentSession_v2,FilterInfo_v2,SessionListResponse,ReportData,LogDetail
from core.query import LogQuery, LogQuery_v2

router = APIRouter()

'''
대시보드 < 후순위
- KPI 카드
  - [목록] 최근 문의 3개 (보여주는 내용은 '첫번째 메시지', '제품 ID'만. 내부적으론 내용 클릭 시 로그 분석으로 이동할 수 있도록 세션ID 포함하여 하이퍼링크)
  - [목록] FAQ 목록 5개(정렬 기준 : 최근 생성일)
  - 1행 3열 항목 나열
    - 현재 등록된 제품 수 카운트
    - 현재 등록된 문서 수 카운트
    - 최근 1주일 간 문제 해결률 카운트 (resolved/전체 문의)
- [차트] 최근 1주일 간 문의가 가장 많이 진행된 제품 5개
- [차트] 최근 7일간 문의가 진행된 횟수

로그 분석 < 우선순위
- [목록] 최근 문의 3개 (대시보드에 있던 것과 동일)
- [선택 사항][목록] 필터 기능 (기간, 제품ID, 해결여부, 수동 검색창:세션ID 기준 검색)
- [목록] 전체 & 조건부 세션 조회 (해결여부, 제품ID, 세션ID, 첫번째 질문, 종료 시간, 만족도)
- 세션 클릭 시
  - [팝업] 해당 세션 리포트 조회 (DB : test_report 활용)
  - [선택 사항][팝업] 리포트 조회 중 상세 로그 조회 기능 (DB : test_session 활용)
'''

def code_fetch(results):
    code_row = results.mappings().all()
    print(code_row,type(code_row))
    if not code_row:
        return [] 
    json_safe_rows = [dict(row) for row in code_row]
    return json_safe_rows

@router.get("/logs/recent", response_model=list[RecentSession_v2])
async def view_recent(user_info:Dict = Depends(get_current_user), session:AsyncSession = Depends(get_session)):
    results = await session.execute(text(LogQuery_v2.view_recent))
    return code_fetch(results)

@router.get("/logs/session-info", response_model=list[FilterInfo_v2])
async def get_info(user_info:Dict = Depends(get_current_user), session:AsyncSession = Depends(get_session)):
    results = await session.execute(text(LogQuery_v2.product_info))
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

    query_front = LogQuery_v2.view_session_head
    query_end = LogQuery_v2.view_session_tail
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

@router.get("/logs/view/{session_id}", response_model=list[ReportData])
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