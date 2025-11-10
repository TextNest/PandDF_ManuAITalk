# =============================================================================
# File: Backend/module/document_processor/ocr_extractor.py
# =============================================================================
# SeShat - OCR Text Extraction Module (v1.0)
# -----------------------------------------------------------------------------
# 목적
#   - image_extractor.py에서 추출된 이미지(.png)들 중, 
#     이미지 안에 텍스트가 포함된 스캔본 페이지에서 텍스트를 추출한다.
#   - GPT Vision 호출 전에 OCR을 통해 기계가 읽을 수 있는 텍스트를 확보함으로써
#     처리 속도 및 비용을 절감한다.
#
# 설계 원칙
#   1) Tesseract OCR 기반의 로컬 처리 (인터넷/LLM 비용 無)
#   2) 한국어+영문 병행 인식(lang="kor+eng")
#   3) PDF 페이지별 OCR 결과를 JSON으로 저장
#   4) OCR 실패 시 오류 로그만 출력하고 전체 실행은 계속 진행
#   5) 추출 텍스트는 후속 단계(qa_service_img.py, image_captioner.py)에서
#      벡터화 및 검색용으로 활용 가능
#
# 입력 경로
#   Backend/data/image_store/   ← image_extractor.py 출력 이미지 폴더
#
# 출력 경로
#   Backend/data/ocr_texts/
#       ├── ocr_texts.json         : 전체 OCR 결과 통합
#       ├── <pdf_name>_ocr.json    : PDF별 OCR 텍스트 결과
#
# 변경 이력
#   - v1.0: 기본 OCR 추출 및 JSON 저장 구현
# =============================================================================

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List

from PIL import Image
from tqdm import tqdm
import pytesseract

from Backend.core.config import get_settings

# ----------------------------------------------------------------------------- 
# 1) 설정 및 경로 로드
# -----------------------------------------------------------------------------
_, paths = get_settings()

IMAGE_DIR = paths.IMAGE_STORE_DIR
OUTPUT_DIR = Path("Backend/data/ocr_texts")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Windows 환경에서 Tesseract 실행 경로 지정 (설치 경로에 따라 수정 필요)
# Linux/Mac 환경이라면 자동 인식 가능.
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


# ----------------------------------------------------------------------------- 
# 2) OCR 처리 유틸 함수
# -----------------------------------------------------------------------------
def extract_text_from_image(image_path: Path) -> str:
    """
    단일 이미지 파일(.png/.jpg)에서 OCR을 수행하여 텍스트를 추출한다.
    - kor+eng 병행 인식
    - 예외 발생 시 빈 문자열 반환
    """
    try:
        img = Image.open(image_path)
        text = pytesseract.image_to_string(img, lang="kor+eng")
        return text.strip()
    except Exception as e:
        print(f"[WARN] OCR 실패: {image_path.name} ({e})")
        return ""


# ----------------------------------------------------------------------------- 
# 3) 이미지 디렉터리 스캔 및 PDF별 그룹화
# -----------------------------------------------------------------------------
def group_images_by_pdf(image_dir: Path) -> Dict[str, List[Path]]:
    """
    이미지 파일명을 기반으로 PDF별 그룹화한다.
    예시:
        SDH-BPM600_p7_img1.png → SDH-BPM600
    """
    groups: Dict[str, List[Path]] = {}
    for img_path in image_dir.glob("*.png"):
        stem = img_path.stem
        pdf_name = stem.split("_p")[0]  # "_p" 이전까지를 PDF 식별자로 사용
        groups.setdefault(pdf_name, []).append(img_path)
    return groups


# ----------------------------------------------------------------------------- 
# 4) PDF 단위 OCR 실행
# -----------------------------------------------------------------------------
def ocr_images_for_pdf(pdf_name: str, image_paths: List[Path]) -> Dict[str, str]:
    """
    특정 PDF에 속한 이미지 파일들을 OCR 처리하고 텍스트를 반환한다.
    - 페이지 순서대로 정렬
    - 결과를 딕셔너리(page_id: text) 형태로 반환
    """
    results = {}
    # 페이지 번호 기준 정렬 (파일명 내 "_p3_" 형태)
    image_paths.sort(key=lambda p: int(p.stem.split("_p")[1].split("_")[0]))

    for img_path in tqdm(image_paths, desc=f"OCR: {pdf_name}", leave=False):
        page_tag = img_path.stem.split("_p")[1].split("_")[0]
        text = extract_text_from_image(img_path)
        if text:
            results[page_tag] = text

    # PDF별 OCR 결과 개별 파일로 저장
    out_path = OUTPUT_DIR / f"{pdf_name}_ocr.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    return results


# ----------------------------------------------------------------------------- 
# 5) 전체 일괄(batch) 처리
# -----------------------------------------------------------------------------
def batch_ocr_all_images() -> None:
    """Backend/data/image_store/ 내 모든 이미지에 대해 OCR을 수행한다."""
    if not IMAGE_DIR.exists():
        print(f"[!] 이미지 폴더가 존재하지 않습니다: {IMAGE_DIR}")
        return

    grouped = group_images_by_pdf(IMAGE_DIR)
    if not grouped:
        print(f"[!] OCR 대상 이미지가 없습니다: {IMAGE_DIR}")
        return

    print(f"총 {len(grouped)}개의 PDF 이미지 그룹을 OCR 처리합니다...")

    all_results = {}

    for pdf_name, img_paths in grouped.items():
        results = ocr_images_for_pdf(pdf_name, img_paths)
        all_results[pdf_name] = results

    # 전체 OCR 통합 저장
    merged_path = OUTPUT_DIR / "ocr_texts.json"
    with open(merged_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)

    print(f"\n✅ OCR 전체 완료. 결과 저장 위치: {merged_path}")


# ----------------------------------------------------------------------------- 
# 6) 실행 진입점
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    batch_ocr_all_images()
