import json
import os
import re
import httpx

OLLAMA_BASE = "http://localhost:11434"
OLLAMA_TIMEOUT = 90.0
# Lightest Ollama model; override with env OLLAMA_MODEL (e.g. tinyllama, phi, llama3.2:1b)
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "tinyllama")

# For streaming we ask for: reflection text first, then blank line, then JSON (no reflection in JSON).
MOOD_PROMPT_STREAM = """You are a warm, supportive friend and journaling companion. You talk back to the person like a caring friend: you use their name, acknowledge their feelings, offer comfort or validation, and ask 1–2 short follow-up questions. Never call them "user" — always use their name: {user_name}.

Reply in two parts.

PART 1 — Companion reply only (no JSON): Write 2–4 sentences speaking directly to {user_name}. Acknowledge what they shared, offer comfort or understanding, then 1–2 brief follow-up questions (e.g. "What do you think might help?" or "How did that feel?"). Use their name. Sound like a caring friend, not a therapist. Do not include any JSON or labels here.

Then leave one blank line.

PART 2 — One line of valid JSON only (no newlines inside), with exactly these keys:
- "mood": one of [happy, sad, anxious, calm, angry, confused, grateful, excited]
- "mood_score": integer 1–10 (1=very low, 10=very high)
- "key_thoughts": array of exactly 3 short strings (main thoughts)
- "one_line_summary": one sentence capturing the day

Use ONLY the journal entry and the following context when the entry refers to it. Do not invent facts.

{context}

Entry:
{entry}
"""

# Non-streaming: single JSON with gentle_reflection inside.
MOOD_PROMPT = """You are a warm, supportive friend and journaling companion. You talk back to the person like a caring friend: you use their name, acknowledge their feelings, offer comfort or validation, and ask 1–2 short follow-up questions to understand them better or show you care. Never call them "user" — always use their name: {user_name}.

Analyze this journal entry and return ONLY a valid JSON object (no markdown, no extra text) with exactly these keys:
- mood: one of [happy, sad, anxious, calm, angry, confused, grateful, excited]
- mood_score: integer from 1 to 10 (1=very low, 10=very high)
- key_thoughts: array of exactly 3 short bullet point strings summarizing main thoughts
- gentle_reflection: Your reply as their companion (2–4 sentences). Speak directly to {user_name}: acknowledge what they shared, offer comfort or understanding, then include 1–2 brief questions to follow up (e.g. "What do you think might help?" or "How did that feel?"). Use their name. Sound like a caring friend, not a therapist or analyst.
- one_line_summary: a single sentence capturing the day

Use ONLY the journal entry and the following context when the entry refers to it. Do not invent facts.

{context}

Entry:
{entry}
"""


def _extract_json(text: str):
    """Extract JSON from model output (may be wrapped in markdown). Returns dict or None if invalid."""
    if not text or not text.strip():
        return None
    text = text.strip()
    # Remove markdown code blocks if present
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
    # Find first { and last }
    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        text = text[start:end]
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return None


def _build_context(profile_context: str | None) -> str:
    if not profile_context or not profile_context.strip():
        return "No additional context provided."
    return "Context (use only if the entry refers to it):\n" + profile_context.strip()[:1500]


def analyze_mood(
    entry_text: str,
    user_name: str,
    profile_context: str | None = None,
) -> dict:
    """
    Send entry to Ollama Mistral 7B and parse mood JSON.
    user_name: the person's name — the AI will use it and never call them "user".
    profile_context: optional; only used when the entry refers to profile.
    Returns dict with: mood, mood_score, key_thoughts, gentle_reflection, one_line_summary
    """
    if not user_name or not user_name.strip():
        user_name = "there"  # fallback so we never say "user"
    else:
        user_name = user_name.strip()
    context = _build_context(profile_context)
    prompt = MOOD_PROMPT.format(
        user_name=user_name,
        context=context,
        entry=entry_text[:4000],
    )
    with httpx.Client(timeout=60.0) as client:
        r = client.post(
            f"{OLLAMA_BASE}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {"num_predict": 400},
            },
        )
        r.raise_for_status()
        data = r.json()
        response_text = data.get("response", "")

    parsed = _extract_json(response_text)
    if not parsed:
        return {
            "mood": "calm",
            "mood_score": 5,
            "key_thoughts": [],
            "gentle_reflection": response_text[:1000] if response_text else "",
            "one_line_summary": "",
        }
    mood = parsed.get("mood", "calm").lower()
    allowed = {"happy", "sad", "anxious", "calm", "angry", "confused", "grateful", "excited"}
    if mood not in allowed:
        mood = "calm"
    mood_score = max(1, min(10, int(parsed.get("mood_score", 5))))
    key_thoughts = parsed.get("key_thoughts", [])
    if not isinstance(key_thoughts, list):
        key_thoughts = [str(key_thoughts)]
    key_thoughts = [str(t)[:200] for t in key_thoughts[:3]]
    gentle_reflection = str(parsed.get("gentle_reflection", ""))[:1000]
    one_line_summary = str(parsed.get("one_line_summary", ""))[:500]

    return {
        "mood": mood,
        "mood_score": mood_score,
        "key_thoughts": key_thoughts,
        "gentle_reflection": gentle_reflection,
        "one_line_summary": one_line_summary,
    }


