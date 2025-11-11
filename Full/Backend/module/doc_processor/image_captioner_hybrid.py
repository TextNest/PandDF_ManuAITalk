# =============================================================================
# File: Backend/module/document_processor/image_captioner_hybrid.py
# =============================================================================
# SeShat - Image Captioner (Hybrid: OCR + Donut + BLIP)
# -----------------------------------------------------------------------------
# 목적:
#   - OCR로 충분한 텍스트가 있으면 요약으로 대체
#   - 문서/도면·표·설명서 페이지 → Donut로 요약
#   - 제품 사진·아이콘·버튼 등 비문서형 이미지 → BLIP 캡션
#   - 모델 실패/부적합 시 상호 폴백
#
# 입력:
#   - 이미지: Backend/data/image_store/*.png
#   - OCR:    Backend/data/ocr_texts/*.json
#
# 출력:
#   - Backend/data/image_captions/image_captions_hybrid.json
#
# 요구 패키지:
#   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
#   pip install transformers pillow tqdm sentencepiece
#
# ※ GPU(CUDA) 사용 권장. (GTX 1650 Ti 완전 호환)
# =============================================================================

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

import torch
from PIL import Image
from tqdm import tqdm
from transformers import (
    BlipProcessor,                     # ✅ 변경됨
    BlipForConditionalGeneration,      # ✅ 변경됨
    DonutProcessor,
    VisionEncoderDecoderModel,
)
from Backend.core.config import get_settings


# ------------------------------
# 0) 디바이스 설정
# ------------------------------
def get_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


@dataclass
class HybridConfig:
    ocr_min_chars_for_summary: int = 40
    prefer_donut_tokens: tuple = ("vec", "render", "renderHQ")

    # ✅ 1650Ti 호환 모델 조합
    blip_model_name: str = "Salesforce/blip-image-captioning-large"
    donut_model_name: str = "naver-clova-ix/donut-base"

    donut_prompt: str = (
        "<s_donut><s_answer>이 이미지는 제품 설명서/도면입니다. "
        "핵심 항목(부품명, 사용법/주의, 표/치수)을 한국어로 간결히 요약해 주세요.</s_answer>"
    )

    blip_max_new_tokens: int = 64
    donut_max_new_tokens: int = 128


# ------------------------------
# 1) 모델 로더
# ------------------------------
class BlipCaptioner:
    """BLIP (v1) 캡셔닝 모델 로더"""
    def __init__(self, model_name: str, device: str, max_new_tokens: int = 64):
        self.device = device
        self.processor = BlipProcessor.from_pretrained(model_name)
        self.model = BlipForConditionalGeneration.from_pretrained(model_name)
        self.model.to(device, dtype=torch.float16)  # FP16으로 VRAM 절약
        self.max_new_tokens = max_new_tokens

    @torch.inference_mode()
    def caption(self, image_path: Path) -> str:
        image = Image.open(image_path).convert("RGB")
        inputs = self.processor(images=image, return_tensors="pt").to(self.device)
        out = self.model.generate(**inputs, max_new_tokens=self.max_new_tokens)
        text = self.processor.decode(out[0], skip_special_tokens=True)
        return re.sub(r"\s+", " ", text).strip()


class DonutSummarizer:
    """Donut 문서/도면 요약기"""
    def __init__(self, model_name: str, device: str, prompt: str, max_new_tokens: int = 128):
        self.device = device
        self.processor = DonutProcessor.from_pretrained(model_name)
        self.model = VisionEncoderDecoderModel.from_pretrained(model_name)
        self.model.to(device)
        self.prompt = prompt
        self.max_new_tokens = max_new_tokens

    @torch.inference_mode()
    def summarize(self, image_path: Path) -> str:
        image = Image.open(image_path).convert("RGB")
        inputs = self.processor(image, self.prompt, return_tensors="pt").to(self.device)
        out = self.model.generate(**inputs, max_length=self.max_new_tokens, do_sample=False)
        seq = self.processor.batch_decode(out.sequences)[0]
        seq = seq.replace(self.processor.tokenizer.eos_token, "").replace(self.processor.tokenizer.pad_token, "")
        seq = re.sub(r"<.*?>", "", seq)
        return re.sub(r"\s+", " ", seq).strip()


