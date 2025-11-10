# =============================================================================
# File: Backend/module/document_processor/pdf_classifier.py
# =============================================================================

"""
SeShat - PDF Page Classifier

목적
  - PDF 각 페이지를 텍스트/이미지/혼합형으로 분류하여, 이후 단계
    (텍스트 추출, OCR, 이미지 캡션 생성)가 처리 대상을 효율적으로
    나눌 수 있도록 메타데이터를 제공한다.

    + 단순 텍스트 길이와 이미지 개수뿐만 아니라, 
      벡터 도형(drawings) 수와 텍스트 밀도(text density)를 함께 고려 -> 시각적 복잡도 보정

      
배경/문제정의
  - 초기 데이터(스캔본 포함 149개 PDF)는 다음이 혼재되어 있음:
      1) 텍스트 레이어가 살아있는 페이지 (텍스트 추출 가능)
      2) 이미지로만 구성된 스캔 페이지 (OCR 필요)
      3) 제품 사진/도면/아이콘/표/그래프가 포함된 복합 페이지
  - 모든 페이지에 OCR을 적용하면 비용/시간이 급증하고, 반대로
    텍스트 추출만 시도하면 스캔 페이지를 놓치게 됨.
  - 따라서 사전 분류기로 페이지 타입을 판별하는 모듈이 필요.

  + 일부 PDF는 텍스트 위주의 페이지처럼 보이지만, 
    실제로는 도형·버튼·아이콘·설명선 등 벡터 기반 그래픽 요소가 많음.
    -> PyMuPDF의 get_images()는 비트맵 이미지(PNG/JPG)만 인식하므로
    -> 벡터 도형이 많은 페이지는 image_count=0으로 잘못 감지될 수 있음
    -> 이에 따라 시각적으로 "그림 많은 페이지"임에도 "text"로 분류되는 문제 발생

    
기능 개요
  1) PDF 로드(PyMuPDF/fitz)
  2) 페이지별 텍스트 길이 측정(get_text("text"))
  3) 페이지 내 이미지 개수 및 상대 면적 비율 산출
  4) 규칙 기반 분류(text / image / mixed)
  5) 결과를 리스트[dict]로 반환 (후속 파이프라인 입력용)

  
분류 기준(기본값; 프로젝트 진행 중 데이터 기반으로 조정 권장)
  - TEXT_STRICT_THRESHOLD = 300   # 텍스트 길이(문자 수)
  - IMAGE_STRICT_THRESHOLD = 100  # 텍스트 길이(문자 수)
  - 이미지 개수 ≥ 1, 텍스트 길이 < IMAGE_STRICT_THRESHOLD → "image"
  - 텍스트 길이 > TEXT_STRICT_THRESHOLD, 이미지 개수 == 0 → "text"
  - 그 외 → "mixed"
  - 이미지 면적 비율(image_area_ratio)은 참고 지표로 산출 및 기록.

  + 1) page.get_drawings() 결과의 도형 개수를 반영 (drawing_count)
    2) 텍스트 밀도(text_length / page_area) 계산
    3) 두 지표를 활용한 보정 규칙:
        - drawing_count > DRAWING_THRESHOLD → mixed
        - text_density < TEXT_DENSITY_MIN → image/mixed로 보정

  
출력 형식(예시)
  [
    {
      "page_num": 1,
      "text_length": 520,
      "image_count": 0,
      "image_area_ratio": 0.031,
      "page_type": "text"
    },
    ...
  ]

실행 모드
  - 단일 파일 모드: --pdf 인자 지정
  - 일괄(batch) 모드: 인자 없이 실행 시 data/pdf_source/ 전체 처리

변경 이력
  - v1.0: 기본 규칙 기반 분류기 구현
  - v1.1: 일괄(batch) 처리 기능 통합
  - v2.0: 벡터 도형 및 텍스트 밀도 기반 보정 로직 추가
=============================================================================
"""

from __future__ import annotations

import json
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import List, Dict, Literal

import fitz  # PyMuPDF
from tqdm import tqdm
from Backend.core.config import get_settings

# -----------------------------------------------------------------------------
# 0) 분류 임계값(휴리스틱)
#    - 실제 데이터(149개 PDF) 통계를 보며 프로젝트 진행 중 수치 조정 권장
# -----------------------------------------------------------------------------
TEXT_STRICT_THRESHOLD: int = 300       # 텍스트가 많다고 판단할 최소 길이
IMAGE_STRICT_THRESHOLD: int = 100      # 텍스트가 거의 없다고 판단할 최대 길이
DRAWING_THRESHOLD: int = 10            # 벡터 도형이 많다고 판단할 기준 개수
TEXT_DENSITY_MIN: float = 0.0005       # 텍스트 밀도 최소 기준(낮으면 image/mixed)
PageType = Literal["text", "image", "mixed"]


# -----------------------------------------------------------------------------
# 1) 반환 데이터 구조 정의
#    - dataclass를 사용해 구조/타입을 명확히 하고, 후속 직렬화에 용이
# -----------------------------------------------------------------------------
@dataclass
class PageAnalysis:
    """단일 페이지 분석 결과를 표현하는 데이터 클래스."""
    page_num: int
    text_length: int
    image_count: int
    drawing_count: int
    image_area_ratio: float
    text_density: float
    page_type: PageType


