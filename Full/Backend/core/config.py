from langchain.embeddings import OpenAIEmbeddings
class path:
    FAISS_INDEX_PATH = "data/faiss_index"
    DOCSTORE_PATH = "data/docstore.pkl"
    IMAGE_STORE_PATH = "data/image_store.pkl"
    PAGE_IMAGES_DIR = "data/page_images"

class load:
    def __init__(self):
        pass

    def envs():
        from dotenv import load_dotenv
        import os  
        load_dotenv()
        os.environ["OPENAI_API_KEY"] = os.getenv("openai")
        DB_HOST = os.getenv("DB_HOST")
        DB_USER = os.getenv("DB_USER")
        DB_PASSWORD = os.getenv("DB_PW")
        DB_DATABASE = os.getenv("DB_DATABASE")
        DB_PORT = os.getenv("DB_PORT")
        return DB_HOST,DB_USER,DB_PASSWORD,DB_DATABASE,DB_PORT
        
        






