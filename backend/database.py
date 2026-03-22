import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://tanvi:oodles@localhost:5432/mann"
)


def _engine_kwargs(url: str) -> dict:
    # SQLite + background threads (e.g. suggestions refresh) need this or writes can block/hang.
    if (url or "").strip().lower().startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}}
    return {}


engine = create_engine(DATABASE_URL, **_engine_kwargs(DATABASE_URL))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    pin_hash = Column(String(255), nullable=False)
    encryption_salt = Column(String(100), nullable=False)  # base64, for Fernet key derivation
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # Email verification
    email_verified = Column(Integer, default=0)  # 0 false, 1 true
    email_verify_token = Column(String(255), nullable=True)
    email_verify_expires = Column(DateTime(timezone=True), nullable=True)
    # PIN change
    pin_change_token = Column(String(255), nullable=True)
    pin_change_expires = Column(DateTime(timezone=True), nullable=True)
    # Profile
    bio = Column(Text, nullable=True)
    hobbies = Column(JSON, nullable=True)  # list of strings
    likes = Column(Text, nullable=True)
    dislikes = Column(Text, nullable=True)
    other_details = Column(Text, nullable=True)  # free-form
    # Cached weekly suggestions from journal interactions only; refreshed on new entry
    suggestions_cache = Column(JSON, nullable=True)


class EntryModel(Base):
    __tablename__ = "entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    encrypted_content = Column(Text, nullable=False)
    transcript_preview = Column(String(100), nullable=False)
    mood = Column(String(50), nullable=False)
    mood_score = Column(Integer, nullable=False)
    key_thoughts = Column(JSON, nullable=False)  # list of strings
    reflection = Column(Text, nullable=False)
    one_line_summary = Column(String(500), nullable=True)
    audio_duration_seconds = Column(Float, nullable=True)
    entry_type = Column(String(20), default="voice")  # voice | text
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # Chat room: list of {role: "user"|"assistant", content: str, created_at: str (ISO)}
    chat_messages = Column(JSON, nullable=True, default=list)


def _ensure_postgres_schema_patches():
    """Add columns when DB predates Alembic (e.g. suggestions_cache). Safe IF NOT EXISTS."""
    url = (DATABASE_URL or "").lower()
    if "postgres" not in url:
        return
    try:
        from sqlalchemy import text

        with engine.begin() as conn:
            conn.execute(
                text("ALTER TABLE users ADD COLUMN IF NOT EXISTS suggestions_cache JSONB")
            )
    except Exception:
        pass


def init_db():
    Base.metadata.create_all(bind=engine)
    _ensure_postgres_schema_patches()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
