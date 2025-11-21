# ============================================================
#  File: module/rag_pipeline/upstage_batch_loader.py
# ============================================================
# [모듈 개요]
#   - Full/Backend/uploads/pdfs 폴더에 있는
#     가전제품 설명서 PDF들을 Upstage Document Parse API로 일괄 파싱한다.
#
#   - Upstage Document Parse HTTP API를 requests로 직접 호출해서
#       1) 페이지 단위 텍스트/마크다운
#       2) 페이지 메타데이터(elements.json; 좌표 포함)
#       3) 페이지 안의 "figure" 이미지(base64)만
#          → PNG 파일 + 메타데이터(figures.json)
#     까지 한 번에 생성한다.
#
#   - 산출물(Backend 기준):
#       • data/parsed/<doc_id>.md
#       • data/elements/<doc_id>_elements.json
#       • data/figures/<doc_id>/
#           ├─ page_001_figure_001.png
#           └─ <doc_id>_figures.json
#
# [연계 흐름(Backend 관점)]
#   1) 기업 담당자가 제품을 등록하면서 PDF를 업로드하면
#        → Full/Backend/uploads/pdfs/<파일명>.pdf 로 저장 (api/products.py)
#   2) 백그라운드 작업(document_pr.py)에서 이 모듈을 호출해
#        → 업로드된 PDF를 Upstage Document Parse 로 파싱
#   3) 본 모듈 산출물:
#        - data/parsed/*.md
#        - data/elements/*_elements.json
#        - data/figures/*/*
#      를 기반으로
#        - 텍스트/표 정규화
#        - 이미지 캡션 생성(Gemini 등; 좌표 기반 문맥 활용)
#        - 청킹 → 임베딩 → RAG 등 후속 파이프라인 진행
#
# [Upstage Document Parse HTTP 호출 방식]
#   - 엔드포인트:
#       POST https://api.upstage.ai/v1/document-ai/document-parse
#   - 헤더:
#       Authorization: Bearer <UPSTAGE_API_KEY>
#   - 바디 (multipart/form-data):
#       files = { "document": <PDF 바이너리> }
#       data  = {
#           "ocr": "auto" 또는 "force",
#           "model": "document-parse" (또는 환경변수로 지정한 모델명),
#           "output_formats": "['markdown']",
#           "coordinates": True,
#           "base64_encoding": "['figure']",
#       }
#   - 응답(JSON) 구조(요약):
#       {
#         "elements": [
#           {
#             "id": "...",
#             "page": 0,         # 0-based 페이지 인덱스
#             "category": "...",
#             "content": {
#               "text": "...",
#               "html": "...",
#               "markdown": "...",
#             },
#             "coordinates": [...],       # 선택
#             "base64_encoding": [...],   # 선택 (figure 등)
#           },
#           ...
#         ]
#       }
#
#   - langchain-upstage의 UpstageDocumentParseLoader / Parser 내부 구현을
#     참고하여, 같은 옵션(split='page', output_format='markdown', coordinates=True,
#     base64_encoding=['figure'])로 직접 호출하도록 구현했다.
#
# [이번 버전의 핵심 포인트]
#   1) langchain-upstage 의존성 제거
#      - 더 이상 `from langchain_upstage import UpstageDocumentParseLoader` 를 사용하지 않는다.
#      - 대신 requests로 Upstage Document Parse API를 직접 호출한다.
#
#   2) Document 구조는 이전(test3)과 최대한 동일하게 유지
#      - 여전히 langchain_core.documents.Document 객체를 사용한다.
#      - metadata:
#           "page"              : 페이지 번호(0-based)
#           "base64_encodings"  : 각 페이지의 base64_encoding 목록
#           "coordinates"       : 각 페이지의 coordinates 목록
#      - 따라서 이후 파이프라인(image_captioner_gemini.py, 청킹/임베딩 등)은
#        구조를 크게 바꾸지 않고 재사용 가능하다.
#
# [Backend 내 디렉터리 규칙]
#   - PROJECT_ROOT : Full/Backend (이 파일 기준으로 두 단계 위 폴더)
#   - RAW_DIR      : PROJECT_ROOT / "uploads" / "pdfs"
#                    (제품 등록 시 업로드되는 설명서 PDF 위치)
#   - PARSED_DIR   : PROJECT_ROOT / "data" / "parsed"
#   - ELEMENTS_DIR : PROJECT_ROOT / "data" / "elements"
#   - FIGURES_DIR  : PROJECT_ROOT / "data" / "figures"
#
# [재실행 전략]
#   - 기본(default):
#       • data/parsed/<doc_id>.md
#       • data/elements/<doc_id>_elements.json
#       • data/figures/<doc_id>/<doc_id>_figures.json
#     이 모두 존재하면 해당 PDF는 SKIP.
#   - --force 옵션:
#     위 산출물이 있어도 모두 삭제 후
#     Upstage API를 다시 호출하여 새로 생성.
#
# [사용 예] (Backend 폴더에서 실행한다고 가정)
#   - 전체 문서를 한 번만 파싱 (기존 결과 유지):
#       (.venv) > python -m module.rag_pipeline.upstage_batch_loader
#
#   - 기존 parsed/elements/figures 를 전부 지우고 새로 파싱:
#       (.venv) > python -m module.rag_pipeline.upstage_batch_loader --force
#
#   - 특정 doc_id만 강제로 다시 파싱 (예: SIF-20FLY.pdf):
#       (.venv) > python -m module.rag_pipeline.upstage_batch_loader --doc-id SIF-20FLY --force
#
# [사전 준비]
#   1) .env 파일 (Full/Backend/.env)
#        UPSTAGE_API_KEY=up_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
#        # (선택) 모델 버전을 바꾸고 싶다면:
#        # UPSTAGE_DOCUMENT_PARSE_MODEL=document-parse-250116
#
#   2) 패키지 설치
#        pip install -U requests langchain-core python-dotenv Pillow
# ============================================================

