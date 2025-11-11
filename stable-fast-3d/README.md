# Stable Fast 3D - API Server

이 프로젝트는 Stability AI의 [Stable Fast 3D](https://github.com/Stability-AI/stable-fast-3d) 모델을 사용하여 단일 이미지로부터 3D 모델을 생성하는 FastAPI 기반의 API 서버입니다.

원본 프로젝트의 C++ 확장 모듈 의존성을 제거하고, 순수 Python 라이브러리(`trimesh`, `torch`)만을 사용하도록 수정하여 Windows 및 Google Colab을 포함한 다양한 환경에서 쉽게 설치하고 실행할 수 있도록 최적화되었습니다.

## 주요 특징

- **간편한 설치:** 복잡한 C++ 빌드 과정 없이 `pip`만으로 모든 의존성을 설치할 수 있습니다.
- **FastAPI 기반 서버:** `/convert-2d-to-3d` 엔드포인트를 통해 이미지 파일을 업로드하여 3D 모델(`.glb`)을 생성합니다.
- **비동기 처리:** 무거운 3D 모델링 작업을 별도의 스레드에서 처리하여 서버의 응답성을 유지합니다.
- **유연한 설정:** `.env` 파일을 통해 텍스처 해상도와 같은 주요 설정을 쉽게 변경할 수 있습니다.
- **Google Colab 지원:** Google Colab 노트북에서 간편하게 서버를 실행하고 테스트할 수 있는 가이드를 제공합니다.

## 로컬 환경에서 설치 및 실행

### 사전 요구 사항

- Python 3.10 이상
- Git
- NVIDIA GPU (CUDA 지원, VRAM 6GB 이상 권장)

### 1. 프로젝트 클론

```bash
git clone <your-repository-url>
cd stable-fast-3d
```

### 2. 가상 환경 생성 및 활성화

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate
```

### 3. 의존성 설치

PyTorch를 먼저 사용자의 CUDA 버전에 맞게 설치한 후, 나머지 의존성을 설치합니다.

```bash
# PyTorch (CUDA 12.1) 설치 (사용자 환경에 맞게 변경)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

# 나머지 의존성 설치
pip install -r requirements.txt
```

### 4. 환경 변수 설정

`.env.example` 파일을 `.env` 파일로 복사하고, 필요에 따라 설정을 수정합니다.

```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

VRAM이 4GB와 같이 낮은 환경에서는 `.env` 파일의 `BAKE_RESOLUTION` 값을 `512`로 낮추는 것을 권장합니다.

### 5. 서버 실행

```bash
python api_server.py
```

서버가 `http://127.0.0.1:8001`에서 실행됩니다. 처음 실행 시 Hugging Face Hub에서 모델 가중치를 다운로드하므로 시간이 다소 걸릴 수 있습니다.

## API 사용법

`curl`을 사용하여 이미지 파일을 `/convert-2d-to-3d` 엔드포인트로 전송할 수 있습니다.

```bash
curl -X POST -F "file=@/path/to/your/image.png" http://127.0.0.1:8001/convert-2d-to-3d
```

## Google Colab에서 실행하기

Google Colab의 GPU를 사용하여 이 서버를 실행하고, `ngrok`을 통해 외부에서 접근할 수 있는 공개 URL을 생성할 수 있습니다.

아래 코드를 Colab 노트북의 셀에 복사하여 실행하세요.

```python
# 1. 프로젝트 클론
!git clone <your-repository-url>
%cd stable-fast-3d

# 2. 의존성 설치
# Colab 환경에 맞는 PyTorch가 이미 설치되어 있을 수 있으므로, requirements.txt만 설치합니다.
!pip install -r requirements.txt
!pip install pyngrok

# 3. Ngrok 설정 (Ngrok 웹사이트에서 인증 토큰을 받아오세요)
from pyngrok import ngrok
import os

NGROK_AUTH_TOKEN = "YOUR_NGROK_AUTH_TOKEN"  # 여기에 자신의 Ngrok 인증 토큰을 입력하세요.
ngrok.set_auth_token(NGROK_AUTH_TOKEN)

# 4. .env 파일 설정 (Colab에서는 VRAM에 맞춰 해상도를 낮춥니다)
with open(".env", "w") as f:
    f.write("BAKE_RESOLUTION=512\n")
    f.write("PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True\n")

# 5. FastAPI 서버를 백그라운드에서 실행
import asyncio
from uvicorn import Config, Server

async def run_server():
    config = Config("api_server:app", host="127.0.0.1", port=8001, log_level="info")
    server = Server(config)
    await server.serve()

# 비동기적으로 서버 실행
print("Starting FastAPI server in the background...")
loop = asyncio.get_event_loop()
loop.create_task(run_server())

# 6. Ngrok을 통해 공개 URL 생성 및 출력
public_url = ngrok.connect(8001)
print("====================================================================")
print("✅ FastAPI 서버가 다음 공개 URL에서 실행 중입니다:")
print(public_url)
print("====================================================================")
print("이제 이 URL을 사용하여 API에 요청을 보낼 수 있습니다.")
print("예: curl -X POST -F \"file=@/path/to/your/image.png\" " + public_url + "/convert-2d-to-3d")
```
