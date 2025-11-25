import pickle
from langchain_classic.chains.retrieval import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain

from langchain_classic.chains.history_aware_retriever import create_history_aware_retriever
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder, PromptTemplate

from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_classic.retrievers.multi_vector import MultiVectorRetriever
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.vectorstores import FAISS
from core.config import path,load
import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_openai import OpenAIEmbeddings
from langchain_classic.retrievers.multi_query import MultiQueryRetriever

from langchain_core.callbacks.manager import CallbackManagerForRetrieverRun

load.envs()
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
# 세션 히스토리를 위한 인메모리 저장소
store = {}
def get_session_history(session_id: str):
    if session_id not in store:
        store[session_id] = InMemoryChatMessageHistory()
    return store[session_id]
class HybridRAGChain:
    def __init__(self,pid):
        self.embeddings = embeddings
        self.vectorstore = FAISS.load_local(
            path.FAISS_INDEX_PATH,
            self.embeddings,
            allow_dangerous_deserialization=True
        )
        self.pid = pid
        with open(path.DOCSTORE_PATH, "rb") as f:
            self.docstore = pickle.load(f)

        self.llm = ChatGoogleGenerativeAI(model = "gemini-2.5-flash",temperature=0)

        self.base_retriever = MultiVectorRetriever(
            vectorstore= self.vectorstore, 
            docstore=self.docstore, 
            id_key="doc_id",
            search_kwargs={'k': 5, 'filter': {"product_id": self.pid}}
        )

        self.combined_retriever = MultiQueryRetriever.from_llm(
                retriever= self.base_retriever, llm=self.llm
            )

        
        qa_prompt = ChatPromptTemplate.from_messages([
            ("system", """당신은 제품 매뉴얼 전문가입니다.
            검색된 내용과 대화 기록을 종합하여 사용자의 질문에 답변하세요. 그리고 어떤 페이지에 있다고만 대답하는 것이 아닌 자세하게 대답을 해주세요
             만약 검색된 내용에서 사용자의 질문과 직접 관련된 정보를 찾을 수 없다면, "관련 정보를 찾을 수 없습니다.'라고 답변하세요
            
            검색된 내용:\n{context}"""),
            MessagesPlaceholder(variable_name="chat_history"), ("human", "{input}"),
        ])
        question_answer_chain = create_stuff_documents_chain(self.llm, qa_prompt)
        rag_chain = create_retrieval_chain(self.combined_retriever,question_answer_chain)
        
        
        self.chain_with_history = RunnableWithMessageHistory(
            runnable=rag_chain, 
            get_session_history=get_session_history,
            input_messages_key="input", 
            history_messages_key="chat_history", 
            output_messages_key="answer",
        )
        self.light_with_history = RunnableWithMessageHistory(
            runnable=rag_chain, 
            get_session_history=get_session_history,
            input_messages_key="input", 
            history_messages_key="chat_history", 
            output_messages_key="answer",
        )
    def check(self,query):
        check_context = self.base_retriever.invoke(query)
        return check_context
    def invoke(self, query,session):
        initial_context = self.check(query)
        if initial_context:
            print("검색 결과가 존재합니다. 결과를 출력 해드리겠습니다.")
            answer = self.light_with_history.invoke(
                {"input":query,"context":initial_context},
                config={"configurable": {"session_id": session}}
            )

        else:
            print("검색결과가 없습니다. 쿼리를 재 작성하겠습니다.")
            run_manager = CallbackManagerForRetrieverRun.get_noop_manager()
            sub_queries = self.combined_retriever.generate_queries(query, run_manager=run_manager)

            print(f"{sub_queries}가 생성되었습니다. 해당 쿼리들로 재 검색 하겠습니다.")
            
            
            answer = self.chain_with_history.invoke(
            {"input": query},
            config={"configurable": {"session_id": session}}
        )
            answer = answer.get("answer","")
        return {"answer": answer}