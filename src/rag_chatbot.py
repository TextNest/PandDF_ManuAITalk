# ============================================================
#  File: src/rag_chatbot.py
# ============================================================
# [모듈 개요]
#   - rag_search_gemini.RagSearcher + rag_qa_service.RAGQASession 을 묶어서
#     "터미널용 RAG 챗봇" 인터페이스를 제공하는 진입점 스크립트.
#
#   - 사용자는 CLI에서 자연어로 질문을 입력하고,
#     본 모듈은 내부적으로 다음 순서로 동작한다.
#
#       1) RAGQASession.answer() 호출
#          · 제품/모델 코드 자동 인식 + doc_id_filter 자동 적용
#          · RagSearcher.search() 로 관련 청크 검색
#          · Gemini 2.5 Flash 로 최종 답변 생성
#
#       2) 답변과 함께 "간추린 출처 정보" 를 출력
#          · 예) 출처: [SAH001 p.3, p.4] [SBDH-T1000 p.2]
#          🔸 스니펫별 상세 정보를 모두 나열하지 않고,
#             문서/페이지 단위로만 가볍게 묶어서 보여준다.
#
#       3) 추가 기능
#          · 전체 "검색 + 답변 생성" 에 걸린 시간을 초 단위로 표시
#          · 답변 텍스트를 한 번에 출력하지 않고,
#            터미널에서 "타자 치는 듯한" 느낌으로 스트리밍처럼 출력
#
# [주요 특징]
#   1) 세션 단위 문맥 유지
#      - 같은 세션 안에서 한 번 모델 코드를 언급하면,
#        이후에는 "이 제품 크기가 얼마야?" 처럼 코드 생략 질의도
#        동일 설명서에 대해 이어서 질의 가능.
#
#   2) 간단한 CLI 명령
#      - 일반 질문: 그냥 문장 입력
#      - /reset       : 세션 상태 초기화(현재 문서 컨텍스트 + 대화 이력 삭제)
#      - /history     : 지금까지의 Q/A 간단 요약 출력
#      - /top N       : 검색에 사용할 top_k 변경 (예: /top 5)
#      - /filter text : chunk_type_filter 강제(text / figure / all)
#      - /doc SAH001  : doc_id_filter 강제 지정(이후 질의부터 해당 문서에만 검색)
#      - /clear_doc   : doc_id_filter 해제(전체 문서 대상으로 복귀)
#      - /quit, /exit : 종료
#
#   3) 출처 표시 간소화
#      - RAGQASession.answer()에서 반환되는 search_result.chunks 를 기반으로
#        (doc_id, page) 묶음을 모아서 "문서별 페이지 목록"만 보여줌.
#      - 예)
#           출처: [SAH001 p.3, p.4] [SVC-WN2200MR p.2]
#
#   4) 응답 시간/스트리밍 출력
#      - RAGQASession.answer() 호출 직전/직후 시각을 측정하여
#        "검색 + 생성 전체 소요 시간" 을 초 단위로 출력
#      - qa_result.answer 를 한 번에 print 하지 않고
#        작은 덩어리로 잘라 짧은 딜레이를 두고 출력 → 스트리밍 느낌
#
# [실행 예]
#   (.venv) PS C:\Users\user\Desktop\test3> python -m src.rag_chatbot
#
# ============================================================

from __future__ import annotations

import logging
import re
import sys
import time  # ⬅ 응답 시간 측정 + 스트리밍 딜레이용
from collections import defaultdict
from typing import Dict, List, Optional, Tuple

from .rag_qa_service import RAGQASession, QAResult
from .rag_search_gemini import configure_logging


logger = logging.getLogger(__name__)


# ------------------------------------------------------------
# CLI 명령 파서
# ------------------------------------------------------------


def _parse_top_command(cmd: str) -> Optional[int]:
    """
    '/top N' 형식의 명령에서 N을 추출한다.

    예)
        '/top 5'  → 5
        '/top10'  → 10
    """
    m = re.search(r"/top\s*([0-9]+)", cmd)
    if not m:
        return None
    try:
        return int(m.group(1))
    except ValueError:
        return None


