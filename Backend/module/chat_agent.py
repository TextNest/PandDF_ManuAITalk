from typing import Literal
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
Tool_name={
    "product_qa_tool":"질문",
    "recommend_tool":"추천"
}

class AgentState(MessagesState):
    product_id : str
    session_id : str
    tool_name: str

catalog = {"SDH-E18KPA":"SDH-E18KPA_SDH-CP170E1_MANUAL",
    "SIF-14SSWT":"2024년_SIF-14SSWT_W3514BL_D14BCSJ_BL2314_14JKS_MANUAL",
    "SDH-E45KPA":"SDH-PM45_MANUAL"}  ## 데이터 베이스 추가시 변경 필요
_rag_cache = {}
def get_rag_chain(product_id: str) -> HybridRAGChain:
    pdf_id = catalog.get(product_id,"")
    if product_id not in _rag_cache:
        print(f"RAG 체인 생성:[{product_id}]")
        _rag_cache[product_id] = HybridRAGChain(pdf_id)
    else:
        print(f"[{product_id}] RAG 체인 재사용")
    return _rag_cache[product_id]

@tool
def product_qa_tool(query: str, product_id:str,session_id:str) -> str:
    """
    제품의 정보 및 메뉴얼에 대한 질문에 답변합니다.
    """
    rag = get_rag_chain(product_id)
    answer = rag.invoke(query,session_id)
    return answer["answer"]

@tool
def recommend_tool(product_id:str,count:int=3, *, config: RunnableConfig) -> str:
    """
    상푼 추천을 해줍니다. 만약 유저가 'count'개 만큼 추천해달라고 하면 count 수만큼 추천을 해주고 작성을 하지않으면 기본값을 사용합니다.
    """
    db_session = config.get("configurable", {}).get("db_session")
    print("연결됨")
    data = [{"id":"abc","name":"거대한풍선"},{"id":"cde","name":"거대한선풍기"},{"id":"efg","name":"작은 선풍기"}]
    return data[:count]





class  ChatBotAgent:
    def __init__(self,product_id:str,session_id:str,initial_messages: Optional[List[Dict[str, Any]]] = None):
        self.product_id = product_id
        self.llm = ChatGoogleGenerativeAI(model = "gemini-2.5-flash",temperature=0)
        self.tools = [product_qa_tool,recommend_tool]
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
            system_msg = SystemMessage(agent_prompt)
#             system_msg = SystemMessage(
#                 content=system_msg.format(product_id=state["product_id"])
# )
            response = llm_with_tools.with_config({"run_name":"final_answer"}).invoke([system_msg]+state["messages"])
            return {"messages":[response]}

        def tool_node(state):
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
            message_tool =  ToolNode(self.tools).invoke(state)    
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

    def chat(self,query:str,db_session: Optional[Any] = None):
        config = {"configurable":{"thread_id":self.session_id,"db":db_session}}
        initial_state = {
            "messages":[HumanMessage(content=query)],
            "product_id":self.product_id,
            "session_id":self.session_id,
            "tool_name": None
        }
        result = self.graph.invoke(initial_state,config=config)
        final_message = result["messages"][-1]
        tool_name = result.get("tool_name")
        return {"answer":final_message.content,"tool_name":tool_name}
    # async def stream_chat(self,query:str,db_session: Optional[Any] = None):
    #     config = {"configurable":{"thread_id":self.session_id,"db":db_session}}
    #     initial_state = {
    #         "messages":[HumanMessage(content=query)],
    #         "product_id":self.product_id,
    #         "session_id":self.session_id
    #     }
    #     async for event in self.graph.astream_events(
    #         initial_state, config=config, version="v1"
    #     ):
    #         kind = event["event"]
    #         if (kind == "on_chat_model_stream" and event["name"]=="final_answer"):
    #             chunk = event["data"]["chunk"]
    #             if content := chunk.content:    
    #                 yield content