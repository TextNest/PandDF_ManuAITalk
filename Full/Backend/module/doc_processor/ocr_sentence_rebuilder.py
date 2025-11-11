# =============================================================================
# File: Backend/module/document_processor/ocr_sentence_rebuilder.py
# =============================================================================
# SeShat - OCR Sentence Rebuilder
# -----------------------------------------------------------------------------
# 목적:
#   - OCR 후 잘린 문장 / 비정상 개행 / 단어 분리 현상을 자동 복원한다.
#   - 'ocr_cleaner.py' 결과물을 입력으로 받아 RAG 학습에 적합한 문단 구조로 변환한다.
#
# 입력:
#   *_ocr_cleaned.json   (페이지별 OCR 정제 결과)
#   *_ocr_cleaned.txt    (전체 텍스트 병합본)
#
# 출력:
#   *_rebuilt.json
#   *_rebuilt.txt
#
# 주요 기능:
#   1) OCR 잘림 문장 자동 연결 (줄바꿈 → 공백)
#   2) 숫자/단위 분리 복원 (예: "1 0 0 0 W" → "1000W")
#   3) 개행이 문장 내에 있을 경우 문장 단위로 재조립
#   4) 페이지별 텍스트 재결합 후 전체 텍스트 병합
#
# =============================================================================

import re
import json
from pathlib import Path
from tqdm import tqdm
from Backend.core.config import get_settings


# -----------------------------------------------------------------------------
# 1. 텍스트 정제 유틸
# -----------------------------------------------------------------------------
def fix_number_units(text: str) -> str:
    """숫자와 단위 사이의 불필요한 공백 제거"""
    # 예: "1 0 0 0 W" → "1000W"
    text = re.sub(r"(\d)\s+(\d)", r"\1\2", text)
    text = re.sub(r"(\d)\s*([A-Za-z%℃°])", r"\1\2", text)
    return text


def merge_broken_lines(text: str) -> str:
    """
    개행이 문장 중간에 존재할 경우 자동으로 문장 단위로 복원.
    예: "제품을 사용\n할 때" → "제품을 사용할 때"
    """
    # 1. 문장 끝에 마침표나 물음표, 느낌표가 없고 다음 줄이 소문자 또는 한글이면 이어 붙이기
    lines = text.split("\n")
    rebuilt = []
    buffer = ""

    for line in lines:
        line = line.strip()
        if not line:
            continue
        if buffer:
            # 이전 줄이 문장 중간일 가능성
            if not re.search(r"[.!?]$", buffer) and re.match(r"^[가-힣a-z0-9]", line):
                buffer += " " + line
            else:
                rebuilt.append(buffer)
                buffer = line
        else:
            buffer = line

    if buffer:
        rebuilt.append(buffer)

    return " ".join(rebuilt)


def rebuild_text(text: str) -> str:
    """모든 보정 규칙 적용"""
    text = merge_broken_lines(text)
    text = fix_number_units(text)
    # 중복 공백 제거
    text = re.sub(r"\s{2,}", " ", text).strip()
    return text


# -----------------------------------------------------------------------------
# 2. 파일 단위 재조립 로직
# -----------------------------------------------------------------------------
def rebuild_ocr_file(cleaned_path: Path, output_dir: Path):
    """단일 OCR cleaned 파일을 문장 단위로 복원"""
    try:
        with open(cleaned_path, "r", encoding="utf-8") as f:
            pages = json.load(f)

        rebuilt_pages = []
        all_texts = []

        for p in pages:
            text = rebuild_text(p.get("text", ""))
            if text:
                rebuilt_pages.append({"page_num": p["page_num"], "text": text})
                all_texts.append(f"[p{p['page_num']}] {text}")

        if not rebuilt_pages:
            print(f"[WARN] {cleaned_path.name}: 비어 있음")
            return False

        output_dir.mkdir(parents=True, exist_ok=True)
        base = cleaned_path.stem.replace("_cleaned", "")

        out_json = output_dir / f"{base}_rebuilt.json"
        out_txt = output_dir / f"{base}_rebuilt.txt"

        with open(out_json, "w", encoding="utf-8") as f:
            json.dump(rebuilt_pages, f, ensure_ascii=False, indent=2)

        with open(out_txt, "w", encoding="utf-8") as f:
            f.write("\n\n".join(all_texts))

        print(f"[OK] {cleaned_path.name} → {out_json.name}")
        return True

    except Exception as e:
        print(f"[ERROR] {cleaned_path.name}: {e}")
        return False


# -----------------------------------------------------------------------------
# 3. 전체 배치 실행
# -----------------------------------------------------------------------------
def batch_rebuild_all():
    """Backend/data/ocr_texts_cleaned 내 모든 파일 대상"""
    _, paths = get_settings()
    src_dir = paths.OCR_TEXTS_CLEANED_DIR
    out_dir = paths.OCR_TEXTS_CLEANED_DIR / "rebuilt"

    json_files = list(src_dir.glob("*_cleaned.json"))
    if not json_files:
        print(f"[!] OCR cleaned 파일이 없습니다: {src_dir}")
        return

    print(f"총 {len(json_files)}개 OCR cleaned 파일을 재조립합니다...\n")

    for cleaned_path in tqdm(json_files, desc="Rebuilding Sentences"):
        rebuild_ocr_file(cleaned_path, out_dir)

    print(f"\n✅ 문장 재조립 완료 → {out_dir}")


# -----------------------------------------------------------------------------
# 4. CLI Entry
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    batch_rebuild_all()
