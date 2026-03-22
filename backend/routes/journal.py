import base64
import json
import threading
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db, SessionLocal, EntryModel, UserModel, init_db
from routes.deps import get_current_user
from models import EntryCreate, EntryResponse, EntryListItem
from services.encryption import encrypt_content, decrypt_content
from services.whisper_transcribe import transcribe_audio
from services.mood_analyzer import stream_mood_analysis
from services.chroma_search import add_entry as chroma_add, search_entries as chroma_search
from services.weekly_suggestions import (
    generate_fast_suggestions_from_journal,
    generate_weekly_suggestions_from_journal,
)

# Bump when suggestion format / disclaimer logic changes so clients don’t keep stale `note` from DB.
SUGGESTIONS_CACHE_VERSION = 10

router = APIRouter(prefix="/api/journal", tags=["journal"])


def _suggestion_cards_look_valid(suggestions: list | None) -> bool:
    """Fast shape check so GET can return warm cache without re-querying the whole journal."""
    if not isinstance(suggestions, list) or len(suggestions) < 2:
        return False
    for s in suggestions[:8]:
        if not isinstance(s, dict):
            return False
        t = (s.get("title") or "").strip()
        d = (s.get("detail") or "").strip()
        if len(t) < 4 or len(d) < 15:
            return False
    return True


def _coerce_suggestions_cache(raw) -> dict | None:
    """ORM/DB may return JSON as dict or as a string."""
    if raw is None:
        return None
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else None
        except (json.JSONDecodeError, TypeError):
            return None
    return None


@router.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user),
):
    """Accept audio blob, return transcript. User can review/edit before saving."""
    init_db()
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty audio")
    try:
        text = transcribe_audio(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    return {"transcript": text}


def _profile_context(user: UserModel) -> str:
    """Build a short context string from user profile for AI personalization."""
    parts = []
    if getattr(user, "bio", None):
        parts.append(f"About: {user.bio}")
    if getattr(user, "hobbies", None) and isinstance(user.hobbies, list):
        parts.append("Hobbies: " + ", ".join(str(h) for h in user.hobbies))
    if getattr(user, "likes", None):
        parts.append(f"Likes: {user.likes}")
    if getattr(user, "dislikes", None):
        parts.append(f"Dislikes: {user.dislikes}")
    if getattr(user, "other_details", None):
        parts.append(f"Other: {user.other_details}")
    return "\n".join(parts) if parts else ""


# Phrases that indicate the user wants reflection to use their profile (hobbies, likes, etc.)
_PROFILE_REFERENCE_PHRASES = (
    "my profile", "my hobbies", "my likes", "my dislikes", "my interests",
    "based on my profile", "consider my profile", "use my profile",
    "from my profile", "what i like", "what i dislike", "what i enjoy",
    "consider my hobbies", "consider my likes", "using my details",
    "based on what i like", "based on my interests", "my preferences",
    "refer to my profile", "use my hobbies", "my bio", "about me",
)


def _entry_asks_for_profile(entry_text: str) -> bool:
    """True only when the user refers to or asks for profile-based reflection."""
    if not entry_text or not entry_text.strip():
        return False
    lower = entry_text.lower().strip()
    return any(phrase in lower for phrase in _PROFILE_REFERENCE_PHRASES)


def _journal_interactions_blob(
    db: Session,
    user_id: int,
    days: int = 21,
    limit: int = 45,
    *,
    preview_snippet_limit: int = 15,
    preview_snippet_chars: int = 1800,
) -> str:
    """Structured journal context for suggestions: factual stats + per-entry lines."""
    from datetime import datetime, timedelta
    from collections import Counter

    since = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.query(EntryModel)
        .filter(EntryModel.user_id == user_id, EntryModel.created_at >= since)
        .order_by(EntryModel.created_at.desc())
        .limit(limit)
        .all()
    )
    if not rows:
        return ""

    moods_order = []
    scores = []
    previews = []
    parts = []

    for e in rows:
        moods_order.append((e.mood or "unknown").lower())
        scores.append(int(e.mood_score) if e.mood_score is not None else 5)
        p = (e.transcript_preview or "").strip()
        if p and p != "—":
            previews.append(p)

    mood_counts = Counter(moods_order)
    mood_counts_str = ", ".join(f"{m}×{c}" for m, c in mood_counts.most_common(8))
    seq = " → ".join(moods_order[:12])
    if len(moods_order) > 12:
        seq += " → …"
    newest = rows[0]
    oldest = rows[-1]
    d_new = newest.created_at.date() if hasattr(newest.created_at, "date") else newest.created_at
    d_old = oldest.created_at.date() if hasattr(oldest.created_at, "date") else oldest.created_at
    avg_score = round(sum(scores) / len(scores), 1) if scores else 5
    min_s, max_s = (min(scores), max(scores)) if scores else (5, 5)

    # Short preview anchors — long pipe-joined lists tempt the model to paste them back verbatim
    preview_anchors = " | ".join(previews[:preview_snippet_limit])[:preview_snippet_chars]

    parts.append("--- FACTUAL SUMMARY (use for accuracy; do not contradict) ---")
    parts.append(f"Entries in this window: {len(rows)} (from {d_old} to {d_new}, newest listed first below).")
    parts.append(f"Mood frequency: {mood_counts_str or 'n/a'}.")
    parts.append(f"Mood sequence (newest→older, up to 12): {seq}.")
    parts.append(f"Mood score range: {min_s}–{max_s} (average {avg_score}).")
    parts.append(f"Newest entry: {d_new}, mood {newest.mood} ({newest.mood_score}/10).")
    if preview_anchors:
        parts.append(f"Their own words (preview snippets, may truncate): {preview_anchors}")
    parts.append("")
    parts.append("--- EACH ENTRY (newest first) ---")

    for i, e in enumerate(rows, start=1):
        d = e.created_at.date() if hasattr(e.created_at, "date") else e.created_at
        kt = e.key_thoughts or []
        if not isinstance(kt, list):
            kt = [str(kt)]
        kt_s = " · ".join(str(t)[:140] for t in kt[:3])
        summ = (e.one_line_summary or "").strip() or "—"
        prev = (e.transcript_preview or "").strip() or "—"
        refl = (e.reflection or "").strip()
        if len(refl) > 450:
            refl = refl[:447] + "…"
        refl_s = refl or "—"
        et = getattr(e, "entry_type", "voice") or "voice"
        parts.append(
            f"[{i}] Date {d} · {et} · mood {e.mood} ({e.mood_score}/10)\n"
            f"    Preview (their words): {prev}\n"
            f"    One-line summary: {summ}\n"
            f"    Key thoughts: {kt_s or '—'}\n"
            f"    Companion reflection (from their entry): {refl_s}"
        )

    return "\n".join(parts)


