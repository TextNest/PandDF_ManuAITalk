# ============================================================
#  File: src/rag_embedder_gemini.py
# ============================================================
# [모듈 개요]
#   - text_chunker.py / figure_chunker.py 가 생성한 청크 JSONL을 읽어
#       • data/chunks/text/*.jsonl       (텍스트 청크)
#       • data/chunks/figure/*.jsonl     (이미지 캡션 청크)
#     를 하나의 "벡터 인덱스(FAISS)"로 통합한다.
#
#   - Google Gemini 임베딩 모델(text-embedding-004)을 사용해
#       1) 텍스트 청크(content) → 임베딩 벡터
#       2) figure 캡션(text)     → 임베딩 벡터
#     를 생성하고,
#   - FAISS(IndexFlatIP + L2 정규화) 기반 코사인 유사도 인덱스를 생성한다.
#
#   - 메타데이터는 vectors_meta.jsonl 로 별도 저장되어,
#     추후 RAG 질의 시 "벡터 인덱스 결과 → 메타데이터 역참조"가 가능하다.
#
# [입력]
#   - data/chunks/text/<doc_id>_text_chunks.jsonl
#       각 라인 예시(text_chunker.py 결과):
#         {
#           "doc_id": "SAH001",
#           "chunk_id": "SAH001_text_0001",
#           "type": "text",
#           "content": "청크 텍스트 ...",
#           "page_start": 1,
#           "page_end": 2,
#           "section_title": "안전상의 주의",
#           "char_len": 945
#         }
#
#   - data/chunks/figure/<doc_id>_figure.jsonl
#       각 라인 예시(figure_chunker.py 결과):
#         {
#           "id": "SAH001:figure:0001",
#           "doc_id": "SAH001",
#           "chunk_type": "figure",
#           "page": 1,
#           "figure_index": 1,
#           "text": "제품 전체 모습과 앞면 패널을 보여주는 그림이다...",
#           "image_file": "data/caption_images/SAH001/page_001_figure_001.png",
#           "orig_image_file": "data/figures/SAH001/page_001_figure_001.png",
#           "bbox_norm": {...} | null,
#           "bbox_center_norm": {...} | null,
#           "category": "photo_or_diagram",
#           "tags": [...],
#           "caption_model": "gemini-2.5-flash",
#           "caption_fallback_reason": null,
#           "extra": {
#             "metrics": {...},
#             "raw_image_meta": {...}
#           }
#         }
#
# [출력]
#   - data/index/faiss.index
#       • FAISS IndexFlatIP (L2 정규화된 벡터 → 코사인 유사도 동등)
#
#   - data/index/vectors_meta.jsonl
#       • 벡터 인덱스의 각 row(=벡터)에 대응하는 메타데이터 1줄
#       • 한 줄 예시:
#           {
#             "uid": "SAH001_text_0001",     # 벡터 고유 ID
#             "chunk_type": "text",          # "text" | "figure"
#             "doc_id": "SAH001",
#             "source_path": "data/chunks/text/SAH001_text_chunks.jsonl",
#             "text": "청크 텍스트 ...",
#             "page_start": 1,
#             "page_end": 2,
#             "section_title": "안전상의 주의",
#             "char_len": 945
#           }
#
#       • figure 청크의 경우:
#           {
#             "uid": "SAH001:figure:0001",
#             "chunk_type": "figure",
#             "doc_id": "SAH001",
#             "source_path": "data/chunks/figure/SAH001_figure.jsonl",
#             "text": "제품 전체 모습과 앞면 패널을 보여주는 그림이다...",
#             "page": 1,
#             "figure_index": 1,
#             "image_file": "...",
#             "orig_image_file": "...",
#             "category": "photo_or_diagram",
#             "tags": [...],
#             "caption_model": "gemini-2.5-flash",
#             "caption_fallback_reason": null
#           }
#
#   - data/index/manifest.json
#       • 인덱스 생성 환경/설정 기록:
#           {
#             "embed_model": "text-embedding-004",
#             "output_dimensionality": 768,
#             "index_type": "IndexFlatIP_L2norm",
#             "num_vectors": 1234,
#             "num_text_chunks": 1000,
#             "num_figure_chunks": 234,
#             "created_at": "2025-11-17T10:30:21+09:00",
#             "chunk_dirs": {...},
#             "note": "RAG 멀티모달 인덱스 (text + figure)"
#           }
#
# [환경 변수(.env)]
#   - GEMINI_API_KEY      : Google Gemini API 키 (필수)
#
#   예시:
#       GEMINI_API_KEY="AIzaSy...."
#
# [설계 요점]
#   1) 멀티모달 RAG를 위해 "텍스트 청크 + 이미지 캡션 청크"를
#      하나의 벡터 인덱스로 통합하고, chunk_type 으로만 구분한다.
#      → 질의 시 "텍스트만", "figure만", "둘 다" 필터링이 쉽다.
#
#   2) IndexFlatIP + L2 정규화
#      - 벡터를 L2 normalize 한 뒤 inner product로 검색하면
#        코사인 유사도와 동등하게 동작한다.
#
#   3) JSONL 메타를 별도로 보관
#      - 인덱스는 오로지 벡터만 저장
#      - vectors_meta.jsonl 를 통해
#        • 어떤 doc_id / 페이지 / 섹션의 청크인지
#        • figure라면 어떤 이미지 파일과 연결되는지
#        를 역추적할 수 있다.
#
# [사용 예시]
#   - 전체 문서(text + figure) 통합 인덱스 생성:
#       (.venv) > python -m src.rag_embedder_gemini
#
#   - 텍스트 청크만 인덱싱:
#       (.venv) > python -m src.rag_embedder_gemini --text-only
#
#   - 특정 doc_id만 인덱싱 (예: SAH001, SBDH-T1000):
#       (.venv) > python -m src.rag_embedder_gemini --doc-id SAH001 SBDH-T1000
#
#   - 다른 차원/배치 크기:
#       (.venv) > python -m src.rag_embedder_gemini --dim 512 --batch-size 16
#
# ============================================================

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