from __future__ import annotations

import os
import io
import json
import base64
import logging
import argparse
import shutil
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

import requests
from dotenv import load_dotenv
from PIL import Image
from langchain_core.documents import Document


# ----------------------------- 경로 및 상수 정의 -----------------------------


# 이 파일(module/rag_pipeline/upstage_batch_loader.py)을 기준으로 Backend 루트 계산
#   .../Full/Backend/module/rag_pipeline/upstage_batch_loader.py
#   parents[0] = .../module/rag_pipeline
#   parents[1] = .../module
#   parents[2] = .../Backend   ← 여기까지를 PROJECT_ROOT로 사용
PROJECT_ROOT: Path = Path(__file__).resolve().parents[2]

# 원본 PDF 디렉터리:
#   제품 등록 시 api/products.py 에서 Full/Backend/uploads/pdfs 에 저장하므로
#   그대로 여기서 RAW_DIR로 사용한다.
RAW_DIR: Path = PROJECT_ROOT / "uploads" / "pdfs"

# 파싱된 마크다운 출력 디렉터리: Full/Backend/data/parsed
PARSED_DIR: Path = PROJECT_ROOT / "data" / "parsed"

# 요소 메타데이터 JSON 디렉터리: Full/Backend/data/elements
ELEMENTS_DIR: Path = PROJECT_ROOT / "data" / "elements"

# 그림(figure 이미지) 디렉터리 루트: Full/Backend/data/figures
FIGURES_ROOT_DIR: Path = PROJECT_ROOT / "data" / "figures"

# 환경 변수(.env) 위치: Full/Backend/.env
ENV_FILE_PATH: Path = PROJECT_ROOT / ".env"
UPSTAGE_API_KEY_ENV: str = "UPSTAGE_API_KEY"

# Upstage Document Parse HTTP API 기본 URL
UPSTAGE_DOCUMENT_PARSE_URL_DEFAULT: str = "https://api.upstage.ai/v1/document-ai/document-parse"


# ----------------------------- 로깅 설정 함수 -----------------------------


def configure_logging() -> None:
    """
    모듈 전체에서 사용할 기본 로깅 설정을 초기화한다.

    - 로그 레벨: INFO
    - 포맷   : [LEVEL] 메시지
    """
    logging.basicConfig(
        level=logging.INFO,
        format="[%(levelname)s] %(message)s",
    )


# ----------------------------- 초기화 / 유틸 함수 -----------------------------


def load_environment() -> None:
    """
    .env 파일을 로드하여 환경 변수를 설정한다.

    - Full/Backend/.env 파일을 우선적으로 읽는다.
    - 이미 설정된 OS 환경 변수 값은 덮어쓰지 않는다(override=False).
    """
    if ENV_FILE_PATH.exists():
        load_dotenv(ENV_FILE_PATH, override=False)
        logging.info("환경 변수 로드 완료: %s", ENV_FILE_PATH)
    else:
        logging.warning(".env 파일이 존재하지 않습니다: %s", ENV_FILE_PATH)


