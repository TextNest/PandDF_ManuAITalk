# ============================================================
#  File: src/rag_qa_service.py
# ============================================================
# [모듈 개요]
#   - RAG 기반 QA 세션 관리 모듈.
#   - RagSearcher(rag_search_gemini.py)를 이용해
#       1) 사용자 질의 → 벡터 검색
#       2) 검색 결과 청크들을 컨텍스트로 Gemini 2.5 Flash에게 답변 생성
#   - "세션" 단위로 현재 대화에서 사용 중인 doc_id(제품/설명서)를 기억하여
#     후속 질의에서 코드가 생략되더라도 동일 문서에 대해 질의가 이어지도록 함.
#
# [핵심 기능]
#   1) RAGQASession.answer()
#      - 제품/모델 코드 자동 인식 + doc_id_filter 자동 적용
#        (상위에서 doc_id_filter를 안 넘길 때)
#      - RagSearcher.search()도 자체적으로 코드 인식 기능을 가지고 있어,
#        두 레벨(세션/검색기) 모두에서 코드를 해석할 수 있도록 설계.
#   2) Gemini 2.5 Flash 기반 답변 생성
#      - "가전제품 설명서 전용 QA 어시스턴트" 시스템 프롬프트
#      - 근거 출처를 [doc_id p.X] 형식으로 활용할 수 있도록 컨텍스트 구성
#
# [외부에서 사용하는 주요 API]
#   - RAGQASession
#       session = RAGQASession()
#       result = session.answer(
#           query="SAH001 제품 사양 알려줘",
#           top_k=5,
#           chunk_type_filter=None,       # "text" | "figure" | None
#           doc_id_filter=None,           # ["SAH001"] | None
#       )
#       print(result.answer)
#
# ============================================================

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Sequence, Tuple

from google import genai
from google.genai import types

from .rag_search_gemini import (
    RagSearcher,
    SearchResult,
    RetrievedChunk,
    load_gemini_client,
)

logger = logging.getLogger(__name__)


# ----------------------------- 상수 / 프롬프트 -----------------------------


DEFAULT_GEN_MODEL: str = "gemini-2.5-flash"
DEFAULT_TOP_K: int = 8

# LLM에 넘길 때, 청크 하나당 텍스트 최대 길이(문자 수).
# 너무 긴 청크는 ... (중략) 을 붙여 잘라서 전달해 컨텍스트 폭주를 막는다.
MAX_CONTEXT_CHARS_PER_CHUNK: int = 1200

# QA용 시스템 프롬프트
QA_SYSTEM_PROMPT: str = """
당신은 '가전제품 사용설명서 전용' 한국어 Q&A 어시스턴트입니다.

[역할]
- 아래에 제공되는 '검색된 설명서 발췌문' 안에서만 근거를 찾고 답변합니다.
- 설명서에 명시되지 않은 추가 정보(추측, 일반 상식, 인터넷 정보 등)를
  새로 지어내지 않습니다.
- 답이 설명서에 명확히 없으면, 모르는 내용을 지어내지 말고
  "해당 설명서 발췌문에서는 정보를 찾을 수 없습니다" 라고 솔직하게 말합니다.
- 설명서는 한국 소비자를 대상으로 한 자료이므로,
  안전, 사용방법, 주의사항 등을 친절하고 쉽게 설명합니다.

[답변 원칙]
1. 사용자가 질문한 제품/모델에 대해서만 답합니다.
2. 안전과 관련된 내용이 있다면, 항상 눈에 잘 띄게 강조하여 안내합니다.
3. 설명서의 표현을 그대로 복사하기보다는, 이해하기 쉽게 풀어서 설명하지만
   의미를 왜곡하지 않습니다.
4. 여러 발췌문이 있을 경우, 서로 모순되지 않는 선에서 통합하여 답변합니다.
5. 출처 표시를 할 때에는, 문장 끝에 대괄호로 [doc_id p.페이지] 형식을 사용합니다.
   예) 히터의 사이즈는 가로 590mm, 높이 1570mm입니다. [SAH001 p.3]

[중요]
- 발췌문에 크기/사양/제원 정보가 있다면, 숫자와 단위를 정확하게 그대로 옮깁니다.
- 발췌문이 없거나, 질문과 직접 관련된 내용이 없다면 그 사실을 분명히 언급합니다.
"""


