from sqlalchemy import Column, String
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Product(Base):
    """제품 정보 테이블"""
    __tablename__ = "test_products"
    
    product_id = Column(String(255), primary_key=True)
    product_name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)