def _parse_filter_command(cmd: str) -> Optional[str]:
    """
    '/filter text', '/filter figure', '/filter all' 등을 파싱한다.

    반환:
        - 'text', 'figure', None
          * None 은 "필터 해제" 또는 'all' 의미
    """
    m = re.search(r"/filter\s+(\w+)", cmd)
    if not m:
        return None

    value = m.group(1).strip().lower()
    if value in ("text", "figure"):
        return value
    # 'all', 'none' 등은 필터 해제로 처리
    if value in ("all", "none", "any"):
        return None
    return None


def _parse_doc_command(cmd: str) -> Optional[List[str]]:
    """
    '/doc SAH001', '/doc SAH001 SBDH-T1000' 등에서 doc_id 목록을 추출한다.

    - 공백 기준으로 분리 후, '/doc' 키워드 뒤의 토큰들을 doc_id 로 간주.
    """
    parts = cmd.strip().split()
    if len(parts) <= 1:
        return None
    # parts[0] == '/doc'
    doc_ids = [p.strip() for p in parts[1:] if p.strip()]
    return doc_ids or None


# ------------------------------------------------------------
# 출처(근거 스니펫) 요약 유틸
# ------------------------------------------------------------


def summarize_sources(qa_result: QAResult) -> str:
    """
    QAResult.search_result.chunks 에서
    문서/페이지 단위로 출처를 간추려 문자열로 만든다.

    예)
        입력: 여러 RetrievedChunk 들
        출력: "[SAH001 p.3, p.4] [SBDH-T1000 p.2]"

    - 페이지 정보는 meta.page 또는 meta.page_start 에서 우선 추출.
    - 페이지가 없는 스니펫은 p.? 로 표기.
    """
    if not qa_result.search_result.chunks:
        return "출처: (검색된 설명서 발췌문 없음)"

    # doc_id → set(pages) 매핑 생성
    doc_to_pages: Dict[str, set] = defaultdict(set)

    for ch in qa_result.search_result.chunks:
        doc_id = ch.doc_id or "?"
        page = ch.meta.get("page") or ch.meta.get("page_start")
        if page is None:
            doc_to_pages[doc_id].add("?")
        else:
            doc_to_pages[doc_id].add(str(page))

    # 문서/페이지 묶음을 보기 좋게 문자열로 변환
    parts: List[str] = []
    for doc_id, pages in doc_to_pages.items():
        # 페이지 번호 정렬(숫자, '?' 혼합 가능성 고려)
        page_list = sorted(
            pages,
            key=lambda x: (x == "?", int(x) if x.isdigit() else 9999),
        )
        page_str = ", ".join(f"p.{p}" for p in page_list)
        parts.append(f"[{doc_id} {page_str}]")

    return "출처: " + " ".join(parts)


# ------------------------------------------------------------
# 히스토리 출력 유틸
# ------------------------------------------------------------


def print_history(session: RAGQASession, max_turns: int = 10) -> None:
    """
    세션의 최근 Q/A 이력을 간단히 출력한다.

    - history 리스트는 {"role": "user"/"assistant", "content": "..."} 구조.
    - 최근 max_turns 개의 Q/A 쌍만 보여준다.
    """
    if not session.history:
        print("→ 아직 대화 이력이 없습니다.\n")
        return

    # user/assistant 를 쌍으로 묶기
    turns: List[Tuple[str, str]] = []
    current_q: Optional[str] = None

    for msg in session.history:
        role = msg.get("role")
        content = msg.get("content", "")
        if role == "user":
            # 이전 질문이 남아있다면 그냥 버리고 새로 시작(간단 구현)
            current_q = content
        elif role == "assistant":
            if current_q is not None:
                turns.append((current_q, content))
                current_q = None

    if not turns:
        print("→ 아직 완성된 Q/A 턴이 없습니다.\n")
        return

    print(f"\n──────────── 최근 대화 이력 (최대 {max_turns}턴) ────────────")
    for i, (q, a) in enumerate(turns[-max_turns:], start=1):
        print(f"[{i}] Q: {q}")
        # 답변은 앞부분만 잘라서 미리보기 형태로 출력
        preview = a.strip().splitlines()[0] if a.strip() else ""
        if len(preview) > 120:
            preview = preview[:120].rstrip() + "..."
        print(f"    A: {preview}")
    print("────────────────────────────────────────────────────────\n")