# ----------------------------- 데이터 구조 정의 -----------------------------


@dataclass
class QAResult:
    """
    RAGQASession.answer() 의 반환 결과.

    - answer: LLM이 생성한 최종 답변 텍스트
    - search_result: RagSearcher.search() 검색 결과 원본
    - used_doc_id_filter:
        실제 검색에 사용된 doc_id_filter (없으면 None)
    - doc_ids_from_codes:
        이번 질의에서 "제품/모델 코드" 를 인식해 얻은 doc_id 목록
        (세션 기억/명시 filter가 우선이면 빈 리스트)
    - used_session_doc_filter:
        True  → 세션이 기억하고 있던 doc_id를 재사용한 경우
        False → 새로 감지되었거나, 아예 doc_id 필터 없이 검색한 경우
    """

    question: str
    answer: str
    search_result: SearchResult
    used_doc_id_filter: Optional[List[str]] = None
    doc_ids_from_codes: List[str] = field(default_factory=list)
    used_session_doc_filter: bool = False


# ----------------------------- RAGQASession 구현 -----------------------------


class RAGQASession:
    """
    단일 사용자 대화 세션 단위로
      - 검색기(RagSearcher)
      - 생성모델(Gemini 2.5 Flash)
      - 현재 문서(doc_id) 컨텍스트
      - 대화 이력(history)
    를 관리하는 클래스.

    🔹 제품/모델 코드 인식 + doc_id_filter 자동 적용 로직
    ----------------------------------------------------
    1) answer() 호출 시 인자에 doc_id_filter가 명시되면 그 값을 최우선 사용.
       - self.current_doc_ids 를 해당 값으로 갱신.
    2) 명시된 doc_id_filter가 없다면, 검색기(RagSearcher)의
       extract_model_codes_from_query() / resolve_doc_ids_for_codes()
       를 이용해 질의문에서 코드(SBDH-T1000, SAH001 등)를 추출.
       - 매핑되는 doc_id가 있으면 그 목록을 doc_id_filter로 사용하고,
         self.current_doc_ids에 저장 (→ 다음 턴에서 제품명 생략 가능).
    3) 1, 2 둘 다 실패하고, 세션이 이미 current_doc_ids를 기억하고 있다면
       - 이전 턴에서 사용하던 doc_id_filter를 그대로 재사용.
    4) 그 어떤 것도 없으면 doc_id_filter 없이 전체 설명서에 대해 검색.

    * RagSearcher.search() 내부에도
      "doc_id_filter가 비어 있을 때, 질의에서 코드 감지 → 자동 필터링"
      로직이 있으므로, 상위(세션)와 하위(검색기) 두 레벨에서
      코드 인식이 동작하는 구조이다.
    """

    def __init__(
        self,
        searcher: Optional[RagSearcher] = None,
        gen_model: str = DEFAULT_GEN_MODEL,
        temperature: float = 0.2,
        top_k: int = DEFAULT_TOP_K,
    ) -> None:
        # 검색기 (없으면 기본 설정으로 생성)
        self.searcher: RagSearcher = searcher or RagSearcher()

        # 생성 모델 관련 설정
        self.gen_model: str = gen_model
        self.temperature: float = temperature
        self.top_k: int = top_k

        # LLM 클라이언트 (rag_search_gemini 의 유틸 재사용)
        self._client: genai.Client = load_gemini_client()

        # 세션 상태
        self.history: List[Dict[str, str]] = []  # {"role": "user"/"assistant", "content": "..."}
        self.current_doc_ids: Optional[List[str]] = None  # 현재 세션에서 선택된 doc_id 목록
        self.last_question: Optional[str] = None

        logger.info(
            "[QA] RAGQASession 초기화 완료 (gen_model=%s, top_k=%d)",
            self.gen_model,
            self.top_k,
        )

    # ---------- 세션 관리 유틸 ----------

    def reset(self) -> None:
        """
        세션 상태 초기화 (대화 이력, 현재 doc_id 컨텍스트 등).
        """
        self.history.clear()
        self.current_doc_ids = None
        self.last_question = None
        logger.info("[QA] RAGQASession 상태가 초기화되었습니다.")

    # ---------- doc_id_filter 결정 로직 ----------

    def _decide_doc_id_filter(
        self,
        query: str,
        explicit_doc_ids: Optional[Sequence[str]] = None,
    ) -> Tuple[Optional[List[str]], List[str], bool]:
        """
        현재 턴에서 사용할 doc_id_filter를 결정한다.

        Returns:
            (effective_doc_ids, doc_ids_from_codes, used_session_doc_filter)

            - effective_doc_ids      : 실제 search()에 넘길 doc_id_filter (없으면 None)
            - doc_ids_from_codes     : 이번 질의에서 코드 인식으로 얻어진 doc_id 목록
            - used_session_doc_filter: 세션의 current_doc_ids를 재사용했는지 여부
        """
        # 1) 명시적으로 doc_id_filter 인자가 넘어온 경우 → 최우선
        if explicit_doc_ids:
            dedup = list(
                dict.fromkeys(
                    str(d).strip() for d in explicit_doc_ids if str(d).strip()
                )
            )
            if dedup:
                self.current_doc_ids = dedup
                logger.info(
                    "[QA] 상위 레벨에서 명시된 doc_id_filter 사용: %s",
                    ",".join(dedup),
                )
                return dedup, [], False

        # 2) 질의문에서 제품/모델 코드 추출 → doc_id 매핑
        codes = self.searcher.extract_model_codes_from_query(query)
        if codes:
            doc_ids_from_codes = self.searcher.resolve_doc_ids_for_codes(codes)
            if doc_ids_from_codes:
                self.current_doc_ids = doc_ids_from_codes
                logger.info(
                    "[QA] 질의에서 모델 코드 감지 %s → doc_id_filter 설정: %s",
                    ",".join(codes),
                    ",".join(doc_ids_from_codes),
                )
                return doc_ids_from_codes, doc_ids_from_codes, False
            else:
                logger.info(
                    "[QA] 질의에서 코드 %s 감지되었으나 매핑되는 doc_id 없음",
                    ",".join(codes),
                )

        # 3) 세션에서 기억 중인 doc_id 컨텍스트 재사용
        if self.current_doc_ids:
            logger.info(
                "[QA] 세션 컨텍스트의 doc_id_filter 재사용: %s",
                ",".join(self.current_doc_ids),
            )
            return list(self.current_doc_ids), [], True

        # 4) 아무 필터도 사용하지 않음 (전체 문서 대상 검색)
        logger.info("[QA] doc_id_filter 없이 전체 설명서 대상 검색을 수행합니다.")
        return None, [], False

    # ---------- 컨텍스트 문자열 구성 ----------

    @staticmethod
    def _format_chunk_for_context(chunk: RetrievedChunk) -> str:
        """
        LLM에 넘길 컨텍스트 텍스트 한 덩어리로 변환.

        예:
            [SAH001 p.3 TEXT]
            (섹션: 제품 사양)
            제품 사양 | 품 명 | 가스 히터 ...

        - 청크 본문은 MAX_CONTEXT_CHARS_PER_CHUNK 길이까지만 사용하고,
          넘어가는 경우 "(중략)" 표시를 덧붙인다.
        """
        doc_id = chunk.doc_id
        page = chunk.meta.get("page") or chunk.meta.get("page_start")
        page_info = f"p.{page}" if page is not None else "p.?"
        chunk_type = (chunk.chunk_type or "text").upper()

        section = chunk.meta.get("section_title") or chunk.meta.get("category") or ""
        section_line = f"(섹션: {section})" if section else ""

        header = f"[{doc_id} {page_info} {chunk_type}]"
        body = (chunk.text or "").strip()

        # 과도하게 긴 청크는 잘라서 전달
        if body and len(body) > MAX_CONTEXT_CHARS_PER_CHUNK:
            body = body[:MAX_CONTEXT_CHARS_PER_CHUNK].rstrip() + "\n...(중략)..."

        parts = [header]
        if section_line:
            parts.append(section_line)
        if body:
            parts.append(body)

        return "\n".join(parts)

    def _build_context_block(self, search_result: SearchResult) -> str:
        """
        여러 청크들을 하나의 컨텍스트 블록 문자열로 합친다.
        """
        formatted_chunks: List[str] = [
            self._format_chunk_for_context(ch) for ch in search_result.chunks
        ]
        if not formatted_chunks:
            return "(검색된 설명서 발췌문이 없습니다.)"
        return "\n\n-----\n\n".join(formatted_chunks)

    # ---------- LLM 호출 ----------

    def _call_llm(
        self,
        question: str,
        search_result: SearchResult,
    ) -> str:
        """
        Gemini 2.5 Flash를 호출해 최종 답변을 생성.
        """
        context_block = self._build_context_block(search_result)

        # 하나의 텍스트 프롬프트로 시스템 지시 + 컨텍스트 + 질문을 합친다.
        prompt = (
            QA_SYSTEM_PROMPT.strip()
            + "\n\n"
            + "==============================\n"
            + "[검색된 설명서 발췌문]\n"
            + "==============================\n"
            + context_block
            + "\n\n"
            + "==============================\n"
            + "[사용자 질문]\n"
            + "==============================\n"
            + question.strip()
            + "\n"
        )

        logger.info("[QA] Gemini 답변 생성 시작 (context_chunks=%d)", len(search_result.chunks))

        resp = self._client.models.generate_content(
            model=self.gen_model,
            contents=[prompt],
            config=types.GenerateContentConfig(
                temperature=self.temperature,
            ),
        )

        # 응답 텍스트만 추출
        text_parts: List[str] = []
        if getattr(resp, "candidates", None):
            for cand in resp.candidates:
                if not cand.content:
                    continue
                for part in cand.content.parts:
                    if hasattr(part, "text") and part.text:
                        text_parts.append(part.text)
        if not text_parts and hasattr(resp, "text") and resp.text:
            text_parts.append(resp.text)

        answer_text = "\n".join(text_parts).strip()
        if not answer_text:
            logger.warning("[QA] LLM 응답이 비어 있습니다.")
            answer_text = (
                "죄송합니다. 현재 제공된 설명서 발췌문만으로는 "
                "적절한 답변을 생성하지 못했습니다."
            )

        return answer_text

    # ---------- 메인 API: answer() ----------

    def answer(
        self,
        query: str,
        top_k: Optional[int] = None,
        chunk_type_filter: Optional[str] = None,     # "text" | "figure" | None
        doc_id_filter: Optional[Sequence[str]] = None,
    ) -> QAResult:
        """
        사용자의 자연어 질의(query)에 대해 RAG 기반 답변을 생성한다.

        1) 세션/질의 기반으로 doc_id_filter 결정
        2) RagSearcher.search() 호출로 관련 청크 검색
        3) 검색 결과를 컨텍스트로 LLM 호출
        4) 세션 이력/컨텍스트 갱신 후 QAResult 반환
        """
        q = query.strip()
        if not q:
            raise ValueError("빈 문자열은 질의로 사용할 수 없습니다.")

        # 0) 사용할 top_k 결정
        effective_top_k = top_k if (top_k is not None and top_k > 0) else self.top_k

        # 1) 이번 턴에서 사용할 doc_id_filter 결정
        effective_doc_ids, doc_ids_from_codes, used_session_filter = (
            self._decide_doc_id_filter(q, explicit_doc_ids=doc_id_filter)
        )

        # 2) 검색 수행
        search_result: SearchResult = self.searcher.search(
            query=q,
            top_k=effective_top_k,
            chunk_type_filter=chunk_type_filter,
            doc_id_filter=effective_doc_ids,
        )

        # 3) LLM 호출로 최종 답변 생성
        answer_text: str = self._call_llm(
            question=q,
            search_result=search_result,
        )

        # 4) 세션 이력 업데이트
        self.history.append({"role": "user", "content": q})
        self.history.append({"role": "assistant", "content": answer_text})
        self.last_question = q

        return QAResult(
            question=q,
            answer=answer_text,
            search_result=search_result,
            used_doc_id_filter=list(effective_doc_ids) if effective_doc_ids else None,
            doc_ids_from_codes=list(doc_ids_from_codes),
            used_session_doc_filter=used_session_filter,
        )


