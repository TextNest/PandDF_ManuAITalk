# =============================================================================
# File: Backend/module/document_processor/image_extractor.py
# =============================================================================
# SeShat - PDF Image Extractor (v2: 안정형 + 폴백 지원)
# -----------------------------------------------------------------------------
# 목적
#   - PDF의 모든 페이지에서 비트맵, 벡터, 렌더링 이미지를 추출하여
#     후속 단계(image_captioner.py)가 캡션을 생성할 수 있도록 준비한다.
#   - 단순히 OCR용 이미지뿐만 아니라, 텍스트 페이지에 포함된 도면·아이콘
#     등의 시각 자산을 함께 저장하여 RAG 응답 품질을 향상시킨다. 
#   + 일부 PDF에서 발생하는 "not enough image data" 문제를 방지하고 
#     벡터 기반 PDF도 전체 페이지 렌더링으로 시각 정보를 보존한다.
#
# 설계 원칙
#   1) 모든 페이지에서 이미지 추출 수행 (page_type 무관)
#       -> pdf_classifier.py 단계에서 도면을 인식하지 못하고
#           -> 도면이 많은 PDF 페이지도 텍스트로 분류했기 때문
#   2) 비트맵 이미지(get_images) + 벡터 도형(get_drawings) 모두 처리
#   3) 추출된 이미지를 Backend/data/image_store/ 아래에 자동 저장
#   4) 후속 단계에서 사용할 수 있도록 메타데이터(JSON) 반환
#
# 출력 예시
#   [
#     {
#       "page_num": 7,
#       "images": [
#         {"path": "Backend/data/image_store/SDH-BPM600_p7_img1.png", "type": "bitmap"},
#         {"path": "Backend/data/image_store/SDH-BPM600_p7_vec1.png", "type": "vector"}
#       ]
#     }
#   ]
#
# 변경 이력
#   - v1.0: 기본 비트맵 이미지 추출 및 저장
#   - v1.1: 벡터 도형 렌더링 기능 추가
#   - v1.2: 로그 및 JSON 메타데이터 통합
# 
# 주요 개선사항 (v2)
#   1) 예외 복원: JPEG2000 / CMYK / 손상된 xref 등에서도 중단 없이 실행
#   2) 폴백 로직: 비트맵 이미지가 없을 때 → 전체 페이지 렌더링으로 대체
#   3) 모든 실패 로그를 [WARN] 수준으로 표시
#   4) 결과 JSON에 "render" 타입 포함
# 
#   + 후처리 옵션 추가: 잡지 못한 이미지만 고해상도로 재렌더링 (일단 2배)
# =============================================================================

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List

import fitz  # PyMuPDF
from PIL import Image
from tqdm import tqdm
from Backend.core.config import get_settings


# -----------------------------------------------------------------------------
# 1) 내부 유틸 - 안전한 이미지 저장
# -----------------------------------------------------------------------------
def _save_image_safe(
    pix: fitz.Pixmap, out_dir: Path, base_name: str, page_num: int, idx: int, tag: str
) -> Path | None:
    """
    Pixmap 이미지를 PNG로 안전하게 저장한다.
    - CMYK → RGB 변환
    - 예외 발생 시 None 반환
    """
    try:
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"{base_name}_p{page_num}_{tag}{idx}.png"

        # 색상 채널 수 확인
        if pix.n < 5:  # RGB / Gray
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        else:  # CMYK → RGB 변환
            pix = fitz.Pixmap(fitz.csRGB, pix)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

        img.save(out_path, "PNG")
        return out_path

    except Exception as e:
        print(f"[WARN] 이미지 저장 실패 (p{page_num}): {e}")
        return None