def ensure_directories() -> None:
    """
    파싱 결과를 저장할 디렉터리(PARSED_DIR, ELEMENTS_DIR, FIGURES_ROOT_DIR)를 생성한다.

    - 이미 존재하면 아무 작업도 하지 않는다.
    """
    PARSED_DIR.mkdir(parents=True, exist_ok=True)
    ELEMENTS_DIR.mkdir(parents=True, exist_ok=True)
    FIGURES_ROOT_DIR.mkdir(parents=True, exist_ok=True)
    logging.info(
        "출력 디렉터리 준비 완료: %s, %s, %s",
        PARSED_DIR,
        ELEMENTS_DIR,
        FIGURES_ROOT_DIR,
    )


def list_pdf_files(target_doc_id: Optional[str] = None) -> List[Path]:
    """
    RAW_DIR(Full/Backend/uploads/pdfs) 아래의 PDF 파일 목록을 정렬된 리스트로 반환한다.

    Args:
        target_doc_id:
            특정 파일만 처리하고 싶을 때, 확장자를 제외한 파일명.
            예: "SIF-20FLY" 지정 시 "SIF-20FLY.pdf"만 대상으로 한다.

    Returns:
        List[Path]: RAW_DIR 아래의 .pdf 파일 경로 목록

    Raises:
        FileNotFoundError: RAW_DIR가 존재하지 않을 경우
    """
    if not RAW_DIR.exists():
        raise FileNotFoundError(f"RAW_DIR이 존재하지 않습니다: {RAW_DIR}")

    if target_doc_id:
        pdf_path = RAW_DIR / f"{target_doc_id}.pdf"
        if not pdf_path.exists():
            logging.warning(
                "요청한 doc-id에 해당하는 PDF를 찾을 수 없습니다: %s", pdf_path
            )
            return []
        pdf_files = [pdf_path]
    else:
        pdf_files = sorted(RAW_DIR.glob("*.pdf"))

    logging.info("원본 PDF 파일 수: %d개 (경로: %s)", len(pdf_files), RAW_DIR)
    return pdf_files


# ----------------------------- Upstage 파싱 관련 함수 -----------------------------


def _parse_upstage_elements_to_documents(
    elements: List[Dict[str, Any]],
    output_format: str = "markdown",
) -> List[Document]:
    """
    Upstage Document Parse 응답의 elements 리스트를
    langchain_core.documents.Document 리스트로 변환한다.

    이 함수는 langchain-upstage의 UpstageDocumentParseParser(split="page")가
    하는 일을 간단히 재구현한 것이다.

    동작 요약:
        1) elements를 page 값 기준으로 그룹화한다.
        2) 같은 page 그룹 내의 content[output_format]을 공백으로 이어붙여
           페이지 단위 텍스트를 만든다.
        3) base64_encoding / coordinates 필드를 페이지 단위로 모아서
           metadata["base64_encodings"] / metadata["coordinates"]에 저장한다.

    Args:
        elements:
            Upstage Document Parse API 응답의 "elements" 리스트.
        output_format:
            content에서 사용할 필드 이름 ("text" | "html" | "markdown").

    Returns:
        List[Document]:
            페이지 단위로 생성된 Document 객체 리스트.
            - page_content: 해당 페이지의 전체 텍스트
            - metadata:
                "page"              : 페이지 번호(0-based)
                "base64_encodings"  : base64 정보 목록(있을 때만)
                "coordinates"       : 좌표 정보 목록(있을 때만)
    """
    if not elements:
        return []

    # elements 안에 있는 page 값(0-based)을 모두 모아서 정렬된 목록 생성
    pages = sorted({el.get("page", 0) for el in elements})

    documents: List[Document] = []

    for page in pages:
        # 현재 page에 해당하는 element들만 추출
        group = [el for el in elements if el.get("page", 0) == page]

        page_text_parts: List[str] = []
        base64_list: List[Any] = []
        coord_list: List[Any] = []

        for el in group:
            # Upstage 응답에서 텍스트는 el["content"][output_format] 형태로 들어온다.
            content: Dict[str, Any] = el.get("content", {}) or {}
            text_value = content.get(output_format) or ""
            page_text_parts.append(text_value)

            # figure 등에서 base64_encoding 필드가 들어올 수 있다.
            if "base64_encoding" in el and el["base64_encoding"] is not None:
                base64_list.append(el["base64_encoding"])

            # coordinates 필드(정규화 bbox 좌표)가 있을 수 있다.
            if "coordinates" in el and el["coordinates"] is not None:
                coord_list.append(el["coordinates"])

        # 페이지 메타데이터 구성
        metadata: Dict[str, Any] = {"page": page}
        if base64_list:
            metadata["base64_encodings"] = base64_list
        if coord_list:
            metadata["coordinates"] = coord_list

        documents.append(
            Document(
                page_content=" ".join(page_text_parts),
                metadata=metadata,
            )
        )

    return documents


