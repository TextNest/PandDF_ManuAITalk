from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from typing import List, Optional
from core.db_config import get_session
from module.faq import FAQ
from schemas.faq import FAQCreate, FAQUpdate, FAQResponse

router = APIRouter(prefix="/api/faqs", tags=["FAQ"])

# PDF에서 FAQ 생성
@router.post("/", response_model=FAQResponse, status_code=201)
async def create_faq(
    faq_data: FAQCreate, 
    session: AsyncSession = Depends(get_session)
):
    """
    PDF 파싱 또는 수동 생성 시 사용
     faq_id는 22자 Short UUID 생성
    """
    new_faq = FAQ(**faq_data.model_dump())
    session.add(new_faq)
    await session.commit()
    await session.refresh(new_faq)
    return new_faq

# 챗봇 분석으로 자동 생성된 FAQ 추가
@router.post("/from-chatbot", response_model=FAQResponse, status_code=201)
async def create_faq_from_chatbot(
    question: str,
    answer: str,
    category: Optional[str] = None,
    session: AsyncSession = Depends(get_session)
):
    """
    챗봇 메시지 분석 후 자동 생성
    source='chatbot', is_auto_generated=True로 설정
    """
    new_faq = FAQ(
        question=question,
        answer=answer,
        category=category,
        source='chatbot',
        is_auto_generated=True,
        status='draft',
        created_by='AI'
    )
    session.add(new_faq)
    await session.commit()
    await session.refresh(new_faq)
    return new_faq

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
    query = select(FAQ)
    
    if status:
        query = query.where(FAQ.status == status)
    if category:
        query = query.where(FAQ.category == category)
    
    query = query.offset(skip).limit(limit)
    result = await session.execute(query)
    faqs = result.scalars().all()
    return faqs

# faq_id로 단일 FAQ 조회
@router.get("/{faq_id}", response_model=FAQResponse)
async def get_faq(
    faq_id: str,  # 22자 Short UUID
    session: AsyncSession = Depends(get_session)
):
    """
    URL 예시: GET /api/faqs/VQ6EAOKbQdSnFkRmVUQAAA
    """
    query = select(FAQ).where(FAQ.faq_id == faq_id)
    result = await session.execute(query)
    faq = result.scalar_one_or_none()
    
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    
    # 조회수 증가
    faq.view_count += 1
    await session.commit()
    await session.refresh(faq)
    
    return faq

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
    query = select(FAQ).where(FAQ.faq_id == faq_id)
    result = await session.execute(query)
    faq = result.scalar_one_or_none()
    
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    
    # 수정할 필드만 업데이트
    for key, value in faq_update.model_dump(exclude_unset=True).items():
        setattr(faq, key, value)
    
    await session.commit()
    await session.refresh(faq)
    return faq

# FAQ 삭제
@router.delete("/{faq_id}", status_code=204)
async def delete_faq(
    faq_id: str, 
    session: AsyncSession = Depends(get_session)
):
    """
    faq_id로 FAQ 삭제
    """
    query = select(FAQ).where(FAQ.faq_id == faq_id)
    result = await session.execute(query)
    faq = result.scalar_one_or_none()
    
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    
    await session.delete(faq)
    await session.commit()

# 도움이 됨 카운트 증가
@router.post("/{faq_id}/helpful", response_model=FAQResponse)
async def mark_helpful(
    faq_id: str,
    session: AsyncSession = Depends(get_session)
):
    """
    FAQ 도움이 됨 카운트 증가
    """
    query = select(FAQ).where(FAQ.faq_id == faq_id)
    result = await session.execute(query)
    faq = result.scalar_one_or_none()
    
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    
    faq.helpful_count += 1
    await session.commit()
    await session.refresh(faq)
    return faq