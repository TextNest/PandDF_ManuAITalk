# =============================================================================
# File: Backend/module/document_processor/ocr_cleaner.py
# =============================================================================
# SeShat - OCR Text Cleaner (v2: auto-structure adaptive)
# -----------------------------------------------------------------------------
# 목적:
#   - OCR 추출 결과(JSON)를 정제(clean)하여 RAG 벡터화에 적합한 텍스트로 변환
#   - 다양한 OCR 결과 구조(리스트형, 딕셔너리형, 단순 문자열형)에 자동 대응
#
# 입력 예시:
#   1) [{ "page_num": 1, "text": "..." }, { "page_num": 2, "text": "..." }]
#   2) { "1": "...", "2": "..." }
#   3) ["페이지1 텍스트", "페이지2 텍스트"]
#
# 출력:
#   - *_ocr_cleaned.json : 페이지별 정제된 텍스트
#   - *_ocr_cleaned.txt  : 전체 병합 텍스트
#
# 변경 이력:
#   - v1.0 : 기본 정제기
#   - v2.0 : 구조 자동 감지 + 예외 복원 + 로그 보강
# =============================================================================

import json
from pathlib import Path
from tqdm import tqdm
from Backend.core.config import get_settings


def _normalize_text(text: str) -> str:
    """OCR 결과 내 특수문자·공백 정리"""
    if not text:
        return ""
    text = text.replace("\n", " ").replace("\t", " ").strip()
    # 반복 공백 정리
    while "  " in text:
        text = text.replace("  ", " ")
    return text


def _load_ocr_json(path: Path):
    """JSON 파일을 안전하게 로드하고 구조를 자동 감지"""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # --- 구조 감지 ---
    if isinstance(data, dict):
        # { "1": "...", "2": "..." }
        pages = [{"page_num": int(k), "text": v} for k, v in data.items()]
    elif isinstance(data, list):
        # [{"page_num":..,"text":..}] 또는 ["텍스트", "텍스트"]
        if all(isinstance(x, dict) for x in data):
            pages = [
                {"page_num": x.get("page_num", i + 1), "text": x.get("text", "")}
                for i, x in enumerate(data)
            ]
        else:
            # ["텍스트", "텍스트"] 형태
            pages = [{"page_num": i + 1, "text": x} for i, x in enumerate(data)]
    else:
        raise ValueError(f"지원되지 않는 JSON 구조: {type(data)}")

    return pages


def clean_ocr_file(json_path: Path, output_dir: Path):
    """단일 OCR JSON 파일을 정제"""
    try:
        pages = _load_ocr_json(json_path)
        cleaned_pages = []

        for p in pages:
            text = _normalize_text(p.get("text", ""))
            if text:
                cleaned_pages.append({"page_num": p["page_num"], "text": text})

        if not cleaned_pages:
            print(f"[WARN] {json_path.name}: 텍스트가 비어 있음")
            return False

        # 파일 저장
        output_dir.mkdir(parents=True, exist_ok=True)
        base = json_path.stem
        out_json = output_dir / f"{base}_cleaned.json"
        out_txt = output_dir / f"{base}_cleaned.txt"

        with open(out_json, "w", encoding="utf-8") as f:
            json.dump(cleaned_pages, f, ensure_ascii=False, indent=2)

        with open(out_txt, "w", encoding="utf-8") as f:
            for p in cleaned_pages:
                f.write(f"[p{p['page_num']}]\n{p['text']}\n\n")

        print(f"[OK] {json_path.name} → {out_json.name}")
        return True

    except Exception as e:
        print(f"[ERROR] {json_path.name}: {e}")
        return False


def batch_clean_all_ocr():
    """Backend/data/ocr_texts 내 모든 OCR 결과 정제"""
    _, paths = get_settings()
    src_dir = paths.OCR_TEXTS_DIR
    out_dir = paths.OCR_TEXTS_CLEANED_DIR

    json_files = list(src_dir.glob("*_ocr.json"))
    if not json_files:
        print(f"[!] OCR JSON 파일이 없습니다: {src_dir}")
        return

    print(f"총 {len(json_files)}개 OCR 결과를 정제합니다...\n")

    for json_path in tqdm(json_files, desc="Cleaning OCR Texts"):
        clean_ocr_file(json_path, out_dir)

    print(f"\n✅ OCR 텍스트 정제 완료 → {out_dir}")


if __name__ == "__main__":
    batch_clean_all_ocr()