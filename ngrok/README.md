# ngrok 설정

이 문서는 새 컴퓨터에서 이 프로젝트를 위해 ngrok을 설정하고 실행하는 방법을 안내합니다.

## 1. ngrok 다운로드

ngrok 공식 웹사이트에서 사용 중인 운영체제에 맞는 ngrok 실행 파일을 다운로드하세요:
[https://ngrok.com/download](https://ngrok.com/download)

다운로드한 `ngrok.exe` 파일을 이 디렉토리(`/ngrok`) 안에 위치시키세요.

## 2. 인증 설정

1.  ngrok 대시보드에 로그인하여 인증 토큰(authtoken)을 확인합니다: [https://dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken)

2.  `ngrok_back.example.yml` 파일을 복사하여 `ngrok_back.yml`이라는 이름으로 파일을 만듭니다.

3.  `ngrok_front.example.yml` 파일을 복사하여 `ngrok_front.yml`이라는 이름으로 파일을 만듭니다.

4.  `ngrok_back.yml`과 `ngrok_front.yml` 두 파일을 열고, 플레이스홀더인 `<YOUR_NGROK_AUTHTOKEN>` 부분을 실제 ngrok 인증 토큰으로 교체합니다.

## 3. 터널 시작하기

설정이 완료되면, `start.bat` 스크립트를 실행하여 프론트엔드와 백엔드 터널을 모두 시작할 수 있습니다.