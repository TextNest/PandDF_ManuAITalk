import pickle
from langchain_classic.chains.retrieval import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder, PromptTemplate
from langchain_classic.retrievers import ContextualCompressionRetriever
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.vectorstores import FAISS
from core.config import path,load
import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_classic.retrievers.multi_query import MultiQueryRetriever
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_core.callbacks.manager import CallbackManagerForRetrieverRun
from langchain_core.runnables import RunnableLambda
from langchain_cohere import CohereRerank

QA_SYSTEM_PROMPT =  """당신은 제품 매뉴얼 전문가입니다.
검색된 내용과 대화 기록을 종합하여 사용자의 질문에 답변하세요.
단순히 페이지만 언급하지 말고, 내용을 상세하게 설명해야 합니다.
만약 검색된 내용에서 관련 정보를 찾을 수 없다면, "관련 정보를 찾을 수 없습니다."라고 답변하세요.
**절대로 (관련 이미지: 경로) 작성하지마세요**. 무조건 이미지경로눈 아래 규칙을 따르세요.
경로에 images경로가 들어가면 아래 이미지 삽입 절대 규칙을 따르세요. 만약 설명이 없으면 설명없음으로 하고 아래 규칙을 따르세요

**[이미지 삽입 절대 규칙]**
1. 검색된 내용에 '(관련 이미지: 경로)' 형식의 정보가 있다면, 답변의 적절한 위치에 이미지를 반드시 삽입하세요.
2. **절대 '바로가기 링크' 형식(`[설명](경로)`)으로 작성하지 마세요.** 반드시 이미지가 화면에 보이도록 **`!`(느낌표)**를 붙여야 합니다.
3. 이미지 태그의 앞과 뒤에는 반드시 **빈 줄을 두 번 추가하여(Enter 두 번)** 본문과 명확히 분리하세요.
4. **절대로 (관련 이미지: 경로) 작성하지마세요**.
 

**[이미지 작성 예시]**
- (X) 잘못된 형식: [이미지 설명](경로)  <- 이렇게 하지 마세요.
- (X) 잘못된 형식: (관련 이미지: 경로) <- 이렇게 하지 마세요.
- (O) 올바른 형식: ![이미지 설명](경로)  <- 반드시 이렇게 하세요.

검색된 내용:
{context}
"""
load.envs()
api_key = os.getenv("GEMINI_API_KEY")
embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004",api_key = api_key)
# 세션 히스토리를 위한 인메모리 저장소
store = {}
def get_session_history(session_id: str):
    if session_id not in store:
        store[session_id] = InMemoryChatMessageHistory()
    return store[session_id]
class HybridRAGChain:
    def __init__(self,pid,local_path="http://localhost:8000"):
        self.base_url = local_path
        self.embeddings = embeddings
        self.vectorstore = FAISS.load_local(
            path.FAISS_INDEX_PATH,
            self.embeddings,
            allow_dangerous_deserialization=True
        )
        self.pid = pid

        self.llm = ChatGoogleGenerativeAI(model = "gemini-2.5-flash",temperature=0,max_output_tokens=1024)

        retriever = self.vectorstore.as_retriever(
                search_type="mmr",
                search_kwargs={
                    'k': 20, 
                    'fetch_k': 1000, 
                    'lambda_mult': 0.5,
                    'filter': {"doc_id": self.pid}
                }
            )
        compressor = CohereRerank(
            cohere_api_key=os.getenv("COHERE_API_KEY"),
            model="rerank-multilingual-v3.0", 
            top_n=5
            )
        
        self.base_retriever = ContextualCompressionRetriever(
            base_compressor=compressor,
            base_retriever=retriever
        )
        

        self.combined_retriever = MultiQueryRetriever.from_llm(
                retriever= self.base_retriever, llm=self.llm
            )


        def inject_image_paths(docs):
            for doc in docs:
                if "image_file" in doc.metadata and doc.metadata["image_file"]:
                   
                    img_path = doc.metadata["image_file"].replace("\\", "/")
                    server_path = img_path .replace(
                        "data/caption_images/", 
                        f"{self.base_url}/images/"
                    )
                    doc.page_content += f"\n\n(관련 이미지: {server_path})"
            return docs
            
        
        def extract_query(x):
            if isinstance(x, dict):
                return x.get("input", "")
            return x

      
        self.enhanced_base_retriever =RunnableLambda(extract_query)| self.base_retriever | RunnableLambda(inject_image_paths)
        self.enhanced_combined_retriever = RunnableLambda(extract_query)|self.combined_retriever | RunnableLambda(inject_image_paths)
        # -----------------------------

        qa_prompt = ChatPromptTemplate.from_messages([
            ("system", QA_SYSTEM_PROMPT),
            MessagesPlaceholder(variable_name="chat_history"), ("human", "{input}"),
        ])
        question_answer_chain = create_stuff_documents_chain(self.llm, qa_prompt)
        
        # Use ENHANCED retrievers here
        light_chain = create_retrieval_chain(self.enhanced_base_retriever, question_answer_chain)
        rag_chain = create_retrieval_chain(self.enhanced_combined_retriever, question_answer_chain)
        
        self.chain_with_history = RunnableWithMessageHistory(
            runnable=rag_chain, 
            get_session_history=get_session_history,
            input_messages_key="input", 
            history_messages_key="chat_history", 
            output_messages_key="answer",
        )
        self.light_with_history = RunnableWithMessageHistory(
            runnable=light_chain, 
            get_session_history=get_session_history,
            input_messages_key="input", 
            history_messages_key="chat_history", 
            output_messages_key="answer",
        )
    def check(self,query):
        check_context = self.base_retriever.invoke(query)
        return check_context
    async def invoke(self, query,session):
        initial_context = self.check(query)
        need_self_query = False
        if initial_context:
            print("검색 결과가 존재합니다. 결과를 출력 해드리겠습니다.")
            answer = await self.light_with_history.ainvoke(
                {"input":query,"context":initial_context},
                config={"configurable": {"session_id": session}}
            )
            if "찾을 수 없습니다" in answer.get("answer", ""): 
                need_self_query = True
        else:
            need_self_query = True

        if need_self_query:
            print("검색결과가 없습니다. 쿼리를 재 작성하겠습니다.")
            run_manager = CallbackManagerForRetrieverRun.get_noop_manager()
            sub_queries = self.combined_retriever.generate_queries(query, run_manager=run_manager)

            print(f"{sub_queries}가 생성되었습니다. 해당 쿼리들로 재 검색 하겠습니다.")
            
            
            answer = await self.chain_with_history.ainvoke(
            {"input": query},
            config={"configurable": {"session_id": session}}
            )
        answer = answer.get("answer","")
        return {"answer": answer}