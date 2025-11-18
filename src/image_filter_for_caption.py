# ============================================================
#  File: src/image_filter_for_caption.py
# ============================================================
# [모듈 개요]
#   - upstage_batch_loader.py 가 생성한 figure PNG + 메타데이터를
#     OpenCV 기반의 간단한 규칙으로 분석하여,
#       1) QR 코드
#       2) 너무 작은 픽토그램/아이콘
#       3) 폐가전 제품 배출 안내 등, 가로로 긴 절차 배너(인포그래픽)
#     를 제외하고, 나머지 이미지는 모두 캡션 대상으로 남긴다.
#
#   - 결과는 각 문서별로:
#       data/figures/<doc_id>/<doc_id>_figures_filtered.json
#     에 저장되며, 이후 이미지 캡셔닝 스크립트에서
#       "keep_for_caption == true" 인 항목만 골라
#     Gemini 등에 넘기도록 설계한다.
#
#   - 추가 기능:
#       • 캡셔닝에 실제로 사용할 이미지 PNG만 별도 디렉터리에 모은다.
#           - data/caption_images/<doc_id>/page_XXX_figure_YYY.png
#       • 필터링 JSON에 "caption_file" 필드를 추가해,
#         캡셔닝용 복사본 이미지 경로를 명시한다.
#
# [필터링 규칙(이번 버전)]
#   - upstage_batch_loader.py에서 추가한 bbox_norm / bbox_center_norm 필드는
#     이 스크립트에서 변경하지 않고 그대로 통과시키며,
#     이후 image_captioner_gemini.py에서 텍스트-그림 매칭에 사용된다.
#
#   - qr_code / qr_code_heuristic:
#       · 1차: OpenCV QRCodeDetector.detectAndDecode 에서 데이터 검출 시
#         → keep_for_caption = False, category = "qr_code"
#       · 2차: Detector가 실패하더라도, 다음 조건을 모두 만족하면
#              QR 코드로 간주(휴리스틱):
#              - 거의 정사각형(0.85 ≤ aspect_ratio ≤ 1.15)
#              - 크기: 80px ≤ min(width, height) ≤ 300px
#              - edge_ratio ≥ 0.15
#              - table_line_ratio ≥ 0.20
#              - ink_ratio ≥ 0.30
#         → keep_for_caption = False, category = "qr_code_heuristic"
#
#   - small_icon:
#       · max(width, height) <= SMALL_ICON_MAX_DIM (기본 96px)
#         또는 width*height <= SMALL_ICON_MAX_AREA (기본 96*96)
#       · keep_for_caption = False, category = "small_icon"
#
#   - procedure_banner:
#       · 폐가전 제품 배출 절차처럼 가로로 긴 인포그래픽/배너를 제거
#       · 조건:
#           aspect_ratio >= 4.0
#           ink_ratio <= 0.20
#           table_line_ratio >= 0.03
#       · keep_for_caption = False, category = "procedure_banner"
#
#   - photo_or_diagram (및 기타):
#       · 위 조건들에 모두 해당하지 않는 모든 이미지
#       · keep_for_caption = True, category = "photo_or_diagram"
#
#   ※ table/text 관련 metric(ink_ratio, table_line_ratio 등)은
#      일부는 휴리스틱 분류(QR/배너)에 사용하고,
#      나머지는 "참고용/디버깅용" 메트릭으로 JSON에 기록한다.
# ============================================================

from __future__ import annotations

import argparse
import json
import logging
import shutil
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

# ----------------------------- 경로/상수 정의 -----------------------------

# 이 파일(src/image_filter_for_caption.py)을 기준으로 프로젝트 루트 계산
PROJECT_ROOT: Path = Path(__file__).resolve().parents[1]

# figures 메타 및 PNG가 있는 디렉터리 (upstage_batch_loader.py 산출물)
FIGURES_ROOT_DIR: Path = PROJECT_ROOT / "data" / "figures"

# 캡셔닝에 사용할 이미지만 모아둘 디렉터리 루트
#   - data/caption_images/<doc_id>/page_XXX_figure_YYY.png
CAPTION_IMAGES_ROOT_DIR: Path = PROJECT_ROOT / "data" / "caption_images"

# ----------------------------- 필터링 설정 상수 -----------------------------

