from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class EntryCreate(BaseModel):
    transcript: str
    audio_duration_seconds: Optional[float] = None


class MoodAnalysis(BaseModel):
    mood: str
    mood_score: int
    key_thoughts: List[str]
    gentle_reflection: str
    one_line_summary: str


class EntryResponse(BaseModel):
    id: int
    transcript_preview: str
    transcript: str  # decrypted on backend when user provides PIN/session
    mood: str
    mood_score: int
    key_thoughts: List[str]
    reflection: str
    one_line_summary: str
    audio_duration_seconds: Optional[float]
    entry_type: str = "voice"  # voice | text
    created_at: datetime

    class Config:
        from_attributes = True


class EntryListItem(BaseModel):
    id: int
    transcript_preview: str
    mood: str
    mood_score: int
    one_line_summary: Optional[str]
    entry_type: str = "voice"
    created_at: datetime

    class Config:
        from_attributes = True


class Entry(BaseModel):
    id: int
    user_id: int
    encrypted_content: str
    transcript_preview: str
    mood: str
    mood_score: int
    key_thoughts: List[str]
    reflection: str
    one_line_summary: str
    audio_duration_seconds: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True
