# 가전제품 설명서 RAG 파이프라인

> **입력:** 가전제품 설명서 PDF(텍스트 + 표 + 이미지)
> **출력:** 터미널에서 동작하는 RAG 기반 QA 챗봇
> → `python -m src.rag_chatbot`

---

## 1. 프로젝트 개요

이 프로젝트는 **가전제품 사용설명서 PDF**를 입력으로 받아:

1. Upstage Document Parse API로 **텍스트·요소·이미지·좌표**를 파싱하고
2. OpenCV로 **캡션이 필요 없는 이미지(QR/배너/아이콘 등)** 를 필터링한 뒤
3. Google **Gemini 2.5 Flash(멀티모달)** 로 이미지 캡션을 생성하고
4. 정리된 텍스트 + 이미지 캡션을 **텍스트 청크 / figure 청크**로 나눈 후
5. **Gemini 임베딩(text-embedding-004) + FAISS** 로 벡터 인덱스를 만들고
6. 최종적으로 **터미널 RAG 챗봇**에서 질의응답을 제공하는 파이프라인입니다.

---

## 2. 디렉터리 구조

루트 경로: `C:\Users\user\Desktop\test3` → 이하 `PROJECT_ROOT` 로 표기

```
PROJECT_ROOT
├─ .env                         # Upstage / Gemini API 키 등 환경 변수
├─ .venv/                       # Python 가상환경
├─ data/
│  ├─ raw/                      # 원본 PDF 업로드 위치
│  ├─ parsed/                   # Upstage 파싱 결과(.md/.json 등)
│  ├─ elements/                 # 요소 + 캡션 통합 JSON (<doc_id>_elements.json)
│  ├─ figures/                  # 추출된 figure PNG + figure 메타 JSON
│  ├─ caption_images/           # "캡션 필요"로 선별된 이미지 PNG
│  ├─ normalized/               # RAG용 정리 텍스트(.md)
│  ├─ chunks/
│  │  ├─ text/                  # 텍스트 청크 JSONL (<doc_id>_text.jsonl)
│  │  └─ figure/                # figure 캡션 청크 JSONL (<doc_id>_figure.jsonl)
│  └─ index/
│     ├─ faiss.index            # FAISS 벡터 인덱스
│     └─ vectors_meta.jsonl     # 각 벡터 메타데이터(청크 정보)
└─ src/
   ├─ upstage_batch_loader.py       # (1) Upstage 문서 파싱
   ├─ image_filter_for_caption.py   # (2) 캡션용 이미지 필터링(OpenCV)
   ├─ image_captioner_gemini.py     # (3) Gemini 멀티모달 캡션 생성
   ├─ text_chunk_preparer.py        # (4) 텍스트 정리/정규화
   ├─ text_chunker.py               # (5) 텍스트 청킹(JSONL)
   ├─ figure_chunker.py             # (6) figure 캡션 청킹(JSONL)
   ├─ rag_embedder_gemini.py        # (7) 임베딩 + FAISS 인덱스 구축
   ├─ rag_search_gemini.py          # (8) 벡터 검색기
   ├─ rag_qa_service.py             # (9) RAG QA 세션 관리
   ├─ rag_chatbot.py                # (10) 터미널 RAG 챗봇 (CLI)
   └─ __pycache__/
```

---

## 3. 환경 설정

### 3.1 가상환경 생성

```bash
cd C:\Users\user\Desktop\test3

# 가상환경 생성
python -m venv .venv

# 활성화 (Windows PowerShell / CMD)
.\.venv\Scripts\activate

# (WSL / Linux)
# source .venv/bin/activate
```

### 3.2 주요 의존성 (예시)

> 실제로는 `requirements.txt` 기준으로 설치하는 것을 권장합니다.

* 공통
  * `python-dotenv`
  * `requests`
  * `tqdm`
  * `rich` (선택: 이쁘게 로그/프로그레스 바 표시)

* Upstage 파싱
  * `langchain-upstage`
  * `PyMuPDF` (`fitz`)

* 이미지 처리
  * `opencv-python`
  * `numpy`

* 벡터 검색 / RAG
  * `faiss-cpu` (또는 GPU 환경이면 `faiss-gpu`)

* Google Gemini (임베딩 + 멀티모달 + QA)
  * `google-genai`
    → `from google import genai` 형태의 신규 공식 라이브러리 사용

