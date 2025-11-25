from sqlalchemy import Column, Integer, Text, TIMESTAMP, ForeignKey, Index, Boolean
from .base import Base

class Report(Base):
    """세션 분석 결과 저장"""
    __tablename__ = "tb_report"
    
    report_internal_id = Column(Integer, primary_key=True, autoincrement=True, comment='고유 식별자')
    session_internal_id = Column(Integer, ForeignKey("tb_session.session_internal_id", ondelete="SET NULL"), nullable=True, index=True, comment='세션 고유 식별자')
    
    is_resolved = Column(Boolean, nullable=False, default=False, comment='분석 결과')
    content = Column(Text, nullable=False, comment='분석 내용')
    
    started_at = Column(TIMESTAMP, nullable=False, comment='시작 시간')
    completed_at = Column(TIMESTAMP, nullable=False, comment='종료 시간')
    
    positive = Column(Integer, nullable=False, comment='긍정 개수')
    negative = Column(Integer, nullable=False, comment='부정 개수')
    satisfaction = Column(Integer, nullable=False, comment='만족도')