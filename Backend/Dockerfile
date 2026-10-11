FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    HF_HOME=/app/.cache/huggingface

# DejaVu provides the Unicode (incl. Lithuanian) glyphs used by PDF exports.
RUN apt-get update \
    && apt-get install -y --no-install-recommends fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN useradd --create-home --uid 10001 app

COPY requirements.txt .
RUN pip install torch==2.11.0 --index-url https://download.pytorch.org/whl/cpu \
    && pip install -r requirements.txt

# Bake the sentence-embedding model into the image so containers start fast
# and work without internet access to Hugging Face. Disable with
# --build-arg PRELOAD_EMBEDDING_MODEL=0 (the model is then downloaded on first use).
ARG PRELOAD_EMBEDDING_MODEL=1
RUN if [ "$PRELOAD_EMBEDDING_MODEL" = "1" ]; then \
      python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"; \
    fi

COPY . .
RUN DJANGO_DEBUG=false DJANGO_SECRET_KEY=collectstatic-only DB_ENGINE=sqlite \
    python manage.py collectstatic --noinput \
    && chmod +x docker-entrypoint.sh \
    && chown -R app:app /app

USER app
EXPOSE 8000
ENTRYPOINT ["./docker-entrypoint.sh"]
