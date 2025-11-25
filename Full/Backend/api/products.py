# Full/Backend/api/products.py
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
import os
import shutil
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, update
from fastapi import Depends
from typing import List
from core.db_config import get_session
from models.product import Product, Status
from schemas.product import ProductCreate, ProductUpdate, Product as ProductSchema
from module.document_pr import trigger_pdf_processing
from core.auth import get_current_user
from core.query import (
    find_all_product, find_product_id, delete_product_query, find_products_by_company_id,
    find_product_with_company_name_by_id
)

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

@router.get("/", response_model=List[ProductSchema])
async def get_completed_products(session: AsyncSession = Depends(get_session)):
    """
    분석이 완료된 모든 제품 목록을 조회합니다. (임시: 모든 제품 조회)
    """
    try:
        result = await session.execute(
            text(find_all_product)
            # .options(selectinload(Product.category))
            # .where(Product.status == Status.COMPLETED) # 임시로 필터 제거
        )
        products = result.mappings().all()
        return [dict(row) for row in products]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"제품 목록을 불러오는 중 오류가 발생했습니다: {e}")

@router.post("/", response_model=ProductSchema)
async def create_product(
    product_data: ProductCreate,
    session: AsyncSession = Depends(get_session),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: dict = Depends(get_current_user)
):
    """
    [관리자 전용] 새로운 제품 정보를 데이터베이스에 저장하고, PDF 분석을 백그라운드 작업으로 트리거합니다.
    제품은 현재 로그인된 관리자의 회사에 소속됩니다.
    """
    user_role = current_user.get("role")
    company_id = current_user.get("company_id")
    created_by_str = current_user.get("id")
    created_by_id = int(created_by_str.split('_')[1]) if created_by_str and '_' in created_by_str else None

    # 회사 관리자만 제품을 생성할 수 있도록 제한
    if user_role != "company_admin" or not company_id or not created_by_id:
        raise HTTPException(
            status_code=403,
            detail="제품을 생성할 권한이 없습니다."
        )

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
        company_internal_id=company_id, # 토큰에서 가져온 company_id 사용
        description=product_data.description,
        release_date=product_data.release_date,
        is_active=product_data.is_active,
        image_url=product_data.image_url,
        pdf_path=product_data.pdf_path,
        model3d_url=product_data.model3d_url,
        status=Status.PENDING,
        created_by=created_by_id, # 토큰에서 가져온 user id 사용
        updated_by=created_by_id  # 생성 시에는 updated_by도 동일하게 설정
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
                if os.path.exists(old_full_path):
                    os.rename(old_full_path, new_full_path)
                    # 4. DB 업데이트
                    new_product.pdf_path = new_relative_path
                    new_pdf_path = new_relative_path # 백그라운드 작업에 전달할 경로 업데이트
                    await session.commit()
                    await session.refresh(new_product)
                else:
                    # 임시 PDF 파일이 없어도 제품 생성은 유지하되, 로그를 남기거나 경고 처리
                    print(f"Warning: Temporary PDF file not found at {old_full_path}, but product created without it.")
                    new_pdf_path = None # PDF가 없으므로 백그라운드 작업을 트리거하지 않음

            except Exception as e:
                # 파일 처리 오류 시에도 DB 트랜잭션은 유지될 수 있으므로, 일단 로깅만 하고 넘어감
                print(f"Error renaming PDF file: {e}")
                # 필요하다면 여기서 HTTPException을 발생시켜 전체 작업을 실패시킬 수 있음
                # raise HTTPException(status_code=500, detail=f"PDF 파일명 변경 중 오류 발생: {e}")

        # PDF 분석을 백그라운드 작업으로 추가
        if new_pdf_path:
            background_tasks.add_task(
                trigger_pdf_processing, 
                product_id=new_product.product_id, 
                pdf_path=new_pdf_path # 변경된 경로를 전달
            )
        
        return new_product
        
    except Exception as e:
        await session.rollback()
        # unique 제약 조건 위반 등 DB 오류 처리
        raise HTTPException(status_code=500, detail=f"데이터베이스에 제품을 저장하는 중 오류가 발생했습니다: {e}")