import faiss  # type: ignore
import numpy as np
from dotenv import load_dotenv
from google import genai
from google.genai import types


# ----------------------------- 경로 / 상수 정의 -----------------------------


# 이 파일(src/rag_embedder_gemini.py)을 기준으로 프로젝트 루트 계산
PROJECT_ROOT: Path = Path(__file__).resolve().parents[1]

# 청크 입력 디렉터리
CHUNKS_TEXT_DIR: Path = PROJECT_ROOT / "data" / "chunks" / "text"
CHUNKS_FIGURE_DIR: Path = PROJECT_ROOT / "data" / "chunks" / "figure"

# 인덱스 출력 디렉터리
INDEX_ROOT_DIR: Path = PROJECT_ROOT / "data" / "index"
FAISS_INDEX_PATH: Path = INDEX_ROOT_DIR / "faiss.index"
VECTORS_META_PATH: Path = INDEX_ROOT_DIR / "vectors_meta.jsonl"
MANIFEST_PATH: Path = INDEX_ROOT_DIR / "manifest.json"

# 기본 임베딩 설정
DEFAULT_EMBED_MODEL: str = "text-embedding-004"
DEFAULT_OUTPUT_DIM: int = 768
DEFAULT_BATCH_SIZE: int = 32
DEFAULT_MAX_RETRIES: int = 3
DEFAULT_RETRY_BASE_SLEEP: float = 2.0  # 초


# ----------------------------- 데이터 구조 정의 -----------------------------


@dataclass
class ChunkRecord:
    """
    임베딩 전에 메모리 상에서 관리할 "청크 단위" 표현.

    - 텍스트 청크든 figure 캡션이든 동일한 구조로 다룬다.
    """

    uid: str              # 벡터 고유 ID (text: chunk_id, figure: id)
    doc_id: str
    chunk_type: str       # "text" | "figure"
    text: str             # 임베딩 대상 텍스트
    meta: Dict[str, Any]  # vectors_meta.jsonl 에 쓸 메타데이터 전체


# ----------------------------- 로깅 / 공통 유틸 -----------------------------


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


