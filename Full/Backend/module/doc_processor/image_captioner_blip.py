# =============================================================================
# File: Backend/module/document_processor/image_captioner_blip.py
# =============================================================================
# SeShat - Image Captioner (BLIP version, 무료 대체 GPT-Vision)
# -----------------------------------------------------------------------------
# 목적:
#   - GPT-4V Vision API 없이 무료로 이미지 캡션(시각 설명)을 생성한다.
#   - OCR로 텍스트를 읽지 못한 이미지(도면, 버튼, 구조도 등)의
#     시각적 의미를 자동으로 설명하여 RAG 품질을 높인다.
#
# 기술 스택:
#   - HuggingFace Transformers (Salesforce/blip-image-captioning-base)
#   - PyTorch (CPU/GPU 자동 감지)
#   - Pillow (이미지 로드)
#
# 입력:
#   Backend/data/image_store/*.png   ← image_extractor.py 결과
#
# 출력:
#   Backend/data/image_captions/*.json
#
# 설계 원칙:
#   1) 완전 무료 (OpenAI API 미사용)
#   2) GPU 유무에 따라 자동 전환
#   3) 이미지 파일 단위 로깅 및 예외 복원
#   4) OCR 텍스트가 비어 있는 이미지만 선택 가능 (옵션)
#
# =============================================================================

from pathlib import Path
from transformers import BlipProcessor, BlipForConditionalGeneration
from tqdm import tqdm
from PIL import Image
import torch
import json
import re
from Backend.core.config import get_settings


# -----------------------------------------------------------------------------
# 1) 모델 로드 (CPU/GPU 자동 감지)
# -----------------------------------------------------------------------------
def load_blip_model():
    print("[INIT] BLIP 모델 로드 중... (무료 버전)")
    processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
    model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device)
    print(f"[INFO] BLIP 모델 로드 완료 → device = {device}")
    return processor, model, device


# -----------------------------------------------------------------------------
# 2) OCR 텍스트가 비어 있는 이미지만 선별 (옵션)
# -----------------------------------------------------------------------------
def find_ocr_failed_images(image_dir: Path, ocr_dir: Path) -> list[Path]:
    """
    OCR 결과 중 텍스트가 비어 있거나 인식 실패한 이미지 경로만 반환한다.
    """
    ocr_jsons = list(ocr_dir.glob("*_ocr.json"))
    empty_images = set()

    for json_path in ocr_jsons:
        try:
            data = json.load(open(json_path, "r", encoding="utf-8"))
            for page in data:
                for item in page.get("images", []):
                    text = item.get("text", "")
                    img_path = item.get("path", "")
                    if img_path and (not text.strip()):
                        empty_images.add(Path(img_path))
        except Exception as e:
            print(f"[WARN] OCR 파일 읽기 실패: {json_path.name} ({e})")

    # 실제 존재하는 파일만 필터링
    valid_images = [img for img in empty_images if img.exists()]
    print(f"[INFO] OCR 실패 이미지 {len(valid_images)}개 탐색 완료.")
    return valid_images


# -----------------------------------------------------------------------------
# 3) BLIP 캡션 생성
# -----------------------------------------------------------------------------
def generate_caption(image_path: Path, processor, model, device) -> str:
    """
    단일 이미지의 시각 설명(캡션)을 생성한다.
    """
    try:
        raw_image = Image.open(image_path).convert("RGB")
        inputs = processor(raw_image, return_tensors="pt").to(device)
        out = model.generate(**inputs, max_new_tokens=60)
        caption = processor.decode(out[0], skip_special_tokens=True)
        caption = re.sub(r"\s+", " ", caption).strip()
        return caption
    except Exception as e:
        return f"[ERROR] {e}"


# -----------------------------------------------------------------------------
# 4) 배치 실행
# -----------------------------------------------------------------------------
def batch_caption_all(use_ocr_filter: bool = True):
    """
    전체 이미지에 대해 캡션을 생성한다.
    use_ocr_filter=True → OCR 실패 이미지에만 적용.
    """
    _, paths = get_settings()
    image_dir = paths.IMAGE_STORE_DIR
    ocr_dir = paths.OCR_TEXTS_DIR
    out_dir = Path(paths.DATA_DIR) / "image_captions"
    out_dir.mkdir(parents=True, exist_ok=True)

    processor, model, device = load_blip_model()

    # 대상 이미지 수집
    if use_ocr_filter:
        image_files = find_ocr_failed_images(image_dir, ocr_dir)
    else:
        image_files = list(image_dir.glob("*.png"))

    print(f"[INFO] 총 {len(image_files)}개 이미지에 대해 캡션 생성 시작...\n")

    results = []
    for img_path in tqdm(image_files, desc="Generating captions"):
        caption = generate_caption(img_path, processor, model, device)
        results.append({"image": str(img_path), "caption": caption})

    out_path = out_dir / f"image_captions_blip.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n✅ BLIP 캡션 생성 완료 → {out_path}")


# -----------------------------------------------------------------------------
# 5) CLI 진입점
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    # True = OCR 실패 이미지만 처리
    batch_caption_all(use_ocr_filter=False)
