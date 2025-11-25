# ============================================================
#  File: module/rag_pipeline/text_chunk_preparer.py
# ============================================================
# [모듈 개요]
#   - upstage_batch_loader.py 가 생성한
#       • data/parsed/<doc_id>.md
#     파일을 입력으로 받아,
#       1) 이미지 플레이스홀더 마크다운 제거
#          - 예: "![image](/image/placeholder)" 등
#          - 한 줄 전체가 이미지일 수도 있고,
#            "접촉 금지 ![image](/image/placeholder)"처럼
#            문장 안에 끼어 있을 수도 있음.
#       2) 페이지 번호 등 의미 없는 잡텍스트 최소화
#          - 페이지 바닥에 있는 "2", "3" 같은 숫자만 있는 줄
#          - "| --- |" 같은 표 구분선만 남은 줄
#       3) 필요 시, 여러 페이지에 반복되는 공통 헤더/푸터 문구 제거
#          - 거의 모든 페이지에 동일하게 등장하는 짧은 한 줄 광고/문구 등
#
#   - 결과는 "청킹(text → chunk) 단계에서 바로 사용할 수 있는"
#     정돈된 마크다운으로 저장한다.
#
# [입력]
#   - data/parsed/<doc_id>.md
#       • upstage_batch_loader.save_docs_as_markdown() 결과
#       • 페이지 경계는 아래 형식의 헤더로 구분:
#             # [p1]
#             ... 1페이지 내용 ...
#
# [출력]
#   - data/normalized/<doc_id>.md
#       • 동일한 페이지 헤더 "# [pX]"를 유지하되,
#         라인 단위로 간단한 정리(clean-up)가 적용된 텍스트
#
#   - data/normalized/<doc_id>_normalize_report.json
#       • 전처리 통계/로그
#           {
#             "doc_id": "SAH001",
#             "num_pages": 12,
#             "lines_before": 303,
#             "lines_after": 246,
#             "placeholders_removed_estimate": 49,
#             "repeated_lines_removed": 0,
#             "num_repeated_patterns": 0,
#             "repeated_patterns_sample": [
#                "....",
#                ...
#             ]
#           }
#
# [설계 요점]
#   1) "과한 전처리"를 피하고, 안전한 정도만 수행한다.
#      - 이미지 플레이스홀더 제거
#          · 문장 안에 끼어 있는 경우에는
#            마크다운 부분만 제거하고 나머지 텍스트는 살려둔다.
#          · 한 줄 전체가 이미지인 경우에는 결과적으로 빈 줄이 되므로
#            자동으로 제거된다.
#      - 숫자만 있는 줄(페이지 번호 등) 제거
#      - '|'와 '-'만으로 구성된 표 구분선(헤더 구분선) 제거
#
#   2) 페이지 헤더 유지
#      - "# [p1]" 형태의 헤더는 그대로 유지하여,
#        이후 청킹 단계에서 "페이지 단위 청킹" 혹은
#        "페이지 범위 메타데이터"를 쉽게 붙일 수 있도록 한다.
#
#   3) 반복 헤더/푸터 제거(옵션성 기능)
#      - 각 페이지에 등장하는 줄들을 모아,
#        "문서의 60% 이상 페이지에 동일하게 등장하는 줄"을
#        반복 헤더/푸터 후보로 본다.
#      - 길이가 너무 짧거나(5자 미만) 너무 긴 줄은 후보에서 제외한다.
#      - 대부분의 설명서에서 큰 영향을 주지는 않지만,
#        특정 브랜드/모델에서 과도하게 반복되는 바닥 문구가 있을 경우
#        자연스럽게 정리된다.
#
# [Backend 내 디렉터리 규칙]
#   - PROJECT_ROOT : Full/Backend (이 파일 기준으로 두 단계 위 폴더)
#   - PARSED_DIR      : PROJECT_ROOT / "data" / "parsed"
#   - NORMALIZED_DIR  : PROJECT_ROOT / "data" / "normalized"
#
# [사용 예시]  (Full/Backend 폴더에서 실행한다고 가정)
#   - 전체 문서에 대해 정규화 마크다운 생성:
#       (.venv) > python -m module.rag_pipeline.text_chunk_preparer
#
#   - 특정 문서만 처리 (예: SAH001):
#       (.venv) > python -m module.rag_pipeline.text_chunk_preparer --doc-id SAH001
#
#   - 기존 normalized 결과를 무시하고 다시 생성:
#       (.venv) > python -m module.rag_pipeline.text_chunk_preparer --force
#
# ============================================================

from __future__ import annotations

import argparse
import json
import logging
import math
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


# ----------------------------- 경로 / 상수 정의 -----------------------------