def refresh_suggestions_cache(user_id: int, *, use_llm: bool = True):
    """Regenerate suggestions from journal interactions only; persist on user row."""
    from datetime import datetime

    db = SessionLocal()
    try:
        user = db.query(UserModel).filter(UserModel.id == user_id).first()
        if not user:
            return None
        journal_blob = _journal_interactions_blob(
            db,
            user_id,
            preview_snippet_limit=8,
            preview_snippet_chars=720,
        )
        if use_llm:
            if not journal_blob.strip():
                payload = generate_weekly_suggestions_from_journal("")
            else:
                payload = generate_weekly_suggestions_from_journal(journal_blob)
        else:
            payload = generate_fast_suggestions_from_journal(
                journal_blob,
                background_pending_note=False,
            )
        out = {
            "v": SUGGESTIONS_CACHE_VERSION,
            "suggestions": payload.get("suggestions") or [],
            "note": payload.get("note") or "",
            "updated_at": datetime.utcnow().isoformat() + "Z",
        }
        user.suggestions_cache = out
        db.commit()
        return out
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def _stream_save_body(
    entry_id,
    user_id,
    transcript,
    entry_type_val,
    audio_duration_seconds,
    user_name,
    profile_ctx,
    preview,
    created_at_iso,
    get_db_session,
):
    """Generator: yield NDJSON lines for streaming save response. Uses plain args so it's safe in a thread pool."""
    # First send entry so client can show it immediately
    yield json.dumps({
        "event": "entry",
        "id": entry_id,
        "transcript_preview": preview,
        "transcript": transcript,
        "mood": "calm",
        "mood_score": 5,
        "key_thoughts": [],
        "reflection": "",
        "one_line_summary": "",
        "audio_duration_seconds": audio_duration_seconds,
        "entry_type": entry_type_val,
        "created_at": created_at_iso,
    }) + "\n"
    # Stream Ollama response
    for chunk, full in stream_mood_analysis(transcript, user_name=user_name, profile_context=profile_ctx):
        if chunk is not None:
            yield json.dumps({"event": "chunk", "text": chunk}) + "\n"
        else:
            analysis = full
            # Use a new DB session (generator runs in thread pool, request session is not safe)
            db = get_db_session()
            try:
                entry = db.query(EntryModel).filter(EntryModel.id == entry_id).first()
                if entry:
                    entry.mood = analysis["mood"]
                    entry.mood_score = analysis["mood_score"]
                    entry.key_thoughts = analysis["key_thoughts"]
                    entry.reflection = analysis["gentle_reflection"]
                    entry.one_line_summary = analysis.get("one_line_summary", "") or ""
                    db.commit()
            finally:
                db.close()

            def _refresh_suggestions_bg():
                try:
                    refresh_suggestions_cache(user_id)
                except Exception:
                    pass

            threading.Thread(target=_refresh_suggestions_bg, daemon=True).start()

            yield json.dumps({
                "event": "done",
                "mood": analysis["mood"],
                "mood_score": analysis["mood_score"],
                "key_thoughts": analysis["key_thoughts"],
                "reflection": analysis["gentle_reflection"],
                "one_line_summary": analysis.get("one_line_summary", "") or "",
            }) + "\n"


