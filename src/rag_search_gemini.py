# ============================================================
#  File: src/rag_search_gemini.py
# ============================================================
# [모듈 개요]
#   - Google Gemini 임베딩(text-embedding-004) + FAISS 인덱스를 이용해
#       "사용자 질의 → 벡터 검색 → 후보 청크 재랭킹" 을 수행하는 모듈.
#
#   - 이 모듈은 순수히 "검색" 역할만 담당하고,
#     실제 답변 생성은 rag_qa_service.py에서 처리한다.
#
# [역할]
#   1) 질의 임베딩
#      - text-embedding-004, output_dimensionality = 768 (기본)
#   2) FAISS 검색
#      - IndexFlatIP + L2 정규화된 벡터 (코사인 유사도)
#   3) 재랭킹
#      - 텍스트 청크를 우선(가중치 1.2)
#      - 질의 키워드가 잘 매칭되는 청크에 추가 가중치 부여
#      - 🔸 "외형/크기/사양" 관련 질의 시:
#          · '제품 사양/규격/제원' 섹션 가벼운 추가 부스팅
#          · '각 부의 이름/구성품/외형' 섹션 및 figure 청크 부스팅
#          · 반대로 소비자 피해보상/보증서/AS 안내 등은 소폭 감점
#   4) 🔹 제품/모델/도면 코드 인덱스
#      - vectors_meta.jsonl 전체를 훑어서
#        "SBDH-T1000", "SAH001" 같은 코드 → doc_id 리스트 매핑을 생성
#      - search() 에서 질의에 코드가 포함되어 있으면,
#        doc_id_filter가 비어 있을 때 자동으로 해당 doc_id로 필터링
#
#      - 특히 "가장 구체적인 코드"를 우선 사용:
#          예) 질의: "SVC-WN2200MR 크기가 얼마나 돼?"
#              · 추출 코드: ["SVC-WN2200MR", "SVC", "WN2200MR"]
#              · "SVC-WN2200MR" / "WN2200MR" 같이 숫자가 포함된 더 긴 코드를
#                우선으로 사용하여, 해당 모델에 가장 밀접한 doc_id만 남김
#
# [입력 파일]
#   - data/index/faiss.index
#   - data/index/vectors_meta.jsonl
#
# [출력]
#   - 없음 (검색 결과 SearchResult 객체 반환)
#
# [외부에서 사용하는 주요 API]
#   - RagSearcher
#       searcher = RagSearcher()
#       result = searcher.search(
#           query="질문 텍스트",
#           top_k=8,
#           chunk_type_filter=None,      # "text" | "figure" | None
#           doc_id_filter=None,          # ["SAH001", "SBDH-T1000"] | None
#       )
#
# ============================================================

from __future__ import annotations

import json
import logging
import os
import re
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Sequence

import faiss  # type: ignore
import numpy as np
from dotenv import load_dotenv
from google import genai
from google.genai import types

# ----------------------------- 로거 / 경로 / 상수 정의 -----------------------------

logger = logging.getLogger(__name__)

PROJECT_ROOT: Path = Path(__file__).resolve().parents[1]

INDEX_ROOT_DIR: Path = PROJECT_ROOT / "data" / "index"
FAISS_INDEX_PATH: Path = INDEX_ROOT_DIR / "faiss.index"
VECTORS_META_PATH: Path = INDEX_ROOT_DIR / "vectors_meta.jsonl"

DEFAULT_EMBED_MODEL: str = "text-embedding-004"
DEFAULT_OUTPUT_DIM: int = 768

# 재검색/재랭킹 관련 상수
DEFAULT_TOP_K: int = 8
DEFAULT_PRESEARCH_FACTOR: int = 3  # top_k * 이 값 만큼 먼저 FAISS에서 뽑기

TEXT_TYPE_BOOST: float = 1.2       # text 청크 가중치
FIGURE_TYPE_BOOST: float = 1.0     # figure 청크 가중치

KEYWORD_BOOST_PER_HIT: float = 0.1  # 키워드 한 번 매칭될 때마다 +0.1 배
KEYWORD_MAX_HITS: int = 3           # 최대 3회까지만 반영 (→ 최대 +0.3)


