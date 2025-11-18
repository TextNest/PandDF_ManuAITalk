# ============================================================
#  File: src/figure_chunker.py
# ============================================================
# [모듈 개요]
#   - image_captioner_gemini.py 가 생성한
#       • data/figures/<doc_id>/<doc_id>_figures_captioned.json
#     을 입력으로 받아,
#   - RAG 임베딩 단계에서 사용할 "figure 캡션 청크(JSONL)"를 생성한다.
#
# [입력]
#   - data/figures/<doc_id>/<doc_id>_figures_captioned.json
#       {
#         "doc_id": "...",
#         "source_pdf": "...",
#         "num_images_total": ...,
#         "num_images_kept": ...,
#         "model": "gemini-2.5-flash",
#         "images": [
#           {
#             "index": 1,
#             "page": 1,
#             "file": "data/figures/<doc_id>/page_001_figure_001.png",
#             "caption_file": "data/caption_images/<doc_id>/page_001_figure_001.png",
#             "keep_for_caption": true,
#             "category": "photo_or_diagram",
#             "tags": [...],
#             "metrics": {...},
#             "caption_short": "짧은 접근성 캡션",
#             "caption_fallback_reason": null,
#             ...
#           },
#           ...
#         ]
#       }
#
# [출력(JSONL)]
#   - data/chunks/figure/<doc_id>_figure.jsonl
#
#   - 각 라인은 "그림 1개 = 청크 1개" 구조:
#       {
#         "id": "SAH001:figure:0001",
#         "doc_id": "SAH001",
#         "chunk_type": "figure",
#         "page": 1,
#         "figure_index": 1,
#         "text": "제품 전체 모습과 앞면 패널을 보여주는 그림이다...",
#         "image_file": "data/caption_images/SAH001/page_001_figure_001.png",
#         "orig_image_file": "data/figures/SAH001/page_001_figure_001.png",
#         "bbox_norm": { ... }     # 있는 경우 그대로 복사
#         "bbox_center_norm": { ... },  # 있는 경우 그대로 복사
#         "category": "photo_or_diagram",
#         "tags": [...],
#         "caption_model": "gemini-2.5-flash",
#         "caption_fallback_reason": null,
#         "extra": {
#             "metrics": {...},     # 전체 metrics 통째로
#             "raw_image_meta": {   # 필요 시 디버깅용으로 원본 메타 보존
#                 ...
#             }
#         }
#       }
#
# [출력(리포트)]
#   - data/chunks/figure/<doc_id>_figure_report.json
#       {
#         "doc_id": "SAH001",
#         "source_caption_file": "data/figures/SAH001/SAH001_figures_captioned.json",
#         "num_images_total": 13,
#         "num_keep_for_caption": 7,
#         "num_with_caption_text": 7,
#         "num_chunks_written": 7
#       }
#
# [설계 요점]
#   1) "텍스트 청크(text)"와 "figure 청크(이미지 캡션)"를
#      동일한 JSONL 스키마(텍스트 필드 + 메타데이터)로 맞춰서,
#      임베딩 파이프라인에서 타입만 구분(chunk_type)하면
#      공통 코드로 처리할 수 있도록 설계.
#
#   2) figure 청크는 다음 기준을 만족하는 것만 사용:
#      - keep_for_caption == True
#      - caption_short 가 공백이 아님
#
#   3) bbox_norm / bbox_center_norm / metrics / tags 등
#      좌표·분석 정보는 그대로 meta에 보존하여
#      추후 "좌표 기반 rerank"나 "페이지 내 위치 기반 UI"에서 활용 가능.
#
# [사용 예시]
#   - 전체 문서에 대해 figure 청크 생성:
#       (.venv) > python -m src.figure_chunker
#
#   - 특정 문서만 처리 (예: SAH001):
#       (.venv) > python -m src.figure_chunker --doc-id SAH001
#
#   - 기존 figure 청크를 무시하고 다시 생성:
#       (.venv) > python -m src.figure_chunker --force
#
# ============================================================

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional


# ----------------------------- 경로 / 상수 정의 -----------------------------


# 이 파일(src/figure_chunker.py)을 기준으로 프로젝트 루트 계산
PROJECT_ROOT: Path = Path(__file__).resolve().parents[1]

# figure 캡션 메타가 저장된 디렉터리
FIGURES_ROOT_DIR: Path = PROJECT_ROOT / "data" / "figures"

# 청크 출력 디렉터리 루트
CHUNKS_ROOT_DIR: Path = PROJECT_ROOT / "data" / "chunks"
FIGURE_CHUNK_DIR: Path = CHUNKS_ROOT_DIR / "figure"


