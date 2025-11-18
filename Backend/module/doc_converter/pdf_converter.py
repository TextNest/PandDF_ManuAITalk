import os
import sys
import re
import random
import json
import uuid
from uuid import uuid5
from pdf2image import convert_from_path
from datetime import datetime, timedelta, timezone
from pypdf import PdfReader
from core.config import path

# 상수
ABSPATH = os.path.dirname(os.path.abspath(__file__))
ABSPATH = os.path.abspath(os.path.join(ABSPATH,'..','..'))
MPC = uuid.UUID(os.getenv('MAIT_PROTOCOL_CODE'))
OUTDIR = os.path.join(path.PAGE_IMAGES_DIR)
PDF_PATH = os.path.join(ABSPATH,'data')
DATALIST = os.listdir(PDF_PATH)
DEFAULT_DPI = 400
IMG_FMT = 'png'
PATH_BIN = os.path.join(sys.prefix,'library','bin')

# 함수

# pdf 경로 검사. 일정 길이 초과 시 차단
def set_pdf(pdf_path: str):
    filename = os.path.basename(pdf_path)
    name,_ = os.path.splitext(filename)
    if len(name) > 100:
        raise ValueError(
            f'Invalid filename length ({len(name)} chars): \n\t    The filename must not exceed 100 characters'
        )
    return os.path.abspath(pdf_path)

# 데이터 폴더 내 무작위 pdf 특정
def rand_pdf(data_namelist: list, pdf_path: str, target: str = None):
    os.makedirs(OUTDIR, exist_ok=True)
    if target is None:
        target = random.choice(data_namelist)
        r = os.path.join(pdf_path, target)
    else:
        r = os.path.join(pdf_path, target)
    if len(target) > 104:
        name,_ = os.path.splitext(target)
        raise ValueError(
            f'Invalid filename length ({len(name)} chars): \n\t    The filename must not exceed 100 characters'
        )
    return r

# 고유 문서 생성자
def gen_doc_id(pdf_path:str):
    pdf = os.path.basename(pdf_path)
    return str(uuid5(MPC, pdf))

# 프로세스 : 페이지 단위 추출(변환)
def pdf_converter(pdf_path: str, path_bin: str, dpi: int = DEFAULT_DPI):
    try:
        images = convert_from_path(pdf_path, dpi=dpi, poppler_path=path_bin)
        return images
    except Exception as e:
        print(f'Error: the path is too long. so the process has been denied.\n{e}')
        return
    
# 서브 모듈 : PDF 내 최종 수정 시각 추적
def pdf_date_to_utc(date_str: str) -> str | None:
    if not date_str or not date_str.startswith("D:"):
        return None

    m = re.match(
        r"D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})([+-]\d{2})'?(\d{2})?'?",
        date_str
    )
    if not m:
        return None

    y, mo, d, h, mi, s, tz_h, tz_m = m.groups()
    tz = timezone(timedelta(hours=int(tz_h), minutes=int(tz_m)))
    local_dt = datetime(int(y), int(mo), int(d), int(h), int(mi), int(s), tzinfo=tz)
    utc_dt = local_dt.astimezone(timezone.utc)
    return utc_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

# 프로세스 : 페이지 별 메타데이터 생성
def gen_image_meta(uid: str, page_num: int, path_info: str, lang: str,
                   index: int = 0):
    pdf = PdfReader(path_info)
    name,_ = os.path.splitext(os.path.basename(path_info))
    image_rel= os.path.join(OUTDIR, uid,
                            f'{name}_{lang}_p{page_num}_{index}.png')
    metadata = {
        "doc_id": uid,
        "page": page_num,
        "slice_index": index,
        "language": lang,
        "source_path": path_info.replace('\\', '/'),
        "image":image_rel.replace('\\', '/'),
        "modified_at": pdf_date_to_utc(pdf.metadata['/ModDate'])
    }
    return metadata

