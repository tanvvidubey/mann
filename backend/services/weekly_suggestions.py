"""Weekly activity suggestions from journal interactions only (Ollama)."""
from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, List, Tuple

import httpx

from services.mood_analyzer import OLLAMA_BASE

logger = logging.getLogger(__name__)

# Suggestions can run longer than entry analysis (large prompt + JSON)
SUGGESTIONS_HTTP_TIMEOUT = float(os.getenv("SUGGESTIONS_HTTP_TIMEOUT", "75"))


def _suggestions_ollama_model() -> str:
    """Read at call time so backend/.env loaded from main.py is visible."""
    return (os.getenv("OLLAMA_MODEL_SUGGESTIONS") or os.getenv("OLLAMA_MODEL") or "tinyllama").strip()

# Ollama structured output (JSON Schema) — strongly typed suggestions when supported
SUGGESTIONS_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "suggestions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "detail": {"type": "string"},
                },
                "required": ["title", "detail"],
            },
        }
    },
    "required": ["suggestions"],
}

# Titles/phrases that mean the model echoed the prompt or log headers (not real actions).
_JUNK_TITLE_PATTERNS = re.compile(
    r"factual summary|json array|===|newest first|^task\s*:|^output|^rules\(|"
    r"based on the log entries|data for this user|companion reflection:|"
    r"one-line summary|key thoughts:|preview \(their words\)|"
    r"^journal log\b|^journal entry\b|^\d+\s*$|^\d+\.\s*task\b",
    re.I,
)
_JUNK_DETAIL_PATTERNS = re.compile(
    r"journal log \(newest|=== data for this user|return only a json",
    re.I,
)

# Model pasted the stats block or prompt example back into title/detail
_ECHO_OR_DUMP_PATTERNS = re.compile(
    r"Moody?\s+frequency|Moo+d\s+score|\bscore\s+range:\s*\d|Newest\s+entry:\s*\d{4}|"
    r"Their\s+own\s+words\s*\(|preview\s+snippets?|FACTUAL\s+SUMMARY|EACH\s+ENTRY|"
    r"\[\d+\]\s+Date\s+\d{4}-\d{2}-\d{2}|Companion\s+reflection\s*\(from|"
    r"One-line\s+summary:\s|Key thoughts:\s|Entries in this window:|Mood sequence\s*\(|"
    r"Why\s+it\s+fits\s+their\s+journal:\s*Why\s+it\s+fits|"
    r"Why it fits their journal:\s*$|"
    r"\baverage\s+[\d.]+\s*\)\s*\.|mood\s+calm\s*\(\s*5\s*/\s*10\s*\)",
    re.I,
)

_BAD_PLACEHOLDER_TITLES = frozenset(
    x.lower()
    for x in (
        "short action",
        "long action",
        "concrete action",
        "title",
        "action",
        "suggestion",
        "activity",
        "item",
    )
)
# Whole-word placeholder titles (avoid matching "short actionable …")
_PLACEHOLDER_TITLE_RE = re.compile(
    r"^\s*(short|long|concrete)\s+action\s*$",
    re.I,
)

# Single-word titles that are usually mood labels copied from data, not actions
_MOOD_ECHO_TITLE = re.compile(
    r"^(calm|sad|angry|anxious|happy|low|stressed|overwhelmed|upset|worried|"
    r"fine|okay|neutral|tired|empty|depressed|nervous)$",
    re.I,
)


SUGGESTIONS_PROMPT = """You suggest 3–6 kind, practical things someone could try THIS WEEK for wellbeing. Ideas must be ACCURATE to their journal only.

Output ONE JSON object only. No markdown, no text before or after the JSON.

Required JSON shape:
{{"suggestions":[{{"title":"…","detail":"…"}},…]}}

Accuracy (critical):
- Every "detail" must clearly connect to something they actually wrote: reuse a distinctive word or short phrase from their Preview, One-line summary, or Key thoughts (put it in quotes if you like). If you cannot tie an idea to a specific line in the data below, do not include that item.
- Do not guess diagnoses, relationships, or life events that are not stated. Do not mention therapy/medication unless they did.
- Do not restate statistics, headers, or long lists from the journal block.

Style:
- "title": specific action (verb phrase). NOT a mood label alone ("Calm"). NOT "Short action".
- "detail": max 2 short sentences, under 260 characters, calm tone.

Journal data:
{journal_block}
"""