# ----------------------------- 데이터 구조 정의 -----------------------------


@dataclass
class RetrievedChunk:
    """
    검색 결과에서 반환할 단일 청크 단위.

    - meta: vectors_meta.jsonl 한 줄에 해당하는 메타데이터
    """

    uid: str
    score: float              # 재랭킹된 최종 점수
    raw_score: float          # 순수 FAISS 스코어 (코사인 유사도)
    doc_id: str
    chunk_type: str           # "text" | "figure" | 기타
    text: str
    meta: Dict[str, Any]


@dataclass
class SearchResult:
    """
    검색 결과 전체 표현.
    """

    query: str
    top_k: int
    total_candidates: int            # 재랭킹 대상이 된 후보 수
    chunks: List[RetrievedChunk]


# ----------------------------- 공통 유틸 -----------------------------


def configure_logging() -> None:
    """
    간단한 로그 설정 (스크립트 단독 실행 시 사용).
    """
    logging.basicConfig(
        level=logging.INFO,
        format="[%(levelname)s] %(message)s",
    )


def load_gemini_client() -> genai.Client:
    """
    Google Gemini 클라이언트 생성.
    """
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY (또는 GOOGLE_API_KEY)가 설정되어 있지 않습니다.")
    client = genai.Client(api_key=api_key)
    return client


def extract_vectors_from_response(resp: Any) -> List[List[float]]:
    """
    embed_content 응답에서 벡터 리스트를 추출.
    rag_embedder_gemini.py 와 동일한 로직.
    """
    # batch 응답 형태
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

    # 단일 응답 형태
    if hasattr(resp, "embedding") and resp.embedding is not None:
        values = getattr(resp.embedding, "values", None)
        if values is None and isinstance(resp.embedding, dict):
            values = resp.embedding.get("values")
        if values is None:
            raise RuntimeError("임베딩 응답에서 values 필드를 찾을 수 없습니다.")
        return [list(values)]

    raise RuntimeError("embed_content 응답 형식이 예상과 다릅니다.")


def normalize_vector(vec: np.ndarray) -> np.ndarray:
    """
    (N, D) 또는 (1, D) 벡터를 L2 정규화.
    """
    faiss.normalize_L2(vec)
    return vec


# ----------------------------- 키워드 추출/부스팅 -----------------------------


_KO_STOPWORDS = {
    "는", "은", "이", "가", "을", "를", "에", "에서", "으로",
    "으로써", "으로서", "과", "와", "도", "만", "보다", "보다도",
    "때문에", "해서", "하여", "하고", "이며", "입니다", "인가요",
}

_EN_STOPWORDS = {
    "the", "is", "are", "and", "or", "of", "to", "in", "on",
    "for", "a", "an", "what", "how", "why", "who", "where",
}


def extract_keywords(query: str) -> List[str]:
    """
    매우 단순한 키워드 추출:

    - 소문자 변환
    - 알파벳/숫자/한글 외 문자는 공백으로 치환
    - 길이 2 미만 토큰, 불용어(stopword)는 제거
    """
    q = query.strip().lower()
    if not q:
        return []

    # 한글/영문/숫자 외의 문자는 공백으로 치환
    q = re.sub(r"[^0-9a-z가-힣]+", " ", q)
    tokens = [t for t in q.split() if len(t) >= 2]

    keywords: List[str] = []
    for t in tokens:
        if t in _EN_STOPWORDS:
            continue
        if t in _KO_STOPWORDS:
            continue
        keywords.append(t)

    return keywords


