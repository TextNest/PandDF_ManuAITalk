import os
from . import converter
from .converter import set_pdf, execute

__all__ = ["converter"]

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"