# (1) 작은 아이콘/픽토그램 판정 기준
SMALL_ICON_MAX_DIM: int = 96             # 가로/세로 중 더 큰 값이 이 이하이면 "작다"
SMALL_ICON_MAX_AREA: int = 96 * 96       # 전체 픽셀 수가 이 이하이면 "작다"

# (2) 텍스트/표 metric을 위한 잉크(어두운 픽셀) 기준
#  - 잉크 비율(ink_ratio) 계산에 사용
INK_INTENSITY_THRESHOLD: int = 190       # 0~255; 이 값보다 어두우면 "잉크"로 간주

# (3) 절차 배너(폐가전 배출 안내 등) 필터 기준
PROCEDURE_BANNER_MIN_ASPECT: float = 4.0     # 매우 가로로 긴 경우만
PROCEDURE_BANNER_MAX_INK: float = 0.20      # 아이콘/선 위주로 잉크가 적음
PROCEDURE_BANNER_MIN_TABLE_LINE: float = 0.03

# (4) QR 코드 탐지 여부(Detector + 휴리스틱 모두 사용)
ENABLE_QR_DETECTION: bool = True

# QR 휴리스틱 기준값
QR_SIZE_MIN: float = 80.0                  # 너무 작은 건 small_icon 규칙에 걸림
QR_SIZE_MAX: float = 300.0                 # 일반 설명서 내 QR 코드 상한
QR_SQUARE_ASPECT_TOL: float = 0.15         # aspect_ratio 가 1.0에서 ±15% 이내
QR_MIN_EDGE_RATIO: float = 0.15
QR_MIN_TABLE_LINE_RATIO: float = 0.20
QR_MIN_INK_RATIO: float = 0.30

# (5) 디버그용: 각 문서마다 처음 N개 이미지의 메트릭을 로그로 남길지 여부
DEBUG_SAMPLES_PER_DOC: int = 5

# QR 코드 검출기 (모듈 전역에서 1번만 생성)
_QR_DETECTOR = cv2.QRCodeDetector() if ENABLE_QR_DETECTION else None


# ----------------------------- 로깅 설정 함수 -----------------------------


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


# ----------------------------- 유틸 함수 -----------------------------


def _load_image_bgr(image_path: Path) -> Optional[np.ndarray]:
    """
    주어진 경로에서 이미지를 BGR(OpenCV) 형식으로 읽어온다.

    Args:
        image_path (Path): 이미지 파일 경로

    Returns:
        np.ndarray | None:
            - 성공 시: (H, W, 3) BGR 배열
            - 실패 시: None
    """
    img = cv2.imread(str(image_path))
    if img is None:
        logging.warning("이미지 로딩 실패: %s", image_path)
    return img


def _detect_qr_code(image_bgr: np.ndarray) -> bool:
    """
    OpenCV QRCodeDetector를 사용해 이미지 내 QR 코드 존재 여부를 판정한다.

    - Detector가 비활성화 되어 있거나 예외가 발생하면 False를 반환한다.
    """
    if not ENABLE_QR_DETECTION or _QR_DETECTOR is None:
        return False

    try:
        data, points, _ = _QR_DETECTOR.detectAndDecode(image_bgr)
        if points is not None and isinstance(data, str) and data.strip():
            # QR 코드로 해석 가능한 데이터가 있으면 True
            return True
    except Exception as e:
        # QR 탐지 실패는 전체 파이프라인에 치명적이지 않으므로 DEBUG 수준으로만 기록
        logging.debug("QR 탐지 중 예외 발생: %s", e)

    return False


