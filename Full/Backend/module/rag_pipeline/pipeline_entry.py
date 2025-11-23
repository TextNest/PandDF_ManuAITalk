# ============================================================
#  File: module/rag_pipeline/pipeline_entry.py
# ============================================================
# [모듈 개요]
#   - 업로드된 단일 PDF 파일에 대해
#       1) data/raw/<doc_id>.pdf 로 복사
#       2) Upstage 문서 파싱 (텍스트/요소/이미지 추출)
#       3) 이미지 필터링 (캡션 의미 없는 그림 제거)
#       4) 이미지 캡셔닝 생성 (Gemini 2.5 Flash)
#       5) 텍스트 정규화 (청킹 전용 마크다운)
#       6) 텍스트 청킹(JSONL)
#       7) figure 캡션 청킹(JSONL)
#       8) 임베딩 + FAISS 인덱스 생성
#       9) 전처리된 MD 기반 제품 메타데이터 추출 + DB 업데이트
#     까지 한 번에 수행하는 "전체 전처리 엔트리" 스크립트.
#
#   - 기존에 구현해 둔 각 단계별 스크립트들을
#       • module.rag_pipeline.upstage_batch_loader
#       • module.rag_pipeline.image_filter_for_caption
#       • module.rag_pipeline.image_captioner_gemini
#       • module.rag_pipeline.text_chunk_preparer
#       • module.rag_pipeline.text_chunker
#       • module.rag_pipeline.figure_chunker
#       • module.rag_pipeline.rag_embedder_gemini
#       • module.rag_pipeline.product_metadata_extractor   ← ★ 신규
#     를 그대로 사용하되,
#     여기서는 하위 스크립트를 `python -m module.rag_pipeline.XXX` 형태로
#     서브프로세스로 호출하여 순차 파이프라인을 구성한다.
#
# [사용 예시]
#   1) 업로드된 PDF를 전체 파이프라인에 태우기
#       (.venv) PS C:\...\Full\Backend> `
#           python -m module.rag_pipeline.pipeline_entry `
#               --pdf-path "C:\...\uploads\pdfs\20251119_113125_SIF-W12YH_USER.pdf" `
#               --doc-id "SIF-W12YH_USER" `
#               --product-id SIF-W12YH
#
#   2) 같은 doc_id에 대해 결과를 전부 새로 만들고 싶을 때
#       (.venv) > python -m module.rag_pipeline.pipeline_entry \
#                     --pdf-path ... \
#                     --doc-id SIF-W12YH_USER \
#                     --product-id SIF-W12YH \
#                     --force
#
#   3) 이미지 관련 단계는 건너뛰고 텍스트만 처리하고 싶을 때
#       (.venv) > python -m module.rag_pipeline.pipeline_entry \
#                     --pdf-path ... \
#                     --doc-id SAH001 \
#                     --product-id SIF-W12YH \
#                     --skip-image
#
#   4) DB 업데이트 없이 전처리/임베딩만 테스트하고 싶을 때
#       (.venv) > python -m module.rag_pipeline.pipeline_entry \
#                     --pdf-path ... \
#                     --doc-id SAH001
#         → --product-id SIF-W12YH 를 생략하면 메타데이터 추출 단계는 건너뜀
#
# [주의 사항]
#   - 이 스크립트는 Backend/module/rag_pipeline/ 디렉터리 안의 다른 스크립트들과 마찬가지로
#     "module.rag_pipeline" 패키지 기준으로 실행하는 것을 전제한다.
#       • 권장 실행 위치: Full/Backend (uvicorn main:app 를 실행하는 루트)
#       • 명령 형태    : python -m module.rag_pipeline.pipeline_entry ...
#
#   - Upstage / Gemini API 키는 PROJECT_ROOT/.env(=Full/Backend/.env) 에서
#       • UPSTAGE_API_KEY
#       • GEMINI_API_KEY (또는 GOOGLE_API_KEY 등; 개별 모듈 설정에 따름)
#     으로 관리되며, 각 하위 스크립트에서 개별적으로 load_dotenv 한다.
#
# ============================================================

from __future__ import annotations

