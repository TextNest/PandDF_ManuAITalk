import json
import logging
import os
import asyncio
import aiofiles  # 비동기 파일 처리를 위해 필요
from pathlib import Path
from typing import List, Set

# 랭체인
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 1. 경로 설정
PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv()

RAW_META_PATH = PROJECT_ROOT / "data/index/vectors_meta.jsonl"
MY_LANGCHAIN_DIR = PROJECT_ROOT / "data/langchain_db" 
CHECK_PATH = PROJECT_ROOT / "data/check.txt"

async def re_embed_with_langchain():
    # 1. API 키 확인
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.error("❌ API 키가 없습니다.")
        return

    if not RAW_META_PATH.exists():
        logger.error(f"메타 파일 없음: {RAW_META_PATH}")
        return

    processed_uuids: Set[str] = set()

    # DB 폴더가 없으면 기록 초기화, 있으면 기존 기록 로드
    if not MY_LANGCHAIN_DIR.exists():
        logger.info("✨ 기존 벡터 DB가 없어 새로 생성합니다. 기록도 초기화합니다.")
    elif CHECK_PATH.exists():
        async with aiofiles.open(CHECK_PATH, "r", encoding="utf-8") as f:
            content = await f.read()
            processed_uuids = set(line.strip() for line in content.splitlines() if line.strip())
            logger.info(f"📂 이미 처리된 문서 ID: {len(processed_uuids)}개 로드됨")

    documents = []
    ids = []
    new_processed_uuids = [] 

    logger.info("♻️ 데이터 로드 및 구조화 중...")

    # 메타 데이터 읽기 (비동기)
    async with aiofiles.open(RAW_META_PATH, "r", encoding="utf-8") as f:
        async for line in f: 
            if not line.strip(): continue
            
            try:
                data = json.loads(line)
            except json.JSONDecodeError:
                continue


            doc_uuid = data.get("uid")
            if not doc_uuid:
                continue 

            if doc_uuid in processed_uuids:
                continue
            
            raw_text = str(data.get("text", "")).strip()
            metadata = {k: v for k, v in data.items() if k not in ["text", "section_title"]}
            metadata["doc_uuid"] = doc_uuid

            doc = Document(page_content=raw_text, metadata=metadata)
            
            documents.append(doc)
            ids.append(doc_uuid)
            new_processed_uuids.append(doc_uuid)

    if not documents:
        logger.info("🚫 새로 추가할 문서가 없습니다.")
        return

    logger.info(f"📊 총 {len(documents)}개의 신규 문서 처리 준비 완료.")

    
    embeddings = GoogleGenerativeAIEmbeddings(model="text-embedding-004", google_api_key=api_key)

    
    logger.info("⏳ FAISS 벡터 생성/업데이트 중 (Google API 호출)...")

    try:
        if (MY_LANGCHAIN_DIR / "index.faiss").exists():
            logger.info(f"🔄 기존 벡터 DB를 불러와서 문서를 추가합니다: {MY_LANGCHAIN_DIR}")
            
            vectorstore = FAISS.load_local(
                folder_path=str(MY_LANGCHAIN_DIR), 
                embeddings=embeddings,
                allow_dangerous_deserialization=True
            )
            
            
            await vectorstore.aadd_documents(documents=documents, ids=ids)
        else:
            logger.info(f"🆕 새로운 벡터 DB를 생성합니다: {MY_LANGCHAIN_DIR}")
            vectorstore = await FAISS.afrom_documents(
                documents=documents, 
                embedding=embeddings,
                ids=ids
            )
        
        # 4. 로컬 저장 (save_local은 동기 함수임)
        MY_LANGCHAIN_DIR.mkdir(parents=True, exist_ok=True)
        vectorstore.save_local(str(MY_LANGCHAIN_DIR))
        logger.info(f"✅ FAISS 저장 완료: {MY_LANGCHAIN_DIR}")

        if new_processed_uuids:
            async with aiofiles.open(CHECK_PATH, "a", encoding="utf-8") as f:
                await f.write("\n".join(new_processed_uuids) + "\n")
            logger.info(f"📝 처리된 UUID {len(new_processed_uuids)}개 기록 완료.")

    except Exception as e:
        logger.error(f"❌ 벡터 저장 중 오류 발생: {e}")
        #