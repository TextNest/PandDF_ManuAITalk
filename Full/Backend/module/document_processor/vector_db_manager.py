# =============================================================================
# File: Backend/module/document_processor/vector_db_manager.py
# =============================================================================
# SeShat - Vector DB Manager (제품별 FAISS 인덱스 자동 생성)
# -----------------------------------------------------------------------------
# 목적:
#   - document_pr.py에서 생성된 제품별 청크 파일을 읽어
#     각 제품별로 독립적인 FAISS 벡터 인덱스를 생성
#   - 토큰 초과 방지를 위해 청크 단위 배치 처리(batch embedding)
#   - 한글/공백/특수문자 폴더명 자동 정규화 (Windows 인코딩 에러 방지)
#   - 진행률 표시 및 로그 출력 포함
#
# 입력:
#   - Backend/data/chunk_store/{product_id}_chunks.json
#
# 출력:
#   - Backend/data/faiss_index/{product_id}/index.faiss
#   - Backend/data/faiss_index/{product_id}/docstore.pkl
#
# 실행:
#   (venv) $ python -m Backend.module.document_processor.vector_db_manager
#
# 요구 패키지:
#   pip install langchain langchain-community langchain-openai faiss-cpu tqdm
#   pip install openai
#
# 환경 설정:
#   .env 파일에 OPENAI_API_KEY 설정 필요
# =============================================================================

from __future__ import annotations
import json
import re
import hashlib
from pathlib import Path
from tqdm import tqdm
from Backend.core.config import get_settings

# LangChain imports
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain.schema import Document


# ------------------------------
# 1) 파일명 안전화 함수 (한글 포함 완전 대응)
# ------------------------------
def sanitize_filename(name: str) -> str:
    """
    한글, 공백, 특수문자가 포함된 이름을 ASCII 안전 문자열로 변환.
    예: "2024년_SIF-제품매뉴얼" → "HAN_2024_SIF_5a1b2c"
    """
    try:
        # 한글 포함 여부 확인
        if any(ord(ch) > 127 for ch in name):
            hashed = hashlib.md5(name.encode("utf-8")).hexdigest()[:6]
            # 한글/특수문자 제거 후 ASCII만 남김
            ascii_name = re.sub(r"[ㄱ-ㅎㅏ-ㅣ가-힣]+", "", name)
            ascii_name = re.sub(r"[^\w\-]+", "_", ascii_name)
            return f"HAN_{ascii_name[:40]}_{hashed}"
        # 영어/숫자만 있는 경우
        return re.sub(r"[^\w\-_.]", "_", name)[:80]
    except Exception:
        return "unknown_doc"


# ------------------------------
# 2) 청크 로드 함수
# ------------------------------
def load_chunks(json_path: Path):
    """제품별 청크 JSON을 로드하여 LangChain Document 리스트로 변환"""
    try:
        data = json.load(open(json_path, "r", encoding="utf-8"))
        docs = []
        for item in data:
            text = item.get("text", "").strip()
            if not text:
                continue
            metadata = {"document_id": item.get("document_id")}
            docs.append(Document(page_content=text, metadata=metadata))
        return docs
    except Exception as e:
        print(f"⚠️ {json_path.name} 로드 실패 ({e})")
        return []


# ------------------------------
# 3) FAISS 인덱스 생성 함수
# ------------------------------
def build_faiss_index(product_id: str, docs: list[Document], out_dir: Path, batch_size: int = 80):
    """주어진 문서 리스트로 FAISS 인덱스 생성 및 저장"""
    if not docs:
        print(f"⚠️ {product_id}: 청크 없음 → 인덱스 건너뜀")
        return

    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

    # ✅ 한글 및 특수문자 대응 폴더명 변환
    safe_id = sanitize_filename(product_id)
    product_dir = out_dir / safe_id
    product_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n[BUILD] {product_id} → {product_dir}")

    all_docs = []
    vectorstore = None

    # 배치 단위 임베딩 (토큰 초과 방지)
    for i in range(0, len(docs), batch_size):
        batch = docs[i:i + batch_size]
        print(f" → Embedding batch {i//batch_size + 1}/{(len(docs) // batch_size) + 1} ({len(batch)}개 청크)")
        try:
            if i == 0:
                vectorstore = FAISS.from_documents(batch, embeddings)
            else:
                batch_store = FAISS.from_documents(batch, embeddings)
                vectorstore.merge_from(batch_store)
        except Exception as e:
            print(f"⚠️ {product_id}: 임베딩 중 오류 발생 ({e})")
            continue
        all_docs.extend(batch)

    if vectorstore:
        try:
            vectorstore.save_local(str(product_dir))
            print(f"✅ {product_id} 인덱스 생성 완료 ({len(all_docs)}개 청크)")
        except Exception as e:
            print(f"❌ {product_id}: 저장 실패 ({e})")
    else:
        print(f"❌ {product_id}: 인덱스 생성 실패 (비어 있음)")


# ------------------------------
# 4) 메인 실행 로직
# ------------------------------
def run_vector_indexing():
    """Backend/data/chunk_store의 모든 제품별 청크 파일을 순회하며 인덱싱"""
    _, paths = get_settings()
    chunk_dir = Path(paths.DATA_DIR) / "chunk_store"
    out_dir = Path(paths.DATA_DIR) / "faiss_index"
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"[INIT] Building FAISS indices per product in {chunk_dir}...\n")

    chunk_files = sorted(chunk_dir.glob("*_chunks.json"))
    if not chunk_files:
        print("❌ 청크 파일이 없습니다. 먼저 document_pr.py를 실행하세요.")
        return

    for file in tqdm(chunk_files, desc="Building Product Indices"):
        product_id = file.stem.replace("_chunks", "")
        docs = load_chunks(file)
        build_faiss_index(product_id, docs, out_dir)

    print("\n🎯 모든 제품별 인덱스 생성 완료!")


# ------------------------------
# 5) CLI 실행
# ------------------------------
if __name__ == "__main__":
    run_vector_indexing()
