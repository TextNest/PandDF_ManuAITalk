from langchain_openai import OpenAIEmbeddings
import os  
class path:
    FAISS_INDEX_PATH = "data/faiss_index"
    DOCSTORE_PATH = "data/docstore.pkl"
    IMAGE_STORE_PATH = "data/image_store.pkl"
    PAGE_IMAGES_DIR = "data/page_images"
    UPLOAD_FILES_DIR = "data/upload"
    LOGSTORE_DIR = "data/logs"

    @classmethod
    def setup(cls):
        req_dir = [
            cls.FAISS_INDEX_PATH,
            cls.PAGE_IMAGES_DIR,
            cls.UPLOAD_FILES_DIR,
            cls.LOGSTORE_DIR
            ]
        for d in req_dir:
            os.makedirs(d,exist_ok=True)

class load:
    def __init__(self):
        pass

    @staticmethod
    def envs(env_path:str=None):
        from dotenv import load_dotenv
        load_dotenv(dotenv_path=env_path)
        os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")
        os.environ["GOOGLE_API_KEY"] = os.getenv("GEMINI_API_KEY")
        os.environ["MAIT_PROTOCOL_CODE"] = os.getenv('UUID_PROTOCOL_SESHAT')
        DB_HOST = os.getenv("DB_HOST")
        DB_USER = os.getenv("DB_USER")
        DB_PASSWORD = os.getenv("DB_PW")
        DB_DATABASE = os.getenv("DB_DATABASE")
        DB_PORT = os.getenv("DB_PORT")
        return DB_HOST,DB_USER,DB_PASSWORD,DB_DATABASE,DB_PORT