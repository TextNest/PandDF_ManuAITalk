@echo off
ECHO Starting all services...

REM 1. Start Frontend (in a new window)
ECHO Starting Frontend (npm run dev)...
START "Frontend" /D "..\Full\Frontend" npm run dev

REM 2. Start Backend (in a new window, with venv activation)
ECHO Starting Backend (uvicorn)...
REM .venv 이름을 다르게 하셨다면 ".\.venv\Scripts\activate" 부분을 수정하세요.
START "Backend" /D "..\Full\Backend" cmd /k ".\.venv\Scripts\activate && uvicorn main:app --port 8000 --reload"

REM 3. Start ngrok (2-Account Fix)
ECHO Starting ngrok tunnels with separate accounts...
REM ngrok.exe의 상대 경로를 지정합니다. (Root\ngrok\ngrok.exe)
REM --config 플래그로 각 계정의 설정 파일을 명시적으로 지정합니다.
START "ngrok-Frontend (3000)" "ngrok.exe" http 3000 --config="ngrok_front.yml"
START "ngrok-Backend (8000)" "ngrok.exe" http 8000 --config="ngrok_back.yml"

ECHO All services have been launched in separate windows.