def ensure_directories() -> None:
    """
    인덱스 출력 디렉터리(INDEX_ROOT_DIR)를 생성한다.

    - 이미 존재하면 아무 작업도 하지 않는다.
    """
    INDEX_ROOT_DIR.mkdir(parents=True, exist_ok=True)
    logging.info("FAISS 인덱스 출력 디렉터리 준비 완료: %s", INDEX_ROOT_DIR)


def load_gemini_client() -> genai.Client:
    """
    Google Gemini API 클라이언트를 초기화한다.

    - 환경 변수 GEMINI_API_KEY 에서 API 키를 읽는다.
    - 없으면 예외 발생.
    """
    load_dotenv()

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        logging.error("GEMINI_API_KEY(또는 GOOGLE_API_KEY)가 설정되어 있지 않습니다.")
        raise RuntimeError("GEMINI_API_KEY is required")

    client = genai.Client(api_key=api_key)
    logging.info("Gemini 클라이언트 초기화 완료 (env=GEMINI_API_KEY).")
    return client


# ----------------------------- 청크 로딩: 텍스트 -----------------------------


def iter_text_chunk_files() -> Iterable[Path]:
    """
    data/chunks/text 아래의 *_text_chunks.jsonl 파일들을 순회한다.
    """
    if not CHUNKS_TEXT_DIR.exists():
        logging.warning("텍스트 청크 디렉터리가 존재하지 않습니다: %s", CHUNKS_TEXT_DIR)
        return []

    yield from sorted(CHUNKS_TEXT_DIR.glob("*_text_chunks.jsonl"))


def load_text_chunks(
    doc_id_filter: Optional[List[str]] = None,
) -> List[ChunkRecord]:
    """
    text_chunker.py 가 생성한 텍스트 청크 JSONL을 모두 읽어
    ChunkRecord 리스트로 변환한다.

    Args:
        doc_id_filter:
            특정 doc_id 들만 포함하고 싶을 때 리스트로 전달.
            None 이면 전체 사용.

    Returns:
        List[ChunkRecord]
    """
    records: List[ChunkRecord] = []
    doc_id_set = set(doc_id_filter) if doc_id_filter else None

    for jsonl_path in iter_text_chunk_files():
        try:
            rel_path = jsonl_path.relative_to(PROJECT_ROOT)
        except ValueError:
            rel_path = jsonl_path

        with jsonl_path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    logging.warning("[TEXT] JSONL 파싱 실패: %s", jsonl_path)
                    continue

                doc_id = data.get("doc_id")
                if not doc_id:
                    continue
                if doc_id_set and doc_id not in doc_id_set:
                    continue

                text = (data.get("content") or "").strip()
                if not text:
                    # 빈 텍스트는 임베딩 의미 없으므로 건너뜀
                    continue

                chunk_id = data.get("chunk_id") or f"{doc_id}_text_unknown"
                uid = chunk_id

                meta: Dict[str, Any] = {
                    "uid": uid,
                    "chunk_type": data.get("type", "text"),
                    "doc_id": doc_id,
                    "chunk_id": chunk_id,
                    "source_path": str(rel_path),
                    "text": text,
                    "page_start": data.get("page_start"),
                    "page_end": data.get("page_end"),
                    "section_title": data.get("section_title"),
                    "char_len": data.get("char_len"),
                }

                records.append(
                    ChunkRecord(
                        uid=uid,
                        doc_id=doc_id,
                        chunk_type="text",
                        text=text,
                        meta=meta,
                    )
                )

    logging.info(
        "[LOAD] 텍스트 청크 로딩 완료: %d개 (필터: %s)",
        len(records),
        ",".join(doc_id_filter) if doc_id_filter else "전체",
    )
    return records


# ----------------------------- 청크 로딩: figure -----------------------------


def iter_figure_chunk_files() -> Iterable[Path]:
    """
    data/chunks/figure 아래의 *_figure.jsonl 파일들을 순회한다.
    """
    if not CHUNKS_FIGURE_DIR.exists():
        logging.warning("figure 청크 디렉터리가 존재하지 않습니다: %s", CHUNKS_FIGURE_DIR)
        return []

    yield from sorted(CHUNKS_FIGURE_DIR.glob("*_figure.jsonl"))


