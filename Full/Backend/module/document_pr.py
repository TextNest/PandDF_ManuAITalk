# ============================================================
#  File: module/document_pr.py
# ============================================================
# [모듈 개요]
#   - 제품 설명서 PDF 업로드 후 실행되는 "전처리 트리거"를 제공한다.
#   - api/products.py 에서 BackgroundTasks 로 호출되며,
#     업로드된 PDF에 대해 RAG 전처리 파이프라인을 수행한다.
#
# [처리 흐름]
#   1) Product.product_id로 DB에서 Product 조회 (tb_product 기준)
#   2) Product.product_id(제품 코드)를 doc_id 로 사용
#   3) 인자로 받은 pdf_path(상대경로)를 Backend 기준 절대경로로 변환
#   4) module.rag_pipeline.pipeline_entry 를 서브프로세스로 실행
#        - pipeline_entry 내부에서:
#            · Upstage 파싱 / 청킹 / 임베딩
#            · product_metadata_extractor 로 제품 메타데이터 추출 후
#              tb_product 업데이트
#   5) 종료 코드에 따라 Product.status 를 갱신
#      - pending   → 파이프라인 실행 중
#      - completed → 전처리 + 메타데이터 추출 성공
#      - failed    → 전처리 또는 메타데이터 추출 실패
#
# [주의 사항]
#   - FastAPI 앱 기동 시점에 불필요한 import 로 인해 순환 참조가 생기지 않도록
#     DB 세션 및 모델 import 는 trigger_pdf_processing 내부에서 수행한다.
# ============================================================

import asyncio
import logging
import subprocess
import sys
from pathlib import Path

from sqlalchemy import text

from module.convert import re_embed_with_langchain

# --- 로깅 설정 ------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Backend 루트 디렉터리 (module/ 상위 디렉터리)
BACKEND_ROOT: Path = Path(__file__).resolve().parents[1]