def _compute_basic_metrics(image_bgr: np.ndarray) -> Dict[str, float]:
    """
    이미지의 기본적인 통계/특징값을 계산한다.

    계산 항목:
        - width, height, aspect_ratio
        - ink_ratio       : 어두운 픽셀(잉크) 비율
        - edge_ratio      : Canny 엣지 픽셀 비율
        - table_line_ratio: 수평/수직 라인 비율 (테이블/격자 유사성)

    일부 값은 휴리스틱 분류(QR/배너)에 직접 사용되고,
    나머지는 디버깅/튜닝용으로만 사용된다.
    """
    height, width = image_bgr.shape[:2]
    total_pixels = float(width * height) if width > 0 and height > 0 else 1.0
    aspect_ratio = float(width) / float(height) if height > 0 else 1.0

    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)

    # --- 잉크 비율(ink_ratio) 계산 ---
    ink_mask = gray < INK_INTENSITY_THRESHOLD
    ink_pixels = float(np.count_nonzero(ink_mask))
    ink_ratio = ink_pixels / total_pixels

    # --- 엣지 비율(edge_ratio) 계산 ---
    edges = cv2.Canny(gray, 100, 200)
    edge_pixels = float(cv2.countNonZero(edges))
    edge_ratio = edge_pixels / total_pixels

    # --- 테이블 유사성: 수평/수직 라인 비율(table_line_ratio) ---
    _, bw = cv2.threshold(
        gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
    )

    horiz_size = max(10, width // 30)
    horiz_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT, (horiz_size, 1)
    )
    horizontal = cv2.erode(bw, horiz_kernel)
    horizontal = cv2.dilate(horizontal, horiz_kernel)

    vert_size = max(10, height // 30)
    vert_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT, (1, vert_size)
    )
    vertical = cv2.erode(bw, vert_kernel)
    vertical = cv2.dilate(vertical, vert_kernel)

    lines = cv2.bitwise_or(horizontal, vertical)
    line_pixels = float(cv2.countNonZero(lines))
    table_line_ratio = line_pixels / total_pixels

    return {
        "width": float(width),
        "height": float(height),
        "aspect_ratio": float(aspect_ratio),
        "ink_ratio": float(ink_ratio),
        "edge_ratio": float(edge_ratio),
        "table_line_ratio": float(table_line_ratio),
    }


def _is_small_icon(width: float, height: float) -> bool:
    """
    이미지 크기만으로 "작은 픽토그램/아이콘" 여부를 판정한다.

    Args:
        width (float): 이미지 가로 픽셀 수
        height (float): 이미지 세로 픽셀 수

    Returns:
        bool: 작은 아이콘으로 간주되면 True
    """
    max_dim = max(width, height)
    area = width * height
    if max_dim <= SMALL_ICON_MAX_DIM or area <= SMALL_ICON_MAX_AREA:
        return True
    return False


def _is_qr_like_pattern(metrics: Dict[str, float]) -> bool:
    """
    QRCodeDetector가 실패했을 때, 메트릭 기반으로
    "QR 코드일 가능성이 매우 높은" 정사각형 패턴을 추가로 탐지한다.

    기준:
        - 정사각형에 가까운 비율(aspect_ratio)
        - 적당한 크기 범위 내(min_dim)
        - 엣지/라인/잉크 비율이 모두 높은 패턴
    """
    width = float(metrics.get("width", 0.0))
    height = float(metrics.get("height", 0.0))
    if width <= 0 or height <= 0:
        return False

    min_dim = min(width, height)
    if not (QR_SIZE_MIN <= min_dim <= QR_SIZE_MAX):
        return False

    aspect_ratio = float(metrics.get("aspect_ratio", 1.0))
    if abs(aspect_ratio - 1.0) > QR_SQUARE_ASPECT_TOL:
        # QR 코드는 거의 정사각형이므로, 편차가 크면 제외
        return False

    edge_ratio = float(metrics.get("edge_ratio", 0.0))
    table_line_ratio = float(metrics.get("table_line_ratio", 0.0))
    ink_ratio = float(metrics.get("ink_ratio", 0.0))

    if (
        edge_ratio >= QR_MIN_EDGE_RATIO
        and table_line_ratio >= QR_MIN_TABLE_LINE_RATIO
        and ink_ratio >= QR_MIN_INK_RATIO
    ):
        return True

    return False


def _is_procedure_banner(metrics: Dict[str, float]) -> bool:
    """
    폐가전 제품 배출 절차 안내처럼,
    가로로 매우 길고 잉크가 적은 인포그래픽/배너 여부를 판정한다.

    기준:
        - aspect_ratio >= PROCEDURE_BANNER_MIN_ASPECT
        - ink_ratio    <= PROCEDURE_BANNER_MAX_INK
        - table_line_ratio >= PROCEDURE_BANNER_MIN_TABLE_LINE
    """
    aspect_ratio = float(metrics.get("aspect_ratio", 0.0))
    ink_ratio = float(metrics.get("ink_ratio", 0.0))
    table_line_ratio = float(metrics.get("table_line_ratio", 0.0))

    if (
        aspect_ratio >= PROCEDURE_BANNER_MIN_ASPECT
        and ink_ratio <= PROCEDURE_BANNER_MAX_INK
        and table_line_ratio >= PROCEDURE_BANNER_MIN_TABLE_LINE
    ):
        return True

    return False


