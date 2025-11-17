# 📝 PandDF_SeShat: 문서 기반 RAG Q&A 챗봇 프로젝트

이 프로젝트는 FastAPI를 기반으로 구축된 문서 기반 Q&A 챗봇 백엔드입니다. LangGraph를 활용한 에이전트 아키텍처를 통해 사용자의 질문에 대해 RAG(Retrieval-Augmented Generation) 기술로 답변합니다. 텍스트뿐만 아니라 향후 이미지 기반 질의응답까지 확장 가능하도록 설계되었습니다.

---

## ✨ MVP 개발 현황 (Minimum Viable Product)

### ✅ 완료된 기능
1.  **기본 RAG 챗봇**: LangGraph 에이전트 기반의 대화형 Q&A 기능.
2.  **실시간 소통**: WebSocket을 통한 실시간 양방향 통신 구현.
3.  **고급 검색 기법 적용**:
    -   **멀티벡터 검색**: 원본 문서의 작은 조각(Chunk)과 전체 문서를 함께 검색하여 정확도 향상.
    -   **멀티쿼리 생성**: 사용자 질문을 여러 관점의 질문으로 확장하여 검색 누락 방지.
4. **스트리밍** : 일반 출력과 스트리밍을 구분해서 구현해놨습니다. 일반출력은 ChatBotAgent.chat() , 스트리밍은 ChatBotAgent.stream_chat()

### 🚧 미완료 및 개선 사항
1.  **이미지 데이터 처리**: 문서 내 이미지에 대한 질의응답 기능 개발.
2.  **데이터베이스 연동**: `Product_id`를 기반으로 DB에서 PDF 경로 및 Faiss 인덱스 위치를 조회하는 기능.
3.  **성능 최적화**: 대규모 서비스를 위한 응답 캐싱(Caching) 전략 구현.
4.  **보안 강화**: 프롬프트 인젝션 등 LLM 관련 보안 취약점 대응 방안 마련.

