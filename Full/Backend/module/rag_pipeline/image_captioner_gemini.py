# ============================================================
#  File: module/rag_pipeline/image_captioner_gemini.py
# ============================================================
# [모듈 개요]
#   - image_filter_for_caption.py 단계에서 선별된
#       • data/figures/<doc_id>/<doc_id>_figures_filtered.json
#       • data/caption_images/<doc_id>/page_XXX_figure_YYY.png
#       • data/elements/<doc_id>_elements.json
#     을 입력으로 받아,
#   - Google Gemini 2.5 Flash(멀티모달)를 사용해
#       1) 제품의 생김새(겉모습/구성 요소)
#       2) 조작부/버튼/다이얼 위치
#       3) 설치·조립 상태(연결 관계, 방향, 앞/뒤/옆 모습)
#     을 시각장애인·인지 저하 노인·유아도 이해할 수 있을 정도로
#     쉬운 한국어 캡션으로 생성한다.
#
# [역할 분리]
#   - 이 모듈의 캡션은 "이미 설명서 텍스트로 충분히 제공된" 설치/조작 절차를
#     다시 설명하는 것이 아니라,
#       • 그림에서만 알 수 있는 시각 정보
#         (모양, 위치, 배치, 방향, 연결 관계)를
#     텍스트화하여 접근성을 높이는 데 초점을 둔다.
#
#   - 설치법/조립법/사용법의 상세 절차나 경고 문구는
#     텍스트 RAG 파트(텍스트 정규화/청킹/임베딩)에서 이미 다룬다고 보고,
#     여기서는 다음 원칙을 따른다.
#       1) "눈으로 보이는 상태"만 서술
#       2) 사고·부상·사망 등 위험 표현은 새로 창작하지 않고,
#          그림에 인쇄된 경고 표시가 "보인다" 수준으로만 언급
#       3) 한 번에 1~3문장, 200자 이내의 짧고 명료한 설명 유지
#
# [입력 전제]
#   - upstage_batch_loader.py 실행 완료:
#       data/figures/<doc_id>/<doc_id>_figures.json
#   - image_filter_for_caption.py 실행 완료:
#       data/figures/<doc_id>/<doc_id>_figures_filtered.json
#       data/caption_images/<doc_id>/page_XXX_figure_YYY.png
#   - upstage_batch_loader.py 에서 생성한 elements:
#       data/elements/<doc_id>_elements.json
#     형식:
#       {
#         "doc_id": "...",
#         "elements": [
#           {
#             "index": 1,
#             "page": 1,
#             "content": "... 1페이지 전체 마크다운 ...",
#             "metadata": { ... }
#           },
#           ...
#         ]
#       }
#
# [출력]
#   - data/figures/<doc_id>/<doc_id>_figures_captioned.json
#       {
#         "doc_id": "...",
#         "source_pdf": "...",
#         "num_images_total": ...,
#         "num_images_kept": ...,
#         "created_by": "...",
#         "config": { ... },
#         "images": [
#           {
#             ...  # _figures_filtered.json 의 각 항목 전체
#             "caption_short": "짧은 접근성 캡션",
#             "caption_fallback_reason": null 또는 "safety_block" / "no_response" / ...
#           },
#           ...
#         ]
#       }
#
# [안전 설계]
#   1) manual_excerpt 정제
#      - 페이지 전체 텍스트(content)를 가져오되,
#      - "폭발, 감전, 사망, 질식, 중독, 화재, 가스 누출" 등
#        강한 위험 표현이 포함된 줄은 제거한다.
#      - 이는 안내/경고 자체를 숨기려는 것이 아니라,
#        "이미 텍스트로 충분히 제공된 경고를
#         굳이 이미지 캡션 문맥에 다시 넣지 않기" 위한 설계이다.
#
#   2) 프롬프트 레벨 안전 지시
#      - 설치/조작 '절차'를 한 단계씩 제안하지 말고,
#        "현재 그림에서 눈으로 보이는 상태"만 서술하도록 지시한다.
#      - 위험 상황을 상상하거나 새로 만들어내지 말라고 명시한다.
#
#   3) API 수준
#      - Gemini API의 기본 safety 설정을 사용하며,
#        응답이 비어 있거나 예외가 발생하면,
#        안전한 기본 캡션으로 폴백한다.
#
# [Backend 내 디렉터리 규칙]
#   - PROJECT_ROOT : Full/Backend (이 파일 기준으로 두 단계 위 폴더)
#   - FIGURES_ROOT_DIR          : PROJECT_ROOT / "data" / "figures"
#   - CAPTION_IMAGES_ROOT_DIR   : PROJECT_ROOT / "data" / "caption_images"
#   - ELEMENTS_DIR              : PROJECT_ROOT / "data" / "elements"
#
# [CLI 동작 예시]  (Full/Backend 폴더에서 실행한다고 가정)
#   - 기본: 전체 문서 캡션 생성
#       (.venv) > python -m module.rag_pipeline.image_captioner_gemini
#
#   - 특정 문서만:
#       (.venv) > python -m module.rag_pipeline.image_captioner_gemini --doc-id SVC-BH1
#
#   - 기존 결과 무시하고 전체 재생성:
#       (.venv) > python -m module.rag_pipeline.image_captioner_gemini --doc-id SVC-BH1 --force
#
#   - 503 등 에러가 났던 이미지들만 다시 시도:
#       (.venv) > python -m module.rag_pipeline.image_captioner_gemini --doc-id SVC-WN2200MR --retry-failed
#
#     ※ 이 경우:
#        - data/figures/<doc_id>/<doc_id>_figures_captioned.json 를 읽고,
#        - caption_short == null 이고 caption_fallback_reason 에
#          "503", "UNAVAILABLE", "overloaded" 등이 포함된 이미지들만
#          다시 Gemini 호출.
#        - 성공 시 caption_short 갱신 + caption_fallback_reason = null 로 초기화.
#
# [사전 준비]
#   - google-genai SDK 설치:
#       pip install -U google-genai python-dotenv
#
#   - PROJECT_ROOT(.env)에 Gemini 키 설정:
#       GEMINI_API_KEY=your_api_key_here
# ============================================================