def classify_figure_image(image_path: Path) -> Tuple[bool, str, Dict[str, Any]]:
    """
    단일 figure 이미지를 로드하여,
    - keep_for_caption 여부
    - category 문자열
    - 상세 metrics (디버깅/튜닝용)
    을 반환한다.

    이번 버전의 분류 규칙:
      1) QR 코드면 → 제외(qr_code / qr_code_heuristic)
      2) 작은 아이콘/픽토그램이면 → 제외(small_icon)
      3) 폐가전 안내 등 배너/인포그래픽이면 → 제외(procedure_banner)
      4) 그 외는 모두 → 캡션 대상(photo_or_diagram)
    """
    img = _load_image_bgr(image_path)
    if img is None:
        # 이미지가 없으면 캡션 생성도 불가하므로 제외
        metrics: Dict[str, Any] = {
            "width": 0.0,
            "height": 0.0,
            "aspect_ratio": 0.0,
            "ink_ratio": 0.0,
            "edge_ratio": 0.0,
            "table_line_ratio": 0.0,
            "is_qr_code": False,
            "qr_heuristic": False,
            "is_small_icon": False,
            "is_procedure_banner": False,
            "load_error": True,
        }
        return False, "missing_file", metrics

    metrics = _compute_basic_metrics(img)
    width = metrics["width"]
    height = metrics["height"]

    # ----------------- QR 코드 판정: Detector + 휴리스틱 -----------------
    is_qr_detector = _detect_qr_code(img)
    is_qr_heuristic = False

    if not is_qr_detector:
        is_qr_heuristic = _is_qr_like_pattern(metrics)

    is_qr = is_qr_detector or is_qr_heuristic
    metrics["is_qr_code"] = bool(is_qr)
    metrics["qr_heuristic"] = bool(is_qr_heuristic)

    # 작은 아이콘 여부
    is_small_icon = _is_small_icon(width, height)
    metrics["is_small_icon"] = bool(is_small_icon)

    # 절차 배너 여부
    is_banner = _is_procedure_banner(metrics)
    metrics["is_procedure_banner"] = bool(is_banner)

    # ----------------- 규칙 기반 카테고리 판정 -----------------

    # 1) QR 코드인 경우: 무조건 제외
    if is_qr:
        category = "qr_code_heuristic" if is_qr_heuristic else "qr_code"
        return False, category, metrics

    # 2) 너무 작은 아이콘/픽토그램인 경우: 제외
    if is_small_icon:
        return False, "small_icon", metrics

    # 3) 폐가전 배출 안내 등 가로로 긴 절차 배너: 제외
    if is_banner:
        return False, "procedure_banner", metrics

    # 4) 그 외는 모두 캡션 대상
    return True, "photo_or_diagram", metrics


# ----------------------------- 문서 단위 처리 함수 -----------------------------


def _find_target_doc_ids(target_doc_id: Optional[str] = None) -> List[str]:
    """
    처리 대상 doc_id 리스트를 찾는다.

    - target_doc_id가 주어지면 해당 doc_id만 검사
    - 그렇지 않으면 data/figures/*/ 아래의 *_figures.json 을 전부 스캔
    """
    if target_doc_id:
        meta_path = FIGURES_ROOT_DIR / target_doc_id / f"{target_doc_id}_figures.json"
        if not meta_path.exists():
            logging.warning(
                "요청한 doc-id에 해당하는 figures 메타 파일을 찾을 수 없습니다: %s",
                meta_path,
            )
            return []
        return [target_doc_id]

    doc_ids: List[str] = []
    for meta_path in FIGURES_ROOT_DIR.glob("*/*_figures.json"):
        if str(meta_path.name).endswith("_figures_filtered.json"):
            continue
        doc_ids.append(meta_path.parent.name)

    doc_ids = sorted(set(doc_ids))
    return doc_ids


