# Full/Backend/api/products.py
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
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
    relative_path = os.path.join("uploads", "pdfs", safe_filename).replace('\\', '/')

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
    relative_path = os.path.join("uploads", "images", safe_filename).replace('\\', '/')

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
    relative_path = os.path.join("uploads", "models_3d", safe_filename).replace('\\', '/')

    return JSONResponse(content={
        "message": "3D 모델 파일이 성공적으로 업로드되었습니다.",
        "file_path": relative_path,
    })


# --- Product CRUD Endpoints ---

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, update, select
from fastapi import Depends
from typing import List
from core.db_config import get_session
from models.product import Product, AnalysisStatus
from schemas.product import ProductCreate, ProductUpdate, Product as ProductSchema
from module.document_pr import trigger_pdf_processing
from core.query import find_product_id, find_all_product
@router.get("/", response_model=List[ProductSchema])
async def get_completed_products(session: AsyncSession = Depends(get_session)):
    """
    분석이 완료된 모든 제품 목록을 조회합니다. (임시: 모든 제품 조회)
    """
    try:
        result = await session.execute(
            text(find_all_product)
            # .options(selectinload(Product.category))
            # .where(Product.analysis_status == AnalysisStatus.COMPLETED) # 임시로 필터 제거
        )
        products = result.mappings().all()
        return products
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"제품 목록을 불러오는 중 오류가 발생했습니다: {e}")

@router.post("/", response_model=ProductSchema)
async def create_product(
    product_data: ProductCreate,
    session: AsyncSession = Depends(get_session),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    새로운 제품 정보를 데이터베이스에 저장하고, PDF 분석을 백그라운드 작업으로 트리거합니다.
    PDF 파일의 이름은 제품 코드를 따라 변경됩니다.
    """
    # product_id가 제공되었는지 확인
    if not product_data.product_id:
        raise HTTPException(status_code=400, detail="Product ID는 필수입니다.")

    # product_name이 빈 문자열인 경우 None으로 변환
    if product_data.product_name == '':
        product_data.product_name = None

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
        pdf_path=product_data.pdf_path, # 임시 경로
        model3d_url=product_data.model3d_url,
        analysis_status=AnalysisStatus.PENDING
    )
    
    try:
        session.add(new_product)
        await session.commit()
        await session.refresh(new_product)

        # --- PDF 파일명 변경 및 DB 업데이트 ---
        new_pdf_path = new_product.pdf_path
        if product_data.pdf_path and product_data.product_id:
            try:
                # 1. 경로 설정
                base_dir = os.path.dirname(__file__)
                old_relative_path = product_data.pdf_path
                old_full_path = os.path.join(base_dir, "..", old_relative_path)
                
                # 2. 새 파일명 생성
                _, file_extension = os.path.splitext(old_relative_path)
                new_filename = f"{product_data.product_id}{file_extension}"
                new_relative_path = os.path.join("uploads", "pdfs", new_filename).replace('\\', '/')
                new_full_path = os.path.join(base_dir, "..", new_relative_path)

                # 3. 파일명 변경
                os.rename(old_full_path, new_full_path)

                # 4. DB 업데이트
                new_product.pdf_path = new_relative_path
                new_pdf_path = new_relative_path # 백그라운드 작업에 전달할 경로 업데이트
                await session.commit()
                await session.refresh(new_product)

            except FileNotFoundError:
                # 파일이 없는 경우 롤백하고 에러 발생
                await session.rollback()
                raise HTTPException(status_code=404, detail=f"PDF 파일을 찾을 수 없습니다: {old_relative_path}")
            except Exception as e:
                # 기타 파일 처리 오류
                await session.rollback()
                raise HTTPException(status_code=500, detail=f"PDF 파일명 변경 중 오류 발생: {e}")

        # PDF 분석을 백그라운드 작업으로 추가
        if new_pdf_path:
            background_tasks.add_task(
                trigger_pdf_processing, 
                product_id=new_product.internal_id, 
                pdf_path=new_pdf_path # 변경된 경로를 전달
            )
        
        return new_product
        
    except Exception as e:
        await session.rollback()
        # unique 제약 조건 위반 등 DB 오류 처리
        raise HTTPException(status_code=500, detail=f"데이터베이스에 제품을 저장하는 중 오류가 발생했습니다: {e}")

@router.get("/{product_id}", response_model=ProductSchema)
async def get_product(
    product_id: str,
    session: AsyncSession = Depends(get_session)
):
    """
    특정 제품코드의 제품 정보를 조회합니다.
    """
    result = await session.execute(
        # select(Product).where(Product.product_id == product_id)
        text(find_product_id).bindparams(product_id = product_id)
    )
    product = result.mappings().one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return product

@router.put("/{product_id}", response_model=ProductSchema)
async def update_product(
    product_id: str, # 제품 코드를 식별자로 사용
    product_data: ProductUpdate,
    session: AsyncSession = Depends(get_session),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    기존 제품 정보를 업데이트합니다. PDF가 변경되면 분석을 다시 트리거하고 파일명을 제품 코드로 변경합니다.
    """
    try:
        # 1. 제품 조회 (text와 mappings 방식 유지)
        find_stmt = text(find_product_id).bindparams(product_id=product_id)
        result = await session.execute(find_stmt)
        existing_product_row = result.mappings().one_or_none()

        if not existing_product_row:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # RowMapping을 일반 딕셔너리로 변환
        existing_product_dict = dict(existing_product_row)

        # 2. 업데이트 데이터 준비
        update_data = product_data.dict(exclude_unset=True)

        # product_name이 빈 문자열인 경우 None으로 변환하여 DB에 NULL 값이 저장되도록 함
        if 'product_name' in update_data and update_data['product_name'] == '':
            update_data['product_name'] = None
            
        pdf_path_updated = 'pdf_path' in update_data and update_data['pdf_path'] != existing_product_dict.get('pdf_path')
        
        # 3. PDF 파일명 변경 및 경로 업데이트 (PDF가 변경된 경우)
        new_pdf_path = existing_product_dict.get('pdf_path')
        if pdf_path_updated and 'pdf_path' in update_data:
            try:
                base_dir = os.path.dirname(__file__)
                
                # 이전 파일 삭제
                if existing_product_dict.get('pdf_path'):
                    old_full_path = os.path.join(base_dir, "..", existing_product_dict['pdf_path'])
                    if os.path.exists(old_full_path):
                        os.remove(old_full_path)

                # 새 파일명으로 변경
                temp_pdf_path = update_data['pdf_path']
                temp_full_path = os.path.join(base_dir, "..", temp_pdf_path)
                
                _, file_extension = os.path.splitext(temp_pdf_path)
                new_filename = f"{product_id}{file_extension}"
                new_relative_path = os.path.join("uploads", "pdfs", new_filename).replace('\\', '/')
                new_full_path = os.path.join(base_dir, "..", new_relative_path)

                os.rename(temp_full_path, new_full_path)
                
                # 업데이트할 데이터에 새 경로 반영
                update_data['pdf_path'] = new_relative_path
                new_pdf_path = new_relative_path

            except FileNotFoundError:
                raise HTTPException(status_code=404, detail=f"PDF 파일을 찾을 수 없습니다: {update_data['pdf_path']}")
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"PDF 파일명 변경 중 오류 발생: {e}")

        # PDF가 변경되었다면 분석 상태를 PENDING으로 리셋
        if pdf_path_updated:
            update_data['analysis_status'] = AnalysisStatus.PENDING

        # 4. 제품 정보 업데이트 (SQLAlchemy Core update 사용)
        if update_data:
            update_stmt = (
                update(Product)
                .where(Product.product_id == product_id)
                .values(**update_data)
            )
            await session.execute(update_stmt)
            await session.commit()
        
        # 5. 백그라운드 작업 트리거 (PDF가 변경된 경우)
        if pdf_path_updated and new_pdf_path:
            background_tasks.add_task(
                trigger_pdf_processing,
                product_id=existing_product_dict['internal_id'],
                pdf_path=new_pdf_path
            )
        
        # 6. 업데이트된 제품 정보 반환
        updated_product_dict = {**existing_product_dict, **update_data}
        return updated_product_dict

    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"제품 업데이트 중 오류 발생: {e}")

