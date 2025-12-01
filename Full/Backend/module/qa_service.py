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
from core.prompt import QA_SYSTEM_PROMPT
import logging

logging.basicConfig(
    level=logging.INFO, # INFO 레벨 이상만 출력 (DEBUG는 무시)
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


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

        self.llm = ChatGoogleGenerativeAI(model = "gemini-2.5-flash",temperature=0)

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
        

        qa_prompt = ChatPromptTemplate.from_messages([
            ("system", QA_SYSTEM_PROMPT),
            MessagesPlaceholder(variable_name="chat_history"), ("human", "{input}"),
        ])
        question_answer_chain = create_stuff_documents_chain(self.llm, qa_prompt)
        
        
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
    async def invoke(self, query,session):
        import time 
        start = time.time()
        need_self_query = False
        answer = await self.light_with_history.ainvoke(
            {"input":query},
            config={"configurable": {"session_id": session}}
        )
        end = time.time()
        total_time = end - start
        
        if "찾을 수 없습니다" in answer.get("answer", ""): 
            logger.info("정확한 내용을 찾지 못했습니다. 멀티쿼리를 실행하겠습니다.")
            need_self_query = True

        if need_self_query:
            run_manager = CallbackManagerForRetrieverRun.get_noop_manager()
            sub_queries = self.combined_retriever.generate_queries(query, run_manager=run_manager)
            logger.info(f"{sub_queries}가 생성되었습니다. 해당 쿼리들로 재 검색 하겠습니다.")      
            start = time.time()      
            answer = await self.chain_with_history.ainvoke(
            {"input": query},
            config={"configurable": {"session_id": session}}
            )
            end = time.time()
            total_time = end - start
        logger.info(f"답변생성완료가 {total_time:0.2f}초 걸렸습니다.")
        answer = answer.get("answer","")
        print(f"==================답변=================\n{answer}\n===================================")
        return {"answer": answer}