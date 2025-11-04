from typing import Dict, Any, List
from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str

class Register(BaseModel):
    name: str
    email: str
    companyId: str
    companyName:str
    department : str
    languagePreference : str
    password : str
    role : str
class FindCode(BaseModel):
    code:str
class CompayCodeResponse(BaseModel):
    id:str
    name:str
    existingDepartments:List[str]   
    class Config:
        from_attributes = True
class AuthCodeRequest(BaseModel):
    code: str
    redirect_uri: str

companyInfo = Dict[str,str]