# 서브 모듈 : 페이지 분할 여부 탐지기
def grid_check(val: int, mode: str, pagesize: int = 1):
    X_THRESHOLD = 2280
    X_DEVIATION = 240
    Y_THRESHOLD = 3103
    Y_DEVIATION = 299

    def safeguard(value, axis):
        if axis=='x':
            if value < X_THRESHOLD-X_DEVIATION:
                raise ValueError()
        if axis=='y':
            if value < Y_THRESHOLD-Y_DEVIATION:
                raise ValueError()

    try:
        if mode=='x':
            if X_THRESHOLD-X_DEVIATION <= val <= X_THRESHOLD+X_DEVIATION:
                return pagesize
            else:
                pagesize *= 2
                _val = int(round(val/2, 0))
                safeguard(_val,'x')
                return grid_check(_val,'x',pagesize)
        elif mode=='y':
            if Y_THRESHOLD-Y_DEVIATION <= val <= Y_THRESHOLD+Y_DEVIATION:
                return pagesize
            else:
                pagesize *= 2
                _val = int(round(val/2, 0))
                safeguard(_val,'y')
                return grid_check(_val,'y',pagesize)
    except ValueError:
        return 'just_done'
        
def wrapper(obj):
    return obj if isinstance(obj, (list, tuple)) else [obj]

def detect_page_grid(image):
    target = wrapper(image)
    result = []
    for img in target:
        w,h = img.size
        x = grid_check(w,'x')
        y = grid_check(h,'y')
        result.append([x,y])
    return result

# 서브 모듈 : 페이지 분할 후 반환
def align_to_even(value):
    return value+1 if value%2 != 0 else value

def cal_page_size(value,grid):
    v = value
    g = grid
    if g>1:
        v = value//2
        g = grid//2
        if g>1:
            v = align_to_even(v)
            v = cal_page_size(v,g)
    return v

def image_cropper(image, gridset, doc_id, pdfpath, lang):
    imgs = wrapper(image)
    cropped_images, metadatas = [], []
    for i in range(len(imgs)):
        w,h = imgs[i].size
        gx,gy = gridset[i]

        def grid_safe(grids):
            result = []
            for grid in grids:
                if grid == 'just_done':
                    result.append(1)
                else:
                    result.append(grid)
            return result
        
        gx,gy = grid_safe([gx,gy])
        idx = 0
        x = cal_page_size(w, gx)
        y = cal_page_size(h, gy)

        for _i in range(gy):
            for _j in range(gx):
                idx += 1
                left = _j*x
                up = _i*y
                right = left+x
                down = up+y

                cropped = imgs[i].crop((left,up,right,down))
                cropped_images.append(cropped)
                meta = gen_image_meta(uid= doc_id,
                                      page_num= i+1,
                                      index= idx-1,
                                      lang= lang,
                                      path_info= pdfpath)
                metadatas.append(meta)
    return cropped_images, metadatas

# 저장 모듈 : 메타데이터 - 페이지
def save_page_meta(metadata, doc_id):
    os.makedirs(os.path.join(OUTDIR, doc_id), exist_ok=True)
    _path = os.path.join(OUTDIR, doc_id, 'meta.page.json').replace('\\', '/')
    with open(_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    return _path

# 저장 모듈 : 이미지 - 페이지
def save_page_img(imgs, metadata, img_format='png'):
    filelist = [item["image"] for item in metadata if "image" in item]
    for i, img in enumerate(imgs):
        img.save(filelist[i], format=img_format, optimize=True)

# 실행루틴
def execute_convert(pdf_path:str, poppler_path:str = None):
  if poppler_path is None:
    poppler_path = PATH_BIN
  os.makedirs(OUTDIR, exist_ok=True)
  DOC_ID = gen_doc_id(pdf_path)
  imgs = pdf_converter(pdf_path, poppler_path)

  grids = detect_page_grid(imgs)
  cropped_images,dataset = image_cropper(imgs, grids, DOC_ID, pdf_path, 'ko')

  save_page_meta(dataset, DOC_ID)
  save_page_img(cropped_images, dataset, 'png')

if __name__ == '__main__':
  # PDF 선택 (PDF는 랜덤 지정)
  pdfpath = set_pdf('SDH-E18KPA_SDH-CP170E1_MANUAL.pdf')
  execute_convert(pdfpath, PATH_BIN)
