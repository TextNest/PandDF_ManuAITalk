# ============================================================
#  File: module/rag_pipeline/product_metadata_extractor.py
# ============================================================
# [모듈 개요]
#   - 전처리 결과(정규화 마크다운)를 기반으로
#     제품 메타데이터를 LLM(Gemini 2.5 Flash)로 추출한 뒤,
#     MySQL DB(test_products / tb_product)에 업데이트하는 유틸 모듈.
#
# [입력 가정]
#   - doc_id(= product_id): 예) "SDM-WHT330HS"
#   - 전처리 파이프라인에서 생성된 파일:
#       • data/normalized/<doc_id>.md          (우선 사용)
#       • 또는 data/parsed/<doc_id>_parsed.md  (폴백)
#
# [출력/동작]
#   1) 마크다운 일부(소개, 제품 사양, 규격 등)에서 LLM이 읽기 좋은 컨텍스트 추출
#   2) Gemini 2.5 Flash 에게 "JSON 포맷"으로 다음 필드 추출 요청:
#        - product_name : 제품명 (설명서 기준)
#        - category     : 제품 카테고리 (예: '전기 주방가전 - 토스터')
#        - manufacturer : 제조사명
#        - description  : 2~3문장 요약(한국어)
#        - release_date : 'YYYY-MM-DD' 또는 'YYYY-MM' 또는 null
#        - width_mm     : 가로(mm)
#        - height_mm    : 세로(mm)
#        - depth_mm     : 깊이(mm)
#   3) test_products 테이블의 해당 row를 업데이트
#       - analysis_status = COMPLETED 로 변경
#
# [사용 예시]
#   1) CLI:
#       (.venv) > python -m module.rag_pipeline.product_metadata_extractor \
#                       --doc-id SDM-WHT330HS \
#                       --product-internal-id 3
#
#   2) 코드 내에서 (document_pr.trigger_pdf_processing 에서):
#       from module.rag_pipeline.product_metadata_extractor import (
#           extract_and_update_product_metadata,
#       )
#
#       await extract_and_update_product_metadata(
#           doc_id=product.product_id,
#           product_internal_id=product.internal_id,
#       )
#
# ============================================================

from __future__ import annotations

import argparse
import json
import logging
import os
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, Optional

import asyncio
from dotenv import load_dotenv
from google import genai
from google.genai import types
from sqlalchemy import text, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.db_config import get_session_text  # AsyncSession factory
from models.product import Product
from schemas.product import AnalysisStatus

# ----------------------------- 경로 / 상수 -----------------------------

# 이 파일(module/rag_pipeline/...) 기준 Backend 루트
PROJECT_ROOT: Path = Path(__file__).resolve().parents[2]

ENV_FILE_PATH: Path = PROJECT_ROOT / ".env"

NORMALIZED_DIR: Path = PROJECT_ROOT / "data" / "normalized"
PARSED_DIR: Path = PROJECT_ROOT / "data" / "parsed"

DEFAULT_MODEL_NAME: str = "gemini-2.5-flash"
DEFAULT_MAX_CHARS: int = 16000  # LLM에 넘길 컨텍스트 최대 길이 (문자 기준)


# ----------------------------- 로깅 / 공통 유틸 -----------------------------


def configure_logging() -> None:
    """기본 로깅 설정."""
    logging.basicConfig(
        level=logging.INFO,
        format="[%(levelname)s] %(message)s",
    )


def load_gemini_client() -> genai.Client:
    """
    Google Gemini API 클라이언트 초기화.

    - Backend/.env 에서 GEMINI_API_KEY 또는 GOOGLE_API_KEY 를 읽어 사용.
    """
    if ENV_FILE_PATH.exists():
        load_dotenv(ENV_FILE_PATH, override=False)
        logging.info("환경 변수 로드 완료: %s", ENV_FILE_PATH)
    else:
        logging.warning(".env 파일이 없습니다: %s", ENV_FILE_PATH)

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY 또는 GOOGLE_API_KEY가 설정되어 있지 않습니다.")

    client = genai.Client(api_key=api_key)
    logging.info("Gemini 클라이언트 초기화 완료.")
    return client


# ----------------------------- 컨텍스트 로딩 -----------------------------


def _load_manual_markdown(doc_id: str, max_chars: int = DEFAULT_MAX_CHARS) -> str:
    """
    전처리된 마크다운을 로드한다.

    우선순위:
      1) data/normalized/<doc_id>.md
      2) data/parsed/<doc_id>_parsed.md

    너무 길면 max_chars 기준으로 잘라서 반환.
    """
    candidates = [
        NORMALIZED_DIR / f"{doc_id}.md",
        PARSED_DIR / f"{doc_id}_parsed.md",
    ]

    for path in candidates:
        if path.exists():
            text = path.read_text(encoding="utf-8", errors="ignore")
            logging.info("마크다운 컨텍스트 로드: %s (len=%d)", path, len(text))
            if len(text) > max_chars:
                text = text[:max_chars]
                logging.info("컨텍스트가 길어 %d자로 truncate.", max_chars)
            return text

    raise FileNotFoundError(
        f"doc_id={doc_id} 에 대한 마크다운 파일을 찾을 수 없습니다: "
        f"{candidates[0]} 또는 {candidates[1]}"
    )


