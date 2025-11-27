from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from .db_config import async_session_factory
from module.faq_generator import FAQGenerator
import logging

logger = logging.getLogger(__name__)
async def scheduled_faq_generation():
    """주간 FAQ 자동 생성 작업"""
    logger.info("스케줄링된 FAQ 생성 작업 시작")
    async with async_session_factory() as session:
        try:
            await FAQGenerator.generate_faqs_for_products(
                session=session,
                days_range=7,
                created_by=None,
                is_scheduled=True,
                company_id=None
            )
        except Exception as e:
            logger.error(f"스케줄링 작업 실패: {e}")
def start_scheduler():
    scheduler = AsyncIOScheduler()
    
    # 매주 월요일 새벽 3시에 실행 (원하는 시간으로 변경 가능)
    trigger = CronTrigger(day_of_week='mon', hour=3, minute=0)
    
    scheduler.add_job(scheduled_faq_generation, trigger)
    scheduler.start()
    logger.info("FAQ 생성 스케줄러가 시작되었습니다.")