@router.post("/save")
def save_entry(
    transcript: str = Form(...),
    pin: str = Form(...),
    audio_duration_seconds: float = Form(None),
    entry_type: str = Form("voice"),
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save entry and stream the companion response. Returns NDJSON: event=entry first, then event=chunk (text), then event=done."""
    init_db()
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    salt_bytes = base64.urlsafe_b64decode(user.encryption_salt.encode())
    encrypted, _ = encrypt_content(transcript, pin, salt=salt_bytes)
    preview = (transcript[:50] + "…") if len(transcript) > 50 else transcript
    entry_type_val = "text" if entry_type == "text" else "voice"
    profile_ctx = _profile_context(user) if _entry_asks_for_profile(transcript) else None

    # Create entry with placeholders so we have an id immediately
    entry = EntryModel(
        user_id=user_id,
        encrypted_content=encrypted,
        transcript_preview=preview,
        mood="calm",
        mood_score=5,
        key_thoughts=[],
        reflection="",
        one_line_summary="",
        audio_duration_seconds=audio_duration_seconds,
        entry_type=entry_type_val,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    def _index_chroma():
        try:
            chroma_add(entry.id, user_id, transcript)
        except Exception:
            pass

    threading.Thread(target=_index_chroma, daemon=True).start()

    created_at_iso = entry.created_at.isoformat() if hasattr(entry.created_at, "isoformat") else str(entry.created_at)
    return StreamingResponse(
        _stream_save_body(
            entry.id,
            user_id,
            transcript,
            entry_type_val,
            audio_duration_seconds,
            user.name,
            profile_ctx,
            preview,
            created_at_iso,
            get_db_session=SessionLocal,
        ),
        media_type="application/x-ndjson",
    )


@router.get("/entries", response_model=list)
def list_entries(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    init_db()
    rows = db.query(EntryModel).filter(EntryModel.user_id == user_id).order_by(EntryModel.created_at.desc()).all()
    return [
        EntryListItem(
            id=e.id,
            transcript_preview=e.transcript_preview,
            mood=e.mood,
            mood_score=e.mood_score,
            one_line_summary=e.one_line_summary,
            entry_type=getattr(e, "entry_type", "voice"),
            created_at=e.created_at,
        )
        for e in rows
    ]


@router.get("/entry/{entry_id}")
def get_entry(
    entry_id: int,
    pin: str,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns one journal entry with decrypted transcript and AI insights (reflection, mood, etc.)."""
    init_db()
    entry = db.query(EntryModel).filter(EntryModel.id == entry_id, EntryModel.user_id == user_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    salt_b64 = user.encryption_salt
    try:
        transcript = decrypt_content(entry.encrypted_content, pin, salt_b64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid PIN or corrupted data")
    return EntryResponse(
        id=entry.id,
        transcript_preview=entry.transcript_preview,
        transcript=transcript,
        mood=entry.mood,
        mood_score=entry.mood_score,
        key_thoughts=entry.key_thoughts,
        reflection=entry.reflection,
        one_line_summary=entry.one_line_summary or "",
        audio_duration_seconds=entry.audio_duration_seconds,
        entry_type=getattr(entry, "entry_type", "voice"),
        created_at=entry.created_at,
    )


@router.get("/insights")
def get_insights(
    days: int = 30,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mood data for charts: last N days with mood_score and mood."""
    from datetime import datetime, timedelta
    from sqlalchemy import func

    init_db()
    since = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.query(EntryModel)
        .filter(EntryModel.user_id == user_id, EntryModel.created_at >= since)
        .order_by(EntryModel.created_at.asc())
        .all()
    )
    by_day = []
    for e in rows:
        d = e.created_at.date() if hasattr(e.created_at, "date") else e.created_at
        by_day.append({"date": str(d), "mood_score": e.mood_score, "mood": e.mood, "entry_id": e.id})
    # Aggregate for "most common mood" and "best day"
    from collections import Counter
    moods = [x["mood"] for x in by_day]
    most_common = Counter(moods).most_common(1)[0][0] if moods else None
    best = max(by_day, key=lambda x: x["mood_score"]) if by_day else None
    return {
        "entries": by_day,
        "total_entries": len(by_day),
        "most_common_mood": most_common,
        "best_day": best,
    }


@router.get("/suggestions")
def get_suggestions(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Cached weekly ideas from journal interactions only (entries, moods, summaries, previews,
    key thoughts, reflections). GET is fast (journal-only or warm cache). Use POST …/refresh for LLM.
    """
    # Skip init_db() here — startup + other routes already ensured schema; saves latency on every open.
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    cache = _coerce_suggestions_cache(getattr(user, "suggestions_cache", None))
    if (
        cache
        and cache.get("v") == SUGGESTIONS_CACHE_VERSION
        and _suggestion_cards_look_valid(cache.get("suggestions"))
    ):
        return cache
    try:
        # Cold cache: build journal-only suggestions in one DB round-trip (no Ollama).
        fast = refresh_suggestions_cache(user_id, use_llm=False)
        if not fast:
            return {"suggestions": [], "note": "", "updated_at": None}
        return fast
    except Exception as ex:
        raise HTTPException(status_code=503, detail=f"Suggestions unavailable: {str(ex)}")


@router.post("/suggestions/refresh")
def post_suggestions_refresh(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Regenerate suggestions from current journal data (same rules as cache)."""
    init_db()
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        out = refresh_suggestions_cache(user_id)
        if not out:
            raise HTTPException(status_code=500, detail="Could not refresh suggestions")
        return out
    except HTTPException:
        raise
    except Exception as ex:
        raise HTTPException(status_code=503, detail=f"Suggestions unavailable: {str(ex)}")


class SearchBody(BaseModel):
    q: str


@router.post("/search")
def search(
    body: SearchBody,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Semantic search over past entries. Returns entry IDs sorted by relevance."""
    init_db()
    try:
        results = chroma_search(user_id, body.q, n_results=15)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    entry_ids = [r["entry_id"] for r in results]
    # Fetch entry list items for these ids (preserve order)
    if not entry_ids:
        return {"results": []}
    entries = db.query(EntryModel).filter(EntryModel.user_id == user_id, EntryModel.id.in_(entry_ids)).all()
    by_id = {e.id: e for e in entries}
    out = []
    for eid in entry_ids:
        e = by_id.get(eid)
        if e:
            out.append(
                EntryListItem(
                    id=e.id,
                    transcript_preview=e.transcript_preview,
                    mood=e.mood,
                    mood_score=e.mood_score,
                    one_line_summary=e.one_line_summary,
                    entry_type=getattr(e, "entry_type", "voice"),
                    created_at=e.created_at,
                )
            )
    return {"results": out}
