import pickle
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains.history_aware_retriever import create_history_aware_retriever
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder, PromptTemplate
from langchain.memory import ChatMessageHistory
from langchain.retrievers.multi_vector import MultiVectorRetriever
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.vectorstores import FAISS
from core.config import path,load
import os

from langchain_openai import ChatOpenAI,OpenAIEmbeddings
from langchain.retrievers.multi_query import MultiQueryRetriever
from langchain.callbacks.manager import CallbackManagerForRetrieverRun

load.envs()
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
store = {}
def get_session_history(session_id: str):
    if session_id not in store:
        store[session_id] = ChatMessageHistory()
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

        self.llm = ChatOpenAI(model="gpt-4o", temperature=0)

        base_retriever = MultiVectorRetriever(
            vectorstore= self.vectorstore, 
            docstore=self.docstore, 
            id_key="doc_id",
            search_kwargs={'k': 5, 'filter': {"product_id": self.pid}}
        )

        self.combined_retriever = MultiQueryRetriever.from_llm(
                retriever= base_retriever, llm=self.llm
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
            runnable=rag_chain, get_session_history=get_session_history,
            input_messages_key="input", history_messages_key="chat_history", output_messages_key="answer",
        )

    def invoke(self, query,session):
        run_manager = CallbackManagerForRetrieverRun.get_noop_manager()
        sub_queries = self.combined_retriever.generate_queries(query, run_manager=run_manager)
        print("Generated sub-queries:", sub_queries)
        answer = self.chain_with_history.invoke(
        {"input": query},
        config={"configurable": {"session_id": session}}
    )
        answer = answer.get("answer","")
        return {"answer": answer}