def _build_prompt(doc_id: str, context: str) -> str:
    """
    제품 설명서 마크다운을 입력으로 받아
    원하는 메타데이터를 JSON 형태로 추출하도록 지시하는 프롬프트를 생성한다.
    """
    return f"""
다음은 가전제품 설명서(doc_id={doc_id})의 내용입니다.

당신의 역할:
- 이 설명서를 꼼꼼히 읽고, 아래 항목에 맞춰 제품 메타데이터를 추출하십시오.
- 반드시 "단일 JSON 객체"만 출력하십시오. JSON 외의 설명 문장은 출력하지 마십시오.

[설명서 내용 시작]
{context}
[설명서 내용 끝]

요구하는 JSON 스키마는 다음과 같습니다:

{{
  "product_name": "string | null",        // 설명서에 표기된 공식 제품명 (브랜드 + 모델명 조합 허용)
  "category": "string | null",            // 예: "전기 주방가전 - 토스터", "생활가전 - 공기청정기"
  "manufacturer": "string | null",        // 제조사명 (예: "삼성전자(주)")
  "description": "string | null",         // 제품 특징/용도를 요약한 2~3문장 (한국어)
  "release_date": "string | null",        // 가능한 경우 'YYYY-MM-DD' 또는 'YYYY-MM' 또는 'YYYY' 형태
  "width_mm": 0,                          // 가로(mm). 단위를 cm, m로 찾았을 경우 mm로 변환
  "height_mm": 0,                         // 세로(mm)
  "depth_mm": 0                           // 깊이(mm)
}}

세부 지침:
1) release_date:
   - 제품 사양, 제조연월, 출시일 정보가 있을 경우만 채우고, 없으면 null 로 두십시오.
   - 문자열 포맷은 가급적 'YYYY-MM-DD' 이나, 정보가 부족하면 'YYYY-MM' 또는 'YYYY' 허용.

2) width_mm / height_mm / depth_mm:
   - "가로 x 세로 x 높이", "폭 x 길이 x 두께", "크기(mm)" 등 표 안의 규격 정보를 찾으십시오.
   - 단위가 cm, m 인 경우 mm 로 변환하십시오.
   - 값을 찾을 수 없는 경우 0 으로 두십시오.

3) category:
   - 설명서에 직접 카테고리가 나오지 않아도, 제품 종류를 보고 사람이 이해할 수 있는
     간단한 카테고리 문자열을 작성하십시오.
   - 예: "전기 주방가전 - 토스터", "생활가전 - 가습기", "소형가전 - 선풍기"

4) description:
   - 제품의 용도, 주요 기능, 특징을 2~3문장 정도로 자연스럽게 요약하십시오.
   - 한국어로 작성하십시오.

반드시 위 스키마를 만족하는 "하나의 JSON 객체"만 출력하십시오.
"""


def _safe_json_loads(text: str) -> Dict[str, Any]:
    """
    LLM이 보낸 응답에서 JSON 객체를 안전하게 파싱한다.
    - 응답에 여분의 텍스트가 섞여 있다면 첫 '{' ~ 마지막 '}' 구간만 잘라 시도.
    """
    text = text.strip()

    # 바로 JSON으로 파싱 시도
    try:
        return json.loads(text)
    except Exception:
        pass

    # 첫 { ~ 마지막 } 만 잘라 다시 시도
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and start < end:
        try:
            return json.loads(text[start : end + 1])
        except Exception as e:
            logging.error("JSON 파싱 실패: %s", e)
            logging.debug("원본 응답 일부: %s", text[:500])
            raise

    raise ValueError("LLM 응답에서 유효한 JSON 객체를 찾을 수 없습니다.")


def _parse_date(value: Optional[str]) -> Optional[date]:
    """
    LLM이 넘겨주는 release_date 문자열을 date 객체로 변환한다.
    허용 포맷: YYYY-MM-DD, YYYY-MM, YYYY
    """
    if not value:
        return None

    value = value.strip()
    for fmt in ("%Y-%m-%d", "%Y-%m", "%Y"):
        try:
            dt = datetime.strptime(value, fmt)
            return dt.date()
        except Exception:
            continue

    logging.warning("release_date 파싱 실패, None 처리: %s", value)
    return None


# ----------------------------- 메인 로직 -----------------------------