# -----------------------------------------------------------------------------
# 2) 내부 유틸: 이미지 및 도형 면적 비율 계산
#    - get_images(full=True)로 xref 목록을 얻고, 각 xref의 bbox를 통해
#      면적을 추산하여 페이지 전체 면적 대비 비율을 산출
#    - 주의: PDF 구조/회전/트리밍 영향으로 근사치이며 절대값 아님
# -----------------------------------------------------------------------------
def _compute_image_area_ratio(page: fitz.Page, image_count: int) -> float:
    """페이지 내 이미지 총면적 비율(0.0~1.0)을 근사 계산한다."""
    if image_count <= 0:
        return 0.0

    page_area = float(page.rect.width * page.rect.height)
    if page_area <= 0:
        return 0.0

    total_img_area = 0.0
    # get_images()의 반환값 각 튜플의 첫 번째 요소가 xref
    for img in page.get_images(full=True):
        xref = img[0]
        # 해당 이미지의 바운딩 박스(좌표)를 통해 면적 근사
        try:
            bbox = page.get_image_bbox(xref)
            total_img_area += float(bbox.width * bbox.height)
        except Exception:
            # 일부 PDF는 bbox 계산이 실패할 수 있으므로 무시하고 진행
            continue

    ratio = total_img_area / page_area
    # 소수점 과도한 정밀도 방지: 후속 로깅/분석 가독성을 위해 반올림
    return round(max(0.0, min(1.0, ratio)), 6)


# -----------------------------------------------------------------------------
# 3) 핵심 분류 함수 (시각 보정 포함)
#    - 텍스트 길이/이미지 개수/이미지 면적 비율을 이용하여 page_type 결정
#    - 규칙은 단순하지만, 실제 서비스에서 가장 큰 성능 이득을 주는 단계
# -----------------------------------------------------------------------------
def classify_pdf_pages(pdf_path: str | Path) -> List[Dict]:
    """
    PDF 파일을 페이지 단위로 분석하여 각 페이지의 타입을 판별한다.

    Parameters
    ----------
    pdf_path : str | Path
        분석 대상 PDF 경로

    Returns
    -------
    List[Dict]
        PageAnalysis를 dict로 직렬화한 리스트
    """
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF 파일을 찾을 수 없습니다: {pdf_path}")

    results: List[PageAnalysis] = []

    # PyMuPDF로 문서 오픈
    with fitz.open(pdf_path) as doc:
        for i, page in enumerate(doc, start=1):
            # 1) 텍스트, 이미지, 도형 분석
            text = page.get_text("text") or ""
            text_len = len(text.strip())
            images = page.get_images(full=True)
            drawings = page.get_drawings()
            image_count = len(images)
            drawing_count = len(drawings)
            page_area = float(page.rect.width * page.rect.height)
            text_density = text_len / page_area if page_area > 0 else 0
            img_area_ratio = _compute_image_area_ratio(page, image_count)

            # 2) 기본 분류 규칙
            if text_len > TEXT_STRICT_THRESHOLD and image_count == 0:
                page_type: PageType = "text"
            elif text_len < IMAGE_STRICT_THRESHOLD and image_count >= 1:
                page_type = "image"
            else:
                page_type = "mixed"

            # 3) 보정 규칙 (시각적 복잡도)
            if drawing_count > DRAWING_THRESHOLD and page_type == "text":
                page_type = "mixed"
            if text_density < TEXT_DENSITY_MIN and page_type == "text":
                page_type = "mixed"

            # 4) 결과 저장
            results.append(
                PageAnalysis(
                    page_num=i,
                    text_length=text_len,
                    image_count=image_count,
                    drawing_count=drawing_count,
                    image_area_ratio=img_area_ratio,
                    text_density=round(text_density, 8),
                    page_type=page_type,
                )
            )

    return [asdict(r) for r in results]


# -----------------------------------------------------------------------------
# 4) 일괄(batch) 처리 함수
# -----------------------------------------------------------------------------
def batch_classify_all_pdfs() -> None:
    """모든 PDF를 v2 규칙으로 자동 분류"""
    _, paths = get_settings()
    source_dir = paths.PDF_SOURCE_DIR
    logs_dir = paths.LOGS_DIR
    logs_dir.mkdir(parents=True, exist_ok=True)

    pdf_files = list(Path(source_dir).glob("*.pdf"))
    if not pdf_files:
        print(f"[!] PDF 파일을 찾을 수 없습니다: {source_dir}")
        return

    print(f"총 {len(pdf_files)}개의 PDF를 분류합니다...")

    for pdf_path in tqdm(pdf_files, desc="Processing PDFs"):
        try:
            results = classify_pdf_pages(pdf_path)
            output_path = logs_dir / f"classifier_{pdf_path.stem}.json"
            with output_path.open("w", encoding="utf-8") as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[ERROR] {pdf_path.name}: {e}")

    print(f"\n✅ 모든 PDF 분류 완료. 결과는 {logs_dir} 폴더에 저장되었습니다.")


# -----------------------------------------------------------------------------
# 5) 실행 진입점
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    batch_classify_all_pdfs()