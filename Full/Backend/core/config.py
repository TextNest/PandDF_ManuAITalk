from langchain_openai import OpenAIEmbeddings
import os  
class path:
    FAISS_INDEX_PATH = "data/langchain_db"
    IMAGE_STORE_PATH = "data/image_store.pkl"
    PAGE_IMAGES_DIR = "data/page_images"
    UPLOAD_IMAGES_DIR = "uploads/images"
    UPLOAD_3D_MODELS_DIR = "uploads/models_3d"
    UPLOAD_PDFS_DIR = "uploads/pdfs"

    @classmethod
    def setup(cls):
        req_dir = [
            cls.FAISS_INDEX_PATH,
            cls.PAGE_IMAGES_DIR,
            cls.UPLOAD_IMAGES_DIR,
            cls.UPLOAD_3D_MODELS_DIR,
            cls.UPLOAD_PDFS_DIR
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
        os.environ["MAIT_PROTOCOL_CODE"] = os.getenv('UUID_PROTOCOL_SESHAT')
        os.environ["GOOGLE_API_KEY"] = os.getenv("GEMINI_API_KEY")
        os.environ["client_id"] = os.getenv("client_id")
        os.environ["client_secret"] = os.getenv("client_secret")
        os.environ["MODEL_SERVER_URL"] = os.getenv("MODEL_SERVER_URL", "http://127.0.0.1:8001")
        os.environ["GOOGLE_APPLICATION_CREDENTIALS_JSON"] = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")
        DB_HOST = os.getenv("DB_HOST")
        DB_USER = os.getenv("DB_USER")
        DB_PASSWORD = os.getenv("DB_PW")
        DB_DATABASE = os.getenv("DB_DATABASE")
        DB_PORT = os.getenv("DB_PORT")
        return DB_HOST,DB_USER,DB_PASSWORD,DB_DATABASE,DB_PORT