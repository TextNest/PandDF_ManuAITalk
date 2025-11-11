# =============================================================================
# File: Backend/module/document_processor/document_pr.py
# =============================================================================
# SeShat - Document Preparation (OCR + Caption 병합 및 제품별 청크 생성)
# -----------------------------------------------------------------------------
# 목적:
#   - OCR 결과(JSON)와 이미지 캡션(JSON)을 병합하여 제품별 문서 구성
#   - OCR 구조(문자열/딕셔너리/리스트) 자동 감지 및 변환
#   - 텍스트를 청크 단위로 나누어 RAG 인덱싱 준비
#
# 입력:
#   - Backend/data/ocr_texts/*.json
#   - Backend/data/image_captions/*.json
#
# 출력:
#   - Backend/data/chunk_store/{product_id}_chunks.json
#
# 실행:
#   (venv) $ python -m Backend.module.document_processor.document_pr
#
# 주요 기술:
#   - OCR 구조 자동 판별
#   - 정규식 기반 텍스트 정제
#   - 문장 단위 청크 분리
#   - tqdm 진행 표시 및 예외 처리
# =============================================================================

from __future__ import annotations
import json
import re
from pathlib import Path
from tqdm import tqdm
from Backend.core.config import get_settings


# ------------------------------
# 1) 텍스트 정제 함수
# ------------------------------
def clean_text(text: str) -> str:
    """OCR 및 캡션 텍스트를 정제하여 불필요한 공백/기호 제거"""
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[■□◆◇▶▷●◎※→←↑↓◇◆▪︎•]", "", text)
    return text.strip()


# ------------------------------
# 2) 문단 청크 분리 함수
# ------------------------------
def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100):
    """긴 문서를 chunk_size 단위로 분할 (문장 단위 분리 + 오버랩 적용)"""
    sentences = re.split(r"(?<=[.!?。！？])", text)
    chunks, current = [], ""

    for sent in sentences:
        if len(current) + len(sent) > chunk_size:
            chunks.append(current.strip())
            current = sent[-overlap:]
        else:
            current += sent

    if current.strip():
        chunks.append(current.strip())
    return chunks


# ------------------------------
# 3) OCR + Caption 병합
# ------------------------------
def merge_ocr_and_caption(ocr_dir: Path, caption_dir: Path):
    """OCR + Caption 데이터를 병합하고 제품별 텍스트 리스트 생성"""
    print("[INIT] Loading OCR and Caption data...")

    ocr_files = list(ocr_dir.glob("*_ocr.json"))
    caption_files = list(caption_dir.glob("*.json"))
    print(f"[INFO] OCR 파일 {len(ocr_files)}개, Caption 파일 {len(caption_files)}개 로드 완료.")

    # 캡션 매핑: 이미지 경로 → 캡션 텍스트
    caption_map = {}
    for cap_file in caption_files:
        try:
            data = json.load(open(cap_file, "r", encoding="utf-8"))
            for item in data:
                if isinstance(item, dict) and "image" in item:
                    caption_map[item["image"]] = item.get("caption", "")
        except Exception:
            continue

    product_map = {}

    # 각 OCR 파일 순회
    for file in tqdm(ocr_files, desc="Merging OCR + Captions"):
        product_id = file.stem.replace("_ocr", "")

        try:
            ocr_data = json.load(open(file, "r", encoding="utf-8"))
        except Exception as e:
            print(f"⚠️ {product_id}: 파일 로드 실패 ({e})")
            continue

        # ✅ 자동 구조 감지 및 변환
        if isinstance(ocr_data, str):
            # 문자열 하나로 저장된 경우
            ocr_data = [{"page_num": 1, "images": [{"path": "", "text": ocr_data}]}]
        elif isinstance(ocr_data, dict):
            # 단일 딕셔너리 형태
            if "images" in ocr_data:
                ocr_data = [ocr_data]
            else:
                ocr_data = [{"page_num": 1, "images": [{"path": "", "text": json.dumps(ocr_data, ensure_ascii=False)}]}]
        elif not isinstance(ocr_data, list):
            print(f"⚠️ {product_id}: OCR 구조 비정상 → 건너뜀")
            continue

        combined_texts = []

        for page in ocr_data:
            if not isinstance(page, dict):
                continue

            page_text = ""
            for img in page.get("images", []):
                img_text = img.get("text", "")
                img_path = img.get("path", "")
                cap_text = caption_map.get(img_path, "")
                merged = clean_text(f"{img_text} {cap_text}")
                if merged:
                    page_text += merged + " "

            if page_text.strip():
                combined_texts.append(clean_text(page_text))

        if combined_texts:
            product_map[product_id] = combined_texts
        else:
            print(f"⚠️ {product_id}: 텍스트 없음 → 건너뜀")

    return product_map


# ------------------------------
# 4) 메인 실행 로직
# ------------------------------
def run_document_preparation():
    _, paths = get_settings()
    ocr_dir = Path(paths.OCR_TEXTS_DIR)
    caption_dir = Path(paths.DATA_DIR) / "image_captions"
    chunk_dir = Path(paths.DATA_DIR) / "chunk_store"
    chunk_dir.mkdir(parents=True, exist_ok=True)

    # OCR + Caption 병합
    product_map = merge_ocr_and_caption(ocr_dir, caption_dir)

    print("\n[STEP] Splitting documents into chunks...")
    for product_id, texts in tqdm(product_map.items(), desc="Chunking Documents"):
        chunks = []
        for text in texts:
            for chunk in chunk_text(text):
                chunks.append({
                    "document_id": product_id,
                    "text": chunk
                })

        # 제품별 청크 파일 저장
        out_path = chunk_dir / f"{product_id}_chunks.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(chunks, f, ensure_ascii=False, indent=2)

        print(f"✅ {product_id} → {len(chunks)}개 청크 저장 완료")

    print(f"\n✅ Document preparation completed → {chunk_dir}")


# ------------------------------
# 5) CLI 실행
# ------------------------------
if __name__ == "__main__":
    run_document_preparation()