async def trigger_pdf_processing(product_id: str, pdf_path: str) -> None:
    """
    PDF 분석 및 전처리를 시작하는 트리거 함수.

    이 함수는 api/products.py 의 create_product / update_product 등에서
    BackgroundTasks.add_task(...) 형태로 호출된다.

    Parameters
    ----------
    product_id : str
        제품 코드 (tb_product.product_id)
    pdf_path : str
        업로드된 PDF의 상대 경로 (예: "uploads/pdfs/SAH001.pdf")
    """
    # 지연 import 를 사용하여 앱 기동 시점의 순환 참조를 방지한다.
    from core.db_config import get_session_text
    from core.query import find_product_id, update_product_status
    from schemas.product import AnalysisStatus  # status: 'pending' | 'completed' | 'failed'

    logger.info(
        "PDF 전처리 트리거 호출: product_id=%s, pdf_path=%s",
        product_id,
        pdf_path,
    )

    # ---------------------------------------------------------
    # 1. Product 조회 및 doc_id 결정
    # ---------------------------------------------------------
    async with get_session_text() as session:
        result = await session.execute(
            text(find_product_id),
            {"product_id": product_id},
        )
        product_row = result.mappings().one_or_none()
        if product_row is None:
            logger.error(
                "PDF 전처리 실패: Product(product_id=%s)를 찾을 수 없습니다. (pdf_path=%s)",
                product_id,
                pdf_path,
            )
            return

        # RAG 파이프라인에서 사용하는 문서 ID
        # 기본적으로 제품 코드(tb_product.product_id)를 그대로 사용한다.
        doc_id = product_id

        # 상태를 pending 으로 갱신
        #  - tb_product.status 컬럼에 저장되는 값
        update_query = text(update_product_status)
        await session.execute(
            update_query,
            {
                "product_id": product_id,
                "analysis_status": AnalysisStatus.PENDING.value,
            },
        )
        await session.commit()

        logger.info(
            "전처리 대상 제품 결정: product_id=%s, doc_id=%s (status=pending)",
            product_id,
            doc_id,
        )

    # ---------------------------------------------------------
    # 2. PDF 절대 경로 계산 및 존재 여부 검증
    # ---------------------------------------------------------
    pdf_abs_path: Path = (BACKEND_ROOT / pdf_path).resolve()

    if not pdf_abs_path.exists():
        logger.error(
            "PDF 전처리 실패: PDF 파일을 찾을 수 없습니다. abs_path=%s",
            pdf_abs_path,
        )
        # 실패 상태로 마킹
        async with get_session_text() as session:
            update_query = text(update_product_status)
            await session.execute(
                update_query,
                {
                    "product_id": product_id,
                    # 파일 자체가 없으므로 status 는 failed 로 설정
                    "analysis_status": AnalysisStatus.FAILED.value,
                },
            )
            await session.commit()
        return

    logger.info("입력 PDF 절대 경로: %s", pdf_abs_path)

    # ---------------------------------------------------------
    # 3. RAG 전처리 파이프라인 서브프로세스 실행
    #    - module.rag_pipeline.pipeline_entry 의 CLI 인터페이스를 사용한다.
    # ---------------------------------------------------------
    cmd = [
        sys.executable,
        "-m",
        "module.rag_pipeline.pipeline_entry",
        "--pdf-path",
        str(pdf_abs_path),
        "--doc-id",
        doc_id,
        "--product-id",
        product_id,
        # 필요 시 옵션 추가 가능:
        # "--force",
        # "--skip-image",
        # "--skip-embed",
    ]

    logger.info(
        "RAG 전처리 파이프라인 실행 명령: %s",
        " ".join(cmd),
    )

    loop = asyncio.get_running_loop()

    def run_pipeline() -> int:
        """
        서브프로세스에서 전처리 파이프라인을 실행하는 동기 함수.

        Returns
        -------
        int
            서브프로세스 종료 코드 (0: 성공, 그 외: 실패)
        """
        try:
            completed = subprocess.run(
                cmd,
                cwd=str(BACKEND_ROOT),
                check=False,
            )
            return completed.returncode
        except Exception as e:
            logger.exception(
                "RAG 파이프라인 서브프로세스 실행 중 예외 발생: %s",
                e,
            )
            return -1

    # run_in_executor 를 사용하여 이벤트 루프 블로킹을 피한다.
    returncode: int = await loop.run_in_executor(None, run_pipeline)

    # ---------------------------------------------------------
    # 4. 종료 코드에 따라 분석 상태(status) 갱신
    # ---------------------------------------------------------
    async with get_session_text() as session:
        result = await session.execute(
            text(find_product_id),
            {"product_id": product_id},
        )
        product_row = result.mappings().one_or_none()

        if product_row is None:
            logger.warning(
                "전처리 종료 후 상태 업데이트 실패: Product(product_id=%s)를 찾을 수 없습니다.",
                product_id,
            )
            return

        update_query = text(update_product_status)

        if returncode == 0:
            # 파이프라인 성공 시: status = completed
            await session.execute(
                update_query,
                {
                    "product_id": product_id,
                    "analysis_status": AnalysisStatus.COMPLETED.value,
                },
            )
            await session.commit()

            logger.info(
                "RAG 전처리 파이프라인 성공: product_id=%s, doc_id=%s",
                product_id,
                doc_id,
            )

            # 기본 FAISS → LangChain FAISS 변환 함수 호출
            try:
                await re_embed_with_langchain()
            except Exception as e:
                # 재임베딩이 실패하더라도 전처리 자체는 성공한 것이므로,
                # 여기서는 로깅만 남기고 status 를 되돌리지는 않는다.
                logger.exception(
                    "re_embed_with_langchain 실행 중 예외 발생: %s",
                    e,
                )
        else:
            # 파이프라인 실패 시: status = failed
            await session.execute(
                update_query,
                {
                    "product_id": product_id,
                    "analysis_status": AnalysisStatus.FAILED.value,
                },
            )
            await session.commit()

            logger.error(
                "RAG 전처리 파이프라인 실패: product_id=%s, doc_id=%s, returncode=%s",
                product_id,
                doc_id,
                returncode,
            )
