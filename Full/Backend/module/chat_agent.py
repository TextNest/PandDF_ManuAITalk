from typing import Literal,List
from langgraph.graph import StateGraph, MessagesState, START, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import ToolNode

from langchain_core.messages import HumanMessage, SystemMessage,AIMessage
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from module.qa_service import HybridRAGChain
from core.prompt import agent_prompt
from typing import List, Dict, Any, Optional
from langchain_core.runnables import RunnableConfig
from module.qa_recommend import RecommendRAGChain
from sqlalchemy import text 
Tool_name={
    "product_qa_tool":"질문",
    "recommend_tool":"추천"
}

class AgentState(MessagesState):
    product_id : str
    session_id : str
    tool_name: str

_rag_cache = {}
def get_rag_chain(product_id: str) -> HybridRAGChain:
    if product_id not in _rag_cache:
        print(f"RAG 체인 생성:[{product_id}]")
        _rag_cache[product_id] = HybridRAGChain(product_id)
    else:
        print(f"[{product_id}] RAG 체인 재사용")
    return _rag_cache[product_id]

@tool
async def product_qa_tool(query: str, product_id:str,session_id:str) -> str:
    """
    제품의 정보 및 메뉴얼에 대한 질문에 답변합니다.
    """
    rag = get_rag_chain(product_id)
    answer = await rag.invoke(query,session_id)
    return answer["answer"]

@tool
async def recommend_tool(product_id:str, config: RunnableConfig = None,count:int=3) -> str:
    """
    상품을 추천을 해줍니다. 만약 유저가 'count'개 만큼 추천해달라고 하면 count 수만큼 추천을 해주고 작성을 하지않으면 기본값을 사용합니다.
    """
    db_session = config.get("configurable", {}).get("db") if config else None
    origin_query = """
    SELECT product_id,product_name FROM tb_product WHERE category = (SELECT category FROM tb_product WhERE product_id = :product_id) and product_id != :product_id """
    results = await db_session.execute(text(origin_query),
    params={
        "product_id":product_id
    })
    code_row = results.mappings().all()
    return code_row[:count]

@tool
async def compare_tool(query: str, product_id:str,rec_product_id:List[str],session_id:str):
    """
    기존 상품과 비교 상품을 찾아서 사용자가 원하는 키워드를 비교해줍니다.

    query: 비교할 기준 (예: "기능 비교해줘", "가격 차이 알려줘")
    product_id: 기존 상품 ID
    rec_product_id: 비교할 대상 상품 ID들의 리스트 (문자열 리스트)
    session_id: 세션 ID

    """
    rag = RecommendRAGChain(product_id)
    answer = await rag.compare_invoke(query,rec_product_id,session_id)
    return answer["answer"]



class  ChatBotAgent:
    def __init__(self,product_id:str,session_id:str,initial_messages: Optional[List[Dict[str, Any]]] = None):
        self.product_id = product_id
        self.llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash", # 또는 사용 중인 모델
        temperature=0,
        streaming=True,
    )
        self.tools = [product_qa_tool,recommend_tool,compare_tool]
        self.checkpoint = MemorySaver()
        self.graph =self._build_graph()
        self.session_id = session_id    
        
        if initial_messages:
            self._put_memory(initial_messages)
    
    def _put_memory(self,db_msg: List[Dict[str, Any]]):
        config = {"configurable":{"thread_id":self.session_id}}
        memory_state = []
        for msg in db_msg:
            if msg["role"]=="user":
                memory_state.append(HumanMessage(content=msg["content"]))
            elif msg["role"]=="assistant":
                memory_state.append(AIMessage(content=msg["content"]))
            final_state_to_put = AgentState(
            messages=memory_state, 
            product_id=self.product_id, 
            session_id=self.session_id
        )
        self.graph.update_state(config, final_state_to_put)
        print("메모리 저장완료했습니다.")
    
    def _build_graph(self) :
        work  = StateGraph(AgentState)
        llm_with_tools = self.llm.bind_tools(self.tools)
        def agent_node(state):
            formatted_prompt = agent_prompt.format(product_id=self.product_id)
            system_msg = SystemMessage(formatted_prompt)
            response = llm_with_tools.with_config({"run_name":"final_answer"}).invoke([system_msg]+state["messages"])
            return {"messages":[response]}

        async def tool_node(state,config):
            last_msg = state["messages"][-1]
            if hasattr(last_msg,"tool_calls") and last_msg.tool_calls: #마지막 메세지에 too_calls 속성이 있고 값이 있으면
                print(last_msg.tool_calls[0]["name"])
                tool_name = last_msg.tool_calls[0]["name"]
                find_name = Tool_name.get(tool_name,tool_name)
                for call in last_msg.tool_calls:
                    call['args']['product_id'] = state["product_id"]
                    call['args']['session_id'] = state["session_id"]
                    print(f"도구 이름: {call['name']}")
                    print(f"전달된 인자: {call['args']}")
            message_tool =  await ToolNode(self.tools).ainvoke(state)    
            return {
                "messages": message_tool["messages"],
                "tool_name":find_name
            }

        def end_node(state):
            last_msg = state["messages"][-1]
            if hasattr(last_msg,"tool_calls") and last_msg.tool_calls:
                return "tools"
            return "end"
        work.add_node("agent",agent_node)
        work.add_node("tools",tool_node)
        work.add_edge(START,"agent")
        work.add_conditional_edges("agent",end_node,{"tools":"tools","end":END})
        work.add_edge("tools","agent")
        return work.compile(checkpointer=self.checkpoint)

    async def chat(self,query:str,db_session: Optional[Any] = None):
        config = {"configurable":{"thread_id":self.session_id,"db":db_session}}
        initial_state = {
            "messages":[HumanMessage(content=query)],
            "product_id":self.product_id,
            "session_id":self.session_id,
            "tool_name": None
        }
        result = await self.graph.ainvoke(initial_state,config=config)
        final_message = result["messages"][-1]
        tool_name = result.get("tool_name")
        return {"answer":final_message.content,"tool_name":tool_name}

    # async def stream_chat(self,query:str,db_session: Optional[Any] = None): 오류가 많아서 수정중
    #     config = {"configurable":{"thread_id":self.session_id,"db":db_session}}
    #     initial_state = {
    #         "messages":[HumanMessage(content=query)],
    #         "product_id":self.product_id,
    #         "session_id":self.session_id,
    #         "tool_name": None
    #     }
    #     collect_tool_name = None
    #     collect_content = ""

    #     async for event in self.graph.astream_events(
    #         initial_state, config=config, version="v2"
    #     ):
    #         kind = event["event"]
    #         if kind == "on_chain_start":
    #             collect_tool_name = Tool_name.get(event["name"], event["name"])

    #         elif kind == "on_chat_model_stream":
    #             chunk = event["data"]["chunk"]
    #             if content := chunk.content:    
    #                 collect_content+=content
    #                 yield {
    #                     "type": "token", 
    #                     "message": content
    #                 }
    #     yield{
    #         "type": "finish",
    #         "tool_name":collect_tool_name,
    #         "full_content": collect_content
    #     }
            