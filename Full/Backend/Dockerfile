# Backend/Dockerfile
FROM python:3.11-slim

# 디렉터리 설정
WORKDIR /app

# Debian/Ubuntu 기반 이미지에서 패키지 목록을 업데이트한 후 빌드 도구와 MySQL 클라이언트 라이브러리를 설치하고, 캐시를 정리
RUN apt-get update && apt-get install -y \
    build-essential \
    default-libmysqlclient-dev \
    pkg-config \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# requirements 복사 및 외부 패키지 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 8000번 포트 노출
EXPOSE 8000

# 명령어 실행
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]