import io
import os
import re
import logging
from datetime import datetime
from contextlib import nullcontext

import torch
import rembg
from PIL import Image
from dotenv import load_dotenv
from huggingface_hub import login # Added for Hugging Face login
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException
from fastapi.concurrency import run_in_threadpool

from sf3d.system import SF3D

def get_device():
    """Gets the best available device for PyTorch."""
    if torch.cuda.is_available():
        return "cuda"
    if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
        return "mps"
    return "cpu"

def sanitize_filename(filename: str) -> str:
    """Removes characters that are invalid for file names."""
    return re.sub(r'[\\/*?:"<>|]', "", filename)

def remove_background(image: Image.Image, session) -> Image.Image:
    """Removes the background from an image using rembg."""
    return rembg.remove(image, session=session)

def resize_foreground(image: Image.Image, ratio: float) -> Image.Image:
    """Resizes the foreground of an image while maintaining the original canvas size."""
    foreground = image.copy()
    alpha = foreground.getchannel('A')
    bbox = alpha.getbbox()
    if not bbox:
        return image

    fg_width, fg_height = bbox[2] - bbox[0], bbox[3] - bbox[1]

    new_fg_width = int(min(image.width, image.height) * ratio)
    new_fg_height = int(fg_height * (new_fg_width / fg_width))

    resized_fg = foreground.crop(bbox).resize((new_fg_width, new_fg_height), Image.LANCZOS)

    new_image = Image.new("RGBA", image.size, (0, 0, 0, 0))
    paste_x = (image.width - new_fg_width) // 2
    paste_y = (image.height - new_fg_height) // 2
    new_image.paste(resized_fg, (paste_x, paste_y), resized_fg)

    return new_image

# .env 파일에서 환경 변수를 로드합니다.
load_dotenv()

# Hugging Face 토큰 설정 및 로그인
# 환경 변수 HF_TOKEN이 설정되어 있으면 사용하고, 없으면 아래 "YOUR_HUGGING_FACE_TOKEN"을 직접 입력하세요.
HF_TOKEN = os.environ.get("HF_TOKEN", "YOUR_HUGGING_FACE_TOKEN")
if HF_TOKEN == "YOUR_HUGGING_FACE_TOKEN":
    logging.warning("Hugging Face token is not set. Please set HF_TOKEN environment variable or replace 'YOUR_HUGGING_FACE_TOKEN' in api_server.py.")
else:
    try:
        login(token=HF_TOKEN)
        logging.info("Hugging Face login successful via token in api_server.py.")
    except Exception as e:
        logging.error(f"Hugging Face login failed: {e}", exc_info=True)

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# 상수 정의
OUTPUT_BASE_DIR = 'output'

# 모델 로드 (서버 시작 시 한 번만 로드)
device = get_device()
logging.info(f"3D Model Server Device used: {device}")

# 환경 변수에서 bake_resolution 값 읽기 (기본값: 1024)
BAKE_RESOLUTION = int(os.environ.get("BAKE_RESOLUTION", 1024))
logging.info(f"Using bake resolution: {BAKE_RESOLUTION}")

model = None
rembg_session = None

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    global model, rembg_session
    try:
        model = SF3D.from_pretrained(
            "stabilityai/stable-fast-3d",
            config_name="config.yaml",
            weight_name="model.safetensors",
        )
        model.to(device)
        model.eval()
        rembg_session = rembg.new_session()
        logging.info("3D Model and Rembg session loaded successfully.")
    except Exception as e:
        logging.error(f"Error loading 3D model or Rembg session: {e}", exc_info=True)

@app.post("/convert-2d-to-3d")
async def convert_2d_to_3d(file: UploadFile = File(...)):
    if model is None or rembg_session is None:
        logging.error("3D model server not initialized. Model or session is None.")
        raise HTTPException(status_code=503, detail="3D model server is not ready.")

    try:
        image_data = await file.read()
        input_image = Image.open(io.BytesIO(image_data)).convert("RGBA")

        timestamp_run = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        original_filename_base = os.path.splitext(file.filename)[0]
        sanitized_base_name = sanitize_filename(original_filename_base)
        unique_output_dir = os.path.join(OUTPUT_BASE_DIR, f"{sanitized_base_name}_{timestamp_run}")
        os.makedirs(unique_output_dir, exist_ok=True)

        def blocking_operations():
            processed_image = remove_background(input_image, rembg_session)
            processed_image = resize_foreground(processed_image, 0.85)

            processed_image_path = os.path.join(unique_output_dir, f"{sanitized_base_name}_processed.png")
            processed_image.save(processed_image_path)

            with torch.no_grad():
                with torch.autocast(
                    device_type=device, dtype=torch.bfloat16
                ) if "cuda" in device else nullcontext():
                    mesh, glob_dict = model.run_image(
                        [processed_image],
                        bake_resolution=BAKE_RESOLUTION,
                        remesh="none",
                        vertex_count=-1,
                    )

            # --- DEBUGGING LOGS ---
            logging.info(f"DEBUG: Type of 'mesh' variable: {type(mesh)}")
            logging.info(f"DEBUG: Is 'mesh' a list? {isinstance(mesh, list)}")
            # --- END DEBUGGING LOGS ---

            output_glb_path = os.path.join(unique_output_dir, f"{sanitized_base_name}_mesh.glb")
            if isinstance(mesh, list):
                mesh[0].export(output_glb_path, include_normals=True)
            else:
                mesh.export(output_glb_path, include_normals=True)

            return output_glb_path

        logging.info(f"Starting 3D model conversion for {file.filename}")
        output_glb_path = await run_in_threadpool(blocking_operations)
        logging.info(f"Successfully converted {file.filename} to {output_glb_path}")

        relative_output_path = os.path.relpath(output_glb_path,os.path.dirname(os.path.abspath(__file__)))
        return JSONResponse(content={"message": "3D model generated successfully", "model_path":relative_output_path})

    except Exception as e:
        logging.error(f"Error during 3D model conversion for {file.filename}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"3D model conversion failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)