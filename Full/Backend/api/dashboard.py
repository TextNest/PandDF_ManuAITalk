from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from core.db_config import get_session
from core.query import (
    total_companies, total_users, total_documents, total_questions, recent_company,
    get_total_documents_sql, get_total_faqs_sql, get_total_questions_sql, get_avg_questions_per_session_sql,
    get_recent_activity_sql, get_top_products_sql, get_daily_queries_sql
)
from core.auth import get_current_user
from typing import List, Dict, Any

router = APIRouter()

# --- 슈퍼 관리자용 통계 ---

@router.get("/super-admin/stats")
async def get_super_admin_stats(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    슈퍼 관리자 대시보드 통계
    - 전체 기업 수, 사용자 수, 문서(제품) 수, 질문 수
    - 최근 활동 (기업 등록, 관리자 생성 등)
    """
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    stats = {}
    
    # 1. 카운트 쿼리
    queries = {
        "total_companies": total_companies,
        "total_users": total_users,
        "total_documents": total_documents,
        "total_questions": total_questions
    }

    for key, query in queries.items():
        result = await session.execute(text(query))
        stats[key] = result.scalar()

    # 2. 최근 활동 (간단히 최근 가입한 기업 5개만 예시로)
    # 실제로는 여러 테이블을 Union해서 가져오거나 별도 로그 테이블이 필요할 수 있음
    recent_activity_query = recent_company
    activity_result = await session.execute(text(recent_activity_query))
    # datetime 객체를 문자열로 변환하여 반환
    stats['recent_activity'] = [
        {**dict(row), 'created_at': row.created_at.isoformat() if row.created_at else None} 
        for row in activity_result.mappings().all()
    ]

    return stats


# --- 기업 관리자용 통계 ---

@router.get("/company-admin/stats")
async def get_company_admin_stats(
    days: int = 7,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    기업 관리자 대시보드 통계
    - 문서 수, 질문 수, FAQ 수
    """
    user_role = current_user.get("role")
    company_id = current_user.get("company_id")

    if user_role != "company_admin" or not company_id:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    stats = {}

    # 1. 기본 통계 (문서, 질문, FAQ)
    # 질문 수는 해당 회사의 제품에 달린 세션의 메시지 수
    queries = {
        "total_documents": get_total_documents_sql,
        "total_faqs": get_total_faqs_sql,
        "total_questions": get_total_questions_sql
    }

    for key, query in queries.items():
        result = await session.execute(text(query), {"company_id": company_id})
        stats[key] = result.scalar()

    # 2. 평균 질문 개수 (세션 당 User 메시지 수 평균)
    # 전체 User 메시지 수 / 전체 세션 수
    avg_questions_query = get_avg_questions_per_session_sql
    
    result = await session.execute(text(avg_questions_query), {"company_id": company_id})
    row = result.fetchone()
    total_q = row[0] if row[0] else 0
    total_s = row[1] if row[1] else 0
    
    avg_count = total_q / total_s if total_s > 0 else 0
    stats['avg_questions_per_session'] = round(avg_count, 1)

    # 3. 최근 활동 (최근 질문 5개)
    recent_activity_query = get_recent_activity_sql
    activity_result = await session.execute(text(recent_activity_query), {"company_id": company_id})
    stats['recent_activity'] = [
        {**dict(row), 'created_at': row.created_at.isoformat() if row.created_at else None} 
        for row in activity_result.mappings().all()
    ]

    # 4. 가장 많이 질문한 제품 Top 5
    top_products_query = get_top_products_sql
    top_products_result = await session.execute(text(top_products_query), {"company_id": company_id})
    stats['top_products'] = [dict(row) for row in top_products_result.mappings().all()]

    # 5. 일별 질문 수 (최근 7일)
    daily_queries_query = get_daily_queries_sql
    daily_queries_result = await session.execute(text(daily_queries_query), {"company_id": company_id, "days": days})
    stats['daily_queries'] = [dict(row) for row in daily_queries_result.mappings().all()]

    return stats
