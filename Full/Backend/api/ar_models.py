# C:\test\FinalProject\dev\test3\PandDF_SeShat\Full\Backend\api\ar_models.py

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import httpx
import os

router = APIRouter()

# 3D 모델링 서버의 주소
# 개발 환경에서는 127.0.0.1:8001, 배포 환경에서는 내부 IP 또는 Docker 서비스 이름
# 여기서는 로컬 개발 환경을 기준으로 127.0.0.1:8001을 사용합니다.
# 실제 배포 시에는 환경 변수 등으로 설정하는 것이 좋습니다.
MODEL_SERVER_URL = os.getenv("MODEL_SERVER_URL", "http://127.0.0.1:8001")

@router.post("/ar/convert-2d-to-3d")
async def convert_2d_to_3d_api(file: UploadFile = File(...)):
    try:
        # 1. 업로드된 이미지를 3D 모델링 서버로 전달
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{MODEL_SERVER_URL}/convert-2d-to-3d",
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