from __future__ import annotations

import argparse
import json
import logging
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv
from google import genai
from google.genai import types


# ----------------------------- 경로 / 상수 정의 -----------------------------


# 이 파일(module/rag_pipeline/image_captioner_gemini.py)을 기준으로 Backend 루트 계산
#   .../Full/Backend/module/rag_pipeline/image_captioner_gemini.py
#   parents[0] = .../module/rag_pipeline
#   parents[1] = .../module
#   parents[2] = .../Backend   ← 여기까지를 PROJECT_ROOT로 사용
PROJECT_ROOT: Path = Path(__file__).resolve().parents[2]

# image_filter_for_caption 산출물(필터링된 figures 메타)
FIGURES_ROOT_DIR: Path = PROJECT_ROOT / "data" / "figures"

# 캡션 생성 대상 PNG들이 모여 있는 디렉터리
CAPTION_IMAGES_ROOT_DIR: Path = PROJECT_ROOT / "data" / "caption_images"

# 페이지 단위 텍스트(elements) 디렉터리
ELEMENTS_DIR: Path = PROJECT_ROOT / "data" / "elements"

# 환경 변수 및 모델 이름
ENV_FILE_PATH: Path = PROJECT_ROOT / ".env"
GEMINI_API_KEY_ENV: str = "GEMINI_API_KEY"
GEMINI_MODEL_NAME: str = "gemini-2.5-flash"

# 캡션 길이 제한(alt-text 베스트 프랙티스 참고; 1~3문장, 200자 이내를 목표로 하지만 약간 여유 둠)
CAPTION_MAX_CHARS: int = 320

# manual_excerpt에서 제거할 "강한 위험/사고" 키워드 목록
UNSAFE_KEYWORDS: Tuple[str, ...] = (
    "폭발",
    "감전",
    "사망",
    "질식",
    "중독",
    "화재",
    "불이 날",
    "불이날",
    "가스 누출",
    "가스누출",
    "가스가 새",
    "전기 충격",
    "전기충격",
    "고압",
    "중상",
    "심각한 부상",
)


# ----------------------------- 로깅 / 환경 초기화 -----------------------------


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


