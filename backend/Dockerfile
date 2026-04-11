FROM python:3.13-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY pyproject.toml README.md ./
COPY src ./src
COPY main.py ./

RUN pip install --no-cache-dir -e .

# Railway sets PORT; run via shell so $PORT expands (raw ${PORT} in dashboard does not).
CMD ["sh", "-c", "exec python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]

EXPOSE 8000