def parse_pdf_with_upstage(
    pdf_path: Path,
    ocr_mode: str = "auto",
) -> List[Document]:
    """
    단일 PDF 파일을 Upstage Document Parse HTTP API로 파싱하여
    페이지 단위 Document 리스트로 반환한다.

    - langchain-upstage의 UpstageDocumentParseLoader(split="page", output_format="markdown")
      와 동일한 옵션을 직접 HTTP로 호출하여 흉내낸 구현이다.

    Args:
        pdf_path (Path):
            파싱할 PDF 파일 경로.
        ocr_mode (str):
            Upstage OCR 모드.
            - "auto"  : PDF는 텍스트 기반 파싱, 스캔본은 OCR 자동 처리
            - "force" : 무조건 OCR 사용 (스캔본 위주 문서에 사용)

    Returns:
        List[Document]:
            페이지 단위로 생성된 LangChain Document 객체 리스트.
    """
    api_key = os.getenv(UPSTAGE_API_KEY_ENV)
    if not api_key:
        raise RuntimeError(
            f"{UPSTAGE_API_KEY_ENV} 환경 변수가 설정되어 있지 않습니다. "
            f".env 파일 또는 OS 환경변수를 확인해 주세요."
        )

    # 모델 이름은 환경변수로 오버라이드 가능 (없으면 기본 "document-parse")
    model_name = os.getenv("UPSTAGE_DOCUMENT_PARSE_MODEL", "document-parse")

    # 엔드포인트 URL도 필요시 환경변수로 오버라이드 가능
    base_url = os.getenv(
        "UPSTAGE_DOCUMENT_PARSE_URL",
        UPSTAGE_DOCUMENT_PARSE_URL_DEFAULT,
    )

    headers = {
        "Authorization": f"Bearer {api_key}",
    }

    # langchain_upstage.document_parse_parsers.UpstageDocumentParseParser 의
    # _get_response 구현을 참고한 옵션 설정:
    #
    #   data={
    #       "ocr": self.ocr,
    #       "model": self.model,
    #       "output_formats": f"['{self.output_format}']",
    #       "coordinates": self.coordinates,
    #       "base64_encoding": f"{self.base64_encoding}",
    #   }
    #
    # 여기서는 output_format="markdown", base64_encoding=["figure"] 로 고정한다.
    data = {
        "ocr": ocr_mode,
        "model": model_name,
        "output_formats": "['markdown']",
        "coordinates": True,
        "base64_encoding": "['figure']",
    }

    # 파일 업로드: multipart/form-data 로 "document" 필드에 PDF 바이너리 첨부
    with open(pdf_path, "rb") as f:
        files = {"document": f}
        try:
            response = requests.post(
                base_url,
                headers=headers,
                files=files,
                data=data,
                timeout=120,
            )
            response.raise_for_status()
        except requests.HTTPError as e:
            # Upstage 쪽에서 에러 메시지를 JSON/텍스트로 내려주는 경우를 그대로 보여주기 위해
            text = e.response.text if e.response is not None else str(e)
            raise RuntimeError(f"Upstage Document Parse HTTP 오류: {text}") from e
        except requests.RequestException as e:
            raise RuntimeError(f"Upstage Document Parse 요청 실패: {e}") from e

    try:
        payload = response.json()
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Upstage 응답 JSON 파싱 실패: {e}") from e

    elements: List[Dict[str, Any]] = payload.get("elements", []) or []

    if not elements:
        logging.warning(
            "[WARN] Upstage Document Parse 응답에 elements 가 비어 있습니다: %s",
            pdf_path.name,
        )
        return []

    # elements → 페이지 단위 Document 리스트로 변환
    docs = _parse_upstage_elements_to_documents(elements, output_format="markdown")
    return docs