def load_figure_chunks(
    doc_id_filter: Optional[List[str]] = None,
) -> List[ChunkRecord]:
    """
    figure_chunker.py 가 생성한 figure 캡션 청크 JSONL을 모두 읽어
    ChunkRecord 리스트로 변환한다.

    Args:
        doc_id_filter:
            특정 doc_id 들만 포함하고 싶을 때 리스트로 전달.
            None 이면 전체 사용.

    Returns:
        List[ChunkRecord]
    """
    records: List[ChunkRecord] = []
    doc_id_set = set(doc_id_filter) if doc_id_filter else None

    for jsonl_path in iter_figure_chunk_files():
        try:
            rel_path = jsonl_path.relative_to(PROJECT_ROOT)
        except ValueError:
            rel_path = jsonl_path

        with jsonl_path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    logging.warning("[FIGURE] JSONL 파싱 실패: %s", jsonl_path)
                    continue

                doc_id = data.get("doc_id")
                if not doc_id:
                    continue
                if doc_id_set and doc_id not in doc_id_set:
                    continue

                text = (data.get("text") or "").strip()
                if not text:
                    continue

                uid = data.get("id") or f"{doc_id}:figure:unknown"
                chunk_type = data.get("chunk_type", "figure")

                meta: Dict[str, Any] = {
                    "uid": uid,
                    "chunk_type": chunk_type,
                    "doc_id": doc_id,
                    "source_path": str(rel_path),
                    "text": text,
                    "page": data.get("page"),
                    "figure_index": data.get("figure_index"),
                    "image_file": data.get("image_file"),
                    "orig_image_file": data.get("orig_image_file"),
                    "category": data.get("category"),
                    "tags": data.get("tags"),
                    "caption_model": data.get("caption_model"),
                    "caption_fallback_reason": data.get("caption_fallback_reason"),
                    "bbox_norm": data.get("bbox_norm"),
                    "bbox_center_norm": data.get("bbox_center_norm"),
                }

                # metrics/extra 등은 너무 크다면 제외해도 되지만,
                # 필요하다면 meta["metrics"] 등에 추가 가능.
                extra = data.get("extra") or {}
                if "metrics" in extra:
                    meta["metrics"] = extra["metrics"]

                records.append(
                    ChunkRecord(
                        uid=uid,
                        doc_id=doc_id,
                        chunk_type="figure",
                        text=text,
                        meta=meta,
                    )
                )

    logging.info(
        "[LOAD] figure 청크 로딩 완료: %d개 (필터: %s)",
        len(records),
        ",".join(doc_id_filter) if doc_id_filter else "전체",
    )
    return records


# ----------------------------- 임베딩 유틸 -----------------------------


def extract_vectors_from_response(resp: Any) -> List[List[float]]:
    """
    google-genai embed_content 응답 객체에서
    벡터 리스트(List[List[float]])를 추출한다.

    - contents 가 문자열 1개일 때  : response.embedding.values
    - contents 가 리스트일 때      : response.embeddings[i].values
    """
    # 여러 contents 를 한 번에 보낸 경우
    if hasattr(resp, "embeddings") and resp.embeddings is not None:
        vectors: List[List[float]] = []
        for emb in resp.embeddings:
            # emb.values (Pydantic 모델) or dict["values"]
            values = getattr(emb, "values", None)
            if values is None and isinstance(emb, dict):
                values = emb.get("values")
            if values is None:
                raise RuntimeError("임베딩 응답에서 values 필드를 찾을 수 없습니다.")
            vectors.append(list(values))
        return vectors

    # 단일 content 인 경우
    if hasattr(resp, "embedding") and resp.embedding is not None:
        values = getattr(resp.embedding, "values", None)
        if values is None and isinstance(resp.embedding, dict):
            values = resp.embedding.get("values")
        if values is None:
            raise RuntimeError("임베딩 응답에서 values 필드를 찾을 수 없습니다.")
        return [list(values)]

    raise RuntimeError("embed_content 응답 형식이 예상과 다릅니다.")


