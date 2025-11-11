# =============================================================================
# File: Backend/module/document_processor/image_caption_cleaner.py
# =============================================================================
# SeShat - Image Caption Cleaner (BLIP 결과 후처리)
# -----------------------------------------------------------------------------
# 목적:
#   - BLIP 모델이 생성한 영어 중심 캡션 중 불필요하거나 중복된 내용을 정제한다.
#   - "the korean version of ..." 등 반복 문장을 제거하고,
#     최종적으로 간결한 한글 캡션으로 정리한다.
#
# 입력:
#   Backend/data/image_captions/image_captions_blip.json
#
# 출력:
#   Backend/data/image_captions/image_captions_cleaned.json
#
# 옵션:
#   1) 무료 모드: 영어 정제까지만 수행
#   2) GPT 모드: OpenAI GPT-4-mini API로 한글 요약 수행
#
# =============================================================================

import re
import json
from pathlib import Path
from tqdm import tqdm
from Backend.core.config import get_settings

# (선택) OpenAI 사용 시
# from openai import OpenAI
# client = OpenAI()

# --------------------------------------------------------------------------
# 1) BLIP 결과 로드
# --------------------------------------------------------------------------
def load_blip_results(path: Path) -> list:
    if not path.exists():
        raise FileNotFoundError(f"❌ 파일이 존재하지 않습니다: {path}")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


# --------------------------------------------------------------------------
# 2) 캡션 텍스트 정제
# --------------------------------------------------------------------------
def clean_caption_text(text: str) -> str:
    if not text or not isinstance(text, str):
        return ""

    t = text.lower()

    # ① 반복 패턴 제거
    t = re.sub(r"(the korean version of\s+)+", "", t)
    t = re.sub(r"(a black and white image of\s+)+", "", t)
    t = re.sub(r"(an image of\s+)+", "", t)

    # ② 특수문자/공백 정리
    t = re.sub(r"[^a-zA-Z0-9가-힣\s.,]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()

    # ③ 너무 짧거나 의미 없는 문장 제거
    if len(t.split()) < 3:
        return ""

    return t


# --------------------------------------------------------------------------
# 3) (옵션) 영어 → 한글 요약 변환
# --------------------------------------------------------------------------
def translate_to_korean(text: str) -> str:
    """
    GPT-4-mini 또는 googletrans로 번역 가능.
    현재는 데모용으로 단순 변환만 수행.
    """
    if not text:
        return ""

    # GPT 버전 예시
    # response = client.chat.completions.create(
    #     model="gpt-4o-mini",
    #     messages=[{"role": "user", "content": f"다음 문장을 간결한 한국어로 설명해줘: {text}"}],
    #     temperature=0.3
    # )
    # return response.choices[0].message.content.strip()

    # 무료 모드: 단순 접두어 추가
    return f"(한글 요약) {text}"


# --------------------------------------------------------------------------
# 4) 전체 배치 실행
# --------------------------------------------------------------------------
def batch_clean_captions(use_translation: bool = False):
    _, paths = get_settings()
    input_path = Path(paths.DATA_DIR) / "image_captions" / "image_captions_blip.json"
    output_path = Path(paths.DATA_DIR) / "image_captions" / "image_captions_cleaned.json"

    data = load_blip_results(input_path)
    cleaned = []

    for item in tqdm(data, desc="Cleaning captions"):
        img = item.get("image", "")
        cap = item.get("caption", "")
        cleaned_text = clean_caption_text(cap)
        if use_translation:
            cleaned_text = translate_to_korean(cleaned_text)
        if cleaned_text:
            cleaned.append({"image": img, "caption": cleaned_text})

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(cleaned, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 캡션 정제 완료 → {output_path} (총 {len(cleaned)}개)")


# --------------------------------------------------------------------------
# 5) CLI 실행 진입점
# --------------------------------------------------------------------------
if __name__ == "__main__":
    # False = 영어 정제만 / True = 한글 요약 포함
    batch_clean_captions(use_translation=False)