# ----------------------------- 스크립트로 직접 실행 시 -----------------------------


def _interactive_cli() -> None:
    """
    간단한 CLI 테스트용:
        (.venv) > python -m src.rag_qa_service
    """
    from .rag_search_gemini import configure_logging

    configure_logging()
    session = RAGQASession()

    print("\n──────────── RAG QA 테스트 (rag_qa_service) ────────────")
    print("제품/모델 코드 인식 + doc_id_filter 자동 적용이 포함된 QA 세션입니다.")
    print("명령어:")
    print("  /reset       세션 상태 초기화 (현재 문서 컨텍스트 포함)")
    print("  /quit, /exit 종료")
    print("질문을 입력하면 모델의 답변과 함께 사용된 근거 스니펫 정보를 보여줍니다.\n")

    while True:
        try:
            q = input("질문: ").strip()
        except (EOFError, KeyboardInterrupt):
            break

        if not q:
            continue
        if q.lower() in ("/quit", "/exit"):
            break
        if q.lower() == "/reset":
            session.reset()
            print("→ 세션이 초기화되었습니다.\n")
            continue

        try:
            qa_result = session.answer(q, top_k=5)
        except Exception as e:  # pylint: disable=broad-except
            logger.exception("질의 처리 중 오류 발생: %s", e)
            print(f"[오류] {e}\n")
            continue

        # 모델 답변 출력
        print("\n[모델 답변]")
        print(qa_result.answer)
        print()

        # 메타 정보 출력
        if qa_result.used_doc_id_filter:
            src_info = ",".join(qa_result.used_doc_id_filter)
            if qa_result.doc_ids_from_codes:
                print(f"[INFO] doc_id_filter={src_info} (질의의 제품/모델 코드에서 자동 추론)")
            elif qa_result.used_session_doc_filter:
                print(f"[INFO] doc_id_filter={src_info} (세션에서 기억 중인 문서 컨텍스트 재사용)")
            else:
                print(f"[INFO] doc_id_filter={src_info} (상위에서 명시/직접 지정)")
        else:
            print("[INFO] doc_id_filter 없음 (전체 설명서 대상 검색)")

        # 근거 스니펫들 요약
        print(f"[INFO] 검색 컨텍스트: {len(qa_result.search_result.chunks)}개 스니펫 사용")
        for i, ch in enumerate(qa_result.search_result.chunks, start=1):
            doc_id = ch.doc_id
            page = ch.meta.get("page") or ch.meta.get("page_start")
            page_info = f"p.{page}" if page is not None else "p.?"
            section = ch.meta.get("section_title") or ch.meta.get("category") or ""
            section_info = f" | {section}" if section else ""
            print(
                f"  [{i}] {doc_id} {page_info}{section_info} "
                f"| type={ch.chunk_type} | score={ch.score:.4f}"
            )
        print()

    print("종료합니다.")


if __name__ == "__main__":
    _interactive_cli()