def _extract_json_object(text: str) -> Any | None:
    text = (text or "").strip()
    if not text:
        return None
    # Strip common BOM / odd spaces
    text = text.lstrip("\ufeff")
    if "```" in text:
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        else:
            text = text.split("```")[1].split("```")[0].strip()
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        pass
    decoder = json.JSONDecoder()
    for i, ch in enumerate(text):
        if ch != "{":
            continue
        try:
            obj, _ = decoder.raw_decode(text[i:])
            return obj
        except json.JSONDecodeError:
            continue
    return None


_STOPWORDS = frozenset(
    "that this with from have been were they them what when where which your about "
    "just like some make feel feeling really very today here need want tell more than "
    "then also into would could there their will been into does dont dont im ive ill "
    "cant wont thats youre".split()
)


def _grounding_text_corpus(block: str) -> str:
    """User-originated text from the journal blob (not AI companion reflections)."""
    if not (block or "").strip():
        return ""
    chunks: List[str] = []
    for line in block.splitlines():
        line = line.strip()
        for prefix in (
            "Preview (their words):",
            "One-line summary:",
            "Key thoughts:",
        ):
            if prefix in line:
                after = line.split(prefix, 1)[-1].strip()
                if after and after != "—":
                    chunks.append(after)
    m = re.search(
        r"Their own words \(preview snippets[^:]*\):\s*(.+)$",
        block,
        re.I | re.M,
    )
    if m:
        for part in m.group(1).split("|"):
            p = part.strip()
            if p and p != "—":
                chunks.append(p)
    return " ".join(chunks)


def _significant_tokens(corpus: str) -> set[str]:
    raw = re.findall(r"[a-z0-9']{4,}", corpus.lower())
    return {t for t in raw if t not in _STOPWORDS and not t.isdigit()}


def _is_grounded_in_journal(title: str, detail: str, corpus: str, tokens: set[str]) -> bool:
    """True if title+detail clearly references their journal wording (skip if almost no user text)."""
    if len(corpus.strip()) < 10:
        return True
    combined = f"{title} {detail}".lower()
    if any(len(t) >= 5 and t in combined for t in tokens):
        return True
    hits4 = [t for t in tokens if len(t) == 4 and t in combined]
    if len(hits4) >= 2:
        return True
    words = re.sub(r"\s+", " ", corpus.lower()).strip().split()
    for i in range(0, min(len(words) - 3, 60)):
        phrase = " ".join(words[i : i + 4])
        if len(phrase) >= 14 and phrase in combined:
            return True
    return False


def _themed_fallback_cards(block: str) -> List[dict]:
    """Extra cards when using fallback — still tied to themes in their text."""
    b = (block or "").lower()
    cards: List[dict] = []

    if any(
        x in b
        for x in (
            "someone to talk",
            "talk to",
            "need someone",
            "want someone",
            "lonely",
            "alone",
            "isolated",
        )
    ):
        cards.append(
            {
                "title": "Send one honest check-in",
                "detail": (
                    "You’ve said you want someone to talk to. A short message to one person you trust "
                    "— even “rough day, no need to reply” — can ease the pressure to explain everything."
                ),
            }
        )

    if any(x in b for x in ("anxious", "anxiety", "worried", "worry", "panic", "nervous")):
        cards.append(
            {
                "title": "Five minutes of paced breathing",
                "detail": (
                    "You’ve written about feeling anxious or worried. Try inhale for 4, exhale for 6, "
                    "for just five minutes before you decide your next step."
                ),
            }
        )

    if any(x in b for x in ("angry", "anger", "frustrated", "frustration", "mad ")):
        cards.append(
            {
                "title": "Move anger through your body",
                "detail": (
                    "You’ve felt angry or frustrated in these entries. A brisk walk, punching a pillow, "
                    "or cold water on your face can discharge some of it before you respond to anyone."
                ),
            }
        )

    if "mango" in b or "mangos" in b or "mangoes" in b:
        cards.append(
            {
                "title": "Small comfort that’s yours",
                "detail": (
                    "You mentioned missing mangos. When you can, treat yourself to one small sensory "
                    "comfort (food, scent, music) without judging whether you “deserve” it."
                ),
            }
        )

    if any(x in b for x in ("creative block", "creative", "stuck", "writer", "can't write", "cannot write")):
        cards.append(
            {
                "title": "Ten minutes of messy creation",
                "detail": (
                    "You wrote about creative block or feeling stuck. Set a timer for ten minutes with "
                    "no goal except putting something imperfect on paper or voice memo."
                ),
            }
        )

    if any(x in b for x in ("sad", "sadness", "low today", "feeling low", "depressed", "heavy")):
        cards.append(
            {
                "title": "Name the weight in one line",
                "detail": (
                    "Your entries carry sadness or heaviness. Writing a single line — “today feels like …” "
                    "— can make the feeling a bit less vague."
                ),
            }
        )

    seen: set[str] = set()
    out: List[dict] = []
    for c in cards:
        t = c["title"]
        if t not in seen:
            seen.add(t)
            out.append(c)
    return out[:4]


