# Full/Backend/models/category.py
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from .base import Base

class Category(Base):
    __tablename__ = "test_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, comment="카테고리명")

    # Product 모델과의 관계 설정 (Category 입장에서)
    # 'products'는 Category 객체에서 product 목록에 접근할 때 사용할 속성 이름입니다.
    products = relationship("Product", back_populates="category")

    def __repr__(self):
        return f"<Category(id={self.id}, name='{self.name}')>"
