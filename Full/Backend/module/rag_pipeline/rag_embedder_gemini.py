# ============================================================
#  File: module/rag_pipeline/rag_embedder_gemini.py
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
#   - data/chunks/figure/<doc_id>_figure.jsonl
#
# [출력]
#   - data/index/faiss.index
#   - data/index/vectors_meta.jsonl
#   - data/index/manifest.json
#
# [인덱싱 전략 요약]
#
#   1) 기본 동작 (append 모드)
#      - 인덱스/메타 파일이 이미 존재하고 --overwrite / --replace-doc-id 를
#        쓰지 않은 경우:
#          • 기존 FAISS 인덱스를 로드한 뒤, "새 벡터만 append"
#          • vectors_meta.jsonl 뒤에 새 메타를 이어쓰기
#          • manifest.json 의 num_vectors 등을 누적 갱신
#
#   2) 전체 재생성 (overwrite 모드)
#      - --overwrite 가 설정된 경우:
#          • 기존 인덱스/메타/manifest 를 무시하고 "새 인덱스" 생성
#
#   3) 특정 doc_id 교체 (replace 모드)   ★ 이번에 추가된 기능
#      - --replace-doc-id <DOC> 옵션 사용 시:
#          • 기존 vectors_meta.jsonl 을 읽어,
#              - doc_id == <DOC> 인 레코드는 "제거 대상"
#              - doc_id != <DOC> 인 레코드는 keep_records 로 유지
#          • 기존 FAISS 인덱스에서 keep_records.vector_index 만 골라서
#            keep_vectors 를 구성(IndexFlatIP.xb 사용)
#          • 새 <DOC> 에 대한 청크만 임베딩(new_vectors, new_records)
#          • 최종적으로
#              all_vectors = [keep_vectors; new_vectors] 로 다시 생성
#              all_records = keep_records + new_records 로 메타 재작성
#          • FAISS 인덱스 / vectors_meta.jsonl / manifest.json 을 모두
#            "새로 쓰기" 방식으로 덮어쓴다.
#
#      - 장점:
#          • SAH001, SDH-XXX 등 다른 제품은 그대로 유지
#          • 특정 제품(SDM-WHT330HS)만 설명서를 다시 올려도
#            이전 버전의 벡터는 제거되고, 새 버전 벡터만 남는다.
#
#      - 주의:
#          • --replace-doc-id 를 사용할 때는 반드시 해당 doc_id 만
#            임베딩하도록 --doc-id 옵션과 같이 쓰는 것을 권장
#            (pipeline_entry 에서 자동으로 그렇게 호출하게 만들면 안전)
#
# [환경 변수(.env)]
#   - GEMINI_API_KEY 또는 GOOGLE_API_KEY
#
# [Backend 내 디렉터리/실행 규칙]
#   - 이 파일 경로: Full/Backend/module/rag_pipeline/rag_embedder_gemini.py
#   - PROJECT_ROOT : Full/Backend
#   - data 디렉터리 : Full/Backend/data
#
# [사용 예시]
#   1) 전체 문서(text + figure) 통합 인덱스 생성 (처음 한 번):
#        (.venv) > python -m module.rag_pipeline.rag_embedder_gemini
#
#   2) 새로운 제품 문서(doc_id=SAH001, SBDH-T1000) 추가 인덱싱:
#        (.venv) > python -m module.rag_pipeline.rag_embedder_gemini \
#                     --doc-id SAH001 SBDH-T1000
#
#   3) 특정 제품 설명서가 교체된 경우(doc_id=SDM-WHT330HS)만 다시 인덱싱:
#        (.venv) > python -m module.rag_pipeline.rag_embedder_gemini \
#                     --doc-id SDM-WHT330HS \
#                     --replace-doc-id SDM-WHT330HS
#
#   4) 전체 인덱스를 다시 만드는 경우(관리자 수동 재생성):
#        (.venv) > python -m module.rag_pipeline.rag_embedder_gemini \
#                     --overwrite
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