# 이 파일(module/rag_pipeline/text_chunk_preparer.py)을 기준으로 Backend 루트 계산
#   .../Full/Backend/module/rag_pipeline/text_chunk_preparer.py
#   parents[0] = .../module/rag_pipeline
#   parents[1] = .../module
#   parents[2] = .../Backend   ← 여기까지를 PROJECT_ROOT로 사용
PROJECT_ROOT: Path = Path(__file__).resolve().parents[2]

# upstage_batch_loader.py 가 만든 마크다운 파일 디렉터리
PARSED_DIR: Path = PROJECT_ROOT / "data" / "parsed"

# 본 모듈이 정리된 마크다운을 저장할 디렉터리
NORMALIZED_DIR: Path = PROJECT_ROOT / "data" / "normalized"

# 반복 헤더/푸터 탐지를 위한 기본 비율
#   - 한 줄이 전체 페이지의 60% 이상에 등장하면 "반복 패턴" 후보로 간주
REPEATED_LINE_MIN_RATIO: float = 0.6

# 반복 패턴으로 인정할 줄의 최소/최대 길이(문자 수)
REPEATED_LINE_MIN_LEN: int = 5
REPEATED_LINE_MAX_LEN: int = 80


# ----------------------------- 로깅 설정 -----------------------------


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
    출력 디렉터리(NORMALIZED_DIR)를 생성한다.

    - 이미 디렉터리가 존재하면 아무 작업도 하지 않는다.
    """
    NORMALIZED_DIR.mkdir(parents=True, exist_ok=True)
    logging.info("정규화 마크다운 출력 디렉터리 준비 완료: %s", NORMALIZED_DIR)


# ----------------------------- 입력 대상 선택 -----------------------------


def list_parsed_docs(target_doc_id: Optional[str] = None) -> List[Path]:
    """
    data/parsed 아래의 .md 파일 목록을 반환한다.

    Args:
        target_doc_id:
            특정 문서만 처리하고 싶을 때, 확장자를 제외한 파일명.
            예: "SAH001" → "data/parsed/SAH001.md"만 처리.

    Returns:
        List[Path]: 처리할 parsed .md 파일 경로 리스트.
    """
    if not PARSED_DIR.exists():
        logging.warning("PARSED_DIR가 존재하지 않습니다: %s", PARSED_DIR)
        return []

    if target_doc_id:
        path = PARSED_DIR / f"{target_doc_id}.md"
        if not path.exists():
            logging.warning(
                "요청한 doc-id에 해당하는 parsed 마크다운을 찾을 수 없습니다: %s",
                path,
            )
            return []
        return [path]

    md_files = sorted(PARSED_DIR.glob("*.md"))
    logging.info("parsed 마크다운 파일 수: %d개 (%s)", len(md_files), PARSED_DIR)
    return md_files


# ----------------------------- 마크다운 페이지 파싱 -----------------------------


def parse_pages(md_text: str) -> List[Dict[str, Any]]:
    """
    upstage_batch_loader.py 가 생성한 마크다운을
    페이지 단위 구조로 변환한다.

    입력 예:
        # [p1]
        ... 1페이지 내용 ...

        # [p2]
        ... 2페이지 내용 ...

    Returns:
        List[Dict[str, Any]]:
            [
              {"page": 1, "lines": [ "...", ... ]},
              {"page": 2, "lines": [ "...", ... ]},
              ...
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


# ----------------------------- 반복 헤더/푸터 탐지 -----------------------------


def detect_repeated_lines(
    pages: List[Dict[str, Any]],
    min_ratio: float = REPEATED_LINE_MIN_RATIO,
    min_len: int = REPEATED_LINE_MIN_LEN,
    max_len: int = REPEATED_LINE_MAX_LEN,
) -> Tuple[set, Dict[str, Any]]:
    """
    문서 전체에서 "여러 페이지에 반복되는 줄"을 찾아낸다.

    - 각 페이지에서 등장하는 줄들을 집합으로 모은 뒤,
      페이지 수 기준으로 등장 빈도를 계산한다.

    - 전체 페이지의 min_ratio(예: 0.6) 이상에서 등장하고,
      길이가 [min_len, max_len] 범위에 있는 줄을
      반복 헤더/푸터 후보로 간주한다.

    Args:
        pages: parse_pages() 결과
        min_ratio: 반복으로 인정할 최소 비율 (0.0 ~ 1.0)
        min_len: 후보 줄의 최소 길이
        max_len: 후보 줄의 최대 길이

    Returns:
        Tuple[set, Dict[str, Any]]:
            - 반복 라인 문자열 집합
            - 디버깅/리포트용 메타데이터
              {"threshold": int, "candidates": [(line, count), ...]}
    """
    num_pages = len(pages)
    if num_pages < 2:
        # 페이지가 1개뿐이면 반복 헤더/푸터 의미가 없음
        return set(), {"threshold": 0, "candidates": []}

    from collections import Counter

    freq: Counter[str] = Counter()

    # 페이지마다 한 번만 등장했는지 여부만 중요하므로 set 사용
    for p in pages:
        seen: set[str] = set()
        for line in p["lines"]:
            s = line.strip()
            if not s:
                continue
            if s.startswith("#"):
                continue
            seen.add(s)
        freq.update(seen)

    threshold = max(2, math.ceil(min_ratio * num_pages))
    candidates: List[Tuple[str, int]] = [
        (line, count)
        for line, count in freq.items()
        if count >= threshold and min_len <= len(line) <= max_len
    ]

    # 등장 횟수 기준 내림차순 정렬
    candidates_sorted = sorted(candidates, key=lambda x: (-x[1], x[0]))

    repeated_set = {line for line, _ in candidates_sorted}
    meta = {
        "threshold": threshold,
        "candidates": candidates_sorted,
    }
    return repeated_set, meta


# ----------------------------- 개별 라인 정리 -----------------------------


def clean_line(line: str, page_no: int) -> Optional[str]:
    """
    개별 라인에 대해 간단한 정리 작업을 수행한다.

    수행 내용:
      1) 마크다운 이미지 플레이스홀더 제거
         - "![image](/image/placeholder)" 형태 포함 모든 "![...](...)" 패턴
         - 문장 안에 섞여 있는 경우, 마크다운 부분만 제거하고
           나머지 텍스트는 유지한다.
      2) 공백 정리
         - 연속 공백/탭을 하나의 공백으로 축소
         - 앞뒤 공백 제거
      3) 의미 없는 줄 제거
         - 완전히 비어 있는 줄
         - 숫자만 있는 줄(페이지 번호 등)
         - '|', '-', ':' 조합만으로 이루어진 줄 (표 구분선)

    Args:
        line: 원본 라인 문자열
        page_no: 페이지 번호 (현재는 로직에서 직접 사용하지 않지만,
                 향후 페이지별 특수 처리 시를 대비해 인자로 유지)

    Returns:
        정리된 라인 문자열 또는 제거 시 None
    """
    # 1) 줄 끝 개행 제거
    s = line.rstrip("\n\r")

    # 2) 마크다운 이미지 태그 제거
    #    - 예: "접촉 금지 ![image](/image/placeholder)" → "접촉 금지 "
    s = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", s)

    # 3) 내부 공백 정리
    #    - 여러 개의 공백/탭 → 한 칸 공백
    s = re.sub(r"\s+", " ", s)
    s = s.strip()

    # 4) 비어 있는 줄은 제거
    if not s:
        return None

    # 5) 숫자만 있는 줄은 페이지 번호/표 번호일 가능성이 높으므로 제거
    if s.isdigit():
        return None

    # 6) '|', '-', ':' 만으로 구성된 줄은 표 구분선일 확률이 높으므로 제거
    stripped = s.strip()
    if stripped and all(ch in "|:-" for ch in stripped):
        return None

    return s


# ----------------------------- 한 문서 정규화 -----------------------------


def normalize_markdown_for_doc(md_text: str) -> Tuple[str, Dict[str, Any]]:
    """
    단일 문서의 parsed 마크다운 텍스트를 입력으로 받아,
    정리된(normalized) 마크다운 텍스트와 통계 정보를 반환한다.

    수행 순서:
      1) 페이지 단위로 파싱(parse_pages)
      2) 반복 헤더/푸터 후보 탐지(detect_repeated_lines)
      3) 각 페이지 내부 라인 정리(clean_line)
         - 반복 헤더/푸터 라인 제거
         - 이미지 플레이스홀더 제거
         - 숫자만 있는 줄/표 구분선 제거
         - 연속 빈 줄 압축
      4) "# [pX]" 헤더를 다시 붙여 하나의 마크다운 문자열로 합친다.

    Returns:
        Tuple[str, Dict[str, Any]]:
            - normalized_md: 정리된 마크다운 전체 문자열
            - stats: 통계/리포트용 딕셔너리
    """
    pages = parse_pages(md_text)
    repeated_lines, repeated_meta = detect_repeated_lines(pages)

    out_lines: List[str] = []

    stats: Dict[str, Any] = {
        "num_pages": len(pages),
        "lines_before": 0,
        "lines_after": 0,
        "placeholders_removed_estimate": 0,
        "repeated_lines_removed": 0,
        "num_repeated_patterns": len(repeated_lines),
        "repeated_patterns_sample": list(repeated_lines)[:20],
        "repeated_threshold": repeated_meta.get("threshold", 0),
    }

    for page in pages:
        page_no: int = int(page.get("page", 0))

        # 페이지 헤더를 항상 다시 생성
        out_lines.append(f"# [p{page_no}]")
        out_lines.append("")

        prev_blank = False

        for raw_line in page["lines"]:
            stats["lines_before"] += 1

            # 반복 헤더/푸터 라인은 그대로 제거
            if raw_line.strip() in repeated_lines:
                stats["repeated_lines_removed"] += 1
                continue

            # 이미지 플레이스홀더 대략 몇 개 있었는지 추정용 카운터
            if "![image]" in raw_line or "(/image/placeholder" in raw_line:
                stats["placeholders_removed_estimate"] += 1

            cleaned = clean_line(raw_line, page_no)

            # 정리 과정에서 제거 대상이 된 경우
            if cleaned is None:
                continue

            # 연속 공백 줄은 하나로 합치기
            if not cleaned.strip():
                if prev_blank:
                    continue
                prev_blank = True
                out_lines.append("")
                continue

            prev_blank = False
            out_lines.append(cleaned)
            stats["lines_after"] += 1

        # 페이지 끝에는 항상 빈 줄 하나를 추가하여
        # 페이지 간 경계를 명확히 한다.
        out_lines.append("")

    normalized_md = "\n".join(out_lines)
    return normalized_md, stats


# ----------------------------- 파일 단위 처리 -----------------------------


def process_one_parsed_file(md_path: Path, force: bool = False) -> None:
    """
    단일 parsed 마크다운 파일에 대해 정규화 마크다운을 생성한다.

    - 입력:
        data/parsed/<doc_id>.md
    - 출력:
        data/normalized/<doc_id>.md
        data/normalized/<doc_id>_normalize_report.json

    Args:
        md_path: 입력 parsed 마크다운 파일 경로
        force: 이미 normalized 결과가 있어도 덮어쓸지 여부
    """
    doc_id = md_path.stem
    normalized_md_path = NORMALIZED_DIR / f"{doc_id}.md"
    report_path = NORMALIZED_DIR / f"{doc_id}_normalize_report.json"

    if normalized_md_path.exists() and not force:
        logging.info(
            "[SKIP] 이미 normalized 마크다운이 존재합니다(--force 미사용): %s",
            normalized_md_path,
        )
        return

    try:
        raw_text = md_path.read_text(encoding="utf-8")
    except Exception as e:
        logging.error("[ERROR] parsed 마크다운 읽기 실패 (%s): %s", md_path, e)
        return

    normalized_md, stats = normalize_markdown_for_doc(raw_text)

    # 정규화 마크다운 저장
    try:
        normalized_md_path.write_text(normalized_md, encoding="utf-8")
    except Exception as e:
        logging.error(
            "[ERROR] normalized 마크다운 저장 실패 (%s): %s",
            normalized_md_path,
            e,
        )
        return

    # 리포트 저장
    stats_with_id = dict(stats)
    stats_with_id["doc_id"] = doc_id
    stats_with_id["source_parsed_file"] = str(
        md_path.relative_to(PROJECT_ROOT)
    )

    try:
        report_path.write_text(
            json.dumps(stats_with_id, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except Exception as e:
        logging.error(
            "[ERROR] normalize 리포트 저장 실패 (%s): %s",
            report_path,
            e,
        )
        return

    logging.info(
        "[NORMALIZED] doc_id=%s, 줄 수: %d → %d, 반복패턴=%d개 → %s",
        doc_id,
        stats["lines_before"],
        stats["lines_after"],
        stats["num_repeated_patterns"],
        normalized_md_path,
    )


# ----------------------------- 메인 엔트리 포인트 -----------------------------


def main() -> None:
    """
    text_chunk_preparer 스크립트의 메인 엔트리 포인트.

    수행 순서:
        1) 인자 파싱 (--doc-id, --force)
        2) 로깅/디렉터리 초기화
        3) 대상 parsed .md 파일 목록 수집
        4) 각 파일에 대해 정규화 마크다운 생성
    """
    parser = argparse.ArgumentParser(
        description=(
            "upstage_batch_loader 가 생성한 parsed 마크다운을 "
            "청킹 전 단계의 정규화 마크다운으로 정리하는 스크립트"
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
            "기존 normalized 마크다운이 있어도 덮어씁니다. "
            "기본값은 이미 결과가 있으면 SKIP."
        ),
    )

    args = parser.parse_args()

    configure_logging()
    ensure_directories()

    md_files = list_parsed_docs(target_doc_id=args.doc_id)
    if not md_files:
        logging.info("처리할 parsed 마크다운 파일이 없습니다: %s", PARSED_DIR)
        return

    logging.info("총 %d개 문서에 대해 정규화 마크다운 생성 시작.", len(md_files))

    for md_path in md_files:
        process_one_parsed_file(md_path=md_path, force=args.force)

    logging.info("모든 문서 정규화 마크다운 생성 완료.")


if __name__ == "__main__":
    main()