def load_environment() -> None:
    """
    .env 파일을 로드하여 환경 변수를 설정한다.

    - PROJECT_ROOT/.env 파일을 우선적으로 읽는다.
    - 이미 설정된 OS 환경 변수를 덮어쓰지 않는다.
    """
    if ENV_FILE_PATH.exists():
        load_dotenv(ENV_FILE_PATH, override=False)
        logging.info("환경 변수 로드 완료: %s", ENV_FILE_PATH)
    else:
        logging.warning(".env 파일이 존재하지 않습니다: %s", ENV_FILE_PATH)


def init_gemini_client() -> genai.Client:
    """
    Gemini API 클라이언트를 초기화한다.

    - 환경 변수 GEMINI_API_KEY가 설정되어 있어야 한다.
    - google-genai SDK의 기본 클라이언트를 사용한다.
    """
    api_key = os.getenv(GEMINI_API_KEY_ENV)
    if not api_key:
        raise RuntimeError(
            f"환경 변수 {GEMINI_API_KEY_ENV} 가 설정되어 있지 않습니다. "
            f"PROJECT_ROOT/.env 파일에 '{GEMINI_API_KEY_ENV}=YOUR_API_KEY' 형식으로 "
            f"추가했는지 확인해 주세요. (현재 PROJECT_ROOT: {PROJECT_ROOT})"
        )

    client = genai.Client(api_key=api_key)
    logging.info("Gemini 클라이언트 초기화 완료 (model=%s)", GEMINI_MODEL_NAME)
    return client


# ----------------------------- elements(페이지 텍스트) 관련 -----------------------------


def load_elements_for_doc(doc_id: str) -> Dict[int, str]:
    """
    특정 doc_id에 대한 elements JSON을 읽어,
    페이지 번호(page) → 페이지 전체 텍스트(content) 매핑을 생성한다.

    Args:
        doc_id (str): 문서 식별자 (PDF 파일명에서 확장자 제거)

    Returns:
        Dict[int, str]: page 번호를 키로 하고, content(마크다운)를 값으로 하는 딕셔너리.
    """
    elements_path = ELEMENTS_DIR / f"{doc_id}_elements.json"
    if not elements_path.exists():
        logging.warning(
            "[WARN] elements 파일을 찾을 수 없어, manual_excerpt를 사용할 수 없습니다: %s",
            elements_path,
        )
        return {}

    try:
        raw = json.loads(elements_path.read_text(encoding="utf-8"))
    except Exception as e:
        logging.error("[ERROR] elements JSON 로드 실패 (%s): %s", elements_path, e)
        return {}

    pages: Dict[int, str] = {}
    for elem in raw.get("elements", []):
        page_no = int(elem.get("page", elem.get("index", 0)))
        content = str(elem.get("content", "") or "")
        pages[page_no] = content

    return pages


def _sanitize_manual_excerpt(page_text: str, max_chars: int = 1000) -> str:
    """
    페이지 전체 텍스트에서 캡션 생성에 도움이 되는 부분만 발췌한다.

    - 줄 단위로 나눈 뒤:
      1) 너무 짧은 줄(공백/한 글자 수준)은 제거
      2) UNSAFE_KEYWORDS 가 포함된 줄은 제거
      3) "경고", "주의"만 있는 제목 수준의 줄은 대부분 제거
    - 나머지 줄을 앞에서부터 이어붙이다가 max_chars를 넘으면 중단.
    """
    if not page_text:
        return ""

    cleaned_lines: List[str] = []
    for raw_line in page_text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if len(line) <= 1:
            continue

        lower_line = line.lower()

        # 강한 위험/사고 표현이 들어간 줄은 캡션 컨텍스트에서 제외
        if any(keyword in line for keyword in UNSAFE_KEYWORDS):
            continue

        # 헤더/경고 타이틀만 있는 줄은 대부분 제거
        if line in ("경고", "주의", "[경고]", "[주의]"):
            continue
        if lower_line.startswith("경고:") or lower_line.startswith("주의:"):
            # 경고 상세 문구는 텍스트 RAG에서 다루도록 하고, 여기서는 제외
            continue

        cleaned_lines.append(line)

    # 글자 수 상한을 넘지 않도록 앞에서부터 차곡차곡 추가
    excerpt_parts: List[str] = []
    total_len = 0
    for line in cleaned_lines:
        if total_len + len(line) + 1 > max_chars:
            break
        excerpt_parts.append(line)
        total_len += len(line) + 1

    return "\n".join(excerpt_parts)


