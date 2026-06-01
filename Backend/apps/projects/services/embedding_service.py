from sentence_transformers import SentenceTransformer

_model = None

def get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model

def build_text(title: str | None, abstract: str | None, keywords: list | None) -> str:
    parts = [
        title or "",
        abstract or "",
        " ".join(keywords or []),
    ]
    return " ".join(p for p in parts if p.strip())

def generate_embedding(title: str | None, abstract: str | None, keywords: list | None) -> list | None:
    text = build_text(title, abstract, keywords)
    if not text.strip():
        return None
    model = get_model()
    vector = model.encode(text, normalize_embeddings=True)
    return vector.tolist()

def encode_query(query: str) -> list:
    model = get_model()
    vector = model.encode(query, normalize_embeddings=True)
    return vector.tolist()