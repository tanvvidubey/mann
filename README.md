# Mann: AI-powered voice journal
A private, encrypted daily journal where you speak or write in **Hindi**, **English**, or **Hinglish**. AI understands your mood and thoughts, and you can search your past entries by meaning.

## Tech stack

- **Backend:** FastAPI (Python)
- **Frontend:** React + Vite + Tailwind CSS
- **Database:** PostgreSQL (entries, mood history)
- **Vector DB:** ChromaDB (semantic search)
- **Speech-to-text:** OpenAI Whisper (local, `whisper` package, model: small)
- **LLM:** Ollama with Mistral 7B (local)
- **Embeddings:** Ollama `nomic-embed-text` for ChromaDB
- **Encryption:** Fernet (key derived from user PIN)

## Prerequisites

- Python 3.10+
- Node 18+
- PostgreSQL (e.g. via Docker)
- [Ollama](https://ollama.ai) installed and running with:
  - `ollama pull tinyllama` (lightest; or set `OLLAMA_MODEL` in backend `.env` to e.g. `phi`, `mistral`)
  - `ollama pull nomic-embed-text`

## Quick start

### 1. Database

```bash
cd mann
docker-compose up -d
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env      # edit if needed
# First run: download Whisper model (can take a few minutes)
python -c "import whisper; whisper.load_model('small')"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload --timeout-keep-alive 300
```

```bash
# optional explicit env file (redundant if .env sits next to main.py)
uvicorn main:app --env-file .env --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Sign up, complete the onboarding (“Your journal is private and encrypted”), then use **Record** to add your first entry.

## API overview

| Method | Route | Description |
|--------|--------|-------------|
| POST | `/api/auth/signup` | Register (name, email, PIN) |
| POST | `/api/auth/login` | Login (email, PIN) |
| POST | `/api/journal/transcribe` | Upload audio → transcript |
| POST | `/api/journal/save` | Save entry (transcript + PIN) → encrypt, analyze, embed |
| GET | `/api/journal/entries` | List user’s entries |
| GET | `/api/journal/entry/{id}?pin=...` | Single entry (decrypted with PIN) |
| GET | `/api/journal/insights?days=7` | Mood data for charts |
| GET | `/api/journal/suggestions` | Cached weekly ideas (journal interactions only; auto-refresh on new entry) |
| POST | `/api/journal/suggestions/refresh` | Regenerate suggestions from current journal data |
| POST | `/api/journal/search` | Semantic search `{"q": "..."}` |

## Environment (backend)

- `DATABASE_URL` — PostgreSQL connection string (default: `postgresql://postgres:postgres@localhost:5432/mann`)
- `JWT_SECRET` — Secret for JWT (change in production)
- `WHISPER_MODEL` — Whisper model name (default: `small`)
- `CHROMA_PERSIST_DIR` — Directory for ChromaDB data (default: `./chroma_data`)
- `OLLAMA_MODEL_SUGGESTIONS` — Optional; defaults to `OLLAMA_MODEL`. Set e.g. `mistral` for more accurate weekly suggestions while keeping a small model for entry streaming.
- `SUGGESTIONS_HTTP_TIMEOUT` — Seconds for each Ollama call when generating suggestions (default `90`). Raise if your model is slow.

## Features

- **Voice recording** in the browser (MediaRecorder), with a simple waveform-style animation while recording.
- **Review & edit** transcript before saving.
- **AI analysis** (Ollama): mood, score, key thoughts, companion reflection, one-line summary per entry.
- **Suggestions** tab: ideas from journal entries only. **GET** is fast (cached or journal-only). **Refresh from journal** runs the LLM and may take a minute. Saving an entry refreshes the cache in the background (with LLM).
- **Encrypted storage:** journal text is encrypted with a key derived from your PIN; only metadata (mood, summary) is stored in plain form.
- **Weekly mood graph** (Recharts) and “Your week at a glance” (most common mood, total entries, best day).
- **Semantic search** over past entries (ChromaDB + nomic-embed-text).
- **Daily reminder** (browser notification, optional).

## Project structure

```
mann/
├── backend/
│   ├── main.py
│   ├── routes/ (auth, journal)
│   ├── services/ (whisper_transcribe, mood_analyzer, weekly_suggestions, encryption, chroma_search)
│   ├── models/
│   └── database.py
├── frontend/
│   ├── src/
│   │   ├── pages/ (Home, Record, Entry, Insights, Search, Login, Signup, Onboarding)
│   │   ├── components/ (VoiceRecorder, MoodGraph, EntryCard, Layout)
│   │   ├── context/ (AuthContext)
│   │   ├── api/ (client)
│   │   └── hooks/ (useDailyReminder)
│   └── ...
└── docker-compose.yml
```

