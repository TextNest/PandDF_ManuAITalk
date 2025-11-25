# ============================================================
#  File: module/rag_pipeline/text_chunker.py
# ============================================================
# [모듈 개요]
#   - text_chunk_preparer.py 가 생성한
#       • data/normalized/<doc_id>.md
#     파일을 입력으로 받아,
#     RAG용 "텍스트 청크(JSONL)"를 생성한다.
#
#   - 이 단계에서 하는 일:
#       1) 페이지 단위 구조 파싱
#          - "# [p1]" 형태의 페이지 헤더를 기준으로 분리
#       2) 빈 줄 기준 "단락(문단)" 구분
#       3) 단락들을 묶어 일정 길이의 청크로 패킹
#          - 목표 길이: 약 800자
#          - 최대 길이: 약 1200자
#       4) 섹션 제목(마크다운 헤더)을 메타데이터로 기록
#
#   - 생성된 청크는 JSONL로 저장되며, 이후 임베딩 단계에서
#     data/chunks/text/*.jsonl 만 읽어 벡터화를 수행할 수 있다.
#
# [입력]
#   - data/normalized/<doc_id>.md
#       • text_chunk_preparer.py 결과
#       • 페이지 헤더 형식:
#           # [p1]
#           (빈 줄)
#           ... 1페이지 내용 ...
#
# [출력]
#   - data/chunks/text/<doc_id>_text_chunks.jsonl
#       • 한 줄에 하나의 JSON 객체
#       • 필드 예시:
#           {
#             "doc_id": "SAH001",
#             "chunk_id": "SAH001_text_0001",
#             "type": "text",
#             "content": "청크 텍스트 ...",
#             "page_start": 1,
#             "page_end": 2,
#             "section_title": "안전상의 주의",
#             "char_len": 945
#           }
#
# [청킹 설계 요점]
#   1) "너무 잘게 쪼개지지도, 너무 길어지지도 않게"
#      - target_chars ~= 800
#      - max_chars    ~= 1200
#      - 한 단락이 max_chars 보다 긴 경우, 문장 단위로 다시 분할
#
#   2) 페이지 메타데이터 유지
#      - 각 단락이 속한 page 번호를 기억하고,
#        하나의 청크가 여러 페이지에 걸치면
#        page_start / page_end 로 범위를 기록한다.
#
#   3) 섹션 제목 추출 (옵션성 메타데이터)
#      - 마크다운 헤더("#", "##", "###" 등)로 시작하는 줄을
#        섹션 제목 후보로 보고, 해당 이후에 등장하는 청크에
#        section_title 로 붙인다.
#      - 헤더 자체 텍스트는 본문에도 그대로 포함한다.
#
# [Backend 내 디렉터리/실행 규칙]
#   - PROJECT_ROOT : Full/Backend (이 파일 기준으로 두 단계 위 폴더)
#   - NORMALIZED_DIR : PROJECT_ROOT / "data" / "normalized"
#   - CHUNKS_TEXT_DIR: PROJECT_ROOT / "data" / "chunks" / "text"
#
# [사용 예시] (Full/Backend 폴더에서 실행한다고 가정)
#   - 전체 문서에 대해 텍스트 청킹:
#       (.venv) > python -m module.rag_pipeline.text_chunker
#
#   - 특정 문서만 처리 (예: SAH001):
#       (.venv) > python -m module.rag_pipeline.text_chunker --doc-id SAH001
#
#   - 기존 청크 JSONL을 무시하고 다시 생성:
#       (.venv) > python -m module.rag_pipeline.text_chunker --force
#
# ============================================================

from __future__ import annotations

import argparse
import json
import logging
import math
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


# ----------------------------- 경로 / 상수 정의 -----------------------------


# 이 파일(module/rag_pipeline/text_chunker.py)을 기준으로 Backend 루트 계산
#   .../Full/Backend/module/rag_pipeline/text_chunker.py
#   parents[0] = .../module/rag_pipeline
#   parents[1] = .../module
#   parents[2] = .../Backend   ← 여기까지를 PROJECT_ROOT로 사용
PROJECT_ROOT: Path = Path(__file__).resolve().parents[2]

# text_chunk_preparer.py 가 만든 정규화 마크다운 디렉터리
NORMALIZED_DIR: Path = PROJECT_ROOT / "data" / "normalized"