def compute_reranked_score(
    base_score: float,
    meta: Dict[str, Any],
    keywords: List[str],
) -> Tuple[float, float, float]:
    """
    FAISS 기본 점수(base_score)에
      - 텍스트/figure 타입 가중치
      - 키워드 부스팅
      - (질의 의도 기반) 섹션/figure 부스팅
    을 곱하여 최종 점수를 계산한다.

    Returns:
        (final_score, type_boost, keyword_boost)
        - final_score 안에는 섹션/의도 부스팅이 모두 반영된 값
    """
    chunk_type = (meta.get("chunk_type") or "").lower()
    if chunk_type == "text":
        type_boost = TEXT_TYPE_BOOST
    elif chunk_type == "figure":
        type_boost = FIGURE_TYPE_BOOST
    else:
        type_boost = 1.0

    # ---------------- 키워드 기반 부스팅 ----------------
    keyword_boost = 1.0
    if keywords:
        haystack = " ".join(
            str(meta.get(k, "")) for k in ("text", "doc_id", "uid")
        ).lower()
        hits = 0
        for kw in keywords:
            if kw and kw in haystack:
                hits += 1
            if hits >= KEYWORD_MAX_HITS:
                break
        if hits > 0:
            keyword_boost += KEYWORD_BOOST_PER_HIT * hits

    # ---------------- 질의 의도 / 섹션 기반 부스팅 ----------------
    #  - "크기/사이즈/길이/폭/높이/무게/사양/spec" → 사양/규격/제원 섹션 우선
    #  - "어떻게 생겼/생김새/모양/외형"          → 구성/각부 명칭/외형 섹션 + figure 우선
    section_boost = 1.0

    if keywords:
        kw_set = set(keywords)

        # 크기/사양 의도 감지
        size_keywords = {
            "크기", "사이즈", "size", "dimensions",
            "길이", "폭", "높이", "가로", "세로", "무게", "중량",
        }
        spec_keywords = {
            "사양", "스펙", "spec", "specs", "specification", "제원", "규격",
        }
        appearance_keywords = {
            "생김새", "모양", "외형", "appearance", "look", "looks",
        }

        is_size_or_spec_query = bool(kw_set & (size_keywords | spec_keywords)) or any(
            ("크기" in kw or "사이즈" in kw or "dimensions" in kw)
            for kw in kw_set
        )
        is_appearance_query = bool(kw_set & appearance_keywords) or any(
            ("생겼" in kw or "생긴" in kw)
            for kw in kw_set
        )

        section_title = str(
            meta.get("section_title")
            or meta.get("category")
            or ""
        ).lower()

        if section_title:
            st = section_title

            # 1) 사양/규격/제원 섹션 부스팅 (크기/사양 관련 질문일 때)
            if is_size_or_spec_query and any(
                hint in st
                for hint in ("사양", "규격", "제원", "spec", "spec.", "specification")
            ):
                section_boost *= 1.15

            # 2) 구성/각 부 명칭/외형 섹션 부스팅 (외형/모양 질문일 때)
            if is_appearance_query and any(
                hint in st
                for hint in ("각 부", "각부", "구성", "구성품", "외관", "외형", "명칭")
            ):
                section_boost *= 1.15

            # 3) 소비자 피해보상 / 보증서 / 서비스 안내는
            #    외형/크기/사양 질문에서는 소폭 감점
            if (is_size_or_spec_query or is_appearance_query) and any(
                bad in st
                for bad in ("피해보상", "소비자", "보증서", "품질 보증", "서비스", "폐가전", "재활용")
            ):
                section_boost *= 0.85

        # 4) 외형/모양 질문이면 figure 타입에 추가 부스팅
        if is_appearance_query and chunk_type == "figure":
            section_boost *= 1.10

    final_score = base_score * type_boost * keyword_boost * section_boost
    return final_score, type_boost, keyword_boost


# ----------------------------- RagSearcher 구현 -----------------------------