def build_manual_excerpt_for_page(
    elements_by_page: Dict[int, str],
    page_no: int,
) -> str:
    """
    페이지 번호에 해당하는 텍스트에서 캡션용 manual_excerpt를 생성한다.
    """
    page_text = elements_by_page.get(page_no, "")
    if not page_text:
        return ""
    return _sanitize_manual_excerpt(page_text, max_chars=1000)


# ----------------------------- 캡션 후처리 유틸 -----------------------------


def _normalize_whitespace(text: str) -> str:
    """
    여러 줄/공백이 섞인 텍스트를 한 줄로 정리한다.

    - 연속 공백을 하나로 줄이고,
    - 앞뒤 공백을 제거한다.
    """
    if not text:
        return ""
    return " ".join(text.split()).strip()


def _truncate_caption(text: str, max_chars: int = CAPTION_MAX_CHARS) -> str:
    """
    캡션 텍스트를 max_chars 이내로 잘라낸다.

    - 가능한 경우 마지막 마침표(또는 문장 부호)까지 포함되도록 자른다.
    - 너무 길 경우에는 단순 슬라이싱을 사용한다.
    """
    text = _normalize_whitespace(text)
    if len(text) <= max_chars:
        return text

    cut_region = text[: max_chars + 1]
    last_punct = max(
        cut_region.rfind("。"),
        cut_region.rfind("."),
        cut_region.rfind("!"),
        cut_region.rfind("?"),
        cut_region.rfind("！"),
        cut_region.rfind("？"),
    )
    if last_punct >= 20:
        return cut_region[: last_punct + 1].strip()

    return cut_region[:max_chars].strip()


def build_accessibility_prompt(manual_excerpt: str) -> str:
    """
    Gemini에게 전달할 접근성 캡션 프롬프트를 생성한다.
    """
    # manual_excerpt는 없을 수도 있으므로, 조건부로 포함
    excerpt_block = ""
    if manual_excerpt:
        excerpt_block = (
            "\n\n[참고용 설명서 발췌]\n"
            "아래 텍스트는 이 그림이 포함된 설명서의 일부이다. "
            "필요한 정보만 참고하고, 그대로 복사하지 말고, "
            "그림에서 실제로 볼 수 있는 내용만 묘사하라.\n"
            "----\n"
            f"{manual_excerpt}\n"
            "----\n"
        )

    prompt = (
        "너는 전자제품 사용 설명서에 실린 그림을 설명하는 접근성 전문가이다.\n"
        "시각장애인, 인지 능력이 떨어지는 노인, 유아도 이해할 수 있도록 "
        "쉬운 한국어로 그림의 내용을 자세하게 설명하라.\n\n"
        "[설명 방식 지침]\n"
        "1) '이미지'나 '그림'이라는 단어를 굳이 쓰지 말고, "
        "사람이 눈앞의 장면을 보는 것처럼 자연스럽게 묘사한다.\n"
        "2) 다음 항목에 특히 집중하여 구체적으로 설명한다.\n"
        "   - 제품의 종류와 전체적인 형태(원통형, 네모난 형태, 높고 낮음 등)\n"
        "   - 어느 방향에서 본 모습인지 (정면, 옆면, 위에서 본 모습 등)\n"
        "   - 위에서 아래로 또는 왼쪽에서 오른쪽으로 따라가면서, "
        "     눈에 보이는 주요 부품(예: 안전망, 버너, 손잡이, 조작부, 바퀴, 받침대 등)의 "
        "     이름과 위치 관계를 차례대로 설명한다.\n"
        "   - 버튼·다이얼·손잡이·레버·불꽃이 나오는 부분 등이 "
        "     제품의 어느 쪽(앞/뒤/왼쪽/오른쪽)에 있고, "
        "     대략 어느 높이(위쪽/가운데/아래쪽)에 있는지.\n"
        "   - 그림 안에 한글로 적힌 레이블이나 번호가 보이면, "
        "     그 글자를 읽어서 어떤 부품을 가리키는지 함께 말해 준다.\n"
        "3) 설치 방법이나 사용 방법을 1단계, 2단계처럼 절차로 설명하지 말고, "
        "   지금 그림에 보이는 '현재 상태'만 차분히 묘사한다.\n"
        "4) 제품의 색이나 재질을 상상해서 말하지 않는다. "
        "   선으로만 그려진 제품은 색을 언급하지 말고, "
        "   실제로 눈에 보이는 경고 라벨 같은 중요한 색깔이 있을 때만 "
        "   짧게 언급한다.\n"
        "5) '불이 난다, 폭발한다, 감전된다, 사망한다'와 같은 위험 상황을 "
        "   새로 상상해서 만들지 말라. "
        "   그림에 실제로 경고 표시나 주의 문구가 보이는 경우에만 "
        "   '위쪽에 경고 표시가 붙어 있다'처럼 짧게만 언급한다.\n"
        "6) 문장은 3~4문장 정도로, 핵심 부품과 위치 관계를 "
        "   머릿속에 그릴 수 있을 만큼 충분히 구체적으로 설명하라. "
        "   전체 길이는 250~300자 안팎이 되도록 한다.\n"
        "7) 존댓말 대신 '~이다, ~있다' 형태의 평서문을 사용한다.\n"
        "\n"
        "위 지침을 따르면서, 이 그림을 보는 사람이 "
        "제품의 구조와 중요한 부분의 위치를 머릿속에 떠올릴 수 있도록 설명하라."
        f"{excerpt_block}"
    )

    return prompt