def _item_to_title_detail(x: Any) -> tuple[str, str]:
    """Map varied model keys to title/detail."""
    if not isinstance(x, dict):
        return "", ""
    lower = {str(k).lower(): v for k, v in x.items()}
    pairs = [
        ("title", "detail"),
        ("title", "description"),
        ("action", "detail"),
        ("action", "rationale"),
        ("heading", "body"),
        ("name", "description"),
    ]
    for tk, dk in pairs:
        if tk in lower and dk in lower:
            return str(lower[tk]).strip(), str(lower[dk]).strip()
    t = str(x.get("title") or x.get("action") or x.get("heading") or "").strip()
    d = str(
        x.get("detail")
        or x.get("description")
        or x.get("body")
        or x.get("rationale")
        or ""
    ).strip()
    return t, d


def _is_valid_suggestion(title: str, detail: str) -> bool:
    t = (title or "").strip()
    d = (detail or "").strip()
    if len(t) < 4 or len(t) > 100:
        return False
    if len(d) < 15 or len(d) > 950:
        return False
    # Reject stats dumps and pasted prompt lines (even if JSON was valid)
    if _ECHO_OR_DUMP_PATTERNS.search(d) or _ECHO_OR_DUMP_PATTERNS.search(t):
        return False
    tl = t.lower()
    if tl in _BAD_PLACEHOLDER_TITLES:
        return False
    if _PLACEHOLDER_TITLE_RE.match(t):
        return False
    if _MOOD_ECHO_TITLE.match(t):
        return False
    # Pipe-chained preview dumps (blob uses "a | b | c")
    if d.count("|") >= 2:
        return False
    if len(d) > 320:
        return False
    dl = d.lower()
    if "why it fits their journal" in dl:
        return False
    if _JUNK_TITLE_PATTERNS.search(t):
        return False
    if _JUNK_DETAIL_PATTERNS.search(d):
        return False
    if t.count(" ") > 12:
        return False
    return True


def _normalize_suggestions_list(
    raw: List[Any], journal_block: str | None = None
) -> List[dict]:
    corpus = _grounding_text_corpus(journal_block) if journal_block else ""
    tokens = _significant_tokens(corpus) if corpus else set()
    out: List[dict] = []
    for x in raw:
        t, d = _item_to_title_detail(x)
        if not _is_valid_suggestion(t, d):
            continue
        if journal_block and not _is_grounded_in_journal(t, d, corpus, tokens):
            continue
        out.append({"title": t[:100], "detail": d[:900]})
        if len(out) >= 7:
            break
    return out


def filter_valid_stored_suggestions(
    stored: List[Any], journal_block: str | None = None
) -> List[dict]:
    """Re-validate cached cards; optional journal_block enforces wording-level accuracy."""
    if not stored:
        return []
    return _normalize_suggestions_list(stored, journal_block=journal_block)


