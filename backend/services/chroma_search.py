import os

# Use no-op telemetry to avoid PostHog "capture() takes 1 positional argument but 3 were given"
os.environ.setdefault("CHROMA_PRODUCT_TELEMETRY_IMPL", "services.chroma_noop.NoopTelemetry")
os.environ["ANONYMIZED_TELEMETRY"] = "False"

import httpx
import chromadb
from chromadb.config import Settings

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_data")
COLLECTION_NAME = "mann_entries"
OLLAMA_EMBED = "http://localhost:11434/api/embeddings"


def _get_embedding(text: str) -> list:
    """Get embedding via Ollama nomic-embed-text."""
    with httpx.Client(timeout=30.0) as client:
        r = client.post(
            OLLAMA_EMBED,
            json={"model": "nomic-embed-text", "prompt": text[:8000]},
        )
        r.raise_for_status()
        return r.json().get("embedding", [])


def get_client():
    """ChromaDB client with persistence."""
    return chromadb.PersistentClient(path=CHROMA_PERSIST_DIR, settings=Settings(anonymized_telemetry=False))


def get_collection():
    return get_client().get_or_create_collection(COLLECTION_NAME, metadata={"hnsw:space": "cosine"})


def add_entry(entry_id: int, user_id: int, text: str):
    """Store embedding for one entry. Use composite id so we can filter by user."""
    coll = get_collection()
    embedding = _get_embedding(text)
    doc_id = f"user_{user_id}_entry_{entry_id}"
    coll.upsert(
        ids=[doc_id],
        embeddings=[embedding],
        documents=[text[:8000]],
        metadatas=[{"entry_id": entry_id, "user_id": user_id}],
    )


def search_entries(user_id: int, query: str, n_results: int = 10) -> list:
    """Semantic search over user's entries. Returns list of (entry_id, distance)."""
    coll = get_collection()
    query_embedding = _get_embedding(query)
    results = coll.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        where={"user_id": user_id},
        include=["metadatas", "distances"],
    )
    if not results or not results["ids"] or not results["ids"][0]:
        return []
    ids = results["ids"][0]
    distances = results["distances"][0]
    metadatas = results["metadatas"][0]
    out = []
    for i, meta in enumerate(metadatas):
        entry_id = meta.get("entry_id")
        if entry_id is not None:
            out.append({"entry_id": entry_id, "distance": distances[i] if distances else 0})
    return out