### 3.3 `.env` 설정

`PROJECT_ROOT/.env` 예시:

```bash
# Upstage Document Parse API
UPSTAGE_API_KEY=up_xxxxxxxxxxxxxxxxxxxxxxxxx

# Google Gemini API
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXX
# 또는
# GOOGLE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXX

# 선택 옵션 (필요할 때만)
# UPSTAGE_TIMEOUT=60
# GEMINI_REGION=asia-northeast3
```

---

## 4. 전체 파이프라인 한눈에 보기 (1–10단계)

### 요약 플로우

1. **PDF 일괄 파싱** – `upstage_batch_loader.py`
2. **이미지 필터링** – `image_filter_for_caption.py`
3. **이미지 캡션 생성(멀티모달)** – `image_captioner_gemini.py`
4. **텍스트 정리/클린업** – `text_chunk_preparer.py`
5. **텍스트 청킹** – `text_chunker.py`
6. **figure 캡션 청크 생성** – `figure_chunker.py`
7. **텍스트+figure 임베딩 & FAISS 인덱스 구축** – `rag_embedder_gemini.py`
8. **벡터 검색기** – `rag_search_gemini.py`
9. **RAG QA 세션 관리 + 답변 생성** – `rag_qa_service.py`
10. **터미널 RAG 챗봇 인터페이스** – `rag_chatbot.py`

---

## 5. 단계별 상세 설명

### 1️⃣ PDF 일괄 파싱 – `src/upstage_batch_loader.py`

**역할**
* Upstage Document Parse API를 호출해서 PDF를 **페이지/요소/figure 단위**로 파싱
* 본문 텍스트, 레이아웃, figure 좌표/메타 정보를 추출
* 이후 모든 단계의 "원천 데이터" 역할

**사용 기술**
* `langchain_upstage.UpstageDocumentParseLoader`
* Upstage Document Parse API
* (필요 시) PyMuPDF 등으로 figure 영역 크롭

**입출력**
* **입력**
  * `data/raw/*.pdf`
    (파일명에서 확장자를 뺀 값이 `doc_id` 로 사용됨. 예: `SAH001.pdf` → `doc_id=SAH001`)
* **출력**
  * `data/parsed/<doc_id>.md`
    → Upstage가 생성한 페이지/요소 기반 마크다운(본문 텍스트 위주)
  * `data/elements/<doc_id>_elements.json`
    → elements[] + 좌표/타입 정보 (나중에 캡션/figure와 결합)
  * `data/figures/<doc_id>/...`
    * `page_XXX_figure_YYY.png` : 페이지별 figure 크롭 이미지
    * `<doc_id>_figures*.json` : figure 좌표/페이지/메타 정보

**실행 예시**
```bash
.\.venv\Scripts\activate
python -m src.upstage_batch_loader
# 기본: data/raw 전체 PDF를 순회하며 parsed/elements/figures 생성
```

---

### 2️⃣ 이미지 필터링 – `src/image_filter_for_caption.py`

**역할**
* 파싱된 figure 이미지 중 **"캡션을 달 가치가 있는 것만"** 선별
* QR 코드, 단순 배너, 작은 아이콘/로고 등은 제거하여
  Gemini 캡션 호출 비용을 줄이고 노이즈를 감소

**사용 기술**
* OpenCV (`cv2`)
* 간단한 컴퓨터 비전 휴리스틱
  * QR / 바코드 비율
  * 너무 작은 아이콘/로고
  * 페이지 상·하단 배너 패턴 등

**입출력**
* **입력**
  * `data/figures/<doc_id>/page_XXX_figure_YYY.png`
  * `data/figures/<doc_id>/<doc_id>_figures*.json`
* **출력**
  * `data/figures/<doc_id>/<doc_id>_figures_filtered.json`
    → 각 figure에 `keep_for_caption: true/false` 플래그
  * `data/caption_images/<doc_id>/page_XXX_figure_YYY.png`
    → `keep_for_caption=True` 만 복사

**실행 예시**
```bash
python -m src.image_filter_for_caption
# 예) 특정 문서만 처리하고 싶으면
# python -m src.image_filter_for_caption --doc-id SAH001
```

---

### 3️⃣ 이미지 캡션 생성(멀티모달) – `src/image_captioner_gemini.py`

