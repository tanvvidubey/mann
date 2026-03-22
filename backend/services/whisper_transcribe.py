import os
import tempfile
from pathlib import Path

# Lazy load to avoid slow startup when not transcribing
_whisper_model = None
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "small")


def _get_model():
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel
        _whisper_model = WhisperModel(WHISPER_MODEL)
    return _whisper_model


def transcribe_audio(audio_bytes: bytes, language: str = None) -> str:
    """
    Transcribe audio using faster-whisper (CTranslate2). Handles Hindi, English, Hinglish.
    Use model 'small' for good Hinglish support.
    """
    model = _get_model()
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
        try:
            f.write(audio_bytes)
            f.flush()
            segments, _ = model.transcribe(
                f.name,
                language=language,
                vad_filter=True,
            )
            return " ".join(s.text for s in segments).strip()
        finally:
            Path(f.name).unlink(missing_ok=True)