# ------------------------------------------------------------
# 스트리밍 스타일 출력 유틸
# ------------------------------------------------------------


def stream_print_answer(text: str, chunk_size: int = 1, delay: float = 0.05) -> None:
    """
    답변 텍스트를 "스트리밍되는 것처럼" 조금씩 출력한다.

    - 실제 Google Gemini 스트리밍 API를 쓰는 것이 아니라,
      이미 생성된 전체 텍스트를 터미널에서만 chunk 단위로 나누어
      천천히 출력하는 방식이다.
    - chunk_size / delay 를 조정하여 속도를 바꿀 수 있다.

    Args:
        text: 출력할 전체 답변 문자열
        chunk_size: 한 번에 출력할 문자 개수
        delay: 각 chunk 사이에 둘 딜레이(초)
    """
    if not text:
        print("(빈 응답)")
        return

    for i in range(0, len(text), chunk_size):
        chunk = text[i : i + chunk_size]
        # print() 대신 sys.stdout.write 를 쓰고 flush 를 명시적으로 호출
        # → 줄바꿈('\n')도 chunk 안에 포함되므로 그대로 표현된다.
        sys.stdout.write(chunk)
        sys.stdout.flush()
        # 너무 긴 답변도 지나치게 느리지 않도록,
        # delay 는 쿨하게 짧게 유지
        time.sleep(delay)

    # 마지막에 개행이 없을 수 있으니 안전하게 한 줄 내려준다.
    if not text.endswith("\n"):
        print("")


# ------------------------------------------------------------
# 메인 인터랙티브 루프
# ------------------------------------------------------------