### 기능 추가 예정
-   **에이전트 Tools 확장**:
    -   `FAQ Tool`: 자주 묻는 질문`에 대한 빠른 답변 기능.
    -   `추천 Tool`: 사용자 질문 기반의 관련 제품 추천 기능.
    -   `스펙정보 Tool`: 정형화된 제품 스펙 정보 제공 기능.

---

## ✨Admin,SuperAdmin,Login 개발현황

### ✅ Login 개발 현황 (진행율 90%) 
1. **JWT 기반 로그인** : 로직 구현 완료 / 데이터베이스 물리 설계 후 수정
2. **패스워드 보안** : Hash 방식을 통해 패스워드 보안 구현
    - bcrypt 충돌 에러로 bcrypt는 4.X 버전 사용 필수
3. **회원가입** : Front form 형태를 가져와서 코드입력-> 정보입력순으로 구현 / 데이터베이스 물리 설계 후 수정
4. **유저로그인** : Front(Oauth로그인)-> Back(code 검증 및 JWT 디코드 이후 role과 이름 부여) -> Front 전송
5. **API** : 
    - **로그인**: 
        - Method: post
        - URL : /api/login
        - Request : user_id , pw
        - Response : 200 - 로그인 성공  / 401 - 패스워드가 틀렸거나 ID가 존재하지 않음.
    - **로그아웃(미구현)**: 
        - JWT 방식이기에 프론트에서 관리 
    - **회원가입/코드**: 
        - Method: Post
        - URL : /api/register/code
        - Request : company_code
        - Response : 200 - 로그인 성공  / 401 - 등록된 코드가 존재하지않음.
    - **회원가입/정보**: 
        - Method: Post
        - URL : /api/register/info
        - Request : company_name,name,user_id,department,preferred_language,pw
        - Response : 200 - 로그인 성공  / 400 - 요청실패 
    - **검증(Only User)**:
        - Method: Post
        - URL : /api/auth/valid
        - Request : code
        - Response : 200 - 검증 이상 무 / 401 - 검증 오류 

### 🚧Admin 개발현황 (진행율:10%)
1. **데이터 불러오기** : JWT 내 payload를 params를 이용하여 다중 조인을 통해 데이터 불러오기 (JWT를 통해 payload를 찾는 로직 구현/쿼리 미작성)
2. **DashBoard** :  
    -  **데이터**:
        - totalDocument,totalQueries,totalFAQs: JWT 내 company_name를 통해 GroupBy 진행예정 
        - avgResponseTime : 응답 로직에 응답시간 추가 예정 
        - *Change : 지금과 특정시간대 기준으로 분리해서 계산 예정
        - analytics : 또한 시간대 별로 GrouBy 진행-> sort->limit 
        - topQuestions: FAQ로직 이후 고민
        - recentActivity: log로직 구현 후 구현 예정
3. **문서관리** : PDF를 업로드시, PDF 문서 파싱, 텍스트/이미지 추출 ,벡터DB추가 파이프라인 순으로 진행 예정
4. **FAQ관리** : 자동생성 버튼 클릭 후 데이터베이스에서 질문을 가져와서 클러스터를 진행하여 분류하고, Top 5개 Case를 질문으로 생성 예정.
5. **로그분석** : DashBoard와 유사하게 데이터를 가져와서  다듬을 예정
6. **제품관리** : QR생성 API를 통해서 제품의 문의 챗봇으로 바로가는 QR코드 생성 및 제품 정보수정

### 🚧SuperAdmin 개발현황 (진행율:0%)
1. **데이터 불러오기** : JWT 내 payload를 params를 이용하여 다중 조인을 통해 데이터 불러오기 (JWT를 통해 payload를 찾는 로직 구현/쿼리 미작성)
2. **DashBoard** :  
    -  **데이터**: 기업등록수 ,전체 기업 사용자,전체 문서,전체 질문 및 최근활동 검색
3. **기업관리** : 각 기업 별 등록된 문서,질문,관리자수 조회 및 새 기업 등록을 통한  기업 코드 생성
4. **사용자 관리** : 전체 사용자 관리 및 사용자 추가
5. **시스템설정** : 설정관리 로직

---

## 📂 프로젝트 구조
```
BackEnd/
│
├─── main.py           # FastAPI 애플리케이션의 메인 실행 파일
├─── requirements.txt    # 프로젝트에 필요한 Python 라이브러리 목록
├─── .env                # API 키 등 민감한 환경 변수 설정 파일
├─── .gitignore          # Git 버전 관리에서 제외할 파일 및 폴더 목록
├─── README.md           # 프로젝트 설명 문서
│
├─── api/                # API 엔드포인트(URL 경로) 정의
│    ├── admin.py         # AdminPage 관련 라우터
│    ├── chat.py          # 채팅 관련 API (WebSocket 연결 등) 라우터
│    ├── faq.py           # FAQ 관련 라우터
│    ├── login.py         # 로그인/회원가입 라우터
│    └── superadmin.py    # SuperAdminPage 관련 라우터
│
├─── core/               # 프로젝트의 핵심 설정 관리
│    ├── auth.py          # JWT, HashPW 생성 등 보안 관련 로직
│    ├── config.py        # .env 파일 로드 등 환경 설정 관련 로직
│    ├── db_config.py     # DB 연결 및 종료 관리 로직
│    └── query.py         # Raw SQL 쿼리 관리
│
├─── data/               # 데이터 저장 폴더 (임시)
│    ├── docstore.pkl     # 원본 문서 조각(chunk) 저장소
│    ├── image_store.pkl  # 문서에서 추출한 이미지 데이터 저장소
│    └── faiss_index/     # 벡터 검색을 위한 FAISS 인덱스
│         ├── index.faiss
│         └── index.pkl
│
├─── module/             # 애플리케이션의 핵심 비즈니스 로직
│    ├── chat_agent.py    # LangGraph 기반의 대화형 에이전트 로직
│    ├── document_pr.py   # PDF 문서 파싱, 텍스트/이미지 추출 파이프라인
│    ├── faq.py           # FAQ 관련 비즈니스 로직
│    ├── qa_service.py    # 텍스트 기반 RAG Q&A 체인 및 서비스 로직
│    └── qa_service_img.py# 이미지 기반 RAG Q&A 체인 및 서비스 로직
│
├─── schemas/            # API 요청/응답 데이터 모델 정의 (Pydantic)
│    ├── chat.py          # 채팅 관련 스키마
│    ├── document.py      # 문서 관련 스키마
│    ├── faq.py           # FAQ 관련 스키마
│    ├── login.py         # 로그인/회원가입 스키마
│    └── qa.py            # Q&A 관련 스키마
│
└─── templates/          # 프론트엔드 HTML 템플릿 (임시)
     ├── chat.html
     ├── login.html
     ├── main.html
     └── register.html
```
---

## 📜 개발 규칙 (Convention)

### 1. 기본 원칙
-   **스타일**: 모든 Python 코드는 **PEP 8** 스타일 가이드를 준수합니다.
-   **네이밍**: 파일 및 폴더는 `snake_case`, 클래스는 `PascalCase`, 함수/변수는 `snake_case`를 사용합니다.
-   **의존성**: 모든 라이브러리는 `requirements.txt`에 명시합니다.

### 2. 디렉토리별 역할 (책임 분리 원칙)
-   **`main.py`**: FastAPI 앱 생성, 미들웨어 추가, 라우터 포함 등 **초기 설정만 담당**합니다. 비즈니스 로직을 포함하지 않습니다.
-   **`api/`**: API 경로를 정의하고 요청/응답을 처리합니다. **요청 유효성 검사 후 `module/`의 서비스 함수를 호출**하는 역할만 수행합니다.
-   **`module/`**: **모든 핵심 비즈니스 로직**이 위치합니다. 데이터베이스 처리, RAG 체인 실행 등 실질적인 작업을 수행합니다.
-   **`schemas/`**: API의 입출력 데이터 모델(Pydantic)만 정의합니다.
-   **`core/`**: `.env` 로드, db연결,보안관리 등 프로젝트 전반의 설정을 담당합니다.