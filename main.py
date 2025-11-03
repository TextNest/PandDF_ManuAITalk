from modules.converter import execute, set_pdf

# 반드시 절대경로 입력
path = 'C:\AI_academy\class_1\project\PandDF_SeShat\ex_data\SIF-12DIS,S12JS,S12OW,J12WH,E12HMT.pdf'

# pdf 파일명 길이 검사. 이상 없으면 조용히 넘어감
# 리턴값은 입력된 경로를 절대경로로 치환하는 것이 전부, path 그대로 사용 OK
pdf = set_pdf(path)

'''
pdf 페이지 별 이미지 변환
- 병합 이미지 분리 포함
- 메타데이터 생성 포함
- 저장 포함 (./artifacts/{doc_id}/...)
  - doc_id : 문서 고유 번호. uuid 방식으로 생성하며, 동일 문서는 반드시 같은 번호로 생성된다.
'''

execute(path)