def ensure_usable_suggestions(payload: dict[str, Any], journal_block: str) -> tuple[List[dict], str]:
    """
    If the model payload fails current validation, use journal-grounded fallback.
    Use when persisting refresh so bad JSON never stays in the DB.
    """
    jb = journal_block.strip() if journal_block else ""
    good = filter_valid_stored_suggestions(
        payload.get("suggestions") or [],
        journal_block=jb or None,
    )
    if len(good) >= 2:
        return good, str(payload.get("note") or "")
    block = (journal_block or "").strip() or "(No journal entries in the last few weeks.)"
    suggestions, note = _fallback_suggestions_from_journal_block(block)
    return suggestions, note


def _parse_model_response(
    response_text: str, journal_block: str | None
) -> List[dict]:
    obj = _extract_json_object(response_text)
    if obj is None:
        return []

    items: List[Any] = []
    if isinstance(obj, dict):
        s = obj.get("suggestions")
        if isinstance(s, list):
            items = s
        elif isinstance(s, dict):
            items = [s]
    elif isinstance(obj, list):
        items = obj

    return _normalize_suggestions_list(items, journal_block=journal_block)


def _ollama_options() -> dict[str, Any]:
    return {
        "num_predict": 400,
        "temperature": 0.12,
        "top_p": 0.82,
    }


def _ollama_generate(
    client: httpx.Client, prompt: str, format_payload: Any | None
) -> str | None:
    body: dict[str, Any] = {
        "model": _suggestions_ollama_model(),
        "prompt": prompt,
        "stream": False,
        "options": _ollama_options(),
    }
    if format_payload is not None:
        body["format"] = format_payload
    r = client.post(f"{OLLAMA_BASE}/api/generate", json=body)
    if r.status_code == 400:
        return None
    r.raise_for_status()
    return (r.json() or {}).get("response") or ""


def _ollama_chat(
    client: httpx.Client, prompt: str, format_payload: Any | None
) -> str | None:
    body: dict[str, Any] = {
        "model": _suggestions_ollama_model(),
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "options": _ollama_options(),
    }
    if format_payload is not None:
        body["format"] = format_payload
    r = client.post(f"{OLLAMA_BASE}/api/chat", json=body)
    if r.status_code == 400:
        return None
    r.raise_for_status()
    data = r.json() or {}
    msg = data.get("message") or {}
    return (msg.get("content") or "").strip() or None


def _collect_suggestions_from_ollama(journal_block: str) -> List[dict]:
    """
    Try a few Ollama modes. Prefer JSON that passes strict journal grounding; if the model
    paraphrases too much, fall back to structure-only validation (same cards, no phrase match).
    """
    block = (journal_block or "")[:10000]
    prompt = SUGGESTIONS_PROMPT.format(journal_block=block)
    attempts: list[tuple[str, Any | None]] = [
        ("chat", "json"),
        ("generate", "json"),
        ("chat", None),
    ]

    with httpx.Client(timeout=SUGGESTIONS_HTTP_TIMEOUT) as client:
        for kind, fmt in attempts:
            try:
                if kind == "generate":
                    raw_txt = _ollama_generate(client, prompt, fmt)
                else:
                    raw_txt = _ollama_chat(client, prompt, fmt)
                if not raw_txt:
                    continue
                strict = _parse_model_response(raw_txt, block)
                if len(strict) >= 2:
                    return strict
                loose = _parse_model_response(raw_txt, None)
                if len(loose) >= 2:
                    logger.info(
                        "weekly_suggestions: model returned JSON but strict phrase grounding dropped "
                        "all cards; using %d cards with structure-only validation",
                        len(loose),
                    )
                    return loose
            except (httpx.HTTPError, json.JSONDecodeError, TypeError) as e:
                logger.debug("suggestions attempt %s fmt=%s: %s", kind, type(fmt).__name__, e)
                continue

    return []


