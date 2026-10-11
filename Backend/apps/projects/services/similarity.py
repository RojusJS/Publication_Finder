"""Text similarity with sentence embeddings and a TF-IDF fallback."""
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

from apps.projects.services.embedding_service import encode


def tfidf_similarity(queries, documents):
    """Cosine similarity matrix ``(len(queries), len(documents))`` using TF-IDF."""
    if not queries or not documents:
        return np.zeros((len(queries), len(documents)), dtype=np.float32)
    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), sublinear_tf=True, max_features=50_000)
    try:
        matrix = vectorizer.fit_transform(list(queries) + list(documents))
    except ValueError:  # empty vocabulary (e.g. only stop words)
        return np.zeros((len(queries), len(documents)), dtype=np.float32)
    query_matrix = matrix[: len(queries)]
    document_matrix = matrix[len(queries):]
    # TF-IDF rows are L2-normalised, so the dot product is the cosine similarity.
    return np.asarray((query_matrix @ document_matrix.T).todense(), dtype=np.float32)


def pairwise(texts_a, texts_b, vectors_b=None):
    """Return ``(sim_ab, sim_aa, method)`` for two text collections.

    Used by the recommender: ``sim_ab`` scores candidates against the library,
    ``sim_aa`` (candidates against each other) drives diversity re-ranking.
    """
    vectors_a = encode(texts_a) if texts_a else None
    if vectors_a is not None:
        dimension = vectors_a.shape[1]
        rows = list(vectors_b) if vectors_b is not None else [None] * len(texts_b)
        missing = [index for index, row in enumerate(rows) if row is None or len(row) != dimension]
        computed = encode([texts_b[index] for index in missing]) if missing else None
        if not missing or computed is not None:
            for position, index in enumerate(missing):
                rows[index] = computed[position]
            matrix_b = np.asarray(rows, dtype=np.float32).reshape(len(rows), dimension)
            return vectors_a @ matrix_b.T, vectors_a @ vectors_a.T, "embeddings"

    if not texts_a:
        return np.zeros((0, len(texts_b)), dtype=np.float32), np.zeros((0, 0), dtype=np.float32), "tfidf"
    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), sublinear_tf=True, max_features=50_000)
    try:
        matrix = vectorizer.fit_transform(list(texts_a) + list(texts_b))
    except ValueError:
        return (
            np.zeros((len(texts_a), len(texts_b)), dtype=np.float32),
            np.eye(len(texts_a), dtype=np.float32),
            "tfidf",
        )
    matrix_a, matrix_b = matrix[: len(texts_a)], matrix[len(texts_a):]
    sim_ab = np.asarray((matrix_a @ matrix_b.T).todense(), dtype=np.float32)
    sim_aa = np.asarray((matrix_a @ matrix_a.T).todense(), dtype=np.float32)
    return sim_ab, sim_aa, "tfidf"


def similarity(query_texts, document_texts, document_vectors=None):
    """Return ``(matrix, method)`` with cosine similarities queries x documents.

    ``document_vectors`` may hold stored embeddings aligned with
    ``document_texts``; missing or incompatible rows are computed on the fly.
    ``method`` is ``"embeddings"`` or ``"tfidf"`` (fallback).
    """
    query_count, document_count = len(query_texts), len(document_texts)
    if query_count == 0 or document_count == 0:
        return np.zeros((query_count, document_count), dtype=np.float32), "embeddings"

    query_vectors = encode(query_texts)
    if query_vectors is not None:
        dimension = query_vectors.shape[1]
        rows = list(document_vectors) if document_vectors is not None else [None] * document_count
        missing = [index for index, row in enumerate(rows) if row is None or len(row) != dimension]
        complete = True
        if missing:
            computed = encode([document_texts[index] for index in missing])
            if computed is None:
                complete = False
            else:
                for position, index in enumerate(missing):
                    rows[index] = computed[position]
        if complete:
            document_matrix = np.asarray(rows, dtype=np.float32)
            return query_vectors @ document_matrix.T, "embeddings"

    return tfidf_similarity(query_texts, document_texts), "tfidf"
