# =============================================================================
# File: Backend/module/document_processor/document_ocr_pipeline.py
# =============================================================================
# SeShat - Document OCR & Text Extraction Pipeline
# -----------------------------------------------------------------------------
# 목적
#   - PDF 분류 결과(JSON)를 기반으로 각 페이지를 자동 분기하여
#     텍스트 페이지는 텍스트 추출, 이미지 페이지는 OCR, 혼합형은 병합 처리.
#   - 결과를 JSON 형태로 저장하여 이후 청킹/임베딩 단계의 입력으로 제공.
#
# 배경/문제정의
#   - SeShat 초기 데이터(149개 PDF)는 텍스트·이미지·혼합형 페이지가 공존.
#   - 모든 페이지에 OCR을 적용하면 처리 비용이 과도하고 속도가 느림.
#   - 따라서 분류 결과를 활용해 효율적으로 필요한 페이지에만 OCR 적용.
#
# 기능 개요
#   1) 분류 결과(logs/classifier_*.json) 불러오기
#   2) 각 page_type에 따라 처리 라우팅:
#        - text   → pdf_text_extractor.py
#        - image  → pdf_ocr_extractor.py
#        - mixed  → 둘 다 병합
#   3) 페이지별 결과(텍스트/이미지 캡션/출처 메타데이터) 통합
#   4) 문서 단위 JSON으로 저장(pdf_processed/)
#
# 처리 순서
#   [PDF Source] → [pdf_classifier] → [document_ocr_pipeline]
#                 → [chunker] → [embedder] → [FAISS Index]
#
# 출력 형식 예시
#   {
#       "manual_name": "SEB-H110CP,H220CP.pdf",
#       "pages": [
#           {"page_num": 1, "type": "text",  "content": "..."},
#           {"page_num": 2, "type": "image", "content": "...(OCR 결과)..."}
#       ]
#   }
#
# 변경 이력
#   - v1.0: 텍스트·OCR 자동 분기 파이프라인 구현
# =============================================================================

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List

from tqdm import tqdm
from Backend.core.config import get_settings
from Backend.module.document_processor.pdf_classifier import classify_pdf_pages

# ------------------------------------------------------------
# OCR 및 텍스트 추출 서브모듈 (다음 단계에서 실제 구현)
# ------------------------------------------------------------
def extract_text_from_pdf(pdf_path: Path, page_numbers: List[int]) -> Dict[int, str]:
    """
    지정된 페이지에서 텍스트를 추출한다.
    (임시 버전: 실제 구현 시 pdfplumber/PyMuPDF로 대체)
    """
    import fitz
    results = {}
    with fitz.open(pdf_path) as doc:
        for i in page_numbers:
            if 0 < i <= len(doc):
                page = doc[i - 1]
                results[i] = page.get_text("text").strip()
    return results


def perform_ocr_on_pdf(pdf_path: Path, page_numbers: List[int]) -> Dict[int, str]:
    """
    지정된 페이지에서 OCR을 수행한다.
    (임시 버전: 실제 구현 시 PaddleOCR/pytesseract로 대체)
    """
    results = {}
    for i in page_numbers:
        results[i] = f"[OCR placeholder] Page {i} from {pdf_path.name}"
    return results


# ------------------------------------------------------------
# 핵심 파이프라인
# ------------------------------------------------------------
def process_pdf_document(pdf_path: Path, classifier_json: Path, output_dir: Path) -> None:
    """
    단일 PDF 파일을 처리한다.
    분류 결과를 기반으로 텍스트/OCR 병합 결과를 pdf_processed에 저장.
    """
    # 1) 분류 결과 로드
    with open(classifier_json, "r", encoding="utf-8") as f:
        classifier_data = json.load(f)

    # 2) 페이지 타입별로 그룹화
    text_pages = [p["page_num"] for p in classifier_data if p["page_type"] == "text"]
    image_pages = [p["page_num"] for p in classifier_data if p["page_type"] == "image"]
    mixed_pages = [p["page_num"] for p in classifier_data if p["page_type"] == "mixed"]

    print(f"\n[Processing] {pdf_path.name} (text={len(text_pages)}, image={len(image_pages)}, mixed={len(mixed_pages)})")

    # 3) 페이지별 텍스트 추출
    extracted_texts = extract_text_from_pdf(pdf_path, text_pages)
    ocr_texts = perform_ocr_on_pdf(pdf_path, image_pages)
    mixed_texts = {}
    if mixed_pages:
        # 혼합형은 텍스트 + OCR 병합 (임시 처리)
        mixed_texts = extract_text_from_pdf(pdf_path, mixed_pages)
        mixed_texts.update(perform_ocr_on_pdf(pdf_path, mixed_pages))

    # 4) 결과 통합
    all_results = []
    for p in classifier_data:
        num = p["page_num"]
        if num in extracted_texts:
            content = extracted_texts[num]
        elif num in ocr_texts:
            content = ocr_texts[num]
        elif num in mixed_texts:
            content = mixed_texts[num]
        else:
            content = ""
        all_results.append({
            "page_num": num,
            "type": p["page_type"],
            "content": content
        })

    # 5) 저장
    output_dir.mkdir(parents=True, exist_ok=True)
    out_path = output_dir / f"{pdf_path.stem}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"manual_name": pdf_path.name, "pages": all_results}, f, ensure_ascii=False, indent=2)
    print(f"✅ Saved processed file: {out_path.name}")


# ------------------------------------------------------------
# 일괄(batch) 실행 함수
# ------------------------------------------------------------
def run_batch_ocr_pipeline():
    """
    Backend/data/pdf_source 내 모든 PDF를 처리.
    분류 결과(logs/classifier_*.json)를 이용하여 OCR/텍스트 추출 자동화.
    """
    _, paths = get_settings()
    source_dir = paths.PDF_SOURCE_DIR
    logs_dir = paths.LOGS_DIR
    processed_dir = paths.PDF_PROCESSED_DIR

    # 1) 분류 결과 파일 목록 수집
    json_files = list(logs_dir.glob("classifier_*.json"))
    if not json_files:
        print(f"[!] 분류 결과가 없습니다. 먼저 pdf_classifier를 실행하세요.")
        return

    # 2) 각 파일에 대해 순회 처리
    for json_file in tqdm(json_files, desc="Processing PDFs"):
        pdf_name = json_file.stem.replace("classifier_", "")
        pdf_path = source_dir / f"{pdf_name}.pdf"

        if not pdf_path.exists():
            print(f"[ERROR] 원본 PDF를 찾을 수 없습니다: {pdf_path}")
            continue

        try:
            process_pdf_document(pdf_path, json_file, processed_dir)
        except Exception as e:
            print(f"[ERROR] {pdf_name}: {e}")

    print(f"\n✅ 모든 PDF OCR/텍스트 추출 완료. 결과는 {processed_dir} 폴더에 저장되었습니다.")


# ------------------------------------------------------------
# 실행 진입점
# ------------------------------------------------------------
if __name__ == "__main__":
    run_batch_ocr_pipeline()
