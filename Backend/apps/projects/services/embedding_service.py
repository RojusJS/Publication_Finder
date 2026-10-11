"""Sentence embeddings for semantic search and recommendations.

The model is loaded lazily (once per process, thread-safe). If embeddings are
disabled or the model cannot be loaded, callers fall back to TF-IDF similarity
(see ``similarity.py``) so the features keep working, just less precisely.
"""
import logging
import threading

import numpy as np
from django.conf import settings

logger = logging.getLogger(__name__)

_model = None
_load_failed = False
_lock = threading.Lock()

MAX_TEXT_CHARS = 2000  # the model truncates at 256 word pieces anyway


def _get_model():
    global _model, _load_failed
    if not settings.EMBEDDINGS_ENABLED or _load_failed:
        return None
    if _model is None:
        with _lock:
            if _model is None and not _load_failed:
                try:
                    from sentence_transformers import SentenceTransformer

                    _model = SentenceTransformer(settings.EMBEDDING_MODEL)
                except Exception:
                    _load_failed = True
                    logger.exception("Could not load embedding model %s; using TF-IDF fallback", settings.EMBEDDING_MODEL)
                    return None
    return _model


def embeddings_available():
    return _get_model() is not None


def build_text(title, abstract=None, keywords=None):
    keyword_names = []
    for keyword in keywords or []:
        if isinstance(keyword, str):
            keyword_names.append(keyword)
        elif isinstance(keyword, dict) and keyword.get("display_name"):
            keyword_names.append(keyword["display_name"])
    parts = [title or "", abstract or "", ", ".join(keyword_names)]
    return " ".join(part.strip() for part in parts if part and part.strip())[:MAX_TEXT_CHARS]


def encode(texts):
    """Return an ``(n, d)`` float32 array of L2-normalised vectors, or ``None``."""
    model = _get_model()
    if model is None or not texts:
        return None
    try:
        vectors = model.encode(
            list(texts),
            batch_size=32,
            normalize_embeddings=True,
            show_progress_bar=False,
            convert_to_numpy=True,
        )
    except Exception:
        logger.exception("Embedding computation failed")
        return None
    return np.asarray(vectors, dtype=np.float32)


def ensure_embeddings(publications):
    """Compute and store missing embeddings for saved publications (in place)."""
    from apps.projects.models import SavedPublication

    missing = [pub for pub in publications if not pub.embedding]
    if not missing:
        return
    texts = [build_text(pub.title, pub.abstract, pub.keywords) for pub in missing]
    vectors = encode(texts)
    if vectors is None:
        return
    for pub, vector in zip(missing, vectors, strict=True):
        pub.embedding = vector.tolist()
    SavedPublication.objects.bulk_update(missing, ["embedding"], batch_size=200)