@router.get("/admin", response_model=List[ProductSchema])
async def get_products_for_admin(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    [관리자 전용] 로그인된 회사 관리자의 소속 회사 제품 목록을 조회합니다.
    """
    user_role = current_user.get("role")
    company_id = current_user.get("company_id")

    # 회사 관리자만 접근 가능하도록 제한
    if user_role != "company_admin" or not company_id:
        raise HTTPException(
            status_code=403,
            detail="회사 관리자만 접근할 수 있습니다."
        )

    try:
        # 회사 관리자용 쿼리 사용
        result = await session.execute(
            text(find_products_by_company_id),
            {"company_id": company_id}
        )
        products = result.mappings().all()
        return [dict(row) for row in products]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"제품 목록을 불러오는 중 오류가 발생했습니다: {e}")

@router.get("/{product_id}", response_model=ProductSchema)
async def get_product(
    product_id: str,
    session: AsyncSession = Depends(get_session)
):
    """
    특정 제품코드의 제품 정보를 조회합니다.
    """
    result = await session.execute(
        text(find_product_with_company_name_by_id).bindparams(product_id=product_id)
    )
    product = result.mappings().one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return product

@router.put("/{product_id}", response_model=ProductSchema)
async def update_product(
    product_id: str,
    product_data: ProductUpdate,
    session: AsyncSession = Depends(get_session),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: dict = Depends(get_current_user)
):
    """
    기존 제품 정보를 업데이트합니다. 회사 관리자는 자기 회사 제품만 수정할 수 있습니다.
    """
    user_role = current_user.get("role")
    company_id = current_user.get("company_id")
    # `id`는 'admin_123' 형식에서 숫자 ID만 추출
    updated_by_str = current_user.get("id")
    updated_by_id = int(updated_by_str.split('_')[1]) if updated_by_str and '_' in updated_by_str else None

    if not company_id or not updated_by_id:
        raise HTTPException(status_code=403, detail="제품을 수정할 권한이 없습니다.")
        
    try:
        # 1. 제품 조회
        find_stmt = text(find_product_id).bindparams(product_id=product_id)
        result = await session.execute(find_stmt)
        existing_product_row = result.mappings().one_or_none()

        if not existing_product_row:
            raise HTTPException(status_code=404, detail="Product not found")

        # 2. 소유권 확인 (회사 관리자인 경우)
        if user_role == "company_admin" and existing_product_row.company_internal_id != company_id:
            raise HTTPException(status_code=404, detail="Product not found")

        existing_product_dict = dict(existing_product_row)

        # 3. 업데이트 데이터 준비
        update_data = product_data.dict(exclude_unset=True)

        # 'manufacturer'는 DB에 없으므로 제거 (혹시 Pydantic에 남아있을 경우)
        update_data.pop('manufacturer', None)
        
        # product_name이 빈 문자열인 경우 None으로 변환하여 DB에 NULL 값이 저장되도록 함
        if 'product_name' in update_data and update_data['product_name'] == '':
            update_data['product_name'] = None
            
        pdf_path_updated = 'pdf_path' in update_data and update_data['pdf_path'] != existing_product_dict.get('pdf_path')
        
        # 4. PDF 파일 처리 (필요 시)
        new_pdf_path = existing_product_dict.get('pdf_path')
        if pdf_path_updated and 'pdf_path' in update_data:
            try:
                base_dir = os.path.dirname(__file__)
                if existing_product_dict.get('pdf_path'):
                    old_full_path = os.path.join(base_dir, "..", existing_product_dict['pdf_path'])
                    if os.path.exists(old_full_path):
                        os.remove(old_full_path)
                temp_pdf_path = update_data['pdf_path']
                temp_full_path = os.path.join(base_dir, "..", temp_pdf_path)
                _, file_extension = os.path.splitext(temp_pdf_path)
                new_filename = f"{product_id}{file_extension}"
                new_relative_path = os.path.join("uploads", "pdfs", new_filename).replace('\\', '/')
                new_full_path = os.path.join(base_dir, "..", new_relative_path)
                os.rename(temp_full_path, new_full_path)
                update_data['pdf_path'] = new_relative_path
                new_pdf_path = new_relative_path
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"PDF 파일 처리 중 오류 발생: {e}")

        # PDF가 변경되면 상태를 PENDING으로 리셋
        if pdf_path_updated:
            update_data['status'] = Status.PENDING # Enum 객체 사용

        # 업데이트한 사용자 ID 및 시간 정보 추가
        update_data['updated_by'] = updated_by_id
        update_data['updated_at'] = datetime.now()

        # 5. 제품 정보 업데이트
        if update_data:
            update_stmt = (
                update(Product)
                .where(Product.product_id == product_id)
                .values({
                    getattr(Product, key): value for key, value in update_data.items()
                })
            )
            await session.execute(update_stmt)
            await session.commit()
        
        # 6. 백그라운드 작업 트리거
        if pdf_path_updated and new_pdf_path:
            background_tasks.add_task(
                trigger_pdf_processing,
                product_id=product_id,
                pdf_path=new_pdf_path
            )
        
        # 7. 업데이트된 제품 정보 반환
        result = await session.execute(
            text(find_product_with_company_name_by_id).bindparams(product_id=product_id)
        )
        return dict(result.mappings().one())

    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"제품 업데이트 중 오류 발생: {e}")

@router.delete("/{product_id}", status_code=204)
async def delete_product(
    product_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    특정 제품코드의 제품을 삭제합니다. 회사 관리자는 자기 회사 제품만 삭제할 수 있습니다.
    """
    user_role = current_user.get("role")
    company_id = current_user.get("company_id")

    if not company_id and user_role != "super_admin":
        raise HTTPException(status_code=403, detail="제품을 삭제할 권한이 없습니다.")

    try:
        # 1. 제품 조회
        stmt = text(find_product_id).bindparams(product_id=product_id)
        result = await session.execute(stmt)
        product_to_delete_row = result.mappings().one_or_none()

        if not product_to_delete_row:
            raise HTTPException(status_code=404, detail="Product not found")

        # 2. 소유권 확인 (회사 관리자인 경우)
        if user_role == "company_admin" and product_to_delete_row.company_internal_id != company_id:
            raise HTTPException(status_code=404, detail="Product not found")

        # 3. 연결된 파일 삭제
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
                    print(f"Warning: Could not delete file {file_path}. Error: {e}")

        # 4. DB에서 제품 레코드 삭제
        delete_query = text(delete_product_query)
        await session.execute(delete_query, {'product_id': product_id})
        await session.commit()
        
        return

    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"제품 삭제 중 데이터베이스 오류 발생: {e}")

