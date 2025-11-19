# ============================================================
#  File: src/image_result_selector.py
# ============================================================
# [모듈 개요]
#   - RAG 검색 결과(retrieved_chunks) 중에서
#     "이미지(figure) 청크"를 선별하고,
#     정적 파일 서버(FastAPI StaticFiles 등)가 제공하는
#     웹 URL로 매핑한 뒤,
#     캡션/문서 정보와 함께 반환하는 헬퍼 모듈.
#
# [가정]
#   1) figure_chunker.py 에서 생성된 figure 청크 JSONL에는
#        - chunk_type: "figure"
#        - image_file: "data/caption_images/<doc_id>/page_001_figure_001.png"
#        - figure_index: 1, 2, ...
#      등의 필드가 포함되어 있고,
#      임베딩/검색 단계에서 이 정보가 meta로 보존되어 있다.
#
#   2) 웹 서버에서 data/caption_images 디렉터리를
#      "/static/caption_images" 로 서빙하고 있다.
#        예) app.mount(
#               "/static/caption_images",
#               StaticFiles(directory="data/caption_images"),
#            )
#
#   3) 검색 결과 객체는 rag_search_gemini.RetrievedChunk 이며,
#        - doc_id: str
#        - chunk_type: str | None
#        - text: str
#        - meta: Dict[str, Any]
#        - score: float
#      속성을 가진다고 가정한다.
#
# [출력 구조]
#   - ImageResult dataclass:
#       {
#         "doc_id": "SAH001",
#         "page": 3,
#         "figure_index": 1,
#         "caption": "제품 전체 모습과 앞면 패널을 보여주는 그림입니다.",
#         "image_url": "/static/caption_images/SAH001/page_001_figure_001.png",
#         "score": 0.9123,
#         "chunk_id": "SAH001:figure:0001",
#       }
#
#   - select_image_results() 로
#     상위 N개 이미지 후보를 리스트로 반환한다.
#
# [사용 예]
#   from src.image_result_selector import select_image_results
#
#   search_result = searcher.search(...)
#   image_results = select_image_results(search_result.chunks, max_images=3)
#
# ============================================================

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from .rag_search_gemini import RetrievedChunk  # 타입 힌트용


# ----------------------------- 데이터 구조 -----------------------------


@dataclass
class ImageResult:
    """
    RAG 검색 결과에서 추출된 '이미지(figure) 청크' 한 개를
    웹 UI에서 바로 사용하기 좋은 형태로 정리한 구조체.
    """

    doc_id: str
    page: Optional[int]
    figure_index: Optional[int]
    caption: str
    image_url: str
    score: float
    chunk_id: str


# ----------------------------- 내부 유틸 -----------------------------


def _extract_image_path(meta: Dict[str, Any], chunk: RetrievedChunk) -> Optional[str]:
    """
    figure 청크 메타 / 속성에서 실제 이미지 파일 경로를 추출한다.

    우선순위:
      1) meta["image_file"]
      2) meta["caption_file"]
      3) chunk.image_file
      4) chunk.caption_file

    반환:
      - "data/caption_images/SAH001/page_001_figure_001.png" 와 같은 로컬 경로
      - 없으면 None
    """
    # meta 쪽 우선
    path = (
        meta.get("image_file")
        or meta.get("caption_file")
        or getattr(chunk, "image_file", None)
        or getattr(chunk, "caption_file", None)
    )
    if not path:
        return None

    # 문자열만 허용
    if not isinstance(path, str):
        return None

    return path


def _to_web_url(raw_path: str, static_prefix: str = "/static") -> str:
    """
    로컬 파일 경로(raw_path)를 정적 파일 서버 기준 웹 URL로 변환한다.

    설계:
      - raw_path 에 "caption_images" 세그먼트가 있으면,
        그 이후를 "/static/caption_images/<...>" 로 매핑한다.
          예) data/caption_images/SAH001/page_001_figure_001.png
              → /static/caption_images/SAH001/page_001_figure_001.png
      - 그렇지 않으면,
        "/static/<파일명>" 정도의 보수적인 URL로 매핑한다.
    """
    p = Path(raw_path)
    parts = p.parts

    if "caption_images" in parts:
        idx = parts.index("caption_images")
        # caption_images/ 뒤 경로만 추출
        rel = Path(*parts[idx + 1 :])
        return f"{static_prefix}/caption_images/{rel.as_posix()}"

    # 폴백: 파일명만 사용
    return f"{static_prefix}/{p.name}"


# ----------------------------- 메인 로직 -----------------------------


def select_image_results(
    retrieved_chunks: Iterable[RetrievedChunk],
    max_images: int = 3,
    static_prefix: str = "/static",
) -> List[ImageResult]:
    """
    검색된 청크들 중에서 "figure" 타입을 선별하고,
    상위 score 기준 max_images 개의 이미지 후보를 반환한다.

    Args:
        retrieved_chunks:
            RagSearcher.search() 가 반환한 SearchResult.chunks 리스트.
        max_images:
            최대 몇 개의 이미지를 반환할지 (기본 3개).
        static_prefix:
            정적 파일 서빙 URL prefix (기본 "/static").
            - 실제 FastAPI 서버에서 "/static/caption_images" 를 mount 했다면
              기본값 그대로 두면 된다.

    Returns:
        List[ImageResult]: 점수가 높은 순으로 정렬된 이미지 후보 리스트.
    """
    candidates: List[ImageResult] = []

    for ch in retrieved_chunks:
        chunk_type = (ch.chunk_type or "").lower()
        meta = ch.meta or {}

        # 1) figure 타입이 아닌 청크는 스킵
        meta_chunk_type = (meta.get("chunk_type") or "").lower()
        if chunk_type != "figure" and meta_chunk_type != "figure":
            continue

        # 2) 이미지 파일 경로 추출
        raw_path = _extract_image_path(meta, ch)
        if not raw_path:
            continue

        image_url = _to_web_url(raw_path, static_prefix=static_prefix)

        # 3) 페이지 / figure_index / 캡션 텍스트 추출
        page = meta.get("page") or meta.get("page_start")
        try:
            page = int(page) if page is not None else None
        except (TypeError, ValueError):
            page = None

        figure_index = meta.get("figure_index") or meta.get("index")
        try:
            figure_index = int(figure_index) if figure_index is not None else None
        except (TypeError, ValueError):
            figure_index = None

        caption = (ch.text or "").strip()
        if not caption:
            caption = (meta.get("caption_short") or "").strip()

        if not caption:
            # 캡션이 전혀 없으면 굳이 노출할 필요가 없으므로 스킵
            continue

        score = float(getattr(ch, "score", 0.0) or 0.0)
        doc_id = ch.doc_id or meta.get("doc_id") or "?"
        
        chunk_id = getattr(ch, "id", f"{doc_id}:figure:{figure_index or 0}")

        candidates.append(
            ImageResult(
                doc_id=doc_id,
                page=page,
                figure_index=figure_index,
                caption=caption,
                image_url=image_url,
                score=score,
                chunk_id=chunk_id,
            )
        )

    # score 내림차순 정렬 후 상위 max_images 개만 반환
    candidates.sort(key=lambda x: x.score, reverse=True)

    if max_images > 0:
        return candidates[:max_images]
    return candidates
