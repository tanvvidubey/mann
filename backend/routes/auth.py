import os
import base64
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from passlib.context import CryptContext

from database import get_db, UserModel, init_db
from models import (
    UserCreate,
    UserLogin,
    UserResponse,
    VerifyEmailBody,
    RequestPinChangeBody,
    ConfirmPinChangeBody,
)
from services.email_sender import send_verification_email, send_welcome_email, send_pin_change_email

router = APIRouter(prefix="/api/auth", tags=["auth"])
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("JWT_SECRET", "mann-dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


def _pin_for_bcrypt(pin: str) -> str:
    """Bcrypt accepts at most 72 bytes; truncate to avoid ValueError."""
    raw = pin.encode("utf-8")
    if len(raw) <= 72:
        return pin
    return raw[:72].decode("utf-8", errors="ignore") or pin[:1]


def hash_pin(pin: str) -> str:
    return pwd_ctx.hash(_pin_for_bcrypt(pin))


def verify_pin(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(_pin_for_bcrypt(plain), hashed)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user_id(token: str) -> int:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        uid = payload.get("sub")
        if uid is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return int(uid)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_user_salt(db: Session, user_id: int) -> str:
    u = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return u.encryption_salt


def _user_response(user: UserModel) -> UserResponse:
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        email_verified=bool(getattr(user, "email_verified", 0)),
        created_at=user.created_at,
    )


VERIFY_EXPIRE_HOURS = 24
PIN_CHANGE_EXPIRE_HOURS = 1


@router.post("/signup", response_model=UserResponse)
def signup(body: UserCreate, db: Session = Depends(get_db)):
    init_db()
    if db.query(UserModel).filter(UserModel.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    salt = secrets.token_bytes(16)
    salt_b64 = base64.urlsafe_b64encode(salt).decode("ascii")
    verify_token = secrets.token_urlsafe(32)
    verify_expires = datetime.utcnow() + timedelta(hours=VERIFY_EXPIRE_HOURS)
    user = UserModel(
        name=body.name,
        email=body.email,
        pin_hash=hash_pin(body.pin),
        encryption_salt=salt_b64,
        email_verified=0,
        email_verify_token=verify_token,
        email_verify_expires=verify_expires,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    try:
        send_verification_email(user.email, user.name, verify_token)
        send_welcome_email(user.email, user.name)
    except Exception:
        pass
    return _user_response(user)


@router.post("/login")
def login(body: UserLogin, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.email == body.email).first()
    if not user or not verify_pin(body.pin, user.pin_hash):
        raise HTTPException(status_code=401, detail="Invalid email or PIN")
    token = create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _user_response(user),
        "encryption_salt": user.encryption_salt,
    }


@router.post("/verify-email")
def verify_email(body: VerifyEmailBody, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.email_verify_token == body.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")
    if user.email_verify_expires and user.email_verify_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Verification link has expired")
    user.email_verified = 1
    user.email_verify_token = None
    user.email_verify_expires = None
    db.commit()
    return {"message": "Email verified", "user": _user_response(user)}


@router.post("/request-pin-change")
def request_pin_change(body: RequestPinChangeBody, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.email == body.email).first()
    if not user:
        return {"message": "If that email is registered, you will receive a link to change your PIN."}
    pin_token = secrets.token_urlsafe(32)
    pin_expires = datetime.utcnow() + timedelta(hours=PIN_CHANGE_EXPIRE_HOURS)
    user.pin_change_token = pin_token
    user.pin_change_expires = pin_expires
    db.commit()
    try:
        send_pin_change_email(user.email, user.name, pin_token)
    except Exception:
        pass
    return {"message": "If that email is registered, you will receive a link to change your PIN."}


@router.post("/confirm-pin-change")
def confirm_pin_change(body: ConfirmPinChangeBody, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.pin_change_token == body.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired link")
    if user.pin_change_expires and user.pin_change_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Link has expired")
    user.pin_hash = hash_pin(body.new_pin)
    user.pin_change_token = None
    user.pin_change_expires = None
    db.commit()
    return {"message": "PIN updated. You can log in with your new PIN."}