# ----------------------------- Gemini 캡션 생성 로직 -----------------------------


def generate_caption_with_gemini(
    client: genai.Client,
    image_path: Path,
    manual_excerpt: str,
    max_retries: int = 10,
    retry_delay_base: float = 5.0,
) -> Tuple[Optional[str], Optional[str]]:
    """
    단일 이미지에 대해 Gemini 2.5 Flash를 호출하여 캡션을 생성한다.

    Returns:
        (caption_short, fallback_reason)
        - caption_short: 성공적으로 생성된 캡션(없으면 None)
        - fallback_reason: 실패 시 이유 문자열
          (예: "no_response", "exception: ...", "file_not_found")
    """
    if not image_path.exists():
        logging.warning("이미지 파일을 찾을 수 없습니다: %s", image_path)
        return None, "file_not_found"

    try:
        image_bytes = image_path.read_bytes()
    except Exception as e:
        logging.warning("이미지 파일 읽기 실패 (%s): %s", image_path, e)
        return None, f"read_error: {e}"

    prompt = build_accessibility_prompt(manual_excerpt)

    image_part = types.Part.from_bytes(
        data=image_bytes,
        mime_type="image/png",
    )

    last_error: Optional[str] = None

    for attempt in range(1, max_retries + 1):
        try:
            response = client.models.generate_content(
                model=GEMINI_MODEL_NAME,
                contents=[
                    image_part,
                    prompt,
                ],
            )
            text = (response.text or "").strip()
            if not text:
                last_error = "no_response"
            else:
                caption = _truncate_caption(text, max_chars=CAPTION_MAX_CHARS)
                return caption, None

        except Exception as e:
            last_error = f"exception: {e}"
            logging.warning(
                "[WARN] Gemini 캡션 생성 실패 (시도 %d/%d, 파일=%s): %s",
                attempt,
                max_retries,
                image_path,
                e,
            )

        # 재시도 대기 (지수 백오프)
        if attempt < max_retries:
            sleep_sec = retry_delay_base * (2 ** (attempt - 1))
            time.sleep(sleep_sec)

    # 여기까지 왔다면 모든 시도가 실패한 것
    return None, last_error or "unknown_error"


# ----------------------------- 문서 단위 처리 로직 -----------------------------