# 이 파일(module/rag_pipeline/rag_embedder_gemini.py)을 기준으로 Backend 루트 계산
PROJECT_ROOT: Path = Path(__file__).resolve().parents[2]

# .env 파일 (Backend/.env)
ENV_FILE_PATH: Path = PROJECT_ROOT / ".env"

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

    - Backend/.env 에서 환경 변수를 로드한 뒤,
      GEMINI_API_KEY 또는 GOOGLE_API_KEY 에서 API 키를 읽는다.
    - 둘 다 없으면 예외 발생.
    """
    if ENV_FILE_PATH.exists():
        load_dotenv(ENV_FILE_PATH, override=False)
        logging.info("환경 변수 로드 완료: %s", ENV_FILE_PATH)
    else:
        logging.warning(".env 파일이 존재하지 않습니다: %s", ENV_FILE_PATH)

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        logging.error("GEMINI_API_KEY(또는 GOOGLE_API_KEY)가 설정되어 있지 않습니다.")
        raise RuntimeError("GEMINI_API_KEY is required")

    client = genai.Client(api_key=api_key)
    logging.info("Gemini 클라이언트 초기화 완료 (env=GEMINI_API_KEY/GOOGLE_API_KEY).")
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

                # metrics/extra 등은 필요 시 메타에 추가
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
                    # task_type 등은 EmbedContentConfig 로 줄 수 있지만
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


# ----------------------------- FAISS 인덱스 유틸 -----------------------------


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
    - 항상 "새로 생성/덮어쓰기" 모드로 동작한다.
    """
    with meta_path.open("w", encoding="utf-8") as f:
        for idx, rec in enumerate(records):
            meta = dict(rec.meta)
            meta["vector_index"] = idx  # 인덱스 내 row 번호
            f.write(json.dumps(meta, ensure_ascii=False) + "\n")

    logging.info(
        "[META] vectors_meta.jsonl 저장 완료 (%d개 레코드) → %s",
        len(records),
        meta_path,
    )