# 본 모듈이 청크 JSONL을 저장할 디렉터리
CHUNKS_TEXT_DIR: Path = PROJECT_ROOT / "data" / "chunks" / "text"

# 청크 목표/최대 길이(문자 수 기준; 한국어 포함)
DEFAULT_TARGET_CHARS: int = 800
DEFAULT_MAX_CHARS: int = 1200


# ----------------------------- 데이터 구조 정의 -----------------------------


@dataclass
class Paragraph:
    """
    청킹 전 단계에서 사용하는 단락 단위 표현.

    Attributes:
        page (int)      : 단락이 속한 페이지 번호
        text (str)      : 단락 전체 텍스트 (여러 줄을 공백으로 합친 형태)
    """

    page: int
    text: str


@dataclass
class Chunk:
    """
    최종 JSONL로 저장할 청크 단위 표현.

    Attributes:
        doc_id (str)        : 문서 식별자
        chunk_index (int)   : 0-based 내부 인덱스 (chunk_id 생성에 사용)
        content (str)       : 청크 텍스트
        page_start (int)    : 청크에 포함된 최소 페이지 번호
        page_end (int)      : 청크에 포함된 최대 페이지 번호
        section_title (str) : 청크에 대표로 붙일 섹션 제목 (없으면 None)
    """

    doc_id: str
    chunk_index: int
    content: str
    page_start: int
    page_end: int
    section_title: Optional[str] = None

    @property
    def chunk_id(self) -> str:
        """
        외부 시스템에서 사용할 청크 ID를 생성한다.

        예: "SAH001_text_0001"
        """
        return f"{self.doc_id}_text_{self.chunk_index:04d}"

    @property
    def char_len(self) -> int:
        """청크 내용의 문자 수."""
        return len(self.content or "")