def interactive_chat() -> None:
    """
    터미널에서 실행되는 RAG 챗봇 메인 루프.

    - RAGQASession 을 하나 생성하여,
      사용자가 /reset 로 초기화하기 전까지 세션 컨텍스트를 유지한다.
    """
    configure_logging()
    session = RAGQASession()

    # CLI 상태 변수
    current_chunk_type_filter: Optional[str] = None  # "text" / "figure" / None
    current_doc_filter: Optional[List[str]] = None   # 세션 수준에서 강제하는 doc_id_filter (옵션)

    print("\n╭─────────────────── 📚 문서 기반 QA 시스템 ───────────────────╮")
    print("│ RAG 챗봇 (Gemini 2.5 Flash + text-embedding-004)             │")
    print("│                                                              │")
    print("│ 명령어:                                                      │")
    print("│   /quit, /exit   종료                                        │")
    print("│   /reset         세션 초기화(대화 이력 + 현재 문서 컨텍스트) │")
    print("│   /history       최근 Q/A 간단히 보기                        │")
    print("│   /top N         검색 대상 스니펫 수 변경 (예: /top 5)       │")
    print("│   /filter X      타입 필터 (text|figure|all)                 │")
    print("│   /doc DOC_ID    특정 설명서로 제한 (예: /doc SAH001)        │")
    print("│   /clear_doc     설명서 제한 해제(전체 문서 대상으로 검색)   │")
    print("╰──────────────────────────────────────────────────────────────╯\n")

    while True:
        try:
            q = input("질문 또는 명령어 입력: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n종료합니다.")
            break

        if not q:
            continue

        # ------------------------ 종료 명령 ------------------------
        if q.lower() in ("/quit", "/exit"):
            print("종료합니다.")
            break

        # ------------------------ 세션 초기화 ------------------------
        if q.lower() == "/reset":
            session.reset()
            current_chunk_type_filter = None
            current_doc_filter = None
            print("→ 세션이 초기화되었습니다. (타입/문서 필터 포함)\n")
            continue

        # ------------------------ 히스토리 ------------------------
        if q.lower() == "/history":
            print_history(session)
            continue

        # ------------------------ top_k 변경 ------------------------
        if q.lower().startswith("/top"):
            new_top = _parse_top_command(q)
            if new_top is None or new_top <= 0:
                print("→ 사용법: /top N (N은 1 이상의 정수)\n")
                continue
            session.top_k = new_top
            print(f"→ top_k 값을 {new_top} 으로 변경했습니다.\n")
            continue

        # ------------------------ 타입 필터 ------------------------
        if q.lower().startswith("/filter"):
            new_filter = _parse_filter_command(q)
            current_chunk_type_filter = new_filter
            if new_filter is None:
                print("→ chunk_type_filter 해제 (텍스트/이미지 모두 허용)\n")
            else:
                print(f"→ chunk_type_filter={new_filter} 로 설정했습니다.\n")
            continue

        # ------------------------ 문서 필터 설정 ------------------------
        if q.lower().startswith("/doc"):
            doc_ids = _parse_doc_command(q)
            if not doc_ids:
                print("→ 사용법: /doc DOC_ID [DOC_ID2 ...]\n")
                continue
            current_doc_filter = doc_ids
            # RAGQASession 의 current_doc_ids 도 함께 갱신해 두면,
            # 이후에 doc_id_filter 파라미터를 생략해도 세션 레벨에서 유지됨.
            session.current_doc_ids = list(doc_ids)
            docs_str = ", ".join(doc_ids)
            print(f"→ 다음 질의부터 doc_id_filter={docs_str} 로 제한합니다.\n")
            continue

        # ------------------------ 문서 필터 해제 ------------------------
        if q.lower() == "/clear_doc":
            current_doc_filter = None
            session.current_doc_ids = None
            print("→ doc_id_filter 를 해제했습니다. (전체 문서 대상으로 검색)\n")
            continue

        # ------------------------ 일반 질문 처리 ------------------------
        try:
            # 1) 질의 처리(검색 + LLM 생성) 전체에 걸린 시간 측정
            t_start = time.perf_counter()
            qa_result: QAResult = session.answer(
                query=q,
                top_k=None,  # 세션에 설정된 top_k 사용
                chunk_type_filter=current_chunk_type_filter,
                doc_id_filter=current_doc_filter,
            )
            t_end = time.perf_counter()
            elapsed = t_end - t_start
        except Exception as e:  # pylint: disable=broad-except
            logger.exception("질의 처리 중 오류 발생: %s", e)
            print(f"[오류] 질의를 처리하는 중 문제가 발생했습니다: {e}\n")
            continue

        # 2) 모델 답변 출력 (스트리밍 스타일)
        print("\n[모델 답변]")
        stream_print_answer(qa_result.answer)
        print()

        # 3) 응답 생성에 걸린 시간 출력
        #    - 소수점 둘째 자리에서 반올림하여 2자리까지 표시
        print(f"⏱ 생성 소요 시간: {elapsed:.2f}초 (검색 + 답변 생성 전체)\n")

        # 4) 간추린 출처 요약 출력
        source_summary = summarize_sources(qa_result)
        print(source_summary)
        print()

        # 디버깅이 필요할 때만 상세 로그(후보/점수 등)를 확인하면 되므로,
        # 여기서는 의도적으로 후보/점수 등은 출력하지 않는다.
        # (필요하다면 '--debug' 플래그를 받아서 추가 출력하도록 확장 가능)


# ------------------------------------------------------------
# 엔트리 포인트
# ------------------------------------------------------------


def main() -> None:
    """
    모듈이 스크립트로 실행될 때 호출되는 진입점.
    """
    # 현재 버전에서는 인자 파싱 없이 바로 인터랙티브 모드만 제공.
    # (향후 --once, --question, --json 등 옵션을 붙이고 싶다면
    #  argparse 를 사용해 확장하면 된다.)
    interactive_chat()


if __name__ == "__main__":
    # python -m src.rag_chatbot  으로 실행될 때의 진입점
    try:
        main()
    except Exception as exc:  # pylint: disable=broad-except
        # 예기치 못한 예외가 터져도 스택트레이스를 로그로 남기고
        # 사용자에게는 간단한 메시지만 보여주도록 처리.
        logger.exception("rag_chatbot 실행 중 치명적 오류 발생: %s", exc)
        print(f"[치명적 오류] rag_chatbot 실행 중 문제가 발생했습니다: {exc}")
        sys.exit(1)
