"""Load backend/.env before any module reads os.environ (uvicorn does not load .env unless --env-file)."""
from pathlib import Path

from dotenv import load_dotenv

_env = Path(__file__).resolve().parent / ".env"
if _env.is_file():
    load_dotenv(_env)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routes.auth import router as auth_router
from routes.journal import router as journal_router
from routes.profile import router as profile_router

app = FastAPI(title="Mann", description="AI-powered voice journaling")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(journal_router)
app.include_router(profile_router)


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
def root():
    return {"app": "Mann", "status": "ok"}