def _find_target_doc_ids(target_doc_id: Optional[str] = None) -> List[str]:
    """
    처리 대상 doc_id 리스트를 찾는다.

    - target_doc_id가 주어지면 해당 doc_id만 반환
    - 그렇지 않으면 data/figures/*/ 아래의 *_figures_filtered.json 을 전부 스캔
    """
    if target_doc_id:
        meta_path = FIGURES_ROOT_DIR / target_doc_id / f"{target_doc_id}_figures_filtered.json"
        if not meta_path.exists():
            logging.warning(
                "요청한 doc-id에 해당하는 필터링 메타 파일을 찾을 수 없습니다: %s",
                meta_path,
            )
            return []
        return [target_doc_id]

    doc_ids: List[str] = []
    for meta_path in FIGURES_ROOT_DIR.glob("*/*_figures_filtered.json"):
        doc_ids.append(meta_path.parent.name)

    doc_ids = sorted(set(doc_ids))
    return doc_ids


def _should_retry_this_image(fallback_reason: Optional[str]) -> bool:
    """
    caption_fallback_reason 문자열을 보고
    '이번에 다시 시도할 대상인지' 판단한다.

    - 503 UNAVAILABLE, overloaded 류의 임시 오류만 재시도 대상으로 본다.
    """
    if not fallback_reason:
        return False

    reason = fallback_reason.lower()
    keywords = ("503", "unavailable", "overloaded", "model is overloaded")
    return any(kw in reason for kw in keywords)