class RagSearcher:
    """
    벡터 인덱스(FAISS) + 메타 정보를 사용해
    설명서 청크를 검색하는 검색기.

    🔹 추가 기능:
      - vectors_meta.jsonl 전체를 훑어서
        'SBDH-T1000', 'SAH001' 같은 코드 → doc_id 매핑 인덱스를 구축.
      - search() 호출 시 doc_id_filter가 비어 있고,
        질의에서 코드가 감지되면 자동으로 해당 doc_id로 검색 범위를 좁힌다.
      - 코드가 여러 개 섞여 있을 때는 "숫자를 포함한, 더 긴 코드"를
        우선으로 사용하여 가능한 한 구체적인 모델 문서에만 매핑한다.
      - doc_id_filter가 설정되어 있으면, 그 문서의 벡터들만 대상으로
        "문서 내부 검색"을 수행한다.
    """

    # 제품/모델/도면 코드 패턴 (예: SBDH-T1000, SAH001 등)
    #  - MODEL_CODE_RE : 대문자/숫자 2~5 + '-' + 2~10 (ex. SBDH-T1000)
    #  - SIMPLE_CODE_RE: 대문자/숫자 3~8 (ex. SAH001)
    MODEL_CODE_RE = re.compile(
        r"(?<![0-9A-Z])[0-9A-Z]{2,5}-[0-9A-Z]{2,10}(?![0-9A-Z])"
    )
    SIMPLE_CODE_RE = re.compile(
        r"(?<![0-9A-Z])[0-9A-Z]{3,8}(?![0-9A-Z])"
    )

    def __init__(
        self,
        embed_model: str = DEFAULT_EMBED_MODEL,
        output_dim: int = DEFAULT_OUTPUT_DIM,
        presearch_factor: int = DEFAULT_PRESEARCH_FACTOR,
    ) -> None:
        self.embed_model = embed_model
        self.output_dim = output_dim
        self.presearch_factor = presearch_factor

        # Lazy 초기화용 내부 상태
        self._client: Optional[genai.Client] = None
        self._index: Optional[faiss.IndexFlatIP] = None
        self._meta: List[Dict[str, Any]] = []

        # 인덱스 + 메타 로딩
        self._load_index_and_meta()

        # 🔹 제품/모델 코드 → doc_id 매핑 인덱스
        self._code_to_doc_ids: Dict[str, List[str]] = {}
        self._build_code_index()

    # ---------- 내부 초기화 ----------

    def _load_index_and_meta(self) -> None:
        """
        FAISS 인덱스와 vectors_meta.jsonl 을 로딩.
        """
        if not FAISS_INDEX_PATH.exists():
            raise FileNotFoundError(f"FAISS 인덱스를 찾을 수 없습니다: {FAISS_INDEX_PATH}")
        if not VECTORS_META_PATH.exists():
            raise FileNotFoundError(f"vectors_meta.jsonl 을 찾을 수 없습니다: {VECTORS_META_PATH}")

        # 1) FAISS 인덱스 로딩
        self._index = faiss.read_index(str(FAISS_INDEX_PATH))

        # 2) 메타 로딩
        meta_list: List[Dict[str, Any]] = []
        with VECTORS_META_PATH.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    meta = json.loads(line)
                except json.JSONDecodeError:
                    continue
                meta_list.append(meta)

        if len(meta_list) != self._index.ntotal:
            logger.warning(
                "[SEARCH] 메타 레코드 수(%d)와 인덱스 벡터 수(%d)가 다릅니다.",
                len(meta_list),
                self._index.ntotal,
            )

        self._meta = meta_list

        logger.info(
            "[META] vectors_meta.jsonl 로딩 완료: %d개 레코드 (%s)",
            len(self._meta),
            VECTORS_META_PATH,
        )

    @property
    def client(self) -> genai.Client:
        """
        Gemini 클라이언트 lazy 초기화.
        """
        if self._client is None:
            self._client = load_gemini_client()
            logger.info("Gemini 클라이언트 초기화 완료.")
        return self._client

    @property
    def index(self) -> faiss.IndexFlatIP:
        if self._index is None:
            raise RuntimeError("FAISS 인덱스가 로딩되지 않았습니다.")
        return self._index

    @property
    def meta_list(self) -> List[Dict[str, Any]]:
        """
        vectors_meta.jsonl 전체 리스트 반환.
        """
        return self._meta

    # ---------- 제품/모델 코드 인덱싱 유틸 ----------

    @staticmethod
    def _normalize_code(code: str) -> str:
        """
        코드 문자열을 비교용으로 정규화:
        - 앞뒤 공백 제거
        - 대문자 변환
        - [0-9A-Z-] 만 남기고 제거
        """
        c = code.strip().upper()
        c = re.sub(r"[^0-9A-Z-]", "", c)
        return c

    def _build_code_index(self) -> None:
        """
        vectors_meta.jsonl 전체를 훑어서
          "SBDH-T1000", "SAH001" 등 → [doc_id1, doc_id2, ...] 매핑을 만든다.
        """
        code_to_docs: Dict[str, List[str]] = defaultdict(list)

        for meta in self.meta_list:
            doc_id = str(meta.get("doc_id") or "").strip()
            if not doc_id:
                continue

            candidates: List[str] = []

            # 1) 파일/출처 관련 필드에서 코드 추출
            for key in ("doc_id", "file_name", "file", "source"):
                v = str(meta.get(key) or "").upper()
                if not v:
                    continue

                # 하이픈 포함 코드(SBDH-T1000 등)
                for m in self.MODEL_CODE_RE.findall(v):
                    candidates.append(m)
                # 간단 코드(SAH001 등)
                for m in self.SIMPLE_CODE_RE.findall(v):
                    candidates.append(m)

            # 2) 텍스트 앞부분에서도 모델 코드가 노출되는 경우가 있어,
            #    텍스트 앞쪽 200자 정도만 훑어서 추가 추출
            text = str(meta.get("text") or "").upper()
            if text:
                head = text[:200]
                for m in self.MODEL_CODE_RE.findall(head):
                    candidates.append(m)

            # 3) 추출된 코드들을 정규화 후 code_to_docs 에 등록
            for code in candidates:
                norm = self._normalize_code(code)
                if not norm:
                    continue
                docs = code_to_docs.setdefault(norm, [])
                if doc_id not in docs:
                    docs.append(doc_id)

        self._code_to_doc_ids = dict(code_to_docs)

        logger.info(
            "[CODE-INDEX] 제품/모델 코드 인덱싱 완료: %d개 코드 매핑",
            len(self._code_to_doc_ids),
        )

    def extract_model_codes_from_query(self, query: str) -> List[str]:
        """
        질의문에서 제품/모델 코드 패턴(SBDH-T1000, SAH001 등)을 추출.
        (대문자/숫자 기준, 하이픈 포함)
        """
        q = query.upper()
        codes: List[str] = []

        # 1) 먼저 하이픈 포함 코드 우선 추출 (SBDH-T1000 등)
        for m in self.MODEL_CODE_RE.findall(q):
            norm = self._normalize_code(m)
            if norm and norm not in codes:
                codes.append(norm)

        # 2) 그 다음 간단 코드(SAH001 등)를 추가
        for m in self.SIMPLE_CODE_RE.findall(q):
            norm = self._normalize_code(m)
            if norm and norm not in codes:
                codes.append(norm)

        return codes

    def resolve_doc_ids_for_codes(self, codes: Sequence[str]) -> List[str]:
        """
        코드 리스트를 받아, 코드 인덱스에서 doc_id 리스트로 해석.

        🔸 기본 동작:
            - 각 코드에 매핑된 doc_id를 모두 모아 중복 제거 후 반환

        🔸 추가 개선:
            - 'SVC-WN2200MR', 'SVC', 'WN2200MR' 처럼 여러 코드가 섞여 있을 때
              "숫자를 포함한, 더 긴 코드"를 우선으로 사용해 doc_id를 좁힌다.
              (가장 구체적인 모델 코드에 해당하는 문서만 우선 사용)
        """
        resolved_all: List[str] = []
        normalized_codes: List[str] = []

        # 1) 우선 전체 매핑 결과를 모은다.
        for code in codes:
            norm = self._normalize_code(code)
            if not norm:
                continue
            normalized_codes.append(norm)
            doc_ids = self._code_to_doc_ids.get(norm)
            if not doc_ids:
                continue
            for d in doc_ids:
                if d not in resolved_all:
                    resolved_all.append(d)

        if not resolved_all:
            return []

        # 2) "숫자를 포함한 코드"만 뽑아 길이 순으로 정렬 (긴 코드가 더 구체적)
        specific_codes = sorted(
            {c for c in normalized_codes if any(ch.isdigit() for ch in c)},
            key=len,
            reverse=True,
        )

        # 3) 가장 구체적인 코드부터, 해당 코드 문자열이 doc_id 안에
        #    (하이픈 제거 후) 그대로 포함되는 doc_id만 남겨 본다.
        #
        #   예) code="SVC-WN2200MR" → "SVCWN2200MR"
        #       doc_id="SVC-WN2200MR_MANUAL" → "SVCWN2200MRMANUAL"
        #       → 포함 관계가 성립하므로, 이 doc_id를 우선 사용
        for sc in specific_codes:
            sc_norm = sc.replace("-", "")
            narrowed = [
                d
                for d in resolved_all
                if sc_norm in d.replace("-", "").upper()
            ]
            if narrowed:
                logger.info(
                    "[CODE-INDEX] 코드 %s 기준으로 doc_id를 좁혔습니다: %s",
                    sc,
                    ",".join(narrowed),
                )
                return narrowed

        # 4) 특정 코드 기준으로 좁힐 수 없으면, 전체 결과를 그대로 사용
        return resolved_all

    # ---------- 질의 임베딩 ----------

    def embed_query(self, query: str) -> np.ndarray:
        """
        사용자 질의를 text-embedding-004로 임베딩.
        """
        query = query.strip()
        if not query:
            raise ValueError("빈 질의는 임베딩할 수 없습니다.")

        resp = self.client.models.embed_content(
            model=self.embed_model,
            contents=[query],
            config=types.EmbedContentConfig(
                output_dimensionality=self.output_dim
            ),
        )
        vectors = extract_vectors_from_response(resp)
        if not vectors:
            raise RuntimeError("질의 임베딩 결과가 비어 있습니다.")

        vec = np.array(vectors[0], dtype="float32").reshape(1, -1)
        if vec.shape[1] != self.output_dim:
            logger.warning(
                "[SEARCH] 질의 벡터 차원(%d)이 설정값(%d)과 다릅니다.",
                vec.shape[1],
                self.output_dim,
            )
        normalize_vector(vec)
        return vec

    # ---------- 검색 + 재랭킹 ----------

    def search(
        self,
        query: str,
        top_k: int = DEFAULT_TOP_K,
        chunk_type_filter: Optional[str] = None,   # "text" | "figure" | None
        doc_id_filter: Optional[List[str]] = None, # ["SAH001", ...] | None
    ) -> SearchResult:
        """
        1) (필요 시) 질의에서 모델/제품 코드 자동 추출 → doc_id_filter 자동 설정
           - 여러 코드가 감지되면, 숫자를 포함한 더 구체적인 코드에
             가장 잘 매칭되는 doc_id만 우선 사용
        2) doc_id_filter가 설정된 경우:
             → 해당 문서의 벡터들만 대상으로 "문서 내부 검색" 수행
        3) doc_id_filter가 없으면:
             → 전체 코퍼스에서 FAISS 검색 (presearch_factor * top_k 만큼)
        4) 텍스트 우선 + 키워드 + (질의 의도 기반 섹션/figure) 부스팅으로
           재랭킹 후 top_k 개 반환
        """
        if top_k <= 0:
            top_k = DEFAULT_TOP_K

        # 0) 🔹 doc_id_filter 자동 감지 (상위 레벨에서 안 줬을 때만)
        auto_doc_ids: List[str] = []
        if not doc_id_filter:
            codes = self.extract_model_codes_from_query(query)
            if codes:
                auto_doc_ids = self.resolve_doc_ids_for_codes(codes)
                if auto_doc_ids:
                    doc_id_filter = auto_doc_ids
                    logger.info(
                        "[CODE-INDEX] 질의에서 모델 코드 감지 %s → doc_id_filter 자동 설정: %s",
                        ",".join(codes),
                        ",".join(auto_doc_ids),
                    )
                else:
                    logger.info(
                        "[CODE-INDEX] 질의에서 코드 %s 감지됐지만 매핑되는 doc_id를 찾지 못했습니다.",
                        ",".join(codes),
                    )
        else:
            # 상위 레벨에서 이미 doc_id_filter를 명시한 경우,
            # 여기서는 단순히 로그만 남기고 그대로 사용.
            codes = self.extract_model_codes_from_query(query)
            if codes:
                logger.info(
                    "[CODE-INDEX] 질의에서 모델 코드 %s 감지됨. "
                    "그러나 상위 레벨에서 doc_id_filter를 전달했으므로 그대로 사용합니다.",
                    ",".join(codes),
                )

        # 필터/키워드 준비
        doc_id_set = set(doc_id_filter) if doc_id_filter else None
        chunk_type_filter_norm = (
            chunk_type_filter.lower() if chunk_type_filter else None
        )

        # 1) 질의 임베딩 + 키워드 추출
        query_vec = self.embed_query(query)
        keywords = extract_keywords(query)
        q_flat = query_vec.astype("float32").reshape(-1)  # (D,)

        # ------------------------------------------------------------------
        # 1단계: doc_id_filter가 설정된 경우 → 해당 문서 벡터들만 대상으로 검색
        # ------------------------------------------------------------------
        if doc_id_set:
            # 이 문서들에 해당하는 row index 수집
            row_indices: List[int] = []
            for idx, meta in enumerate(self.meta_list):
                doc_id = str(meta.get("doc_id") or "")
                if doc_id in doc_id_set:
                    row_indices.append(idx)

            if row_indices:
                logger.info(
                    "[SEARCH] doc_id_filter=%s 적용: %d개 벡터에서만 검색 수행",
                    ",".join(sorted(doc_id_set)),
                    len(row_indices),
                )

                candidates: List[RetrievedChunk] = []

                for row in row_indices:
                    # 개별 벡터 복원 (IndexFlatIP는 reconstruct 지원)
                    try:
                        vec = self.index.reconstruct(int(row))
                    except Exception as e:
                        logger.warning(
                            "[SEARCH] 인덱스 reconstruct 실패 (row=%d): %s",
                            row,
                            e,
                        )
                        continue

                    v = np.asarray(vec, dtype="float32").reshape(1, -1)
                    normalize_vector(v)
                    base_score = float(np.dot(q_flat, v.reshape(-1)))

                    meta = dict(self.meta_list[row])
                    doc_id = str(meta.get("doc_id") or "")
                    chunk_type = str(
                        meta.get("chunk_type") or meta.get("type", "") or ""
                    ).lower()
                    text = str(meta.get("text") or "")

                    # chunk 타입 필터
                    if chunk_type_filter_norm and chunk_type != chunk_type_filter_norm:
                        continue

                    uid = str(meta.get("uid") or meta.get("chunk_id") or f"{doc_id}:{row}")

                    # 재랭킹 점수 계산
                    final_score, type_boost, keyword_boost = compute_reranked_score(
                        base_score=base_score,
                        meta=meta,
                        keywords=keywords,
                    )

                    candidates.append(
                        RetrievedChunk(
                            uid=uid,
                            score=final_score,
                            raw_score=base_score,
                            doc_id=doc_id,
                            chunk_type=chunk_type or "text",
                            text=text,
                            meta=meta,
                        )
                    )

                # 점수 기준 내림차순 정렬 후 top_k 선택
                candidates.sort(key=lambda c: c.score, reverse=True)
                top_chunks = candidates[:top_k]

                logger.info(
                    "[SEARCH] (문서 내부 검색) 후보 %d개 → 최종 컨텍스트 %d개 반환 (요청 top_k=%d)",
                    len(candidates),
                    len(top_chunks),
                    top_k,
                )

                return SearchResult(
                    query=query,
                    top_k=top_k,
                    total_candidates=len(candidates),
                    chunks=top_chunks,
                )

            else:
                # doc_id_filter에는 값이 있지만 실제 메타에는 해당 doc_id가 없는 경우
                logger.warning(
                    "[SEARCH] doc_id_filter=%s 에 해당하는 벡터를 찾지 못했습니다. 전체 코퍼스 검색으로 폴백합니다.",
                    ",".join(sorted(doc_id_set)),
                )
                # 전체 검색 경로로 넘어가도록 doc_id_set 초기화
                doc_id_set = None

        # ------------------------------------------------------------------
        # 2단계: doc_id_filter가 없거나, 매칭 실패 → 기존 전체 코퍼스 검색
        # ------------------------------------------------------------------
        pre_k = min(self.index.ntotal, top_k * self.presearch_factor)
        doc_filter_log = "전체" if not doc_id_set else ",".join(sorted(doc_id_set))

        logger.info(
            "[SEARCH] (전체 검색) 질의 임베딩 완료. top_k=%d (presearch=%d), "
            "chunk_type_filter=%s, doc_id_filter=%s",
            top_k,
            pre_k,
            chunk_type_filter or "None",
            doc_filter_log,
        )

        scores, indices = self.index.search(query_vec, pre_k)

        candidates: List[RetrievedChunk] = []
        for rank_idx in range(pre_k):
            row = int(indices[0, rank_idx])
            base_score = float(scores[0, rank_idx])

            if row < 0 or row >= len(self.meta_list):
                continue

            meta = dict(self.meta_list[row])
            doc_id = str(meta.get("doc_id") or "")
            chunk_type = str(
                meta.get("chunk_type") or meta.get("type", "") or ""
            ).lower()
            text = str(meta.get("text") or "")

            # 필터링
            if doc_id_set and doc_id not in doc_id_set:
                continue
            if chunk_type_filter_norm and chunk_type != chunk_type_filter_norm:
                continue

            uid = str(meta.get("uid") or meta.get("chunk_id") or f"{doc_id}:{row}")

            # 재랭킹 점수 계산
            final_score, type_boost, keyword_boost = compute_reranked_score(
                base_score=base_score,
                meta=meta,
                keywords=keywords,
            )

            candidates.append(
                RetrievedChunk(
                    uid=uid,
                    score=final_score,
                    raw_score=base_score,
                    doc_id=doc_id,
                    chunk_type=chunk_type or "text",
                    text=text,
                    meta=meta,
                )
            )

        # 재랭킹 결과 정렬
        candidates.sort(key=lambda c: c.score, reverse=True)
        top_chunks = candidates[:top_k]

        logger.info(
            "[SEARCH] 재랭킹 완료. 후보 %d개 → 최종 컨텍스트 %d개 반환 (요청 top_k=%d)",
            len(candidates),
            len(top_chunks),
            top_k,
        )

        return SearchResult(
            query=query,
            top_k=top_k,
            total_candidates=len(candidates),
            chunks=top_chunks,
        )