def embed_records(
    client: genai.Client,
    records: List[ChunkRecord],
    model: str,
    output_dim: int,
    batch_size: int,
    max_retries: int,
    retry_base_sleep: float,
) -> Tuple[np.ndarray, List[ChunkRecord]]:
    """
    ChunkRecord 리스트를 받아 Google Gemini 임베딩을 수행하고,
    (N, D) numpy 배열과 "성공적으로 임베딩된 레코드 리스트"를 반환한다.

    - 일부 배치에서 에러가 발생하면, 해당 배치는 건너뛰고 나머지 계속 진행.
    - 반환되는 records 리스트는 실제 벡터 행과 1:1로 대응된다.
    """
    if not records:
        raise ValueError("임베딩할 레코드가 없습니다.")

    texts = [r.text for r in records]
    num_total = len(texts)
    logging.info(
        "[EMBED] 총 %d개 청크를 %d개 배치(batch_size=%d)로 임베딩 시작.",
        num_total,
        (num_total + batch_size - 1) // batch_size,
        batch_size,
    )

    all_vectors: List[List[float]] = []
    kept_records: List[ChunkRecord] = []

    for start in range(0, num_total, batch_size):
        end = min(start + batch_size, num_total)
        batch_texts = texts[start:end]
        batch_records = records[start:end]

        # 혹시 공백만 있는 텍스트가 섞였으면 필터링
        if not any(t.strip() for t in batch_texts):
            continue

        for attempt in range(1, max_retries + 1):
            try:
                # google-genai embed_content 호출
                resp = client.models.embed_content(
                    model=model,
                    contents=batch_texts,
                    # task_type 등은 EmbedContentConfig로 줄 수 있지만
                    # 여기서는 output_dimensionality 만 지정
                    config=types.EmbedContentConfig(
                        output_dimensionality=output_dim
                    ),
                )
                vectors = extract_vectors_from_response(resp)

                if len(vectors) != len(batch_records):
                    logging.error(
                        "[EMBED] 벡터 개수(%d)와 레코드 개수(%d)가 불일치합니다. "
                        "해당 배치는 건너뜁니다.",
                        len(vectors),
                        len(batch_records),
                    )
                    break

                all_vectors.extend(vectors)
                kept_records.extend(batch_records)

                logging.info(
                    "[EMBED] 배치 %d~%d 임베딩 완료 (누적 벡터: %d)",
                    start,
                    end - 1,
                    len(all_vectors),
                )
                # 정상 처리되었으므로 retry 루프 탈출
                break

            except Exception as e:
                logging.warning(
                    "[EMBED] 배치 %d~%d 임베딩 실패 (%d/%d): %s",
                    start,
                    end - 1,
                    attempt,
                    max_retries,
                    e,
                )
                if attempt >= max_retries:
                    logging.error(
                        "[EMBED] 배치 %d~%d 재시도 한계 초과. 이 배치는 건너뜁니다.",
                        start,
                        end - 1,
                    )
                    break
                sleep_sec = retry_base_sleep * (2 ** (attempt - 1))
                logging.info("  → %.1f초 후 재시도합니다.", sleep_sec)
                time.sleep(sleep_sec)

    if not all_vectors:
        raise RuntimeError("어떤 배치도 성공적으로 임베딩되지 않았습니다.")

    matrix = np.array(all_vectors, dtype="float32")
    if matrix.shape[1] != output_dim:
        logging.warning(
            "[EMBED] 벡터 차원(%d)이 설정(output_dim=%d)과 다릅니다.",
            matrix.shape[1],
            output_dim,
        )

    logging.info(
        "[EMBED] 전체 임베딩 완료. 유효 벡터 수: %d / 원래 청크 수: %d",
        matrix.shape[0],
        num_total,
    )

    return matrix, kept_records


# ----------------------------- FAISS 인덱스 생성/저장 -----------------------------


