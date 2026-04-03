# Backend MVP (Phase 2 + Phase 3)

## One-Command Full Stack

```bash
cd backend
cp .env.example .env
# Set OPENROUTER_API_KEY in .env
docker compose up -d --build
```

This starts:
- API (`http://localhost:8000`)
- Worker (ARQ)
- Redis
- MongoDB
- MinIO
- Frontend (`http://localhost:5173`)

If local ports are occupied, set host ports in `.env`:

```env
REDIS_HOST_PORT=6380
MONGO_PORT=27018
MINIO_API_PORT=9100
MINIO_CONSOLE_PORT=9101
API_PORT=8001
FRONTEND_PORT=5174
```

## Core Endpoints

- `GET /health`
- `POST /api/v1/ocr/extract` (sync OCR debug)
- `POST /api/v1/jobs` (create async job)
- `GET /api/v1/jobs` (list recent jobs)
- `GET /api/v1/jobs/{job_id}` (poll one job)
- `GET /api/v1/jobs/{job_id}/image` (view uploaded image)

## Job Status / Error Code

- `PENDING`
- `COMPLETED`
- `FAILED`

## Worker Flow

1. Receive `job_id` from ARQ queue.
2. Read file from storage strategy.
3. OCR extraction via OpenRouter strategy.
4. Validate OCR result with Pydantic schema.
5. Calculate SEE with:
   - `SEE = (precursors + indirect + direct) / total_product_output`
6. Save result to MongoDB.

## Storage Strategy

### Phase 2 default (LocalStorage)

```env
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./data/uploads
```

### Phase 3 (MinIO)

```env
STORAGE_PROVIDER=minio
MINIO_ENDPOINT_URL=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=receipt-images
MINIO_REGION=us-east-1
```