# ----------------------------- 텍스트/요소 저장 함수 -----------------------------


def save_docs_as_markdown(docs: List[Document], out_path: Path) -> None:
    """
    페이지 단위 LangChain Document 리스트를 하나의 마크다운 파일로 저장한다.

    저장 형식 예:
        # [p0]
        (0페이지 내용)

        # [p1]
        (1페이지 내용)
        ...

    주의:
        - Upstage Document Parse의 page 인덱스는 0부터 시작한다.
          (기존 langchain-upstage 기반 구현과 동일하게 0-based를 그대로 사용한다.)

    Args:
        docs (List[Document]):
            Upstage Document Parse 결과로 얻은 Document 리스트.
        out_path (Path):
            결과를 저장할 마크다운 파일 경로.
    """
    lines: List[str] = []

    for idx, doc in enumerate(docs, start=1):
        # metadata 내부에 page 정보가 있으면 사용하고, 없으면 idx 사용
        page_no = doc.metadata.get("page", idx)

        # 페이지 헤더를 추가하여 페이지 경계를 명확히 한다.
        lines.append(f"# [p{page_no}]")
        lines.append((doc.page_content or "").strip())
        lines.append("")  # 페이지 사이에 공백 줄 추가

    out_path.write_text("\n".join(lines), encoding="utf-8")
    logging.info("마크다운 저장 완료: %s (페이지 수: %d)", out_path, len(docs))


def build_elements_payload(
    doc_id: str,
    docs: List[Document],
) -> Dict[str, Any]:
    """
    elements.json에 저장할 페이로드를 생성한다.

    구조 예:
        {
          "doc_id": "SIF-20FLY",
          "elements": [
            {
              "index": 1,
              "page": 0,
              "content": "...",
              "metadata": { ... }  # page, coordinates, base64_encodings 등
            },
            ...
          ]
        }

    Args:
        doc_id (str):
            문서 식별자 (파일명에서 확장자를 제거한 값).
        docs (List[Document]):
            Upstage Document Parse 결과.

    Returns:
        Dict[str, Any]: JSON으로 직렬화 가능한 페이로드 딕셔너리.
    """
    elements: List[Dict[str, Any]] = []

    for idx, doc in enumerate(docs, start=1):
        page_no = doc.metadata.get("page", idx - 1)

        element: Dict[str, Any] = {
            "index": idx,                # 문서 내 요소 순번 (페이지 순서)
            "page": page_no,             # 페이지 번호 (0-based)
            "content": doc.page_content, # 페이지 전체 텍스트(마크다운)
            "metadata": doc.metadata,    # 좌표 / base64_encodings 등 전체 메타데이터
        }
        elements.append(element)

    payload: Dict[str, Any] = {
        "doc_id": doc_id,
        "elements": elements,
    }
    return payload


def save_elements_as_json(
    doc_id: str,
    docs: List[Document],
    out_path: Path,
) -> None:
    """
    Document 리스트를 기반으로 elements.json을 저장한다.

    Args:
        doc_id (str):
            문서 식별자 (파일명에서 확장자를 제거한 값).
        docs (List[Document]):
            Upstage Document Parse 결과.
        out_path (Path):
            결과를 저장할 JSON 파일 경로.
    """
    payload = build_elements_payload(doc_id, docs)

    out_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, default=str),
        encoding="utf-8",
    )
    logging.info(
        "elements.json 저장 완료: %s (요소 수: %d)",
        out_path,
        len(payload["elements"]),
    )


# ----------------------------- figure(base64) 처리 헬퍼 함수 -----------------------------


def _decode_base64_image_to_pil(img_b64: str) -> Image.Image:
    """
    base64 문자열을 디코딩하여 PIL Image 객체로 변환한다.

    - data URL 형식("data:image/png;base64,...")이 들어오는 경우도 대비해
      콤마 뒤의 순수 base64 부분만 사용한다.
    """
    if img_b64.startswith("data:"):
        # "data:image/png;base64,XXXX..." → "XXXX..."
        img_b64 = img_b64.split(",", 1)[1]

    img_data = base64.b64decode(img_b64)
    buffer = io.BytesIO(img_data)
    img = Image.open(buffer)

    # 캡션/임베딩용으로는 RGB 변환이 무난
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")
    return img


