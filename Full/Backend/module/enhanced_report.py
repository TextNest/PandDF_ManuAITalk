"""
**enhanced_report : 자동화 로그 분석 모듈**

자동으로 로그를 분석 & 요약하여 리포트를 작성하고 DB에 업로드를 수행합니다.
일련의 파이프라인을 제공하며, FastAPI의 스케쥴러에 등록해 활용할 수 있습니다.
반복 주기는 **.env 내 AUTOMATIC_REPORT_INTERVAL**을 참조하며, 기본값은 30분 입니다.

활용
- Scheduler_ARP는 enhanced_report의 정규 파이프라인입니다
- reset_report는 DB 내 모든 리포트를 삭제합니다. **복구는 불가능합니다**
"""

import os
import asyncio
from sqlalchemy import text
from core.db_config import get_session_text
from core.query import AutoReportProcess_v2
from core.prompt import analysis_prompt
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel,Field
from collections import Counter

#--------------------------------------------------

__ver__ = 2.0
INTERVAL = int(os.environ.get("AUTOMATIC_REPORT_INTERVAL", "1800"))

#--------------------------------------------------

class ReportFormat(BaseModel):
    status:str = Field(description="'1' 또는 '0'")
    summary:str = Field(description="요약 텍스트 전체")
parser = PydanticOutputParser(pydantic_object=ReportFormat)
llm = ChatGoogleGenerativeAI(model = "gemini-2.5-flash", temperature = 0)
prompt = ChatPromptTemplate.from_messages([
    ("system", analysis_prompt + "\n{format}"),
    ("user", "{input}")
])
chain = prompt | llm | parser

def convert_report_v2(log: list, session_iid: str, session_info: dict):
    count = Counter(l['feedback'] for l in log)
    pos,neg = count['positive'], count['negative']
    total = pos + neg
    satisfy = round((pos/total)*100, 2) if total!=0 else 0
    rst = {
        'session_internal_id': session_iid,
        'session_id': session_info['session_id'],
        'product_name': session_info['product_name'],
        'product_id': session_info['product_id'],
        'category': session_info['category'],
        'messages': [],
        'status': None,
        'summary': None,
        'started_at': log[0]['created_at'],
        'completed_at': log[-1]['created_at'],
        'positive': pos,
        'negative': neg,
        'satisfaction': satisfy}
    for l in log:
        msg = {
            'role' : l['role'],
            'text' : l['content']
        }
        rst['messages'].append(msg)
    return rst

def verbose_msg(message:str):
    return f"""{'-'*40}\n   {message}\n{'-'*40}"""

async def search_session(terminal):
    query = text(AutoReportProcess_v2.find_session_for_rep)
    res = await terminal.execute(query)
    return [r[0] for r in res.fetchall()]

async def find_session_info(terminal, session_internal_id: str):
    query_a = text(AutoReportProcess_v2.find_message_for_rep)
    query_b = text(AutoReportProcess_v2.find_product_for_rep)
    _res_a = await terminal.execute(query_a, {"sid": session_internal_id})
    rows = [dict(r._mapping) for r in _res_a.fetchall()]
    _res_b = await terminal.execute(query_b, {"sid": session_internal_id})
    info = dict(_res_b.fetchone()._mapping)
    return rows, info

async def upload_report_v2(terminal, input_report: dict):
    query = text(AutoReportProcess_v2.report_query)
    param = {
        "sid": input_report['session_internal_id'],
        "session": input_report['session_id'],
        "product_name": input_report['product_name'],
        "pid": input_report['product_id'],
        "ctg": input_report['category'],
        "stat": input_report['status'],
        "summary": input_report['summary'],
        "started_at": input_report['started_at'],
        "ended_at": input_report['completed_at'],
        "pos": input_report['positive'],
        "neg": input_report['negative'],
        "satisfy": input_report['satisfaction']
    }
    await terminal.execute(query, param)
    await terminal.commit()

# Automatic Report-process Pipeline
async def execute_report(verbose):
    if verbose>0: print(verbose_msg("SCHEDULER_ARP : Execute report"))
    async with get_session_text() as session:
        logs = []
        session_ids = await search_session(session)
        for sid in session_ids:
            if verbose>1: print(verbose_msg(f"SCHEDULER_ARP : Collecting infos for session <{sid}>"))
            slogs, info = await find_session_info(session, sid)
            logs.append(convert_report_v2(slogs, sid, info))
        for log in logs:
            if verbose>1: print(verbose_msg(f"SCHEDULER_ARP : Generating report for session <{log['session_id']}>"))
            rst = await chain.ainvoke({
                "input" : log['messages'],
                "format" : parser.get_format_instructions()
            })
            log['status'] = rst.status
            log['summary'] = rst.summary
            await upload_report_v2(session, log)
        if verbose>0: print(verbose_msg("SCHEDULER_ARP : Process completed"))

# report reset : WARNING, THIS FUNCTION WILL DELETE ALL REPORTS
async def reset_report(terminal):
    "**<WARNING> 이 함수는 DB 내 모든 리포트를 삭제할 것입니다.**"
    query = text(AutoReportProcess_v2.reset_all_rep)
    await terminal.execute(query)

#--------------------------------------------------

async def Scheduler_ARP(verbose:int = 0):
    while True:
        try:
            await execute_report(verbose)
        except Exception as e:
            print(f'SCHEDULER_ARP : ERROR!\n>>> {e}')
        await asyncio.sleep(INTERVAL)


