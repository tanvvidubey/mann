from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    pin: str


class UserLogin(BaseModel):
    email: EmailStr
    pin: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    email_verified: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class User(BaseModel):
    id: int
    name: str
    email: str
    pin_hash: str
    created_at: datetime

    class Config:
        from_attributes = True


class ProfileResponse(BaseModel):
    name: str
    email: str
    bio: Optional[str] = None
    hobbies: Optional[List[str]] = None
    likes: Optional[str] = None
    dislikes: Optional[str] = None
    other_details: Optional[str] = None
    email_verified: bool = False

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    hobbies: Optional[List[str]] = None
    likes: Optional[str] = None
    dislikes: Optional[str] = None
    other_details: Optional[str] = None


class VerifyEmailBody(BaseModel):
    token: str


class RequestPinChangeBody(BaseModel):
    email: EmailStr


class ConfirmPinChangeBody(BaseModel):
    token: str
    new_pin: str