def build_and_save_faiss_index(
    vectors: np.ndarray,
    index_path: Path,
) -> None:
    """
    (N, D) numpy 배열을 받아 FAISS IndexFlatIP 인덱스를 생성하고 저장한다.

    - 벡터는 L2 정규화한 뒤 IndexFlatIP 에 추가.
    """
    if vectors.ndim != 2:
        raise ValueError("vectors 는 (N, D) 2D 배열이어야 합니다.")

    n, d = vectors.shape
    logging.info("[FAISS] 인덱스 생성 시작 (N=%d, D=%d)", n, d)

    # 코사인 유사도를 위해 L2 정규화
    faiss.normalize_L2(vectors)

    index = faiss.IndexFlatIP(d)
    index.add(vectors)

    faiss.write_index(index, str(index_path))
    logging.info("[FAISS] 인덱스 저장 완료: %s", index_path)


def save_vectors_meta(
    records: List[ChunkRecord],
    meta_path: Path,
) -> None:
    """
    벡터 메타데이터(vectors_meta.jsonl)를 저장한다.

    - records 리스트는 FAISS 벡터 행과 1:1 대응한다.
    """
    with meta_path.open("w", encoding="utf-8") as f:
        for idx, rec in enumerate(records):
            meta = dict(rec.meta)
            # 인덱스 내 row 번호를 명시적으로 기록해두면 디버깅에 도움
            meta["vector_index"] = idx
            f.write(json.dumps(meta, ensure_ascii=False) + "\n")

    logging.info(
        "[META] vectors_meta.jsonl 저장 완료 (%d개 레코드) → %s",
        len(records),
        meta_path,
    )


def save_manifest(
    model: str,
    output_dim: int,
    num_vectors: int,
    num_text_chunks: int,
    num_figure_chunks: int,
    chunk_dirs: Dict[str, str],
    manifest_path: Path,
) -> None:
    """
    인덱스 생성 환경/설정을 manifest.json 으로 저장한다.
    """
    now = datetime.now(timezone.utc).astimezone().isoformat()

    manifest: Dict[str, Any] = {
        "embed_model": model,
        "output_dimensionality": output_dim,
        "index_type": "IndexFlatIP_L2norm",
        "num_vectors": num_vectors,
        "num_text_chunks": num_text_chunks,
        "num_figure_chunks": num_figure_chunks,
        "created_at": now,
        "chunk_dirs": chunk_dirs,
        "note": "멀티모달 RAG 인덱스 (text + figure)",
    }

    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    logging.info("[MANIFEST] manifest.json 저장 완료 → %s", manifest_path)


# ----------------------------- 메인 파이프라인 -----------------------------


def run_pipeline(
    embed_model: str,
    output_dim: int,
    batch_size: int,
    include_figure: bool,
    doc_ids: Optional[List[str]],
    overwrite: bool,
) -> None:
    """
    전체 RAG 임베딩 파이프라인을 실행한다.

    1) 텍스트/figure 청크 로딩
    2) Google Gemini 임베딩
    3) FAISS 인덱스 생성
    4) vectors_meta.jsonl / manifest.json 저장
    """
    ensure_directories()

    if FAISS_INDEX_PATH.exists() and not overwrite:
        logging.error(
            "FAISS 인덱스가 이미 존재합니다: %s\n"
            "  --overwrite 옵션을 사용하면 덮어쓸 수 있습니다.",
            FAISS_INDEX_PATH,
        )
        sys.exit(1)

    # 1) 청크 로딩
    text_records = load_text_chunks(doc_id_filter=doc_ids)
    figure_records: List[ChunkRecord] = []

    if include_figure:
        figure_records = load_figure_chunks(doc_id_filter=doc_ids)

    all_records = text_records + figure_records
    if not all_records:
        logging.error(
            "임베딩할 청크가 없습니다. text/figure 청크 생성 여부를 확인하세요."
        )
        sys.exit(1)

    logging.info(
        "[PIPELINE] 로딩된 전체 청크 수: %d (text=%d, figure=%d)",
        len(all_records),
        len(text_records),
        len(figure_records),
    )

    # 2) 임베딩
    client = load_gemini_client()
    vectors, kept_records = embed_records(
        client=client,
        records=all_records,
        model=embed_model,
        output_dim=output_dim,
        batch_size=batch_size,
        max_retries=DEFAULT_MAX_RETRIES,
        retry_base_sleep=DEFAULT_RETRY_BASE_SLEEP,
    )

    # 혹시 일부 배치 실패로 인해 records 수가 줄었을 수 있으므로 다시 카운트
    num_text_kept = sum(1 for r in kept_records if r.chunk_type == "text")
    num_figure_kept = sum(1 for r in kept_records if r.chunk_type == "figure")

    logging.info(
        "[PIPELINE] 최종 유효 청크 수: %d (text=%d, figure=%d)",
        len(kept_records),
        num_text_kept,
        num_figure_kept,
    )

    # 3) FAISS 인덱스 생성/저장
    build_and_save_faiss_index(vectors=vectors, index_path=FAISS_INDEX_PATH)

    # 4) 메타/매니페스트 저장
    save_vectors_meta(records=kept_records, meta_path=VECTORS_META_PATH)
    save_manifest(
        model=embed_model,
        output_dim=output_dim,
        num_vectors=vectors.shape[0],
        num_text_chunks=num_text_kept,
        num_figure_chunks=num_figure_kept,
        chunk_dirs={
            "text": str(CHUNKS_TEXT_DIR.relative_to(PROJECT_ROOT)),
            "figure": str(CHUNKS_FIGURE_DIR.relative_to(PROJECT_ROOT)),
        },
        manifest_path=MANIFEST_PATH,
    )

    logging.info("[PIPELINE] 모든 작업 완료.")