# ----------------------------- 로깅/디렉터리 초기화 -----------------------------


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
    출력 디렉터리(CHUNKS_TEXT_DIR)를 생성한다.

    - 이미 디렉터리가 존재하면 아무 작업도 하지 않는다.
    """
    CHUNKS_TEXT_DIR.mkdir(parents=True, exist_ok=True)
    logging.info("텍스트 청크 출력 디렉터리 준비 완료: %s", CHUNKS_TEXT_DIR)


# ----------------------------- 입력 대상 선택 -----------------------------


def list_normalized_docs(target_doc_id: Optional[str] = None) -> List[Path]:
    """
    data/normalized 아래의 .md 파일 목록을 반환한다.

    Args:
        target_doc_id:
            특정 문서만 처리하고 싶을 때, 확장자를 제외한 파일명.
            예: "SAH001" → "data/normalized/SAH001.md"만 처리.

    Returns:
        List[Path]: 처리할 normalized .md 파일 경로 리스트.
    """
    if not NORMALIZED_DIR.exists():
        logging.warning("NORMALIZED_DIR가 존재하지 않습니다: %s", NORMALIZED_DIR)
        return []

    if target_doc_id:
        path = NORMALIZED_DIR / f"{target_doc_id}.md"
        if not path.exists():
            logging.warning(
                "요청한 doc-id에 해당하는 normalized 마크다운을 찾을 수 없습니다: %s",
                path,
            )
            return []
        return [path]

    md_files = sorted(NORMALIZED_DIR.glob("*.md"))
    logging.info("normalized 마크다운 파일 수: %d개 (%s)", len(md_files), NORMALIZED_DIR)
    return md_files


# ----------------------------- 마크다운 페이지 파싱 -----------------------------


def parse_pages(md_text: str) -> List[Dict[str, Any]]:
    """
    text_chunk_preparer.py 가 생성한 마크다운을
    페이지 단위 구조로 변환한다.

    입력 예:
        # [p1]
        (빈 줄)
        ... 1페이지 내용 ...

        # [p2]
        (빈 줄)
        ... 2페이지 내용 ...

    Returns:
        List[Dict[str, Any]]:
            [
              {"page": 1, "lines": [ "...", ... ]},
            ]
    """
    pages: List[Dict[str, Any]] = []
    current_page: Optional[int] = None
    current_lines: List[str] = []

    for raw_line in md_text.splitlines():
        line = raw_line.rstrip("\n\r")

        # 페이지 헤더 패턴: "# [p1]" 형태
        m = re.match(r"#\s*\[p(\d+)\]", line.strip())
        if m:
            # 이전 페이지가 있으면 저장
            if current_page is not None:
                pages.append({"page": current_page, "lines": current_lines})
            current_page = int(m.group(1))
            current_lines = []
        else:
            # 파일 맨 앞에 페이지 헤더가 없는 경우를 대비한 방어 코드
            if current_page is None:
                current_page = 1
            current_lines.append(line)

    # 마지막 페이지 저장
    if current_page is not None:
        pages.append({"page": current_page, "lines": current_lines})

    return pages


# ----------------------------- 단락(Paragraph) 생성 -----------------------------


def iter_paragraphs_from_pages(pages: List[Dict[str, Any]]) -> Iterable[Paragraph]:
    """
    페이지 리스트에서 Paragraph 시퀀스를 생성한다.

    - 각 페이지의 lines 를 빈 줄 기준으로 나누어 단락을 만든다.
    - 하나의 Paragraph 는 "하나의 페이지에 속하는 연속된 라인들의 묶음"이다.
    """
    for page in pages:
        page_no: int = int(page.get("page", 0)) or 0
        lines: List[str] = page.get("lines", [])

        buffer: List[str] = []

        paragraphs: List[Paragraph] = []
        for line in lines:
            if not line.strip():
                # 빈 줄 → 단락 경계
                if buffer:
                    text = " ".join(l.strip() for l in buffer if l.strip())
                    if text:
                        paragraphs.append(Paragraph(page=page_no, text=text))
                    buffer = []
                continue

            buffer.append(line)

        # 페이지 끝에서 남은 버퍼 처리
        if buffer:
            text = " ".join(l.strip() for l in buffer if l.strip())
            if text:
                paragraphs.append(Paragraph(page=page_no, text=text))

        # 생성된 단락들을 순서대로 yield
        for p in paragraphs:
            yield p


# ----------------------------- 긴 단락 분할 -----------------------------


def split_long_paragraph(text: str, max_chars: int) -> List[str]:
    """
    하나의 단락 텍스트가 max_chars 를 크게 초과할 때,
    문장 단위로 여러 조각으로 나누는 간단한 헬퍼 함수.

    - 먼저 문장 단위로 나눈 뒤, 각 조각이 max_chars를 넘지 않도록 다시 합친다.
    - 문장 구분자는 '.', '!', '?', '다.', '요.' 등 간단한 패턴만 사용한다.
      (정교한 문장 분리는 아니지만, 설명서 텍스트에는 충분한 수준)
    """
    text = text.strip()
    if len(text) <= max_chars:
        return [text]

    # 1) 문장 단위로 대략 분리 (마침표/느낌표/물음표 기준)
    #    - 한글 "다.", "요." 같은 패턴을 구분점으로 삼기 위해 lookbehind 사용.
    sentence_end_pattern = re.compile(
        r"(?<=[\.!?])\s+|(?<=[다요]\.)\s+"
    )
    sentences = [s.strip() for s in sentence_end_pattern.split(text) if s.strip()]

    if not sentences:
        # 문장 분리가 실패했다면, 강제로 고정폭 분리
        return [
            text[i : i + max_chars]
            for i in range(0, len(text), max_chars)
        ]

    # 2) 문장들을 다시 모아서, max_chars 를 넘지 않도록 분할
    chunks: List[str] = []
    buffer: List[str] = []
    cur_len = 0

    for sent in sentences:
        # 한 문장 자체가 너무 길면, 더 쪼개서 넣는다.
        if len(sent) > max_chars * 1.2:
            # 우선 버퍼를 마감
            if buffer:
                chunks.append(" ".join(buffer).strip())
                buffer = []
                cur_len = 0
            # 매우 긴 문장은 고정폭으로 분리
            for i in range(0, len(sent), max_chars):
                part = sent[i : i + max_chars]
                chunks.append(part.strip())
            continue

        # 현재 버퍼에 문장을 추가했을 때 길이
        projected = cur_len + len(sent) + (1 if buffer else 0)
        if projected > max_chars and buffer:
            # 버퍼를 청크로 마감
            chunks.append(" ".join(buffer).strip())
            buffer = [sent]
            cur_len = len(sent)
        else:
            buffer.append(sent)
            cur_len = projected

    if buffer:
        chunks.append(" ".join(buffer).strip())

    return chunks


# ----------------------------- 청크 생성 -----------------------------


def build_chunks_for_doc(
    doc_id: str,
    paragraphs: Iterable[Paragraph],
    target_chars: int = DEFAULT_TARGET_CHARS,
    max_chars: int = DEFAULT_MAX_CHARS,
) -> List[Chunk]:
    """
    Paragraph 시퀀스를 입력으로 받아 Chunk 리스트를 생성한다.

    - 단락 단위로 순회하면서, target_chars / max_chars 기준으로
      적절히 패킹하여 Chunk를 만든다.
    - 마크다운 헤더("#", "##", "###")로 시작하는 단락은
      섹션 제목 후보로 보고 이후 청크에 section_title로 기록한다.
    """
    chunks: List[Chunk] = []

    current_parts: List[str] = []
    current_pages: List[int] = []
    current_len: int = 0
    current_section_title: Optional[str] = None
    chunk_index: int = 0

    def flush_chunk() -> None:
        nonlocal current_parts, current_pages, current_len, chunk_index

        if not current_parts:
            return

        content = "\n\n".join(current_parts).strip()
        if not content:
            # 실제 내용이 비어 있으면 굳이 청크로 만들지 않는다.
            current_parts = []
            current_pages = []
            current_len = 0
            return

        page_start = min(current_pages) if current_pages else 0
        page_end = max(current_pages) if current_pages else 0

        chunk = Chunk(
            doc_id=doc_id,
            chunk_index=chunk_index,
            content=content,
            page_start=page_start,
            page_end=page_end,
            section_title=current_section_title,
        )
        chunks.append(chunk)
        chunk_index += 1

        # 버퍼 초기화
        current_parts = []
        current_pages = []
        current_len = 0

    for para in paragraphs:
        raw_text = para.text.strip()
        if not raw_text:
            continue

        # 섹션 헤더 탐지: "#", "##", "###" 로 시작하는 단락
        #  - 페이지 헤더("# [p1]")는 이미 제거된 상태이므로 여기서는 고려 대상 아님
        stripped = raw_text.lstrip()
        m = re.match(r"^(#{1,6})\s*(.+)$", stripped)
        if m:
            # 섹션 제목 후보 업데이트
            heading_text = m.group(2).strip()
            if heading_text:
                current_section_title = heading_text

        # 이 단락이 너무 길다면, 문장 단위로 여러 조각으로 분할
        para_segments = split_long_paragraph(raw_text, max_chars=max_chars)

        for segment in para_segments:
            seg_len = len(segment)
            if seg_len == 0:
                continue

            # 현재 청크에 이 세그먼트를 추가했을 때 길이
            projected_len = current_len + seg_len + (2 if current_parts else 0)

            # projected_len 이 max_chars 를 넘고,
            # 현재 청크가 비어 있지 않다면 청크를 마감한 후 새로 시작
            if current_parts and projected_len > max_chars:
                flush_chunk()

            # 새 청크 시작 시, section_title은 그대로 유지
            current_parts.append(segment)
            current_pages.append(para.page)
            current_len += seg_len + (2 if len(current_parts) > 1 else 0)

            # target_chars 를 크게 넘겼으면 다음 세그먼트는 새 청크에서 처리
            if current_len >= target_chars * 1.3:
                flush_chunk()

    # 루프 종료 후 남은 버퍼 처리
    flush_chunk()

    return chunks


# ----------------------------- 파일 단위 처리 -----------------------------


def process_one_normalized_file(
    md_path: Path,
    force: bool = False,
    target_chars: int = DEFAULT_TARGET_CHARS,
    max_chars: int = DEFAULT_MAX_CHARS,
) -> None:
    """
    단일 normalized 마크다운 파일에 대해 텍스트 청크 JSONL을 생성한다.

    - 입력:
        data/normalized/<doc_id>.md
    - 출력:
        data/chunks/text/<doc_id>_text_chunks.jsonl
    """
    doc_id = md_path.stem
    out_path = CHUNKS_TEXT_DIR / f"{doc_id}_text_chunks.jsonl"

    if out_path.exists() and not force:
        logging.info(
            "[SKIP] 이미 텍스트 청크 JSONL이 존재합니다(--force 미사용): %s",
            out_path,
        )
        return

    try:
        md_text = md_path.read_text(encoding="utf-8")
    except Exception as e:
        logging.error("[ERROR] normalized 마크다운 읽기 실패 (%s): %s", md_path, e)
        return

    pages = parse_pages(md_text)
    paragraphs = list(iter_paragraphs_from_pages(pages))

    if not paragraphs:
        logging.warning("[WARN] doc_id=%s 에서 단락이 하나도 생성되지 않았습니다.", doc_id)
        return

    chunks = build_chunks_for_doc(
        doc_id=doc_id,
        paragraphs=paragraphs,
        target_chars=target_chars,
        max_chars=max_chars,
    )

    if not chunks:
        logging.warning("[WARN] doc_id=%s 에 대해 생성된 청크가 없습니다.", doc_id)
        return

    # JSONL 저장
    try:
        with out_path.open("w", encoding="utf-8") as f:
            for ch in chunks:
                record = {
                    "doc_id": ch.doc_id,
                    "chunk_id": ch.chunk_id,
                    "type": "text",
                    "content": ch.content,
                    "page_start": ch.page_start,
                    "page_end": ch.page_end,
                    "section_title": ch.section_title,
                    "char_len": ch.char_len,
                }
                f.write(json.dumps(record, ensure_ascii=False))
                f.write("\n")
    except Exception as e:
        logging.error("[ERROR] 텍스트 청크 JSONL 저장 실패 (%s): %s", out_path, e)
        return

    # 간단한 통계 로그
    char_lens = [c.char_len for c in chunks]
    avg_len = sum(char_lens) / len(char_lens)
    min_len = min(char_lens)
    max_len_actual = max(char_lens)

    logging.info(
        "[CHUNKED] doc_id=%s → %d개 청크 생성 (avg=%.1f, min=%d, max=%d) → %s",
        doc_id,
        len(chunks),
        avg_len,
        min_len,
        max_len_actual,
        out_path,
    )


# ----------------------------- 메인 엔트리 포인트 -----------------------------


def main() -> None:
    """
    text_chunker 스크립트의 메인 엔트리 포인트.

    수행 순서:
        1) 인자 파싱 (--doc-id, --force, --target-chars, --max-chars)
        2) 로깅/디렉터리 초기화
        3) 대상 normalized .md 파일 목록 수집
        4) 각 파일에 대해 텍스트 청크 JSONL 생성
    """
    parser = argparse.ArgumentParser(
        description=(
            "text_chunk_preparer 가 생성한 normalized 마크다운을 "
            "RAG용 텍스트 청크(JSONL)로 변환하는 스크립트"
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
            "기존 텍스트 청크 JSONL이 있어도 덮어씁니다. "
            "기본값은 이미 결과가 있으면 SKIP."
        ),
    )
    parser.add_argument(
        "--target-chars",
        type=int,
        default=DEFAULT_TARGET_CHARS,
        help=(
            f"청크 목표 길이(문자 수). 기본값={DEFAULT_TARGET_CHARS}. "
            "이 값을 높이면 청크가 더 길어집니다."
        ),
    )
    parser.add_argument(
        "--max-chars",
        type=int,
        default=DEFAULT_MAX_CHARS,
        help=(
            f"청크 최대 길이(문자 수). 기본값={DEFAULT_MAX_CHARS}. "
            "단일 청크가 이 길이를 넘지 않도록 분할합니다."
        ),
    )

    args = parser.parse_args()

    configure_logging()
    ensure_directories()

    md_files = list_normalized_docs(target_doc_id=args.doc_id)
    if not md_files:
        logging.info("처리할 normalized 마크다운 파일이 없습니다: %s", NORMALIZED_DIR)
        return

    logging.info(
        "총 %d개 문서에 대해 텍스트 청크 생성 시작 "
        "(target_chars=%d, max_chars=%d).",
        len(md_files),
        args.target_chars,
        args.max_chars,
    )

    for md_path in md_files:
        process_one_normalized_file(
            md_path=md_path,
            force=args.force,
            target_chars=args.target_chars,
            max_chars=args.max_chars,
        )

    logging.info("모든 문서 텍스트 청크 생성 완료.")


if __name__ == "__main__":
    main()
