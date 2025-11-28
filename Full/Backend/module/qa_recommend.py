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
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_core.runnables import RunnableLambda
from langchain_cohere import CohereRerank
from langchain_core.output_parsers import StrOutputParser
import logging
from core.prompt import QA_REC_PROMPT

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
def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)
def get_session_history(session_id: str):
    if session_id not in store:
        store[session_id] = InMemoryChatMessageHistory()
    return store[session_id]
class RecommendRAGChain:
    def __init__(self,pid):
        self.embeddings = embeddings
        self.vectorstore = FAISS.load_local(
            path.FAISS_INDEX_PATH,
            self.embeddings,
            allow_dangerous_deserialization=True
        )
        self.origin_pid = pid

        self.llm = ChatGoogleGenerativeAI(model = "gemini-2.5-flash",temperature=0)

        self.qa_prompt = ChatPromptTemplate.from_messages([
            ("system", QA_REC_PROMPT),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
        ])

    def get_retriever(self, target_pid):

        base_retriever = self.vectorstore.as_retriever(
            search_type="mmr",
            search_kwargs={
                'k': 20,
                'fetch_k': 1000,
                'lambda_mult': 0.5,
                'filter': {"doc_id": target_pid} 
            }
        )
        
        # 2. Reranker 설정
        compressor = CohereRerank(
            cohere_api_key=os.getenv("COHERE_API_KEY"),
            model="rerank-multilingual-v3.0",
            top_n=3 #많으면 정보의 정확도가 높아지지만 속도가 감소함
        )
        
        # 3. 압축 리트리버
        compression_retriever = ContextualCompressionRetriever(
            base_compressor=compressor,
            base_retriever=base_retriever
        )
        
        return compression_retriever

    async def compare_invoke(self, query: str, target_pid: list, session_id: str):
        recommend_context = []
        origin_retriever = self.get_retriever(self.origin_pid)
        origin_docs = await origin_retriever.ainvoke(query)
        origin_context = format_docs(origin_docs)
        
        
        for i in target_pid:
            target_retriever = self.get_retriever(i)
            target_docs = await target_retriever.ainvoke(query)
            doc_text = format_docs(target_docs)
            recommend_context.append(f"=== [{i}] 제품의 상세 내용 ===\n{doc_text}")
        final_recommend_context = "\n\n".join(recommend_context)
        logger.info("검색 완료: 기준군(A) vs 비교군(B)")
        chain = self.qa_prompt | self.llm | StrOutputParser()

        chain_with_history = RunnableWithMessageHistory(
            runnable=chain,
            get_session_history=get_session_history,
            input_messages_key="input",
            history_messages_key="chat_history",
        )

        logger.info("체인생성 완료")
        import time
        start = time.time()
        response = await chain_with_history.ainvoke(
            {
                "origin_context": origin_context,
                "recommend_context": final_recommend_context,
                "origin_pid": self.origin_pid,
                "target_pid": target_pid,
                "input": query
            },
            config={"configurable": {"session_id": session_id}}
        )
        end = time.time()
        total_time = end - start
        logger.info(f"답변생성완료가 {total_time:0.2f}초 걸렸습니다.")
        return {"answer": response}