def _extract_b64_and_coords_from_item(
    item: Any,
) -> Tuple[Optional[str], Optional[List[Dict[str, float]]]]:
    """
    metadata["base64_encodings"] 항목 하나에서
    - 실제 base64 문자열
    - (있다면) 정규화 좌표 리스트
    를 추출한다.

    지원 시나리오:
      1) 단순 문자열:
         - item: "iVBORw0KGgoAAAANSUhEUgAA..."
           → (base64, None)
      2) dict 기반(Upstage 포맷 확장 대비):
         - item: {"data": "...", "coordinates": [ {x, y}, ... ]}
           → ("...", coordinates)
         - item: {"base64": "...", "bbox": [ {x, y}, ... ]}
           → ("...", bbox)
         - 인식 불가 포맷이면 (None, None) 반환

    반환:
        (img_b64 or None, coords or None)
    """
    # 1) 문자열인 경우: 좌표는 없는 것으로 간주
    if isinstance(item, str):
        return item, None

    # 2) dict인 경우: 여러 키 후보를 순서대로 검사
    if isinstance(item, dict):
        img_b64: Optional[str] = None
        coords: Optional[List[Dict[str, float]]] = None

        # base64 문자열 키 후보
        if isinstance(item.get("data"), str):
            img_b64 = item["data"]
        elif isinstance(item.get("base64"), str):
            img_b64 = item["base64"]
        elif isinstance(item.get("image"), str):
            img_b64 = item["image"]

        # 좌표 키 후보
        raw_coords = (
            item.get("coordinates")
            or item.get("bbox")
            or item.get("bounding_box")
        )
        if isinstance(raw_coords, list):
            # [{x, y}, ...] 형태만 간단히 통과시키고, 나머지는 캡셔닝 단계에서 추가 처리
            coords_clean: List[Dict[str, float]] = []
            for pt in raw_coords:
                if not isinstance(pt, dict):
                    continue
                if "x" in pt and "y" in pt:
                    try:
                        x_val = float(pt["x"])
                        y_val = float(pt["y"])
                        coords_clean.append({"x": x_val, "y": y_val})
                    except Exception:
                        continue
            if coords_clean:
                coords = coords_clean

        return img_b64, coords

    # 그 외 타입은 지원하지 않음
    return None, None


def _compute_center_from_coords(
    coords: Optional[List[Dict[str, float]]],
) -> Optional[Dict[str, float]]:
    """
    좌표 리스트(보통 4개의 꼭짓점)에 대해 중심점(x, y)을 계산한다.

    Args:
        coords:
            - None 또는 빈 리스트인 경우 → None 반환
            - [{"x": 0.1, "y": 0.2}, ...] 형태라고 가정

    Returns:
        dict | None:
            - {"x": center_x, "y": center_y}
    """
    if not coords:
        return None

    xs: List[float] = []
    ys: List[float] = []
    for pt in coords:
        try:
            xs.append(float(pt["x"]))
            ys.append(float(pt["y"]))
        except Exception:
            continue

    if not xs or not ys:
        return None

    center_x = sum(xs) / len(xs)
    center_y = sum(ys) / len(ys)
    return {"x": center_x, "y": center_y}


# ----------------------------- figure(base64) 처리 함수 -----------------------------


