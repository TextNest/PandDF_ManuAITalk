# C:\test\FinalProject\dev\test3\PandDF_SeShat\Full\Backend\api\ar_models.py

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import httpx
import os

router = APIRouter()

# MODEL_SERVER_URL은 환경변수로 변경.
# .env에 있는 MODEL_SERVER_URL을 사용하며, 기본값은 http://127.0.0.1:8001로 설정.
# 필요 시 Backend/core/config.py 내 load 클래스 확인

@router.post("/ar/convert-2d-to-3d")
async def convert_2d_to_3d_api(file: UploadFile = File(...)):
    try:
        # 1. 업로드된 이미지를 3D 모델링 서버로 전달
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{os.environ['MODEL_SERVER_URL']}/convert-2d-to-3d",
                files={"file": (file.filename, await file.read(), file.content_type)}
            )
        
        # 2. 3D 모델링 서버의 응답 처리
        if response.status_code == 200:
            return JSONResponse(content=response.json())
        else:
            # 3D 모델링 서버에서 발생한 오류를 클라이언트에게 전달
            detail = response.json().get("detail", "Unknown error from 3D model server")
            raise HTTPException(status_code=response.status_code, detail=f"3D model conversion failed: {detail}")

    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Could not connect to 3D model server: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")