def _parse_streamed_response(response_text: str) -> dict:
    """Parse full streamed response into analysis dict (legacy single-JSON format)."""
    parsed = _extract_json(response_text)
    if not parsed:
        return {
            "mood": "calm",
            "mood_score": 5,
            "key_thoughts": [],
            "gentle_reflection": (response_text or "").strip()[:1000],
            "one_line_summary": "",
        }
    mood = parsed.get("mood", "calm").lower()
    allowed = {"happy", "sad", "anxious", "calm", "angry", "confused", "grateful", "excited"}
    if mood not in allowed:
        mood = "calm"
    mood_score = max(1, min(10, int(parsed.get("mood_score", 5))))
    key_thoughts = parsed.get("key_thoughts", [])
    if not isinstance(key_thoughts, list):
        key_thoughts = [str(key_thoughts)]
    key_thoughts = [str(t)[:200] for t in key_thoughts[:3]]
    gentle_reflection = str(parsed.get("gentle_reflection", ""))[:1000]
    one_line_summary = str(parsed.get("one_line_summary", ""))[:500]
    return {
        "mood": mood,
        "mood_score": mood_score,
        "key_thoughts": key_thoughts,
        "gentle_reflection": gentle_reflection,
        "one_line_summary": one_line_summary,
    }


def _parse_streamed_response_two_part(response_text: str) -> dict:
    """Parse response in format: reflection text, then blank line, then JSON line.
    If the model doesn't output valid JSON (e.g. tinyllama), we keep the reflection and use safe defaults.
    """
    gentle_reflection = ""
    json_str = (response_text or "").strip()
    if "\n\n" in response_text:
        parts = response_text.split("\n\n", 1)
        gentle_reflection = parts[0].strip()[:1000]
        json_str = parts[1].strip()
    else:
        # No blank line: treat whole response as reflection (light models may skip JSON)
        gentle_reflection = response_text.strip()[:1000]
        json_str = ""
    parsed = _extract_json(json_str) if json_str else None
    if not parsed:
        return {
            "mood": "calm",
            "mood_score": 5,
            "key_thoughts": [],
            "gentle_reflection": gentle_reflection,
            "one_line_summary": "",
        }
    mood = (parsed.get("mood") or "calm").lower()
    allowed = {"happy", "sad", "anxious", "calm", "angry", "confused", "grateful", "excited"}
    if mood not in allowed:
        mood = "calm"
    mood_score = max(1, min(10, int(parsed.get("mood_score", 5))))
    key_thoughts = parsed.get("key_thoughts", [])
    if not isinstance(key_thoughts, list):
        key_thoughts = [str(key_thoughts)]
    key_thoughts = [str(t)[:200] for t in key_thoughts[:3]]
    one_line_summary = str(parsed.get("one_line_summary", ""))[:500]
    return {
        "mood": mood,
        "mood_score": mood_score,
        "key_thoughts": key_thoughts,
        "gentle_reflection": gentle_reflection,
        "one_line_summary": one_line_summary,
    }


def stream_mood_analysis(entry_text: str, user_name: str, profile_context: str | None = None):
    """
    Stream Ollama response. Yields only reflection text (no JSON) as (chunk_text, full_so_far).
    Chunks are buffered to word boundaries for snappier streaming.
    When done, yields (None, full_analysis_dict).
    """
    if not user_name or not user_name.strip():
        user_name = "there"
    else:
        user_name = user_name.strip()
    context = _build_context(profile_context)
    prompt = MOOD_PROMPT_STREAM.format(
        user_name=user_name,
        context=context,
        entry=entry_text[:4000],
    )
    full = []
    reflection_done = False
    reflection_yielded_len = 0
    word_buffer = []  # buffer for word-sized chunks
    WORD_BUF_MAX = 14  # yield when we have this many chars or hit space/newline

    def flush_word_buf():
        if word_buffer:
            s = "".join(word_buffer)
            word_buffer.clear()
            return s
        return None

    with httpx.Client(timeout=OLLAMA_TIMEOUT) as client:
        with client.stream(
            "POST",
            f"{OLLAMA_BASE}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": True,
                "options": {"num_predict": 500},
            },
        ) as r:
            r.raise_for_status()
            for line in r.iter_lines():
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue
                chunk = obj.get("response", "")
                if not chunk:
                    continue
                full.append(chunk)
                full_text = "".join(full)

                if reflection_done:
                    continue

                if "\n\n" in full_text:
                    reflection_done = True
                    reflection_part = full_text.split("\n\n", 1)[0]
                    # yield any buffered reflection we haven't sent yet
                    to_send = reflection_part[reflection_yielded_len:]
                    if to_send:
                        for c in to_send:
                            word_buffer.append(c)
                            if c in " \n" or len(word_buffer) >= WORD_BUF_MAX:
                                part = flush_word_buf()
                                if part:
                                    reflection_yielded_len += len(part)
                                    yield part, full_text
                    reflection_yielded_len = len(reflection_part)
                    continue

                # still in reflection: buffer to word boundary then yield
                for c in chunk:
                    word_buffer.append(c)
                    if c in " \n" or len(word_buffer) >= WORD_BUF_MAX:
                        part = flush_word_buf()
                        if part:
                            reflection_yielded_len += len(part)
                            yield part, full_text

            response_text = "".join(full)
            # send any remaining buffer (reflection not ending with space)
            if not reflection_done and word_buffer:
                part = flush_word_buf()
                if part:
                    yield part, response_text
    analysis = _parse_streamed_response_two_part(response_text)
    yield None, analysis