**역할**
* Google **Gemini 2.5 Flash(멀티모달)**을 사용하여
  선별된 이미지에 대해 **한국어 캡션** 생성:
  * 제품의 생김새/구성 요소
  * 설치·조립·사용 방법
  * 시각장애인·노인·유아도 이해할 수 있을 정도의 쉬운 설명
* Upstage elements에서 figure 주변 텍스트를 발췌(`manual_excerpt`)로 함께 전달해서
  **설명서에 없는 내용을 지어내지 않도록** 할루시네이션을 억제

**사용 기술**
* `google.genai` – `gemini-2.5-flash`
* 멀티모달 입력 (이미지 + 텍스트)
* 안전 프롬프트 + 위험 키워드 필터링
* 재시도 / 백오프 로직

**입출력**
* **입력**
  * `data/figures/<doc_id>/<doc_id>_figures_filtered.json`
  * `data/caption_images/<doc_id>/page_XXX_figure_YYY.png`
  * `data/elements/<doc_id>_elements.json` (figure 근처 텍스트 요소)
* **출력**
  * `data/elements/<doc_id>_elements.json` 업데이트
    → 각 figure/element에 `caption_generated` 등 필드로 최종 캡션 병합
    (이후 `figure_chunker`, `text_chunk_preparer`에서 사용)

**실행 예시**
```bash
python -m src.image_captioner_gemini
# 기본: 모든 doc_id에 대해 keep_for_caption=True인 이미지만 캡션 생성
```

---

### 4️⃣ 텍스트 정리/클린업 – `src/text_chunk_preparer.py`

**역할**
* Upstage 파싱 결과(마크다운 + elements)를 **RAG 친화적인 마크다운**으로 정리:
  * 헤더/섹션 구조 유지
  * 페이지 구분/메타 주석 추가 가능
  * figure 위치에 캡션 텍스트 삽입 (alt 텍스트 역할)
  * 중복/잡음(페이지 번호/푸터/조각 텍스트 등) 제거

**사용 기술**
* 마크다운 텍스트 처리
* elements JSON과의 매핑으로 figure 자리에 캡션 삽입

**입출력**
* **입력**
  * `data/parsed/<doc_id>.md`
  * `data/elements/<doc_id>_elements.json`
* **출력**
  * `data/normalized/<doc_id>.md`
    → "사람이 읽기에도 괜찮은 설명서 전체 마크다운"

**실행 예시**
```bash
python -m src.text_chunk_preparer
# 또는
python -m src.text_chunk_preparer --doc-id SAH001
```

---

### 5️⃣ 텍스트 청킹 – `src/text_chunker.py`

**역할**
* `normalized/*.md`를 읽어 **텍스트 청크 JSONL** 생성
* RAG에 적합한 크기로 나누되:
  * 우선 페이지/섹션/헤더 기준으로 분할
  * 그 안에서 단락/문장 기준으로 재분할
  * 너무 긴 블록은 글자 수 기준으로 반복 분할
  * 필요 시 overlap(중첩) 허용

**입출력**
* **입력**
  * `data/normalized/<doc_id>.md`
* **출력**
  * `data/chunks/text/<doc_id>_text.jsonl`
    → 한 줄 = 하나의 청크(dict)
    예시 필드:
    * `doc_id`
    * `chunk_type = "text"`
    * `page_start`, `page_end`
    * `section_title`
    * `text`
    * `uid` / `chunk_id`

**실행 예시**
```bash
python -m src.text_chunker
# normalized/*.md 전체에 대해 text 청크 생성
```

---

### 6️⃣ figure 캡션 청크 생성 – `src/figure_chunker.py`

**역할**
* 캡션이 붙은 figure들을 **RAG용 "figure 청크"**로 변환
* 텍스트 청크와 동일한 메타 구조를 최대한 맞추고
* `chunk_type="figure"` 로 표시하여 검색·재랭킹에서 별도 가중치 적용 가능하게 함

**입출력**
* **입력**
  * `data/elements/<doc_id>_elements.json`
  * `data/figures/<doc_id>/<doc_id>_figures_filtered.json`
* **출력**
  * `data/chunks/figure/<doc_id>_figure.jsonl`
    예시 필드:
    * `doc_id`
    * `chunk_type = "figure"`
    * `page`
    * `section_title`
    * `text` (Gemini 캡션 + 필요시 주변 텍스트 요약)
    * `image_path`
    * `uid`