# -----------------------------------------------------------------------------
# 2) 페이지 단위 이미지 추출 (비트맵 + 벡터 + 렌더링 폴백)
# -----------------------------------------------------------------------------
def extract_images_from_page(pdf_path: Path, page: fitz.Page, out_dir: Path, page_num: int) -> List[Dict]:
    """단일 페이지에서 비트맵, 벡터, 렌더링 이미지를 추출한다."""
    base_name = pdf_path.stem
    page_results = []

    # ---------- (1) 비트맵 이미지 추출 ----------
    images = page.get_images(full=True)
    for img_idx, img in enumerate(images, start=1):
        try:
            xref = img[0]
            pix = fitz.Pixmap(page.parent, xref)
            out_path = _save_image_safe(pix, out_dir, base_name, page_num, img_idx, "img")
            if out_path:
                page_results.append({"path": str(out_path), "type": "bitmap"})
        except Exception as e:
            print(f"[WARN] {pdf_path.name} (p{page_num}) 이미지 추출 실패: {e}")
            continue

    # ---------- (2) 벡터 도형 존재 시 렌더링 ----------
    drawings = page.get_drawings()
    if drawings:
        try:
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 고해상도 렌더링
            vec_path = _save_image_safe(pix, out_dir, base_name, page_num, 1, "vec")
            if vec_path:
                page_results.append({"path": str(vec_path), "type": "vector"})
        except Exception as e:
            print(f"[WARN] {pdf_path.name} (p{page_num}) 벡터 렌더링 실패: {e}")

    # ---------- (3) 비트맵 + 벡터 둘 다 없으면 폴백 ----------
    if not page_results:
        try:
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            render_path = _save_image_safe(pix, out_dir, base_name, page_num, 1, "render")
            if render_path:
                page_results.append({"path": str(render_path), "type": "render"})
        except Exception as e:
            print(f"[WARN] {pdf_path.name} (p{page_num}) 폴백 렌더링 실패: {e}")

    return page_results


# -----------------------------------------------------------------------------
# 3) 문서 단위 이미지 추출
# -----------------------------------------------------------------------------
def extract_images_from_pdf(pdf_path: Path, output_dir: Path) -> List[Dict]:
    """PDF 전체 페이지에서 이미지 및 도형을 추출한다."""
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF 파일을 찾을 수 없습니다: {pdf_path}")
    
    results = []

    # ---------- (1) 1차 이미지 추출 ----------
    with fitz.open(pdf_path) as doc:
        for page_index, page in enumerate(tqdm(doc, desc=f"Extracting {pdf_path.name}"), start=1):
            images = extract_images_from_page(pdf_path, page, output_dir, page_index)
            if images:
                results.append({"page_num": page_index, "images": images})

    # ---------- (2) 누락 페이지 고해상도 보정 ----------
    results = retry_highres_render_if_missing(pdf_path, output_dir, results)

    # ---------- (3) JSON 메타데이터 저장 ----------
    meta_path = output_dir / f"{pdf_path.stem}_images.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    return results

# -----------------------------------------------------------------------------
# 3-1) 누락 페이지 고해상도 재렌더링 보정
# -----------------------------------------------------------------------------
def retry_highres_render_if_missing(pdf_path: Path, output_dir: Path, results: List[Dict]):
    """
    1차 추출 결과 중 이미지가 누락된 페이지를 고해상도로 재렌더링한다.
    """
    base_name = pdf_path.stem
    fixed_pages = []

    with fitz.open(pdf_path) as doc:
        for page_data in results:
            page_num = page_data["page_num"]
            images = page_data.get("images", [])
            has_visual = any(img["type"] in ("bitmap", "vector") for img in images)

            if not has_visual:
                page = doc.load_page(page_num - 1)
                try:
                    # 2배 해상도로 렌더링 (고품질 보정)
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                    out_path = _save_image_safe(pix, output_dir, base_name, page_num, 1, "renderHQ")
                    if out_path:
                        page_data["images"].append({"path": str(out_path), "type": "renderHQ"})
                        fixed_pages.append(page_num)
                except Exception as e:
                    print(f"[WARN] {pdf_path.name} (p{page_num}) 고해상도 보정 실패: {e}")

    if fixed_pages:
        print(f"[INFO] {pdf_path.name} 고해상도 재렌더링 보정 완료 → {len(fixed_pages)}p")
    return results


# -----------------------------------------------------------------------------
# 4) 일괄(batch) 처리
# -----------------------------------------------------------------------------
def batch_extract_all_pdfs():
    """Backend/data/pdf_source의 모든 PDF에서 이미지 추출"""
    _, paths = get_settings()
    src_dir = paths.PDF_SOURCE_DIR
    img_dir = paths.IMAGE_STORE_DIR

    pdf_files = list(src_dir.glob("*.pdf"))
    if not pdf_files:
        print(f"[!] PDF 파일을 찾을 수 없습니다: {src_dir}")
        return

    print(f"총 {len(pdf_files)}개의 PDF에서 이미지를 추출합니다...")

    for pdf_path in pdf_files:
        try:
            extract_images_from_pdf(pdf_path, img_dir)
        except Exception as e:
            print(f"[ERROR] {pdf_path.name}: {e}")

    print(f"\n✅ 모든 PDF 이미지 추출 완료. 결과는 {img_dir} 폴더에 저장되었습니다.")


# -----------------------------------------------------------------------------
# 5) 실행 진입점
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    batch_extract_all_pdfs()