# ----------------------------- 로깅 / 디렉터리 초기화 -----------------------------


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
    출력 디렉터리(FIGURE_CHUNK_DIR)를 생성한다.

    - 이미 디렉터리가 존재하면 아무 작업도 하지 않는다.
    """
    FIGURE_CHUNK_DIR.mkdir(parents=True, exist_ok=True)
    logging.info("figure 청크 출력 디렉터리 준비 완료: %s", FIGURE_CHUNK_DIR)


# ----------------------------- 입력 대상 선택 -----------------------------


def list_captioned_docs(target_doc_id: Optional[str] = None) -> List[Path]:
    """
    data/figures 아래의 *_figures_captioned.json 파일 목록을 반환한다.

    Args:
        target_doc_id:
            특정 문서만 처리하고 싶을 때, doc_id (예: "SAH001").
            이 경우:
              data/figures/<doc_id>/<doc_id>_figures_captioned.json
            만 처리한다.

    Returns:
        List[Path]: 처리할 captioned 메타 JSON 파일 경로 리스트.
    """
    if not FIGURES_ROOT_DIR.exists():
        logging.warning("FIGURES_ROOT_DIR가 존재하지 않습니다: %s", FIGURES_ROOT_DIR)
        return []

    if target_doc_id:
        path = FIGURES_ROOT_DIR / target_doc_id / f"{target_doc_id}_figures_captioned.json"
        if not path.exists():
            logging.warning(
                "요청한 doc-id에 해당하는 figures_captioned 파일을 찾을 수 없습니다: %s",
                path,
            )
            return []
        return [path]

    json_files = sorted(FIGURES_ROOT_DIR.glob("*/*_figures_captioned.json"))
    logging.info(
        "captioned figure 메타 파일 수: %d개 (%s)",
        len(json_files),
        FIGURES_ROOT_DIR,
    )
    return json_files


# ----------------------------- 청크 레코드 생성 -----------------------------


def build_figure_chunk_record(
    doc_id: str,
    model_name: Optional[str],
    idx: int,
    img_info: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    """
    단일 이미지 메타(img_info)에서 임베딩용 figure 청크 레코드를 생성한다.

    기준:
      - keep_for_caption == True
      - caption_short 가 비어 있지 않을 때만 청크 생성

    Args:
        doc_id: 문서 식별자 (PDF 파일명에서 확장자 제거)
        model_name: 캡션 생성에 사용한 모델명 (예: "gemini-2.5-flash")
        idx: 이 문서 내에서 figure 청크의 순번 (1부터 시작)
        img_info: figures_captioned.json 의 images[] 항목

    Returns:
        Dict[str, Any] | None:
            - 청크 레코드(dict) 또는
            - 청크 생성 대상이 아니면 None
    """
    keep = bool(img_info.get("keep_for_caption", False))
    caption_short = (img_info.get("caption_short") or "").strip()

    # 캡션 대상으로 표시되지 않았거나, 캡션 텍스트가 없으면 사용하지 않음
    if not keep or not caption_short:
        return None

    page = int(img_info.get("page", 0) or 0)
    figure_index = int(img_info.get("index", idx) or idx)

    caption_file = img_info.get("caption_file")
    orig_file = img_info.get("file")  # upstage_batch_loader 기준 원본 figure 파일

    bbox_norm = img_info.get("bbox_norm")
    bbox_center_norm = img_info.get("bbox_center_norm")
    category = img_info.get("category")
    tags = img_info.get("tags") or []
    metrics = img_info.get("metrics") or {}
    fallback_reason = img_info.get("caption_fallback_reason")

    # 문서 내 고유 ID (텍스트 청크와 구분하기 위해 figure 네임스페이스 사용)
    chunk_id = f"{doc_id}:figure:{idx:04d}"

    chunk: Dict[str, Any] = {
        "id": chunk_id,
        "doc_id": doc_id,
        "chunk_type": "figure",
        "page": page,
        "figure_index": figure_index,
        "text": caption_short,  # 임베딩 대상 텍스트
        "image_file": caption_file,
        "orig_image_file": orig_file,
        "caption_model": model_name,
        "caption_fallback_reason": fallback_reason,
        "category": category,
        "tags": tags,
        # 좌표 정보(있을 때만) 그대로 보존
        "bbox_norm": bbox_norm,
        "bbox_center_norm": bbox_center_norm,
        # metrics 및 기타 원본 정보를 extra에 모아 둔다.
        "extra": {
            "metrics": metrics,
            # 필요 시 디버깅/리치 UI를 위해 raw img_info 전체를 보존할 수 있음
            "raw_image_meta": img_info,
        },
    }

    return chunk


# ----------------------------- 한 문서 처리 -----------------------------


def process_one_captioned_file(
    captioned_path: Path,
    force: bool = False,
) -> None:
    """
    단일 figures_captioned.json 파일에 대해 figure 청크(JSONL)를 생성한다.

    - 입력:
        data/figures/<doc_id>/<doc_id>_figures_captioned.json
    - 출력:
        data/chunks/figure/<doc_id>_figure.jsonl
        data/chunks/figure/<doc_id>_figure_report.json

    Args:
        captioned_path: 입력 captioned 메타 JSON 파일 경로
        force: 이미 figure 청크가 있어도 덮어쓸지 여부
    """
    doc_id = captioned_path.parent.name
    chunk_path = FIGURE_CHUNK_DIR / f"{doc_id}_figure.jsonl"
    report_path = FIGURE_CHUNK_DIR / f"{doc_id}_figure_report.json"

    if chunk_path.exists() and not force:
        logging.info(
            "[SKIP] 이미 figure 청크가 존재합니다(--force 미사용): %s",
            chunk_path,
        )
        return

    try:
        meta = json.loads(captioned_path.read_text(encoding="utf-8"))
    except Exception as e:
        logging.error("[ERROR] captioned 메타 JSON 로드 실패 (%s): %s", captioned_path, e)
        return

    images: List[Dict[str, Any]] = meta.get("images", []) or []
    model_name: Optional[str] = meta.get("model")

    if not images:
        logging.warning("[WARN] doc_id=%s 에 이미지 메타가 없습니다.", doc_id)
        return

    num_images_total = len(images)
    num_keep_for_caption = 0
    num_with_caption_text = 0
    num_chunks_written = 0

    # JSONL 파일은 한 줄에 하나의 JSON 객체를 기록
    try:
        with chunk_path.open("w", encoding="utf-8") as f_out:
            idx = 0
            for img_info in images:
                if img_info.get("keep_for_caption", False):
                    num_keep_for_caption += 1
                if (img_info.get("caption_short") or "").strip():
                    num_with_caption_text += 1

                chunk = build_figure_chunk_record(
                    doc_id=doc_id,
                    model_name=model_name,
                    idx=idx + 1,
                    img_info=img_info,
                )
                if chunk is None:
                    continue

                idx += 1
                num_chunks_written += 1
                line = json.dumps(chunk, ensure_ascii=False)
                f_out.write(line + "\n")

    except Exception as e:
        logging.error(
            "[ERROR] figure 청크 JSONL 저장 실패 (%s): %s",
            chunk_path,
            e,
        )
        # 부분적으로 작성된 파일은 남겨두지만, 필요시 수동 삭제 후 재실행 가능
        return

    # 리포트 작성
    report: Dict[str, Any] = {
        "doc_id": meta.get("doc_id", doc_id),
        "source_caption_file": str(captioned_path.relative_to(PROJECT_ROOT)),
        "num_images_total": num_images_total,
        "num_keep_for_caption": num_keep_for_caption,
        "num_with_caption_text": num_with_caption_text,
        "num_chunks_written": num_chunks_written,
    }

    try:
        report_path.write_text(
            json.dumps(report, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except Exception as e:
        logging.error(
            "[ERROR] figure 청크 리포트 저장 실패 (%s): %s",
            report_path,
            e,
        )
        return

    logging.info(
        "[FIGURE CHUNKED] doc_id=%s, 이미지=%d, keep=%d, 캡션텍스트=%d, 청크=%d → %s",
        doc_id,
        num_images_total,
        num_keep_for_caption,
        num_with_caption_text,
        num_chunks_written,
        chunk_path,
    )


# ----------------------------- 메인 엔트리 포인트 -----------------------------


def main() -> None:
    """
    figure_chunker 스크립트의 메인 엔트리 포인트.

    수행 순서:
        1) 인자 파싱 (--doc-id, --force)
        2) 로깅/디렉터리 초기화
        3) 대상 captioned 메타 파일 목록 수집
        4) 각 파일에 대해 figure 청크(JSONL) 생성
    """
    parser = argparse.ArgumentParser(
        description=(
            "image_captioner_gemini 가 생성한 figures_captioned.json 을 읽어 "
            "RAG 임베딩용 figure 캡션 청크(JSONL)를 만드는 스크립트"
        )
    )
    parser.add_argument(
        "--doc-id",
        type=str,
        default=None,
        help="특정 문서만 처리하고 싶을 때, 확장자를 제외한 파일명 (예: SAH001)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help=(
            "기존 figure 청크가 있어도 덮어씁니다. "
            "기본값은 이미 결과가 있으면 SKIP."
        ),
    )

    args = parser.parse_args()

    configure_logging()
    ensure_directories()

    caption_files = list_captioned_docs(target_doc_id=args.doc_id)
    if not caption_files:
        logging.info("처리할 captioned figure 메타 파일이 없습니다: %s", FIGURES_ROOT_DIR)
        return

    logging.info("총 %d개 문서에 대해 figure 청크 생성 시작.", len(caption_files))

    for captioned_path in caption_files:
        process_one_captioned_file(
            captioned_path=captioned_path,
            force=args.force,
        )

    logging.info("모든 문서 figure 청크 생성 완료.")


if __name__ == "__main__":
    main()
