import pickle
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains.history_aware_retriever import create_history_aware_retriever
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder, PromptTemplate
from langchain.memory import ChatMessageHistory
from langchain.retrievers.multi_vector import MultiVectorRetriever
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.vectorstores import FAISS
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from core.config import path
import os

from core.config import load
load.envs()
store = {}
def get_session_history(session_id: str):
    if session_id not in store:
        store[session_id] = ChatMessageHistory()
    return store[session_id]
class HybridRAGChain:
    def __init__(self,pid):
        self.embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        self.vectorstore = FAISS.load_local(
            path.FAISS_INDEX_PATH,
            self.embeddings,
            allow_dangerous_deserialization=True
        )
        self.pid = pid
        with open(path.DOCSTORE_PATH, "rb") as f:
            self.docstore = pickle.load(f)

        with open(path.IMAGE_STORE_PATH, "rb") as f:
            self.image_store = pickle.load(f)

        self.llm = ChatOpenAI(model="gpt-4o", temperature=0)
        document_prompt = PromptTemplate.from_template(
            "[페이지 {page}]\n{page_content}"
        )
        base_retriever = MultiVectorRetriever(
            vectorstore= self.vectorstore, docstore=self.docstore, id_key="doc_id",
            search_kwargs={'k': 10, 'filter': {"product_id": self.pid}}
        )
        contextualize_q_prompt = ChatPromptTemplate.from_messages([
            ("system", """이전 대화 내용과 이어지는 사용자의 질문이 주어집니다. 대화 기록이 없어도 그 자체로 의미가 통하는 완전한 질문으로 재작성해주세요.절대 질문에 대한 답변을 하지 말고, 재작성된 질문만 반환하세요. 만약 질문을 바꿀 필요가 없다면 원래 질문을 그대로 반환하세요."""),
            MessagesPlaceholder(variable_name="chat_history"), ("human", "{input}"),
        ])
        history_aware_retriever = create_history_aware_retriever(self.llm, base_retriever, contextualize_q_prompt)
        qa_prompt = ChatPromptTemplate.from_messages([
            ("system", """당신은 신일전자 제품 매뉴얼 전문가입니다.
            검색된 내용과 대화 기록을 종합하여 사용자의 질문에 답변하세요. 그리고 사용된 페이지 번호도 함께 알려주세요.
             만약 검색된 내용에서 사용자의 질문과 직접 관련된 정보를 찾을 수 없다면, "관련 정보를 찾을 수 없습니다.'라고 답변하세요
            검색된 내용:\n{context}"""),
            MessagesPlaceholder(variable_name="chat_history"), ("human", "{input}"),
        ])
        question_answer_chain = create_stuff_documents_chain(self.llm, qa_prompt,document_prompt=document_prompt)
        rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)
        self.chain_with_history = RunnableWithMessageHistory(
            runnable=rag_chain, get_session_history=get_session_history,
            input_messages_key="input", history_messages_key="chat_history", output_messages_key="answer",
        )

    def invoke(self, query,session):
        answer = self.chain_with_history.invoke(
        {"input": query},
        config={"configurable": {"session_id": session}}
    )
        print(answer)
        true_answer = answer.get("answer", "")
        retrieved_docs = answer.get("context", [])
        pages_with_images = set()

        for doc in retrieved_docs:
            page = doc.metadata.get("page")
            if doc.metadata.get("image_path"):
                pages_with_images.add((page, doc.metadata.get("image_path")))
        pages_found = [item for item in pages_with_images if f"페이지 {item[0]}" in true_answer]
        true_page = sorted(pages_found, key=lambda item: item[0])
        return {
            "answer": true_answer,
            "pages_with_images": true_page
        }