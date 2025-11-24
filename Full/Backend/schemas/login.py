from typing import Dict, Any, List
from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str

class Register(BaseModel):
    companyId: int
    name: str
    email: str
    companyName:str
    department : str
    password : str
    role : str

class FindCode(BaseModel):
    code:str

class CompayCodeResponse(BaseModel):
    id:int
    name:str
    existingDepartments:List[str]   
    class Config:
        from_attributes = True

class AuthCodeRequest(BaseModel):
    code: str
    redirect_uri: str

companyInfo = Dict[str,str]