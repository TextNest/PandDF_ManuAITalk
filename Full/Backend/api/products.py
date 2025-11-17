# Full/Backend/api/products.py
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
import shutil
from datetime import datetime

router = APIRouter()

# PDF 파일을 저장할 디렉토리 (예: Full/Backend/uploads/pdfs)
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "pdfs")

@router.post("/upload-pdf")
async def upload_product_pdf(pdf_file: UploadFile = File(...)):
    """
    PDF 파일을 업로드하고 서버에 저장합니다.
    """
    # 1. PDF 파일인지 확인
    if pdf_file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드할 수 있습니다.")

    # 2. 파일 저장 디렉토리 확인 및 생성
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # 3. 안전한 파일명 생성 (타임스탬프 사용)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{pdf_file.filename}"
    file_location = os.path.join(UPLOAD_DIR, safe_filename)
    
    # 4. 파일 저장
    try:
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(pdf_file.file, file_object)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF 파일 저장에 실패했습니다: {e}")

    # 5. 프론트엔드에서 사용할 파일 경로 반환
    # 여기서는 서버 내부 경로가 아닌, 나중에 DB에 저장하거나 식별할 수 있는 상대 경로를 반환합니다.
    relative_path = os.path.join("uploads", "pdfs", safe_filename)

    return JSONResponse(content={
        "message": "PDF 파일이 성공적으로 업로드되었습니다.",
        "file_path": relative_path,
    })

# --- Image Upload Endpoint ---
IMAGE_UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "images")

@router.post("/upload-image")
async def upload_product_image(image_file: UploadFile = File(...)):
    """
    이미지 파일을 업로드하고 서버에 저장합니다.
    """
    # 1. 이미지 파일인지 확인
    allowed_content_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if image_file.content_type not in allowed_content_types:
        raise HTTPException(status_code=400, detail="이미지 파일(JPG, PNG, GIF, WEBP)만 업로드할 수 있습니다.")

    # 2. 파일 저장 디렉토리 확인 및 생성
    os.makedirs(IMAGE_UPLOAD_DIR, exist_ok=True)

    # 3. 안전한 파일명 생성 (타임스탬프 사용)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{image_file.filename}"
    file_location = os.path.join(IMAGE_UPLOAD_DIR, safe_filename)
    
    # 4. 파일 저장
    try:
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(image_file.file, file_object)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이미지 파일 저장에 실패했습니다: {e}")

    # 5. 프론트엔드에서 사용할 파일 경로 반환
    relative_path = os.path.join("uploads", "images", safe_filename)

    return JSONResponse(content={
        "message": "이미지 파일이 성공적으로 업로드되었습니다.",
        "file_path": relative_path,
    })

# --- 3D Model Upload Endpoint ---
MODEL_3D_UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "models_3d")

@router.post("/upload-3d-model")
async def upload_3d_model(model_file: UploadFile = File(...)):
    """
    3D 모델 파일(.glb)을 업로드하고 서버에 저장합니다.
    """
    # 1. 파일 저장 디렉토리 확인 및 생성
    os.makedirs(MODEL_3D_UPLOAD_DIR, exist_ok=True)

    # 2. 안전한 파일명 생성 (타임스탬프 사용)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    # 원본 파일 확장자를 유지하되, .glb를 권장
    base, _ = os.path.splitext(model_file.filename)
    safe_filename = f"{timestamp}_{base}.glb"
    file_location = os.path.join(MODEL_3D_UPLOAD_DIR, safe_filename)
    
    # 3. 파일 저장
    try:
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(model_file.file, file_object)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"3D 모델 파일 저장에 실패했습니다: {e}")

    # 4. 프론트엔드에서 사용할 파일 경로 반환
    relative_path = os.path.join("uploads", "models_3d", safe_filename)

    return JSONResponse(content={
        "message": "3D 모델 파일이 성공적으로 업로드되었습니다.",
        "file_path": relative_path,
    })


# --- Product CRUD Endpoints ---

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import Depends
from typing import List
from core.db_config import get_session
from models.product import Product, AnalysisStatus
from schemas.product import ProductCreate, ProductUpdate, Product as ProductSchema