**실행 예시**
```bash
python -m src.figure_chunker
# 전체 문서의 figure 캡션을 figure 청크 JSONL로 변환
```

---

### 7️⃣ 텍스트+figure 임베딩 & FAISS 인덱스 – `src/rag_embedder_gemini.py`

**역할**
* 텍스트 청크 + figure 청크를 모두 읽어
  * Google Gemini **text-embedding-004**로 임베딩
  * FAISS IndexFlatIP + L2 정규화로 코사인 유사도 인덱스 구성

**사용 기술**
* `google.genai` – `text-embedding-004`
  * `output_dimensionality = 768` (기본)
* FAISS
  * L2 정규화된 벡터 + `IndexFlatIP` → 코사인 유사도와 동등
* 배치 임베딩, 재시도(지수 백오프), 진행 로그

**입출력**
* **입력**
  * `data/chunks/text/*.jsonl`
  * `data/chunks/figure/*.jsonl`
* **출력**
  * `data/index/faiss.index`
    → 모든 청크(텍스트+figure)의 벡터 인덱스
  * `data/index/vectors_meta.jsonl`
    → 각 벡터에 대응하는 메타 정보 (청크 메타 1:1)

**실행 예시**
```bash
python -m src.rag_embedder_gemini
# 옵션(예): --text-only, --model text-embedding-004, --dim 768 ...
```

---

### 8️⃣ 벡터 검색기 – `src/rag_search_gemini.py`

**역할**
* 사용자의 자연어 질의를 받아:
  1. 질의 임베딩 (`text-embedding-004`)
  2. FAISS 검색 (코사인 유사도)
  3. **재랭킹**:
     * 텍스트 청크 우선 (예: `TEXT_TYPE_BOOST=1.2`)
     * 키워드 매칭 횟수별 가중치 (`KEYWORD_BOOST_PER_HIT`)
     * "크기/사이즈/사양/제원/구성품/외형" 관련 질의 시:
       * 사양/제원/규격 섹션 추가 부스팅
       * 구성품/각부 명칭/외형 섹션 + figure 청크 부스팅
       * 소비자 피해보상/보증서/AS 안내 등은 소폭 감점
  4. **제품/모델 코드 인식 + doc_id 자동 필터링**
     * `SBDH-T1000`, `SAH001`, `SVC-WN2200MR` 등 패턴 인식
     * `vectors_meta.jsonl` 전체를 스캔해 코드 → doc_id 매핑
     * 질의에 코드가 있으면, `doc_id_filter` 자동 설정
     * `SVC-WN2200MR`, `SVC`, `WN2200MR` 같이 섞여 있으면
       → 숫자가 포함되고 더 긴 코드를 우선 사용해 가장 구체적인 문서로 좁힘

**입출력**
* **입력**
  * `data/index/faiss.index`
  * `data/index/vectors_meta.jsonl`
  * 질의 문자열 `query`
* **출력 (내부 객체)**
  * `SearchResult`
    * `query`, `top_k`, `total_candidates`
    * `chunks: List[RetrievedChunk]`
      * `uid`, `doc_id`, `chunk_type`, `text`, `score`, `raw_score`, `meta`
> 이 모듈은 "검색 전용"이며, 실제 답변 생성은 `rag_qa_service.py` 에서 수행합니다.

**테스트 실행 예시**
```bash
python -m src.rag_search_gemini
# 인터랙티브 CLI:
#  - 질의 입력 → 상위 검색 결과의 doc_id / page / score 등을 확인
```

---

### 9️⃣ RAG QA 세션 관리 + 답변 생성 – `src/rag_qa_service.py`

**역할**
* `RagSearcher` + Gemini 2.5 Flash를 묶어
  **한 유저의 대화 세션 단위로 QA 관리**

**핵심 기능**
1. **doc_id_filter 결정 로직**
   * `answer()` 호출 시:
     1. 인자로 명시된 `doc_id_filter`가 있으면 최우선 사용
     2. 질의에서 제품/모델 코드 추출 → 코드 인식으로 doc_id 매핑
     3. 둘 다 없고 세션에 `current_doc_ids`가 있으면 재사용
     4. 모두 없으면 전체 문서 대상 검색

2. **RAG 컨텍스트 구성**
   * `SearchResult.chunks`를
     * `[doc_id p.X TYPE] (섹션: ...)` 형태의 블록으로 포맷
     * 너무 긴 청크는 `MAX_CONTEXT_CHARS_PER_CHUNK` 기준으로 잘라 `(중략)...` 표시