async def extract_and_update_product_metadata(
    doc_id: str,
    product_id: str,
    max_chars: int = DEFAULT_MAX_CHARS,
    client: Optional[genai.Client] = None,
) -> Dict[str, Any]:
    """
    단일 doc_id 에 대해:
      1) 마크다운 컨텍스트 로드
      2) LLM으로 메타데이터 JSON 추출
      3) test_products 행 업데이트
    를 수행한다.

    Parameters:
      - doc_id: str
      - product_id: str

    반환:
      - LLM이 생성한 메타데이터 dict (DB에 반영된 값 기준)
    """
    if client is None:
        client = load_gemini_client()

    # 1) 마크다운 컨텍스트 로드
    context = _load_manual_markdown(doc_id, max_chars=max_chars)

    # 2) 프롬프트 생성 및 LLM 호출
    prompt = _build_prompt(doc_id, context)
    logging.info("Gemini에 메타데이터 추출 요청 중... (doc_id=%s)", doc_id)

    resp = client.models.generate_content(
        model=DEFAULT_MODEL_NAME,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.2,
        ),
    )

    # google-genai 응답에서 텍스트 꺼내기
    # (라이브러리 버전에 따라 resp.candidates[0].content.parts[0].text 형식)
    try:
        # 가장 단순한 케이스: resp.text 가 있는 경우
        raw_text = getattr(resp, "text", None)
        if not raw_text:
            # 후보에서 텍스트 추출
            raw_text = ""
            for cand in getattr(resp, "candidates", []):
                for part in getattr(cand, "content", {}).parts:
                    if getattr(part, "text", None):
                        raw_text += part.text + "\n"
    except Exception as e:
        logging.error("LLM 응답 텍스트 추출 실패: %s", e)
        raise

    metadata = _safe_json_loads(raw_text)

    # 3) DB 업데이트
    await _update_product_row(product_id, metadata)

    logging.info("메타데이터 추출 & DB 업데이트 완료 (doc_id=%s, id=%d)", doc_id, product_id)
    return metadata


async def _update_product_row(
    product_id: str,
    metadata: Dict[str, Any],
) -> None:
    """
    test_products 테이블에서 product_id 로 row를 찾아
    LLM이 추출한 메타데이터를 반영한다.
    """
    from core.query import find_product_id
    from datetime import datetime

    async with get_session_text() as session:   # AsyncSession
        # 제품 조회
        result = await session.execute(
            text(find_product_id),
            {'product_id': product_id}
        )
        product_row = result.mappings().one_or_none()

        if product_row is None:
            logging.error(
                "Product not found (product_id=%s). 메타데이터 업데이트를 건너뜁니다.",
                product_id,
            )
            return
        
        # 메타데이터 준비
        release_date_str = metadata.get("release_date")
        parsed_date = _parse_date(release_date_str)

        def _as_float(val: Any) -> Optional[float]:
            try:
                if val is None:
                    return None
                f = float(val)
                return f
            except Exception:
                return None

        w = _as_float(metadata.get("width_mm"))
        h = _as_float(metadata.get("height_mm"))
        d = _as_float(metadata.get("depth_mm"))

        # 업데이트 데이터 준비 (None이 아닌 값만)
        update_data = {}
        
        if metadata.get("product_name"):
            update_data['product_name'] = metadata.get("product_name")
        if metadata.get("category"):
            update_data['category'] = metadata.get("category")
        if metadata.get("manufacturer"):
            update_data['manufacturer'] = metadata.get("manufacturer")
        if metadata.get("description"):
            update_data['description'] = metadata.get("description")
        if parsed_date:
            update_data['release_date'] = parsed_date
        if w and w > 0:
            update_data['width_mm'] = w
        if h and h > 0:
            update_data['height_mm'] = h
        if d and d > 0:
            update_data['depth_mm'] = d
        
        # analysis_status는 항상 업데이트
        update_data['analysis_status'] = AnalysisStatus.COMPLETED

        # DB 업데이트 (ORM 사용)
        if update_data:
            update_stmt = (
                update(Product)
                .where(Product.product_id == product_id)
                .values(**update_data)
            )
            await session.execute(update_stmt)
            await session.commit()
        
        logging.info(
            "Product (product_id=%s) 메타데이터 업데이트 완료: name=%s, category=%s",
            product_id,
            metadata.get("product_name"),
            metadata.get("category"),
        )


# ----------------------------- CLI 엔트리 -----------------------------


async def _async_main(args: argparse.Namespace) -> None:
    configure_logging()

    client = load_gemini_client()

    await extract_and_update_product_metadata(
        doc_id=args.doc_id,
        product_id=args.product_id,
        max_chars=args.max_chars,
        client=client,
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="전처리된 설명서 마크다운에서 제품 메타데이터를 추출해 DB에 반영하는 스크립트"
    )
    parser.add_argument(
        "--doc-id",
        type=str,
        required=True,
        help="설명서에 해당하는 제품 코드 (예: SDM-WHT330HS)",
    )
    parser.add_argument(
        "--product-internal-id",
        type=int,
        required=True,
        help="DB test_products(tb_product)의 PK (internal_id)",
    )
    parser.add_argument(
        "--max-chars",
        type=int,
        default=DEFAULT_MAX_CHARS,
        help=f"LLM에 넘길 마크다운 최대 길이 (기본 {DEFAULT_MAX_CHARS} 문자)",
    )

    args = parser.parse_args()
    asyncio.run(_async_main(args))


if __name__ == "__main__":
    main()