from sqlalchemy import text, delete
from core.query import find_product_id

@router.delete("/{product_id}", status_code=204)
async def delete_product(
    product_id: str,
    session: AsyncSession = Depends(get_session)
):
    """
    특정 제품코드의 제품을 삭제하고, 연결된 파일도 함께 삭제합니다. (기존 형식 유지)
    """
    try:
        # 1. 제품 조회 (사용자가 지정한 text() 및 mappings() 방식 유지)
        stmt = text(find_product_id).bindparams(product_id=product_id)
        result = await session.execute(stmt)
        product_to_delete_row = result.mappings().one_or_none()

        if not product_to_delete_row:
            raise HTTPException(status_code=404, detail="Product not found")

        # 2. 연결된 모든 파일 (이미지, PDF, 3D 모델) 삭제 시도
        base_dir = os.path.dirname(__file__)
        files_to_delete = [
            product_to_delete_row.get("image_url"), 
            product_to_delete_row.get("pdf_path"), 
            product_to_delete_row.get("model3d_url")
        ]
        
        for file_path in files_to_delete:
            if file_path:
                try:
                    full_path = os.path.join(base_dir, "..", file_path)
                    if os.path.exists(full_path):
                        os.remove(full_path)
                except Exception as e:
                    # 파일 삭제 실패 시 500 에러 대신 경고 로그만 남김
                    print(f"Warning: Could not delete file {file_path}. Error: {e}")

        # 3. DB에서 제품 레코드 삭제 (delete 구문 사용)
        delete_stmt = delete(Product).where(Product.product_id == product_id)
        await session.execute(delete_stmt)
        await session.commit()
        
        return

    except HTTPException:
        # 404 에러는 그대로 다시 발생시킴
        raise
    except Exception as e:
        await session.rollback()
        # 그 외 DB 작업 중 예외는 500 에러로 처리
        raise HTTPException(status_code=500, detail=f"제품 삭제 중 데이터베이스 오류 발생: {e}")