# ----------------------------- CLI / main -----------------------------


def main() -> None:
    """
    rag_embedder_gemini 스크립트의 메인 엔트리 포인트.

    - CLI 인자를 파싱하고 전체 파이프라인을 실행한다.
    """
    parser = argparse.ArgumentParser(
        description=(
            "text_chunker / figure_chunker 가 생성한 청크(JSONL)를 "
            "Google Gemini 임베딩 + FAISS 인덱스로 변환하는 스크립트"
        )
    )
    parser.add_argument(
        "--model",
        type=str,
        default=DEFAULT_EMBED_MODEL,
        help=f"임베딩에 사용할 모델명 (기본값: {DEFAULT_EMBED_MODEL})",
    )
    parser.add_argument(
        "--dim",
        type=int,
        default=DEFAULT_OUTPUT_DIM,
        help=f"임베딩 출력 차원 수 (기본값: {DEFAULT_OUTPUT_DIM})",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        help=f"임베딩 호출 배치 크기 (기본값: {DEFAULT_BATCH_SIZE})",
    )
    parser.add_argument(
        "--text-only",
        action="store_true",
        help="텍스트 청크만 인덱싱하고 figure 캡션은 포함하지 않습니다.",
    )
    parser.add_argument(
        "--doc-id",
        nargs="*",
        default=None,
        help=(
            "특정 doc_id 들만 인덱싱하고 싶을 때 사용 (예: --doc-id SAH001 SBDH-T1000). "
            "지정하지 않으면 모든 doc_id 를 사용합니다."
        ),
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help=(
            "기존 FAISS 인덱스/메타 파일을 덮어씁니다. "
            "기본값은 인덱스가 존재하면 에러를 내고 종료합니다."
        ),
    )

    args = parser.parse_args()

    configure_logging()

    include_figure = not args.text_only

    logging.info(
        "===== RAG 임베딩 파이프라인 시작 =====\n"
        "  embed_model   = %s\n"
        "  output_dim    = %d\n"
        "  batch_size    = %d\n"
        "  include_figure= %s\n"
        "  doc_ids       = %s\n"
        "  overwrite     = %s",
        args.model,
        args.dim,
        args.batch_size,
        include_figure,
        ", ".join(args.doc_id) if args.doc_id else "전체",
        args.overwrite,
    )

    run_pipeline(
        embed_model=args.model,
        output_dim=args.dim,
        batch_size=args.batch_size,
        include_figure=include_figure,
        doc_ids=args.doc_id,
        overwrite=args.overwrite,
    )


if __name__ == "__main__":
    main()
