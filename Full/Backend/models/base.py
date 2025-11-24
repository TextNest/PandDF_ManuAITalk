# models/base.py
from sqlalchemy.orm import declarative_base

# 모든 모델이 공유할 Base 클래스를 정의합니다.
Base = declarative_base()