import argparse
import logging
import shutil
import subprocess
import sys
from pathlib import Path
from typing import List

# ----------------------------- 경로 / 상수 정의 -----------------------------

# 이 파일(module/rag_pipeline/pipeline_entry.py)을 기준으로
# "Backend 루트(Full/Backend)"를 프로젝트 루트로 설정한다.
#
#   .../PandDF_ManuAITalk/Full/Backend/module/rag_pipeline/pipeline_entry.py
#   └ parents[0] = rag_pipeline
#     parents[1] = module
#     parents[2] = Backend   ← 여기
PROJECT_ROOT: Path = Path(__file__).resolve().parents[2]

# 업로드된 PDF를 복사할 RAW 디렉터리
#   예) Full/Backend/data/raw/<doc_id>.pdf
RAW_DIR: Path = PROJECT_ROOT / "data" / "raw"

# .env 파일 위치 (참고용; 실제 로드는 각 하위 스크립트에서 수행)
ENV_FILE_PATH: Path = PROJECT_ROOT / ".env"


# ----------------------------- 유틸리티 함수 -----------------------------


def configure_logging(verbose: bool = False) -> None:
    """
    로깅 포맷과 레벨을 초기화한다.

    Args:
        verbose:
            True 이면 DEBUG 레벨까지 출력하고,
            False 이면 INFO 레벨만 출력한다.
    """
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def ensure_directories() -> None:
    """
    파이프라인에서 사용하는 기본 디렉터리들을 생성한다.

    - 현재 엔트리에서 직접 사용하는 디렉터리는 RAW_DIR 뿐이지만,
      향후 확장을 고려해 필요 시 여기에서 다른 디렉터리도 함께 생성할 수 있다.
    """
    RAW_DIR.mkdir(parents=True, exist_ok=True)


def copy_pdf_to_raw(pdf_path: Path, doc_id: str, overwrite: bool = False) -> Path:
    """
    업로드된 PDF 파일을 프로젝트 표준 위치(data/raw/<doc_id>.pdf)로 복사한다.

    Args:
        pdf_path:
            백엔드(예: 업로드 API)가 저장해 둔 PDF 파일의 실제 경로.
        doc_id:
            설명서 식별자로 사용할 ID.
            data/raw/<doc_id>.pdf 파일명에 그대로 사용된다.
        overwrite:
            True 이면 같은 이름의 파일이 이미 있어도 덮어쓴다.

    Returns:
        최종적으로 생성(또는 재사용)된 data/raw/<doc_id>.pdf 경로.
    """
    target_path = RAW_DIR / f"{doc_id}.pdf"

    if target_path.exists():
        if overwrite:
            logging.info(
                "[COPY] 기존 raw PDF를 덮어쓰는 중입니다: %s", target_path
            )
        else:
            logging.info(
                "[COPY] 이미 raw PDF가 존재하므로 복사를 생략합니다: %s", target_path
            )
            return target_path

    logging.info("[COPY] 업로드된 PDF를 raw 디렉터리로 복사합니다.")
    logging.info("       원본: %s", pdf_path)
    logging.info("       대상: %s", target_path)

    shutil.copy2(pdf_path, target_path)
    return target_path


def run_step(module: str, args: List[str], description: str) -> None:
    """
    개별 단계 스크립트를 서브프로세스로 실행한다.

    Args:
        module:
            python -m 에 전달할 모듈 경로 (예: "module.rag_pipeline.upstage_batch_loader").
        args:
            모듈에 전달할 인자 리스트 (예: ["--doc-id", "SAH001", "--force"]).
        description:
            로그에 남길 단계 설명 (예: "Upstage 문서 파싱").
    """
    cmd = [sys.executable, "-m", module] + args

    logging.info("")
    logging.info("==== 단계 시작: %s ====", description)
    logging.info("실행 명령: %s", " ".join(cmd))

    # cwd를 PROJECT_ROOT(=Full/Backend)로 고정하여, 어디서 실행하더라도
    # module.rag_pipeline 패키지 및 data 디렉터리가 일관되게 인식되도록 한다.
    completed = subprocess.run(
        cmd,
        cwd=str(PROJECT_ROOT),
        check=False,  # 실패 시 직접 예외를 던지기 위해 False로 둔다.
    )

    if completed.returncode != 0:
        # 각 단계에서 에러가 발생하면 즉시 중단한다.
        logging.error(
            "단계 실행 실패 (returncode=%s): %s",
            completed.returncode,
            description,
        )
        raise RuntimeError(f"파이프라인 단계 실패: {description}")

    logging.info("==== 단계 완료: %s ====", description)