def process_one_document(doc_id: str, force: bool = False, debug: bool = False) -> None:
    """
    단일 doc_id에 대해 figure 필터링을 수행한다.

    - 입력:  data/figures/<doc_id>/<doc_id>_figures.json
    - 출력:  data/figures/<doc_id>/<doc_id>_figures_filtered.json
    - 추가:  data/caption_images/<doc_id>/ 에 캡션 대상 이미지만 복사
    """
    doc_dir = FIGURES_ROOT_DIR / doc_id
    input_meta_path = doc_dir / f"{doc_id}_figures.json"
    output_meta_path = doc_dir / f"{doc_id}_figures_filtered.json"

    caption_doc_dir = CAPTION_IMAGES_ROOT_DIR / doc_id

    if not input_meta_path.exists():
        logging.warning(
            "[SKIP] figures 메타 파일이 없어 건너뜁니다: %s", input_meta_path
        )
        return

    if output_meta_path.exists() and not force:
        logging.info(
            "[SKIP] 이미 필터링 결과가 존재합니다( --force 미사용 ): %s",
            output_meta_path,
        )
        return

    # 기존 캡션용 디렉터리 초기화
    if caption_doc_dir.exists():
        shutil.rmtree(caption_doc_dir, ignore_errors=True)
    caption_doc_dir.mkdir(parents=True, exist_ok=True)

    logging.info("[FILTER] doc_id=%s 에 대한 figure 필터링 시작", doc_id)

    try:
        meta = json.loads(input_meta_path.read_text(encoding="utf-8"))
    except Exception as e:
        logging.error("[ERROR] 메타 JSON 로드 실패 (%s): %s", input_meta_path, e)
        return

    images: List[Dict[str, Any]] = meta.get("images", [])
    if not images:
        logging.warning("[WARN] doc_id=%s 에 이미지 메타가 없습니다.", doc_id)
        return

    filtered_images: List[Dict[str, Any]] = []
    keep_count = 0
    category_counts: Dict[str, int] = {}

    for idx, img_info in enumerate(images, start=1):
        rel_path = img_info.get("file")
        if not rel_path:
            logging.warning("[WARN] img_info에 'file' 항목이 없습니다: %s", img_info)
            continue

        src_path = PROJECT_ROOT / rel_path

        keep, category, metrics = classify_figure_image(src_path)
        category_counts[category] = category_counts.get(category, 0) + 1

        if debug and idx <= DEBUG_SAMPLES_PER_DOC:
            logging.info(
                "  [DEBUG] #%d %s -> keep=%s, cat=%s, w=%d, h=%d, ink=%.3f, tbl=%.3f",
                idx,
                rel_path,
                keep,
                category,
                int(metrics.get("width", 0)),
                int(metrics.get("height", 0)),
                float(metrics.get("ink_ratio", 0.0)),
                float(metrics.get("table_line_ratio", 0.0)),
            )

        caption_rel_path: Optional[str] = None

        if keep:
            keep_count += 1
            dst_path = caption_doc_dir / Path(rel_path).name
            try:
                shutil.copy2(src_path, dst_path)
                caption_rel_path = dst_path.relative_to(PROJECT_ROOT).as_posix()
            except Exception as e:
                logging.warning(
                    "[WARN] 캡션용 이미지 복사 실패 (%s → %s): %s",
                    src_path,
                    dst_path,
                    e,
                )

        tags: List[str] = []
        if metrics.get("is_qr_code"):
            tags.append("qr_code")
        if metrics.get("is_small_icon"):
            tags.append("small_icon")
        if metrics.get("is_procedure_banner"):
            tags.append("procedure_banner")

        new_img_info: Dict[str, Any] = dict(img_info)
        new_img_info.update(
            {
                "keep_for_caption": bool(keep),
                "category": category,
                "tags": tags,
                "metrics": metrics,
                "caption_file": caption_rel_path,
            }
        )
        filtered_images.append(new_img_info)

    if debug:
        logging.info("  [DEBUG] category 통계 (doc_id=%s): %s", doc_id, category_counts)

    output_payload: Dict[str, Any] = {
        "doc_id": meta.get("doc_id", doc_id),
        "source_pdf": meta.get("source_pdf"),
        "num_images_total": len(images),
        "num_images_kept": keep_count,
        "created_by": "image_filter_for_caption.py",
        "config": {
            "SMALL_ICON_MAX_DIM": SMALL_ICON_MAX_DIM,
            "SMALL_ICON_MAX_AREA": SMALL_ICON_MAX_AREA,
            "INK_INTENSITY_THRESHOLD": INK_INTENSITY_THRESHOLD,
            "PROCEDURE_BANNER_MIN_ASPECT": PROCEDURE_BANNER_MIN_ASPECT,
            "PROCEDURE_BANNER_MAX_INK": PROCEDURE_BANNER_MAX_INK,
            "PROCEDURE_BANNER_MIN_TABLE_LINE": PROCEDURE_BANNER_MIN_TABLE_LINE,
            "ENABLE_QR_DETECTION": ENABLE_QR_DETECTION,
            "QR_SIZE_MIN": QR_SIZE_MIN,
            "QR_SIZE_MAX": QR_SIZE_MAX,
            "QR_SQUARE_ASPECT_TOL": QR_SQUARE_ASPECT_TOL,
            "QR_MIN_EDGE_RATIO": QR_MIN_EDGE_RATIO,
            "QR_MIN_TABLE_LINE_RATIO": QR_MIN_TABLE_LINE_RATIO,
            "QR_MIN_INK_RATIO": QR_MIN_INK_RATIO,
        },
        "images": filtered_images,
    }

    try:
        output_meta_path.write_text(
            json.dumps(output_payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except Exception as e:
        logging.error(
            "[ERROR] 필터링 결과 JSON 저장 실패 (%s): %s", output_meta_path, e
        )
        return

    logging.info(
        "[DONE] doc_id=%s, 총 %d개 중 %d개 keep_for_caption=True → %s",
        doc_id,
        len(images),
        keep_count,
        output_meta_path,
    )


# ----------------------------- 메인 실행 함수 -----------------------------


def main() -> None:
    """
    image_filter_for_caption 스크립트의 메인 엔트리 포인트.

    수행 순서:
        1) 인자 파싱 (--doc-id, --force, --debug)
        2) 로깅 초기화
        3) 처리 대상 doc_id 목록 수집
        4) 각 doc_id에 대해 figure 필터링 수행
           - *_figures_filtered.json 생성/갱신
           - data/caption_images/<doc_id>/ 에 캡션 대상 이미지 복사
    """
    parser = argparse.ArgumentParser(
        description=(
            "Upstage figure PNG를 OpenCV 기반 규칙으로 분석하여 "
            "QR 코드, 작은 아이콘, 절차 배너를 제외하고, "
            "캡션 대상 이미지를 별도 디렉터리에 복사하는 필터링 스크립트"
        ),
    )
    parser.add_argument(
        "--doc-id",
        type=str,
        default=None,
        help=(
            "특정 문서만 처리하고 싶을 때, 확장자를 제외한 파일명 "
            "(예: SVC-BH1)"
        ),
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help=(
            "기존 *_figures_filtered.json 이 있어도 덮어씁니다. "
            "기존 data/caption_images/<doc_id> 디렉터리도 다시 생성합니다. "
            "기본값은 이미 결과가 있으면 SKIP."
        ),
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help=(
            "각 문서마다 앞쪽 몇 개 이미지의 메트릭/카테고리를 로그로 출력합니다. "
            "튜닝 시에만 켜두고, 대량 처리 시에는 끄는 것을 권장."
        ),
    )
    args = parser.parse_args()

    configure_logging()

    CAPTION_IMAGES_ROOT_DIR.mkdir(parents=True, exist_ok=True)

    doc_ids = _find_target_doc_ids(target_doc_id=args.doc_id)
    if not doc_ids:
        logging.info("처리할 doc_id가 없습니다. FIGURES_ROOT_DIR: %s", FIGURES_ROOT_DIR)
        return

    logging.info("총 %d개 문서에 대해 figure 필터링 시작.", len(doc_ids))

    for doc_id in doc_ids:
        process_one_document(doc_id, force=args.force, debug=args.debug)

    logging.info("모든 문서 필터링 완료.")


if __name__ == "__main__":
    main()