@router.get("/", response_model=List[ProductSchema])
async def get_completed_products(session: AsyncSession = Depends(get_session)):
    """
    분석이 완료된 모든 제품 목록을 조회합니다. (임시: 모든 제품 조회)
    """
    try:
        result = await session.execute(
            select(Product)
            # .options(selectinload(Product.category))
            # .where(Product.analysis_status == AnalysisStatus.COMPLETED) # 임시로 필터 제거
            .order_by(Product.created_at.desc())
        )
        products = result.scalars().all()
        return products
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"제품 목록을 불러오는 중 오류가 발생했습니다: {e}")

@router.post("/", response_model=ProductSchema)
async def create_product(
    product_data: ProductCreate,
    session: AsyncSession = Depends(get_session)
):
    """
    새로운 제품 정보를 데이터베이스에 저장합니다.
    """
    # Pydantic 모델을 SQLAlchemy 모델 인스턴스로 변환
    new_product = Product(
        product_name=product_data.product_name,
        product_id=product_data.product_id,
        category=product_data.category,
        manufacturer=product_data.manufacturer,
        description=product_data.description,
        release_date=product_data.release_date,
        is_active=product_data.is_active,
        image_url=product_data.image_url,
        pdf_path=product_data.pdf_path,
        model3d_url=product_data.model3d_url, # Add model3d_url
    )
    
    try:
        session.add(new_product)
        await session.commit()
        
        # 방금 생성된 객체를 관계와 함께 다시 조회하여 반환
        result = await session.execute(
            select(Product)
            # .options(selectinload(Product.category))
            .where(Product.internal_id == new_product.internal_id)
        )
        created_product = result.scalars().one()
        
    except Exception as e:
        await session.rollback()
        # 특히 'model' 필드의 unique 제약 조건 위반 시 에러가 발생할 수 있습니다.
        raise HTTPException(status_code=500, detail=f"데이터베이스에 제품을 저장하는 중 오류가 발생했습니다: {e}")

    return created_product

@router.get("/{internal_id}", response_model=ProductSchema)
async def get_product(
    internal_id: int,
    session: AsyncSession = Depends(get_session)
):
    """
    특정 ID의 제품 정보를 조회합니다.
    """
    result = await session.execute(
        select(Product).where(Product.internal_id == internal_id)
    )
    product = result.scalars().one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return product

@router.put("/{internal_id}", response_model=ProductSchema)
async def update_product(
    internal_id: int,
    product_data: ProductUpdate, # Change type here
    session: AsyncSession = Depends(get_session)
):
    """
    기존 제품 정보를 업데이트합니다.
    """
    try:
        # 제품 조회
        result = await session.execute(
            select(Product).where(Product.internal_id == internal_id)
        )
        existing_product = result.scalars().one_or_none()

        if not existing_product:
            raise HTTPException(status_code=404, detail="Product not found")

        # ProductUpdate 스키마의 필드를 순회하며 업데이트
        # exclude_unset=True를 사용하여 요청에 포함되지 않은 필드는 업데이트하지 않음
        update_data = product_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(existing_product, field, value)
        
        await session.commit()
        await session.refresh(existing_product) # 변경사항을 반영한 객체를 다시 로드
        
        return existing_product

    except HTTPException:
        raise # 404 에러는 그대로 다시 발생
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"제품 업데이트 중 오류 발생: {e}")

@router.delete("/{internal_id}", status_code=204)
async def delete_product(
    internal_id: int,
    session: AsyncSession = Depends(get_session)
):
    """
    특정 ID의 제품을 삭제합니다.
    """
    try:
        # 제품 조회
        result = await session.execute(
            select(Product).where(Product.internal_id == internal_id)
        )
        product_to_delete = result.scalars().one_or_none()

        if not product_to_delete:
            raise HTTPException(status_code=404, detail="Product not found")

        await session.delete(product_to_delete)
        await session.commit()
        
        return {"message": "Product deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"제품 삭제 중 오류 발생: {e}")