3. **Gemini 2.5 Flash 호출**
   * 시스템 프롬프트:
     * "가전제품 사용설명서 전용 한국어 Q&A 어시스턴트"
     * **설명서 발췌문 안에서만 근거 사용**, 지어내지 않기
     * 크기/사양은 숫자+단위를 정확히 유지
     * 출처는 `[doc_id p.X]` 형식으로 문장 끝에 표기

4. **세션 상태 관리**
   * `history` (user/assistant 대화 이력)
   * `current_doc_ids` (현재 세션에서 집중하고 있는 설명서)
   * 한 번 `SAH001`을 언급하면, 이후에
     * "이 제품 크기가 얼마야?" 같은 질의도 같은 문서 기준으로 이어서 답변

**주요 API**
* `RAGQASession.answer(...) -> QAResult`
  * `question`, `answer`
  * `search_result`
  * `used_doc_id_filter`
  * `doc_ids_from_codes`
  * `used_session_doc_filter`

---

### 🔟 터미널 RAG 챗봇 인터페이스 – `src/rag_chatbot.py`

**역할**
* `RAGQASession`을 실제 터미널에서 쉽게 사용할 수 있도록 감싼 **엔트리 포인트 스크립트**
* 기능:
  * 자연어 질문 입력 → `session.answer()` 호출 → 모델 답변 출력
  * `summarize_sources()`로 **간추린 출처 정보** 출력
    * 예) `출처: [SAH001 p.2, p.3] [SVC-WN2200MR p.1, p.5]`
  * 세션 상태 유지 + 간단한 CLI 명령어 지원
  * (구현된 버전 기준) 답변 생성 시간을 측정하고,
    필요한 경우 **스트리밍처럼 줄 단위로 출력**하는 UX 지원

**지원 명령어**
* 일반 질문 → 그냥 문장 입력
* `/quit`, `/exit` : 종료
* `/reset` : 세션 초기화 (대화 이력 + 현재 문서 컨텍스트)
* `/history` : 지금까지 Q/A 간단 요약
* `/top N` : 검색에 사용할 `top_k` 변경 (예: `/top 5`)
* `/filter text|figure|all`
  * `text` → 텍스트 청크만
  * `figure` → figure 청크만
  * `all` 또는 생략 → 둘 다
* `/doc SAH001 [DOC_ID2 ...]`
  * 특정 설명서만 대상으로 검색
* `/clear_doc`
  * `doc_id` 제한 해제 (전체 설명서 대상으로 복귀)

**실행 예시**
```bash
.\.venv\Scripts\activate
python -m src.rag_chatbot
```

---

## 6. "처음부터 끝까지" 실행 순서 정리

팀원이 처음 세팅할 때 따라가기 쉽게, **명령만 모아놓은 버전**입니다.

```bash
# 0) 가상환경 활성화
cd C:\Users\user\Desktop\test3
.\.venv\Scripts\activate

# 1) Upstage 파싱 (텍스트/요소/figure 추출)
python -m src.upstage_batch_loader

# 2) 캡션용 이미지 필터링 (QR/배너/로고 제거)
python -m src.image_filter_for_caption

# 3) Gemini 멀티모달 캡션 생성
python -m src.image_captioner_gemini

# 4) 텍스트 정리/정규화 (.md)
python -m src.text_chunk_preparer

# 5) 텍스트 청킹(JSONL)
python -m src.text_chunker

# 6) figure 캡션 청킹(JSONL)
python -m src.figure_chunker

# 7) 임베딩 + FAISS 인덱스 생성
python -m src.rag_embedder_gemini

# 8~10) 터미널 RAG 챗봇 실행 (검색 + QA)
python -m src.rag_chatbot
```

---

## 7. 프로젝트 한 줄 요약

1. **입력**: 가전제품 설명서 PDF
2. **전처리**: Upstage 파싱 → 이미지 필터링 → 멀티모달 캡션 → 텍스트/figure 청킹
3. **인덱싱**: Gemini 임베딩 + FAISS
4. **검색·답변**: 제품/모델 코드 인식 + RAG 기반 QA
5. **사용**: `python -m src.rag_chatbot` 으로 터미널 RAG 챗봇 실행