# ----------------------------- 스크립트로 직접 실행 시 -----------------------------


def _interactive_cli() -> None:
    """
    간단한 CLI 테스트용:
        (.venv) > python -m src.rag_search_gemini
    """
    configure_logging()
    searcher = RagSearcher()

    print("\n──────────── RAG 검색 테스트 (rag_search_gemini) ────────────")
    print("질문을 입력하면 상위 결과들의 doc_id / 타입 / 점수 등을 보여줍니다.")
    print("모델 코드가 섞인 질의(SVC-WN2200MR, SBDH-T1000 등)도 테스트해 보세요.")
    print("종료: 빈 줄 + Enter 또는 Ctrl+C\n")

    while True:
        try:
            q = input("질문: ").strip()
        except (EOFError, KeyboardInterrupt):
            break

        if not q:
            break

        result = searcher.search(q, top_k=5)
        print(f"\n[검색 결과] top_k={result.top_k}, 후보={result.total_candidates}개\n")

        for i, ch in enumerate(result.chunks, start=1):
            ct = ch.chunk_type.upper()
            doc = ch.doc_id
            score = ch.score
            raw = ch.raw_score
            sec = ch.meta.get("section_title") or ch.meta.get("category") or ""
            page = ch.meta.get("page") or ch.meta.get("page_start")
            page_info = f"p.{page}" if page is not None else "p.?"
            print(
                f"[{i}] {ct} | {doc} ({page_info}) "
                f"| score={score:.4f} (raw={raw:.4f}) | {sec}"
            )
        print()

    print("종료합니다.")


if __name__ == "__main__":
    _interactive_cli()