# ----------------------------- 메인 파이프라인 -----------------------------


def main() -> None:
    """
    pipeline_entry 스크립트의 메인 엔트리 포인트.

    - 업로드된 PDF 한 개에 대해 전체 전처리 파이프라인을 수행한다.
    """
    parser = argparse.ArgumentParser(
        description=(
            "업로드된 PDF에 대해 Upstage 파싱 → 이미지 필터링/캡션 → "
            "텍스트 정리/청킹 → figure 청킹 → 임베딩 → 메타데이터 추출까지 "
            "한 번에 수행하는 엔트리"
        )
    )
    parser.add_argument(
        "--pdf-path",
        type=str,
        required=True,
        help=(
            "업로드된 원본 PDF 파일의 전체 경로. "
            "예) C:\\Users\\user\\Desktop\\project\\PandDF_ManuAITalk\\"
            "Full\\Backend\\uploads\\pdfs\\....pdf"
        ),
    )
    parser.add_argument(
        "--doc-id",
        type=str,
        required=True,
        help=(
            "설명서를 식별할 doc_id (확장자 제외 파일명). "
            "data/raw/<doc_id>.pdf, data/chunks/<doc_id>_*.jsonl 등 여러 단계에서 공통 사용된다."
        ),
    )
    parser.add_argument(
        "--product-id",
        type=str,
        default=None,
        help=(
            "DB test_products(tb_product)의 product_id(제품 코드). "
            "지정하면 전처리 완료 후 제품 메타데이터 추출 단계까지 수행합니다."
        ),
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help=(
            "동일 doc_id에 대한 기존 전처리 결과가 존재하더라도 "
            "가능한 한 모두 덮어쓰도록 각 단계에 --force / --overwrite 옵션을 전달한다."
        ),
    )
    parser.add_argument(
        "--skip-image",
        action="store_true",
        help=(
            "이미지 관련 단계(필터링, 캡셔닝, figure 청크)를 건너뛴다. "
            "텍스트 기반 RAG만 필요한 경우에 사용."
        ),
    )
    parser.add_argument(
        "--skip-embed",
        action="store_true",
        help=(
            "임베딩 + FAISS 인덱스 생성 단계(rag_embedder_gemini)를 건너뛴다. "
            "청크까지만 만들고 싶을 때 사용."
        ),
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="DEBUG 레벨까지 상세 로그를 보고 싶을 때 사용.",
    )

    args = parser.parse_args()

    # 1. 로깅/디렉터리 초기화
    configure_logging(verbose=args.verbose)
    ensure_directories()

    pdf_path = Path(args.pdf_path).expanduser().resolve()
    if not pdf_path.exists():
        raise FileNotFoundError(f"지정한 PDF 파일을 찾을 수 없습니다: {pdf_path}")

    logging.info("PROJECT_ROOT        : %s", PROJECT_ROOT)
    logging.info("입력 PDF 경로       : %s", pdf_path)
    logging.info("doc_id              : %s", args.doc_id)
    logging.info("product_id : %s", args.product_id)
    logging.info("force               : %s", args.force)
    logging.info("skip_image          : %s", args.skip_image)
    logging.info("skip_embed          : %s", args.skip_embed)

    # 2. 업로드된 PDF를 data/raw/<doc_id>.pdf 로 복사
    copy_pdf_to_raw(pdf_path=pdf_path, doc_id=args.doc_id, overwrite=args.force)

    # 3. 파이프라인 단계 구성
    steps: List[tuple[str, List[str], str]] = []

    # (1) Upstage 문서 파싱: parsed/elements/figures 생성
    upstage_args: List[str] = ["--doc-id", args.doc_id]
    if args.force:
        upstage_args.append("--force")
    steps.append(
        (
            "module.rag_pipeline.upstage_batch_loader",
            upstage_args,
            "Upstage 문서 파싱 (텍스트/요소/이미지 추출)",
        )
    )

    # (2) 이미지 필터링 + 캡셔닝 + figure 청크 (옵션에 따라 생략 가능)
    if not args.skip_image:
        img_filter_args: List[str] = ["--doc-id", args.doc_id]
        if args.force:
            img_filter_args.append("--force")
        steps.append(
            (
                "module.rag_pipeline.image_filter_for_caption",
                img_filter_args,
                "이미지 필터링 (QR/아이콘/배너 등 제거)",
            )
        )

        img_caption_args: List[str] = ["--doc-id", args.doc_id]
        if args.force:
            img_caption_args.append("--force")
        # retry-failed 는 여기서는 기본적으로 사용하지 않는다.
        steps.append(
            (
                "module.rag_pipeline.image_captioner_gemini",
                img_caption_args,
                "이미지 캡셔닝 생성 (Gemini 2.5 Flash)",
            )
        )

        fig_chunk_args: List[str] = ["--doc-id", args.doc_id]
        if args.force:
            fig_chunk_args.append("--force")
        steps.append(
            (
                "module.rag_pipeline.figure_chunker",
                fig_chunk_args,
                "figure 캡션 청크(JSONL) 생성",
            )
        )
    else:
        logging.info("옵션에 의해 이미지 관련 단계(필터링/캡션/figure 청크)를 모두 건너뜁니다.")

    # (3) 텍스트 정규화 + 텍스트 청크 생성
    text_prep_args: List[str] = ["--doc-id", args.doc_id]
    if args.force:
        text_prep_args.append("--force")
    steps.append(
        (
            "module.rag_pipeline.text_chunk_preparer",
            text_prep_args,
            "텍스트 정규화 마크다운 생성",
        )
    )

    text_chunk_args: List[str] = ["--doc-id", args.doc_id]
    if args.force:
        text_chunk_args.append("--force")
    steps.append(
        (
            "module.rag_pipeline.text_chunker",
            text_chunk_args,
            "텍스트 청크(JSONL) 생성",
        )
    )

    # (4) 임베딩 + FAISS 인덱스 생성 (옵션에 따라 생략 가능)
    if not args.skip_embed:
        embed_args: List[str] = ["--doc-id", args.doc_id]
        # force=True 이면 전체 인덱스를 재생성(--overwrite),
        # 그렇지 않으면 해당 doc_id 에 한해서 교체(--replace-doc-id)
        if args.force:
            embed_args.append("--overwrite")
        else:
            embed_args.extend(["--replace-doc-id", args.doc_id])

        steps.append(
            (
                "module.rag_pipeline.rag_embedder_gemini",
                embed_args,
                "임베딩 + FAISS 인덱스 생성",
            )
        )
    else:
        logging.info("옵션에 의해 임베딩/인덱스 생성 단계를 건너뜁니다.")

    # (5) 제품 메타데이터 추출 + DB 업데이트
    if args.product_id is not None:
        meta_args: List[str] = [
            "--doc-id",
            args.doc_id,
            "--product-id",
            args.product_id,
        ]
        steps.append(
            (
                "module.rag_pipeline.product_metadata_extractor",
                meta_args,
                "제품 메타데이터 추출 및 DB 업데이트",
            )
        )
    else:
        logging.info(
            "product_id 가 지정되지 않아 제품 메타데이터 추출 단계는 건너뜁니다."
        )

    # 4. 단계별 실행
    logging.info("")
    logging.info("===== 전체 전처리 파이프라인 시작 =====")

    for module, step_args, desc in steps:
        run_step(module=module, args=step_args, description=desc)

    logging.info("===== 전체 전처리 파이프라인 완료 =====")
    logging.info("doc_id=%s 에 대한 전처리가 모두 끝났습니다.", args.doc_id)


if __name__ == "__main__":
    main()