def append_vectors_meta(
    records: List[ChunkRecord],
    meta_path: Path,
) -> None:
    """
    기존 vectors_meta.jsonl 파일 뒤에 레코드를 이어붙인다.

    - 현재 라인 수(=기존 벡터 수)를 먼저 센 다음,
      새 레코드에는 그 다음 번호부터 vector_index 를 부여한다.
    """
    if not meta_path.exists():
        logging.info(
            "[META] 기존 메타 파일이 없어 새로 생성합니다: %s",
            meta_path,
        )
        save_vectors_meta(records=records, meta_path=meta_path)
        return

    existing_count = 0
    with meta_path.open("r", encoding="utf-8") as f:
        for existing_count, _ in enumerate(f, start=1):
            # 단순히 라인 수만 센다.
            pass

    with meta_path.open("a", encoding="utf-8") as f:
        for idx, rec in enumerate(records, start=existing_count):
            meta = dict(rec.meta)
            meta["vector_index"] = idx
            f.write(json.dumps(meta, ensure_ascii=False) + "\n")

    logging.info(
        "[META] vectors_meta.jsonl 에 %d개 레코드 추가 (기존=%d → 총=%d) → %s",
        len(records),
        existing_count,
        existing_count + len(records),
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


def update_manifest_append(
    model: str,
    output_dim: int,
    num_new_vectors: int,
    num_new_text_chunks: int,
    num_new_figure_chunks: int,
    chunk_dirs: Dict[str, str],
    manifest_path: Path,
) -> None:
    """
    기존 manifest.json 을 읽어 벡터/청크 개수만 누적 갱신한다.

    - manifest.json 이 없거나 손상된 경우에는 save_manifest() 로 새로 생성한다.
    """
    if not manifest_path.exists():
        logging.warning(
            "[MANIFEST] 기존 manifest.json 이 없어 새로 생성합니다: %s",
            manifest_path,
        )
        save_manifest(
            model=model,
            output_dim=output_dim,
            num_vectors=num_new_vectors,
            num_text_chunks=num_new_text_chunks,
            num_figure_chunks=num_new_figure_chunks,
            chunk_dirs=chunk_dirs,
            manifest_path=manifest_path,
        )
        return

    try:
        data = json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception:
        logging.warning(
            "[MANIFEST] manifest.json 읽기 실패 → 새로 생성합니다: %s",
            manifest_path,
        )
        save_manifest(
            model=model,
            output_dim=output_dim,
            num_vectors=num_new_vectors,
            num_text_chunks=num_new_text_chunks,
            num_figure_chunks=num_new_figure_chunks,
            chunk_dirs=chunk_dirs,
            manifest_path=manifest_path,
        )
        return

    # 누적 업데이트
    data["num_vectors"] = int(data.get("num_vectors", 0)) + num_new_vectors
    data["num_text_chunks"] = int(data.get("num_text_chunks", 0)) + num_new_text_chunks
    data["num_figure_chunks"] = int(data.get("num_figure_chunks", 0)) + num_new_figure_chunks

    data["updated_at"] = datetime.now(timezone.utc).astimezone().isoformat()

    manifest_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    logging.info(
        "[MANIFEST] manifest.json 업데이트 완료 (누적 num_vectors=%d) → %s",
        data["num_vectors"],
        manifest_path,
    )


def append_to_existing_index(
    vectors: np.ndarray,
    records: List[ChunkRecord],
    embed_model: str,
    output_dim: int,
    num_text_chunks: int,
    num_figure_chunks: int,
    chunk_dirs: Dict[str, str],
) -> None:
    """
    기존 FAISS 인덱스에 새 벡터를 append 하고,
    vectors_meta.jsonl / manifest.json 을 append 모드로 갱신한다.
    """
    logging.info(
        "[FAISS] 기존 인덱스를 로드하여 새 벡터 %d개를 추가합니다: %s",
        vectors.shape[0],
        FAISS_INDEX_PATH,
    )

    index = faiss.read_index(str(FAISS_INDEX_PATH))

    if index.d != vectors.shape[1]:
        raise ValueError(
            f"기존 인덱스 차원({index.d})과 새 벡터 차원({vectors.shape[1]})이 다릅니다."
        )

    # 기존 인덱스 벡터는 이미 정규화된 상태라고 가정하고,
    # 새 벡터만 L2 정규화해서 추가한다.
    faiss.normalize_L2(vectors)
    index.add(vectors.astype("float32"))
    faiss.write_index(index, str(FAISS_INDEX_PATH))
    logging.info(
        "[FAISS] 기존 인덱스에 벡터 %d개 추가 완료 → %s",
        vectors.shape[0],
        FAISS_INDEX_PATH,
    )

    # 메타/매니페스트는 "추가" 모드로 기록
    append_vectors_meta(
        records=records,
        meta_path=VECTORS_META_PATH,
    )
    update_manifest_append(
        model=embed_model,
        output_dim=output_dim,
        num_new_vectors=vectors.shape[0],
        num_new_text_chunks=num_text_chunks,
        num_new_figure_chunks=num_figure_chunks,
        chunk_dirs=chunk_dirs,
        manifest_path=MANIFEST_PATH,
    )


# ----------------------------- replace-doc 전용 유틸 -----------------------------


def load_existing_meta_excluding_doc(
    exclude_doc_id: str,
) -> Tuple[List[ChunkRecord], List[int], int]:
    """
    기존 vectors_meta.jsonl 을 읽어,
      - doc_id != exclude_doc_id 인 레코드는 keep 대상으로 ChunkRecord 로 복원
      - doc_id == exclude_doc_id 인 레코드는 제거 대상으로 카운트만 센다.

    반환:
      (keep_records, keep_vector_indices, removed_count)
    """
    if not VECTORS_META_PATH.exists():
        logging.warning(
            "[REPLACE] vectors_meta.jsonl 이 존재하지 않아 replace-doc 을 수행할 수 없습니다: %s",
            VECTORS_META_PATH,
        )
        return [], [], 0

    keep_records: List[ChunkRecord] = []
    keep_indices: List[int] = []
    removed_count = 0

    with VECTORS_META_PATH.open("r", encoding="utf-8") as f:
        for line_no, line in enumerate(f, start=0):
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
            except json.JSONDecodeError:
                logging.warning("[REPLACE] 메타 JSON 파싱 실패 (line=%d): %s", line_no, line)
                continue

            doc_id = data.get("doc_id")
            vec_idx = data.get("vector_index", line_no)

            if doc_id == exclude_doc_id:
                removed_count += 1
                continue

            # vector_index 는 새로 쓸 예정이라 meta 에서는 제거
            data_without_vec_index = dict(data)
            data_without_vec_index.pop("vector_index", None)

            uid = data_without_vec_index.get("uid") or data_without_vec_index.get("chunk_id") or f"{doc_id}_unknown"
            chunk_type = data_without_vec_index.get("chunk_type", "text")
            text = (data_without_vec_index.get("text") or "").strip() or "[EMPTY]"

            keep_records.append(
                ChunkRecord(
                    uid=uid,
                    doc_id=doc_id or "",
                    chunk_type=chunk_type,
                    text=text,
                    meta=data_without_vec_index,
                )
            )
            keep_indices.append(int(vec_idx))

    logging.info(
        "[REPLACE] 기존 메타 로드 완료. keep=%d, 제거(doc_id=%s)=%d",
        len(keep_records),
        exclude_doc_id,
        removed_count,
    )
    return keep_records, keep_indices, removed_count


def rebuild_index_with_replacement(
    replace_doc_id: str,
    new_vectors: np.ndarray,
    new_records: List[ChunkRecord],
    embed_model: str,
    output_dim: int,
    chunk_dirs: Dict[str, str],
) -> None:
    """
    기존 인덱스에서 특정 doc_id 에 해당하는 벡터를 제거하고,
    새 벡터(new_vectors)를 포함해 전체 인덱스를 재구성한다.

    - 기존 인덱스/메타가 없다면 → 단순히 새 인덱스를 생성.
    - 기존 인덱스는 있는데 해당 doc_id 가 없다면 → append 와 동일하게 동작.
    """
    if not FAISS_INDEX_PATH.exists() or not VECTORS_META_PATH.exists():
        logging.warning(
            "[REPLACE] 기존 인덱스/메타 파일이 없어 replace-doc 을 수행할 수 없습니다. "
            "새 인덱스를 생성합니다."
        )
        # 단일 문서만 포함된 새 인덱스 생성
        build_and_save_faiss_index(new_vectors, FAISS_INDEX_PATH)
        save_vectors_meta(new_records, VECTORS_META_PATH)
        num_text = sum(1 for r in new_records if r.chunk_type == "text")
        num_fig = sum(1 for r in new_records if r.chunk_type == "figure")
        save_manifest(
            model=embed_model,
            output_dim=output_dim,
            num_vectors=new_vectors.shape[0],
            num_text_chunks=num_text,
            num_figure_chunks=num_fig,
            chunk_dirs=chunk_dirs,
            manifest_path=MANIFEST_PATH,
        )
        return

    # 1) 메타 로드: 교체 대상 doc_id 를 제외한 레코드만 keep
    keep_records, keep_indices, removed_count = load_existing_meta_excluding_doc(
        exclude_doc_id=replace_doc_id
    )

    if removed_count == 0:
        logging.info(
            "[REPLACE] 기존 인덱스 안에 doc_id=%s 에 해당하는 벡터가 없어 "
            "append 모드로 동작합니다.",
            replace_doc_id,
        )
        append_to_existing_index(
            vectors=new_vectors,
            records=new_records,
            embed_model=embed_model,
            output_dim=output_dim,
            num_text_chunks=sum(1 for r in new_records if r.chunk_type == "text"),
            num_figure_chunks=sum(1 for r in new_records if r.chunk_type == "figure"),
            chunk_dirs=chunk_dirs,
        )
        return

    # 2) 기존 인덱스에서 keep_indices 에 해당하는 벡터만 추출
    index = faiss.read_index(str(FAISS_INDEX_PATH))
    d = index.d

    # IndexFlatIP 의 벡터는 xb 에 연속 배열로 저장된다.
    xb = faiss.vector_to_array(index.xb).reshape(-1, d)
    if xb.shape[0] < max(keep_indices) + 1:
        logging.warning(
            "[REPLACE] 기존 인덱스 벡터 수(%d) < 메타의 최대 vector_index(%d). "
            "메타와 인덱스가 불일치할 수 있습니다.",
            xb.shape[0],
            max(keep_indices),
        )

    keep_indices_arr = np.array(keep_indices, dtype="int64")
    keep_vectors = xb[keep_indices_arr]

    logging.info(
        "[REPLACE] 기존 인덱스에서 keep 벡터 %d개 선택 (doc_id=%s 제거 %d개).",
        keep_vectors.shape[0],
        replace_doc_id,
        removed_count,
    )

    # 3) 기존 keep_vectors + 새 new_vectors 를 합쳐 새 인덱스를 구성
    all_vectors = (
        np.concatenate([keep_vectors, new_vectors], axis=0).astype("float32")
        if keep_vectors.size > 0
        else new_vectors.astype("float32")
    )
    all_records: List[ChunkRecord] = keep_records + new_records

    # 4) 인덱스 / 메타 / 매니페스트를 모두 새로 쓴다.
    build_and_save_faiss_index(all_vectors, FAISS_INDEX_PATH)
    save_vectors_meta(all_records, VECTORS_META_PATH)

    num_text_chunks = sum(1 for r in all_records if r.chunk_type == "text")
    num_figure_chunks = sum(1 for r in all_records if r.chunk_type == "figure")

    save_manifest(
        model=embed_model,
        output_dim=output_dim,
        num_vectors=all_vectors.shape[0],
        num_text_chunks=num_text_chunks,
        num_figure_chunks=num_figure_chunks,
        chunk_dirs=chunk_dirs,
        manifest_path=MANIFEST_PATH,
    )

    logging.info(
        "[REPLACE] doc_id=%s 에 대한 기존 벡터 %d개 제거 후, "
        "새 벡터 %d개를 포함해 인덱스를 재구성했습니다. (총 벡터=%d)",
        replace_doc_id,
        removed_count,
        new_vectors.shape[0],
        all_vectors.shape[0],
    )


# ----------------------------- 메인 파이프라인 -----------------------------


def run_pipeline(
    embed_model: str,
    output_dim: int,
    batch_size: int,
    include_figure: bool,
    doc_ids: Optional[List[str]],
    overwrite: bool,
    replace_doc_id: Optional[str],
) -> None:
    """
    전체 RAG 임베딩 파이프라인을 실행한다.

    [파이프라인 단계]
      1) 텍스트/figure 청크 로딩
      2) Google Gemini 임베딩
      3) 인덱스 생성/append/교체
      4) vectors_meta.jsonl / manifest.json 저장 또는 갱신

    [인덱스/메타 처리 규칙]
      - replace_doc_id 가 설정된 경우:
          → 기존 인덱스에서 해당 doc_id 벡터만 제거하고 새 벡터를 반영
      - replace_doc_id 가 없고 overwrite=True 인 경우:
          → 전체 인덱스를 새로 생성
      - 둘 다 없고 기존 인덱스가 존재하는 경우:
          → 기존 인덱스에 벡터 append
      - 둘 다 없고 인덱스가 처음인 경우:
          → 새 인덱스 생성
    """
    ensure_directories()

    # replace_doc_id 가 지정되었는데 doc_ids 가 비어 있으면,
    # 실수로 전체 문서를 임베딩하는 것을 막기 위해 자동으로 제한한다.
    if replace_doc_id and (not doc_ids):
        doc_ids = [replace_doc_id]
        logging.info(
            "[PIPELINE] --replace-doc-id=%s 가 설정되어 있어 doc_ids 를 자동으로 [%s] 로 제한합니다.",
            replace_doc_id,
            replace_doc_id,
        )

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

    chunk_dirs = {
        "text": str(CHUNKS_TEXT_DIR.relative_to(PROJECT_ROOT)),
        "figure": str(CHUNKS_FIGURE_DIR.relative_to(PROJECT_ROOT)),
    }

    # 3) 인덱스 생성/append/교체 분기

    # (1) 특정 doc_id 교체 모드
    if replace_doc_id:
        if overwrite:
            logging.warning(
                "[PIPELINE] --replace-doc-id 와 --overwrite 가 동시에 지정되었습니다. "
                "replace-doc-id 전략을 우선 적용하고 overwrite 플래그는 무시합니다."
            )
        rebuild_index_with_replacement(
            replace_doc_id=replace_doc_id,
            new_vectors=vectors,
            new_records=kept_records,
            embed_model=embed_model,
            output_dim=output_dim,
            chunk_dirs=chunk_dirs,
        )
        logging.info("[PIPELINE] replace-doc-id 파이프라인 완료.")
        return

    # (2) overwrite=True 이면 전체 재생성
    if overwrite or not FAISS_INDEX_PATH.exists():
        logging.info(
            "[FAISS] 새 인덱스를 생성합니다 (overwrite=%s): %s",
            overwrite,
            FAISS_INDEX_PATH,
        )
        build_and_save_faiss_index(
            vectors=vectors,
            index_path=FAISS_INDEX_PATH,
        )
        save_vectors_meta(
            records=kept_records,
            meta_path=VECTORS_META_PATH,
        )
        save_manifest(
            model=embed_model,
            output_dim=output_dim,
            num_vectors=vectors.shape[0],
            num_text_chunks=num_text_kept,
            num_figure_chunks=num_figure_kept,
            chunk_dirs=chunk_dirs,
            manifest_path=MANIFEST_PATH,
        )
        logging.info("[PIPELINE] 전체 재생성(또는 최초 생성) 완료.")
        return

    # (3) 기본 append 모드
    append_to_existing_index(
        vectors=vectors,
        records=kept_records,
        embed_model=embed_model,
        output_dim=output_dim,
        num_text_chunks=num_text_kept,
        num_figure_chunks=num_figure_kept,
        chunk_dirs=chunk_dirs,
    )
    logging.info("[PIPELINE] append 모드 완료.")


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
            "기존 FAISS 인덱스/메타 파일을 덮어쓰고 새로 생성합니다. "
            "기본값(False)에서는 기존 인덱스가 있으면 벡터를 append 합니다."
        ),
    )
    parser.add_argument(
        "--replace-doc-id",
        type=str,
        default=None,
        help=(
            "특정 doc_id 에 해당하는 기존 벡터를 삭제한 뒤, "
            "해당 doc_id 의 새 청크만 다시 임베딩하여 인덱스를 재구성합니다. "
            "보통 --doc-id <DOC> 와 함께 사용하는 것을 권장합니다."
        ),
    )

    args = parser.parse_args()

    configure_logging()

    include_figure = not args.text_only

    logging.info(
        "===== RAG 임베딩 파이프라인 시작 =====\n"
        "  embed_model     = %s\n"
        "  output_dim      = %d\n"
        "  batch_size      = %d\n"
        "  include_figure  = %s\n"
        "  doc_ids         = %s\n"
        "  overwrite       = %s\n"
        "  replace_doc_id  = %s",
        args.model,
        args.dim,
        args.batch_size,
        include_figure,
        ", ".join(args.doc_id) if args.doc_id else "전체",
        args.overwrite,
        args.replace_doc_id or "None",
    )

    run_pipeline(
        embed_model=args.model,
        output_dim=args.dim,
        batch_size=args.batch_size,
        include_figure=include_figure,
        doc_ids=args.doc_id,
        overwrite=args.overwrite,
        replace_doc_id=args.replace_doc_id,
    )


if __name__ == "__main__":
    main()