def process_one_document(
    client: genai.Client,
    doc_id: str,
    force: bool = False,
    retry_failed: bool = False,
) -> None:
    """
    단일 doc_id에 대해 캡션 생성을 수행한다.

    모드:
      - retry_failed=False (기본):
          • *_figures_filtered.json 을 읽어 전체 캡션 생성
          • *_figures_captioned.json 이 이미 있고 force=False 이면 SKIP

      - retry_failed=True:
          • *_figures_captioned.json 을 우선 읽는다.
          • caption_short == None 이고,
            caption_fallback_reason 에 503/UNAVAILABLE/overloaded 가
            포함된 이미지들만 다시 Gemini 호출.
          • 성공 시 caption_short 갱신 + caption_fallback_reason=None
          • 실패 시 caption_fallback_reason 를 최신 에러 메시지로 업데이트
    """
    doc_fig_dir = FIGURES_ROOT_DIR / doc_id
    filtered_meta_path = doc_fig_dir / f"{doc_id}_figures_filtered.json"
    captioned_meta_path = doc_fig_dir / f"{doc_id}_figures_captioned.json"

    if not filtered_meta_path.exists():
        logging.warning(
            "[SKIP] 필터링된 figures 메타 파일이 없어 건너뜁니다: %s",
            filtered_meta_path,
        )
        return

    # ------------------ retry_failed 모드: 기존 결과에서 일부만 재시도 ------------------
    if retry_failed:
        if not captioned_meta_path.exists():
            logging.warning(
                "[SKIP] retry-failed 모드이지만 기존 captioned 메타를 찾을 수 없습니다: %s",
                captioned_meta_path,
            )
            return

        try:
            captioned_meta = json.loads(captioned_meta_path.read_text(encoding="utf-8"))
        except Exception as e:
            logging.error(
                "[ERROR] 기존 captioned 메타 JSON 로드 실패 (%s): %s",
                captioned_meta_path,
                e,
            )
            return

        images: List[Dict[str, Any]] = captioned_meta.get("images", [])
        if not images:
            logging.warning(
                "[WARN] doc_id=%s 의 captioned 메타에 images가 없습니다.",
                doc_id,
            )
            return

        # 페이지별 텍스트 미리 로드
        elements_by_page = load_elements_for_doc(doc_id)

        # 재시도 대상만 필터링
        retry_indices: List[int] = []
        for idx, img_info in enumerate(images):
            keep = bool(img_info.get("keep_for_caption", False))
            caption_rel_path = img_info.get("caption_file")
            caption_short = img_info.get("caption_short")
            fallback_reason = img_info.get("caption_fallback_reason")

            if not keep or not caption_rel_path:
                continue
            if caption_short is not None and caption_short != "":
                # 이미 성공한 것
                continue
            if not _should_retry_this_image(fallback_reason):
                continue

            retry_indices.append(idx)

        if not retry_indices:
            logging.info(
                "[RETRY] doc_id=%s 에서 재시도할 이미지가 없습니다.",
                doc_id,
            )
            return

        logging.info(
            "[RETRY] doc_id=%s: 총 %d개 이미지 중 %d개를 재시도합니다.",
            doc_id,
            len(images),
            len(retry_indices),
        )

        num_retry = 0
        num_success = 0

        for idx in retry_indices:
            img_info = images[idx]
            num_retry += 1

            page_no = int(img_info.get("page", 0))
            caption_rel_path = img_info.get("caption_file")
            image_path = PROJECT_ROOT / caption_rel_path

            manual_excerpt = build_manual_excerpt_for_page(elements_by_page, page_no)

            logging.info(
                "  [RETRY CAPTION] page=%d, file=%s",
                page_no,
                image_path.relative_to(PROJECT_ROOT),
            )

            caption_short, fallback_reason = generate_caption_with_gemini(
                client=client,
                image_path=image_path,
                manual_excerpt=manual_excerpt,
            )

            if caption_short:
                num_success += 1
                images[idx]["caption_short"] = caption_short
                images[idx]["caption_fallback_reason"] = None
            else:
                # 실패했으면 최신 fallback_reason 기록
                images[idx]["caption_short"] = None
                images[idx]["caption_fallback_reason"] = fallback_reason

        # 수정된 images를 기존 payload에 다시 저장
        captioned_meta["images"] = images

        try:
            captioned_meta_path.write_text(
                json.dumps(captioned_meta, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        except Exception as e:
            logging.error(
                "[ERROR] retry-failed 결과 JSON 저장 실패 (%s): %s",
                captioned_meta_path,
                e,
            )
            return

        logging.info(
            "[RETRY DONE] doc_id=%s, 재시도=%d개 중 성공=%d개 → %s",
            doc_id,
            num_retry,
            num_success,
            captioned_meta_path,
        )
        return

    # ------------------ 기본 모드: 전체 캡션 생성/재생성 ------------------

    # 이미 captioned 결과가 있고, force가 아니면 건너뜀
    if captioned_meta_path.exists() and not force:
        logging.info(
            "[SKIP] 이미 캡션 결과가 존재합니다(--force 미사용): %s",
            captioned_meta_path,
        )
        return

    try:
        filtered_meta = json.loads(filtered_meta_path.read_text(encoding="utf-8"))
    except Exception as e:
        logging.error("[ERROR] 필터링 메타 JSON 로드 실패 (%s): %s", filtered_meta_path, e)
        return

    images: List[Dict[str, Any]] = filtered_meta.get("images", [])
    if not images:
        logging.warning("[WARN] doc_id=%s 에 이미지 메타가 없습니다.", doc_id)
        return

    # 페이지별 텍스트 미리 로드
    elements_by_page = load_elements_for_doc(doc_id)

    logging.info(
        "[CAPTION] doc_id=%s 에 대해 캡션 생성 시작 (후보 이미지 %d개)",
        doc_id,
        len(images),
    )

    captioned_images: List[Dict[str, Any]] = []
    num_candidates = 0
    num_captioned = 0

    for img_info in images:
        keep = bool(img_info.get("keep_for_caption", False))
        caption_rel_path = img_info.get("caption_file")

        # 캡션 대상이 아닌 이미지는 그대로 통과(필드만 복사)
        if not keep or not caption_rel_path:
            img_info_copy = dict(img_info)
            img_info_copy.setdefault("caption_short", None)
            img_info_copy.setdefault("caption_fallback_reason", "not_for_caption")
            captioned_images.append(img_info_copy)
            continue

        num_candidates += 1

        page_no = int(img_info.get("page", 0))
        image_path = PROJECT_ROOT / caption_rel_path

        manual_excerpt = build_manual_excerpt_for_page(elements_by_page, page_no)

        logging.info(
            "  [CAPTION] page=%d, file=%s",
            page_no,
            image_path.relative_to(PROJECT_ROOT),
        )

        caption_short, fallback_reason = generate_caption_with_gemini(
            client=client,
            image_path=image_path,
            manual_excerpt=manual_excerpt,
        )

        if caption_short:
            num_captioned += 1

        img_info_copy = dict(img_info)
        img_info_copy["caption_short"] = caption_short
        img_info_copy["caption_fallback_reason"] = fallback_reason

        captioned_images.append(img_info_copy)

    # 최종 payload 구성
    output_payload: Dict[str, Any] = {
        "doc_id": filtered_meta.get("doc_id", doc_id),
        "source_pdf": filtered_meta.get("source_pdf"),
        "num_images_total": filtered_meta.get("num_images_total", len(images)),
        "num_images_kept": filtered_meta.get("num_images_kept", num_candidates),
        "created_by": "image_captioner_gemini.py",
        "model": GEMINI_MODEL_NAME,
        "config": {
            "CAPTION_MAX_CHARS": CAPTION_MAX_CHARS,
            "UNSAFE_KEYWORDS": list(UNSAFE_KEYWORDS),
        },
        "images": captioned_images,
    }

    try:
        captioned_meta_path.write_text(
            json.dumps(output_payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except Exception as e:
        logging.error(
            "[ERROR] 캡션 결과 JSON 저장 실패 (%s): %s", captioned_meta_path, e
        )
        return

    logging.info(
        "[CAPTION DONE] doc_id=%s, 후보=%d개 중 %d개 캡션 생성 → %s",
        doc_id,
        num_candidates,
        num_captioned,
        captioned_meta_path,
    )


# ----------------------------- 메인 엔트리 포인트 -----------------------------


def main() -> None:
    """
    image_captioner_gemini 스크립트의 메인 엔트리 포인트.

    수행 순서:
        1) 인자 파싱 (--doc-id, --force, --retry-failed)
        2) 로깅/환경 변수 초기화
        3) Gemini 클라이언트 생성
        4) 처리 대상 doc_id 목록 수집
        5) 각 doc_id에 대해 캡션 생성 / 재시도 수행
    """
    parser = argparse.ArgumentParser(
        description=(
            "image_filter_for_caption 단계의 결과를 바탕으로, "
            "Gemini 2.5 Flash를 사용하여 전자제품 설명서 그림에 대한 "
            "접근성 캡션(짧은 한국어 설명)을 생성하거나 "
            "이전에 실패했던 이미지들만 선택적으로 재시도하는 스크립트"
        )
    )
    parser.add_argument(
        "--doc-id",
        type=str,
        default=None,
        help="특정 문서만 처리하고 싶을 때, 확장자를 제외한 파일명 (예: SVC-BH1)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help=(
            "기존 *_figures_captioned.json 이 있어도 덮어씁니다. "
            "(retry-failed 모드가 아닐 때만 의미가 있습니다.)"
        ),
    )
    parser.add_argument(
        "--retry-failed",
        action="store_true",
        help=(
            "기존 *_figures_captioned.json 을 읽어, "
            "503/UNAVAILABLE/overloaded 등의 이유로 실패했던 이미지들만 "
            "다시 캡션 생성합니다. "
            "이 옵션을 사용하려면 해당 captioned JSON이 이미 존재해야 합니다."
        ),
    )

    args = parser.parse_args()

    configure_logging()
    load_environment()

    try:
        client = init_gemini_client()
    except Exception as e:
        logging.error("[ERROR] Gemini 클라이언트 초기화 실패: %s", e)
        return

    doc_ids = _find_target_doc_ids(target_doc_id=args.doc_id)
    if not doc_ids:
        logging.info(
            "처리할 doc_id가 없습니다. FIGURES_ROOT_DIR: %s", FIGURES_ROOT_DIR
        )
        return

    mode_str = "RETRY-FAILED" if args.retry_failed else "FULL"
    logging.info(
        "총 %d개 문서에 대해 이미지 캡션 작업 시작 (mode=%s).",
        len(doc_ids),
        mode_str,
    )

    for doc_id in doc_ids:
        process_one_document(
            client=client,
            doc_id=doc_id,
            force=args.force,
            retry_failed=args.retry_failed,
        )

    logging.info("모든 문서 이미지 캡션 작업 완료.")


if __name__ == "__main__":
    main()