def _fallback_suggestions_from_journal_block(block: str) -> Tuple[List[dict], str]:
    """Grounded defaults when the model output is unusable."""
    preview = ""
    m = re.search(r"Preview \(their words\):\s*(.+)", block)
    if m:
        preview = m.group(1).split("\n")[0].strip()[:160]

    mood_line = ""
    m2 = re.search(r"\bmood\s+(\w+)\s*\(\s*(\d+)\s*/\s*10\s*\)", block, re.I)
    if m2:
        mood_line = f"{m2.group(1)} ({m2.group(2)}/10)"

    sug_model = _suggestions_ollama_model().lower()
    if "tinyllama" in sug_model or sug_model in ("phi", "phi:latest"):
        note = (
            "The suggestions model often skips valid JSON. For fuller AI lists, set "
            "OLLAMA_MODEL_SUGGESTIONS=mistral in backend .env, run `ollama pull mistral`, "
            "restart the server, and refresh."
        )
    else:
        note = (
            "Ollama didn’t return usable JSON for suggestions, so these ideas use your journal text only "
            "(not medical advice). Try “Refresh from journal” again, confirm `ollama serve` is running, "
            f"and that `ollama pull {_suggestions_ollama_model()}` completed."
        )

    if preview or mood_line:
        if preview:
            checkin_detail = (
                f"You wrote: “{preview[:100]}{'…' if len(preview) > 100 else ''}”. "
                "Pick a 10-minute window this week to name one feeling out loud or on paper — no fixing, just noticing."
            )
        else:
            checkin_detail = (
                f"Your saved entries show mood {mood_line}. "
                "Take 10 minutes this week to notice how that feels in your body — no need to fix anything yet."
            )
        base = [
            {
                "title": "One gentle check-in with yourself",
                "detail": checkin_detail,
            },
            {
                "title": "Lower the bar for “productive”",
                "detail": (
                    "Your entry reads heavy. Choose one tiny win (shower, one meal, a short walk inside) "
                    "and count it as enough for that day."
                ),
            },
            {
                "title": "Add a short journal note mid-week",
                "detail": (
                    "A few lines on what shifted (even “same as Monday”) helps the next suggestions "
                    "stay tied to what you actually said."
                ),
            },
        ]
        themed = _themed_fallback_cards(block)
        merged: List[dict] = []
        seen: set[str] = set()
        for item in themed + base:
            k = item["title"].strip().lower()
            if k in seen:
                continue
            seen.add(k)
            merged.append(item)
            if len(merged) >= 3:
                break
        return merged[:3], note

    return (
        [
            {
                "title": "Write one short entry",
                "detail": "Once there’s text in your journal, suggestions can mirror your words and mood.",
            },
            {
                "title": "Name one thing that felt heavy",
                "detail": "A single sentence in your next entry is enough to anchor future ideas.",
            },
        ],
        note,
    )


def generate_fast_suggestions_from_journal(
    journal_blob: str, *, background_pending_note: bool = False
) -> dict:
    """
    Journal-only suggestions (no LLM). Used for instant GET responses; optional hint when AI will follow.
    """
    block = (journal_blob or "").strip() or "(No journal entries in the last few weeks.)"
    suggestions, note = _fallback_suggestions_from_journal_block(block)
    if background_pending_note:
        hint = " AI versions load in the background — refresh in about a minute if you want those."
        note = f"{note}{hint}" if note else hint.strip()
    return {"suggestions": suggestions, "note": note}


def generate_weekly_suggestions_from_journal(journal_block: str) -> dict:
    """
    journal_block: factual summary + entry lines from journal routes.
    Returns {"suggestions": [{title, detail}, ...], "note": str}
    """
    block = (journal_block or "").strip() or "(No journal entries in the last few weeks.)"

    raw = _collect_suggestions_from_ollama(block)

    cleaned_strict = filter_valid_stored_suggestions(raw, journal_block=block)
    if len(cleaned_strict) >= 2:
        return {"suggestions": cleaned_strict, "note": ""}

    cleaned_loose = filter_valid_stored_suggestions(raw, journal_block=None)
    if len(cleaned_loose) >= 2:
        return {
            "suggestions": cleaned_loose,
            "note": (
                "These are from the model; phrase-level matching to your journal was relaxed so they could show up."
            ),
        }

    logger.warning(
        "weekly_suggestions: model=%r gave no usable cards (parsed list len=%d); using fallback",
        _suggestions_ollama_model(),
        len(raw),
    )
    suggestions, note = ensure_usable_suggestions({"suggestions": raw, "note": ""}, block)
    return {"suggestions": suggestions, "note": note}