# ------------------------------
# 2) OCR 매핑
# ------------------------------
def load_ocr_map(ocr_dir: Path) -> Dict[str, str]:
    mapping: Dict[str, str] = {}
    for p in ocr_dir.glob("*_ocr.json"):
        try:
            data = json.load(open(p, "r", encoding="utf-8"))
            if isinstance(data, list):
                for page in data:
                    for item in page.get("images", []):
                        path = item.get("path")
                        txt = item.get("text", "")
                        if path:
                            mapping[path] = txt or ""
        except Exception:
            continue
    return mapping


# ------------------------------
# 3) 라우팅 / OCR 요약
# ------------------------------
def route_engine(image_path: Path, cfg: HybridConfig) -> str:
    name = image_path.name.lower()
    if any(tok in name for tok in cfg.prefer_donut_tokens):
        return "donut_first"
    return "blip_first"


def summarize_ocr_text(ocr_text: str, max_chars: int = 400) -> str:
    text = re.sub(r"\s+", " ", ocr_text).strip()
    if len(text) <= max_chars:
        return text
    parts = re.split(r"([.!?。！？])", text)
    acc = ""
    for i in range(0, len(parts), 2):
        sent = parts[i] + (parts[i + 1] if i + 1 < len(parts) else "")
        if len(acc) + len(sent) > max_chars:
            break
        acc += sent
    return acc or text[:max_chars]


# ------------------------------
# 4) 메인 파이프라인
# ------------------------------
def run_hybrid_pipeline(use_ocr_filter: bool = True) -> Path:
    _, paths = get_settings()
    image_dir = paths.IMAGE_STORE_DIR
    ocr_dir = paths.OCR_TEXTS_DIR

    out_dir = Path(paths.DATA_DIR) / "image_captions"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "image_captions_hybrid.json"

    device = get_device()
    cfg = HybridConfig()

    print(f"[INIT] Device = {device}")
    print("[INIT] Loading BLIP (v1)...")
    blip = BlipCaptioner(cfg.blip_model_name, device, cfg.blip_max_new_tokens)
    print("[INIT] Loading Donut...")
    donut = DonutSummarizer(cfg.donut_model_name, device, cfg.donut_prompt, cfg.donut_max_new_tokens)

    print("[INIT] Loading OCR maps...")
    ocr_map = load_ocr_map(ocr_dir)

    image_files = sorted(image_dir.glob("*.png"))
    results: List[Dict] = []

    # OCR 충분한 이미지 → 요약만 저장
    if use_ocr_filter:
        candidates = []
        for img in image_files:
            txt = ocr_map.get(str(img), "")
            if len(txt.strip()) >= cfg.ocr_min_chars_for_summary:
                results.append({
                    "image": str(img),
                    "source": "ocr_summary",
                    "caption": summarize_ocr_text(txt),
                })
            else:
                candidates.append(img)
    else:
        candidates = image_files

    # 나머지 → Vision 캡션
    for img in tqdm(candidates, desc="Hybrid captioning"):
        mode = route_engine(img, cfg)
        caption, used = "", None
        try:
            if mode == "donut_first":
                try:
                    caption = donut.summarize(img)
                    used = "donut"
                    if len(caption) < 5:
                        raise RuntimeError("Donut too short")
                except Exception:
                    caption = blip.caption(img)
                    used = "blip"
            else:
                try:
                    caption = blip.caption(img)
                    used = "blip"
                    if len(caption) < 5:
                        raise RuntimeError("BLIP too short")
                except Exception:
                    caption = donut.summarize(img)
                    used = "donut"
        except Exception as e:
            caption, used = f"[ERROR] {e}", "error"

        results.append({"image": str(img), "source": used, "caption": caption})

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Hybrid captions saved → {out_path}")
    return out_path


# ------------------------------
# 5) CLI
# ------------------------------
if __name__ == "__main__":
    run_hybrid_pipeline(use_ocr_filter=True)
