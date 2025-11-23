from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Optional
from core.db_config import get_session
from core.query import (
    find_faq, 
    find_faq_by_id, 
    create_faq as create, 
    update_faq as update, 
    delete_faq as delete
)
from models.faq import generate_short_id
from module.faq_generator import FAQGenerator
from schemas.faq import FAQCreate, FAQUpdate, FAQResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/faqs", tags=["FAQ"])

# FAQ 생성 (PDF/수동)
@router.post("/", response_model=FAQResponse, status_code=201)
async def create_faq(
    faq_data: FAQCreate, 
    session: AsyncSession = Depends(get_session)
):
    """
    FAQ 수동 생성 시 사용
    faq_id는 22자 Short UUID 생성
    """
    faq_id = generate_short_id()

    query = text(create)
    params = {
        'faq_id': faq_id,
        'question': faq_data.question,
        'answer': faq_data.answer,
        'category': faq_data.category,
        'tags': faq_data.tags,
        'product_id': faq_data.product_id,
        'product_name': faq_data.product_name,
        'status': faq_data.status,
        'is_auto_generated': faq_data.is_auto_generated,
        'source': faq_data.source,
        'view_count': 0,
        'helpful_count': 0,
        'created_by': faq_data.created_by
    }
    

    await session.execute(query, params)
    await session.commit()

    # 생성된 FAQ 조회
    result = await session.execute(
        text(find_faq_by_id),
        {'faq_id':faq_id}
    )
    row = result.mappings().one()
    return dict(row)

# 챗봇 분석으로 자동 생성된 FAQ 추가
@router.post("/auto_generate")
async def generate_faqs_by_products(
    days_range: int = 7,
    min_cluster_size: int = 2,
    min_qa_pair_count: int = 3,
    similarity_threshold: float = 0.8,
    session: AsyncSession = Depends(get_session)
):
    """
    제품별 FAQ 자동 생성 (로깅 포함)
    
    - 생성 이력을 faq_generation_log에 자동 저장
    - 생성_id 반환으로 진행 상황 추적 가능
    - 실제 생성 결과를 즉시 반환
    """
    try:
        result = await FAQGenerator.generate_faqs_for_products(
            session,
            days_range=days_range,
            min_cluster_size=min_cluster_size,
            min_qa_pair_count=min_qa_pair_count,
            similarity_threshold=similarity_threshold
        )
        logger.info(f"FAQ 생성 완료: {result}")
        return result
    except Exception as e:
        logger.error(f"FAQ 생성 중 에러 발생: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "message": f"FAQ 생성 중 오류가 발생했습니다: {str(e)}"
        }


# FAQ 목록 조회
@router.get("/", response_model=List[FAQResponse])
async def get_faqs(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    category: Optional[str] = None,
    session: AsyncSession = Depends(get_session)
):
    """
    FAQ 목록 조회 (필터링 가능)
    """
    query_str = find_faq.strip().rstrip(';')

    conditions = []
    params = {}
    
    if status:
        conditions.append("status = :status")
        params['status'] = status
    if category:
        conditions.append("category = :category")
        params['category'] = category

    if conditions:
        query_str += " AND " + " AND ".join(conditions)

    query_str += " ORDER BY created_at DESC LIMIT :limit OFFSET :skip"
    params['limit'] = limit
    params['skip'] = skip
    
    result = await session.execute(text(query_str), params)
    rows = result.mappings().all()
    return [dict(row) for row in rows]

# faq_id로 단일 FAQ 조회
@router.get("/{faq_id}", response_model=FAQResponse)
async def get_faq(
    faq_id: str,  # 22자 Short UUID
    session: AsyncSession = Depends(get_session)
):
    """
    URL 예시: GET /api/faqs/VQ6EAOKbQdSnFkRmVUQAAA
    """
    result = await session.execute(
        text(find_faq_by_id),
        {'faq_id': faq_id}
    )
    row = result.mappings().one_or_none()
    
    if not row:
        raise HTTPException(status_code=404, detail="FAQ not found")
    
    # 업데이트된 FAQ 다시 조회
    result = await session.execute(
        text(find_faq_by_id),
        {'faq_id': faq_id}
    )
    row = result.mappings().one()
    return dict(row)

# FAQ 수정
@router.patch("/{faq_id}", response_model=FAQResponse)
async def update_faq(
    faq_id: str,
    faq_update: FAQUpdate,
    session: AsyncSession = Depends(get_session)
):
    """
    faq_id로 FAQ 수정
    """
    # 기존 FAQ 확인
    result = await session.execute(
        text(find_faq_by_id),
        {'faq_id': faq_id}
    )
    existing = result.mappings().one_or_none()
    
    if not existing:
        raise HTTPException(status_code=404, detail="FAQ not found")
    
    # 수정할 필드만 업데이트
    update_data = faq_update.model_dump(exclude_unset=True)
    update_data['faq_id'] = faq_id
    
    # None 값은 제외 (COALESCE를 사용하므로 None이면 기존 값 유지)
    params = {k: v for k, v in update_data.items() if v is not None}
    
    await session.execute(text(update), params)
    await session.commit()
    
    # 업데이트된 FAQ 조회
    result = await session.execute(
        text(find_faq_by_id),
        {'faq_id': faq_id}
    )
    row = result.mappings().one()
    return dict(row)

# FAQ 삭제
@router.delete("/{faq_id}", status_code=204)
async def delete_faq(
    faq_id: str, 
    session: AsyncSession = Depends(get_session)
):
    """
    faq_id로 FAQ 삭제
    """
    # 기존 FAQ 확인
    result = await session.execute(
        text(find_faq_by_id),
        {'faq_id': faq_id}
    )
    existing = result.mappings().one_or_none()
    
    if not existing:
        raise HTTPException(status_code=404, detail="FAQ not found")
    
    await session.execute(text(delete), {'faq_id': faq_id})
    await session.commit()