def save_figures_from_docs(
    doc_id: str,
    pdf_path: Path,
    docs: List[Document],
) -> None:
    """
    Upstage Document Parse 결과 docs를 이용해,
    metadata["base64_encodings"]에 포함된 figure 이미지를 추출하고
    PNG + 메타데이터 JSON을 저장한다.

    이번 버전에서는 Upstage가 base64 항목에 좌표 정보를 넘겨줄 수 있다고 가정하고,
    가능한 경우 다음 필드를 함께 figures 메타에 저장한다.

        - bbox_norm        : [{x, y}, ...]  (페이지 기준 정규화 좌표)
        - bbox_center_norm : {"x": ..., "y": ...} (정규화 중심점)

    좌표가 없는 경우에는 두 필드가 None으로 남을 수 있으며, 이후
    image_captioner_gemini.py 에서 "페이지 전체 텍스트 fallback" 전략을 사용한다.

    출력(Backend 기준):
        data/figures/<doc_id>/
          ├─ page_001_figure_001.png
          └─ <doc_id>_figures.json
    """
    doc_fig_dir = FIGURES_ROOT_DIR / doc_id
    doc_fig_dir.mkdir(parents=True, exist_ok=True)

    figures_meta_path = doc_fig_dir / f"{doc_id}_figures.json"

    figures_meta: List[Dict[str, Any]] = []
    global_index: int = 0  # 문서 전체에서의 그림 인덱스

    for page_idx, doc in enumerate(docs, start=1):
        page_no = int(doc.metadata.get("page", page_idx))
        img_list = doc.metadata.get("base64_encodings", []) or []

        if not img_list:
            continue

        logging.info(
            "  - page=%d 에서 figure base64 이미지 %d개 발견", page_no, len(img_list)
        )

        for i, raw_item in enumerate(img_list, start=1):
            # base64 문자열 + (있다면) 좌표 추출
            img_b64, bbox_norm = _extract_b64_and_coords_from_item(raw_item)
            if not img_b64:
                logging.warning(
                    "    [WARN] base64 추출 실패 (page=%d, idx=%d, item 타입=%s)",
                    page_no,
                    i,
                    type(raw_item).__name__,
                )
                continue

            try:
                img = _decode_base64_image_to_pil(img_b64)
            except Exception as e:
                logging.warning(
                    "    [WARN] base64 디코딩 실패 (page=%d, idx=%d): %s",
                    page_no,
                    i,
                    e,
                )
                continue

            global_index += 1

            # 파일명 규칙: page_001_figure_001.png (문서 전체 기준 인덱스 사용)
            img_filename = f"page_{page_no:03d}_figure_{global_index:03d}.png"
            img_path = doc_fig_dir / img_filename

            img.save(img_path, format="PNG")

            # Backend 루트 기준 상대 경로 저장: "data/figures/..." 형태
            rel_path = img_path.relative_to(PROJECT_ROOT).as_posix()

            # 좌표가 있으면 중심점 계산
            bbox_center_norm = _compute_center_from_coords(bbox_norm) if bbox_norm else None

            meta: Dict[str, Any] = {
                "file": rel_path,
                "page": page_no,
                "index": global_index,
                "size_px": list(img.size),  # [width, height]
            }

            # 좌표 정보가 있을 때만 필드를 추가 (JSON이 깔끔하도록)
            if bbox_norm:
                meta["bbox_norm"] = bbox_norm
            if bbox_center_norm:
                meta["bbox_center_norm"] = bbox_center_norm

            figures_meta.append(meta)

    if not figures_meta:
        logging.warning(
            "[WARN] doc_id=%s 에서 추출된 figure 이미지가 없습니다.",
            doc_id,
        )
        # 원하는 경우, 빈 메타 파일을 저장하도록 바꿀 수 있음.
        return

    meta_payload: Dict[str, Any] = {
        "doc_id": doc_id,
        "source_pdf": pdf_path.relative_to(PROJECT_ROOT).as_posix(),
        "num_figures": len(figures_meta),
        "images": figures_meta,
    }

    figures_meta_path.write_text(
        json.dumps(meta_payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    logging.info(
        "[FIGURES DONE] doc_id=%s, num_figures=%d, 메타=%s",
        doc_id,
        len(figures_meta),
        figures_meta_path,
    )


# ----------------------------- 메인 실행 함수 -----------------------------


def main() -> None:
    """
    upstage_batch_loader의 메인 엔트리 포인트.

    수행 순서:
        1) 인자 파싱 (--force, --doc-id)
        2) 로깅 및 환경 변수 초기화
        3) UPSTAGE_API_KEY 존재 여부 확인
        4) 출력 디렉터리 생성
        5) RAW_DIR(uploads/pdfs) 아래 PDF 파일 목록 조회
        6) 각 PDF에 대해:
            - 기본 모드(default)
                · data/parsed/<doc_id>.md
                · data/elements/<doc_id>_elements.json
                · data/figures/<doc_id>/<doc_id>_figures.json
              이 모두 존재하면 SKIP
            - --force 모드
                · 위 산출물이 있어도 삭제 후
                  Upstage Document Parse HTTP API로 다시 파싱하여
                  마크다운(.md) + elements.json + figures PNG/JSON 생성
    """
    parser = argparse.ArgumentParser(
        description="Upstage Document Parse API를 이용해 PDF 설명서를 일괄 파싱하는 스크립트",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help=(
            "기존 data/parsed, data/elements, data/figures 결과를 "
            "해당 doc_id 기준으로 삭제하고 새로 생성합니다."
        ),
    )
    parser.add_argument(
        "--doc-id",
        type=str,
        default=None,
        help="특정 PDF만 처리하고 싶을 때, 확장자를 제외한 파일명 (예: SIF-20FLY)",
    )
    args = parser.parse_args()

    configure_logging()
    load_environment()

    # 1. Upstage API 키 확인
    api_key = os.getenv(UPSTAGE_API_KEY_ENV)
    if not api_key:
        raise RuntimeError(
            f"환경 변수 {UPSTAGE_API_KEY_ENV} 가 설정되어 있지 않습니다. "
            f"Full/Backend/.env 파일에 '{UPSTAGE_API_KEY_ENV}=YOUR_API_KEY' 형식으로 "
            f"추가했는지 확인해 주세요. (현재 PROJECT_ROOT: {PROJECT_ROOT})"
        )
    logging.info("UPSTAGE_API_KEY 확인 완료.")

    # 2. 출력 디렉터리 준비
    ensure_directories()

    # 3. 원본 PDF 목록 조회 (필요 시 doc-id 한정)
    pdf_files = list_pdf_files(target_doc_id=args.doc_id)
    if not pdf_files:
        logging.info("처리할 PDF 파일이 없습니다. RAW_DIR: %s", RAW_DIR)
        return

    logging.info("총 %d개 PDF 문서 처리 시작.", len(pdf_files))

    # 4. 각 PDF 파일 처리
    for pdf_path in pdf_files:
        doc_id = pdf_path.stem  # 예: "SIF-20FLY.pdf" → "SIF-20FLY"

        md_path = PARSED_DIR / f"{doc_id}.md"
        elements_path = ELEMENTS_DIR / f"{doc_id}_elements.json"
        figures_dir = FIGURES_ROOT_DIR / doc_id
        figures_meta_path = figures_dir / f"{doc_id}_figures.json"

        # --force 인 경우, 기존 산출물을 먼저 제거
        if args.force:
            if md_path.exists():
                md_path.unlink()
                logging.info("기존 마크다운 삭제(--force): %s", md_path)
            if elements_path.exists():
                elements_path.unlink()
                logging.info("기존 elements.json 삭제(--force): %s", elements_path)
            if figures_dir.exists():
                shutil.rmtree(figures_dir, ignore_errors=True)
                logging.info("기존 figures 디렉터리 삭제(--force): %s", figures_dir)

        md_exists = md_path.exists()
        elements_exists = elements_path.exists()
        figures_exists = figures_meta_path.exists()

        # 세 산출물 모두 이미 있으면 완전히 처리된 문서로 간주하고 건너뜀.
        if not args.force and md_exists and elements_exists and figures_exists:
            logging.info(
                "[SKIP] 이미 텍스트 + elements + figures 생성 완료: %s", doc_id
            )
            continue

        logging.info(
            "[PARSE] %s → %s, %s, %s",
            pdf_path.name,
            md_path.name,
            elements_path.name,
            figures_meta_path.name,
        )

        try:
            docs = parse_pdf_with_upstage(pdf_path, ocr_mode="auto")
        except Exception as e:
            logging.error("[ERROR] Upstage 파싱 중 오류 발생 (%s): %s", pdf_path.name, e)
            continue

        if not docs:
            logging.warning(
                "[WARN] 파싱 결과가 비어 있습니다. 문서를 확인해 주세요: %s",
                pdf_path.name,
            )
            continue

        # 마크다운, elements.json, figures를 각각 생성
        try:
            if not md_exists:
                save_docs_as_markdown(docs, md_path)
            else:
                logging.info(
                    "[INFO] 마크다운 파일은 이미 존재합니다. 건너뜀: %s",
                    md_path.name,
                )

            if not elements_exists:
                save_elements_as_json(doc_id, docs, elements_path)
            else:
                logging.info(
                    "[INFO] elements.json은 이미 존재합니다. 건너뜀: %s",
                    elements_path.name,
                )

            if not figures_exists:
                save_figures_from_docs(doc_id, pdf_path, docs)
            else:
                logging.info(
                    "[INFO] figures 메타는 이미 존재합니다. 건너뜀: %s",
                    figures_meta_path.name,
                )

        except Exception as e:
            logging.error(
                "[ERROR] 산출물 저장 중 오류 발생 (%s): %s", pdf_path.name, e
            )
            continue

    logging.info("모든 PDF 처리 완료.")


# ----------------------------- 스크립트 실행 구문 -----------------------------


if __name__ == "__main__":
    main()
