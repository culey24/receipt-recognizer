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
- `POST /api/v1/ocr/extract` (sync OCR debug, multipart field `document_type`)
- `POST /api/v1/jobs` (create async job, multipart field `document_type`)
- `GET /api/v1/jobs` (list recent jobs)
- `GET /api/v1/jobs/{job_id}` (poll one job)
- `GET /api/v1/jobs/{job_id}/image` (view uploaded image)
- `POST /api/v1/jobs/{job_id}/recalculate` (manual override + recalculate SEE)
- `POST /api/v1/cases` (create case)
- `GET /api/v1/cases` (list cases)
- `GET /api/v1/cases/{case_id}` (get case config)
- `PATCH /api/v1/cases/{case_id}` (update case config)
- `GET /api/v1/cases/{case_id}/see` (aggregate SEE across all jobs in case)
- `GET /api/v1/cases/{case_id}/cbam-tax` (CBAM tax from SEE + export quantity + carbon price)
- `POST /api/v1/reports/preview` (build periodic CBAM report payload without writing files)
- `POST /api/v1/reports/generate` (generate periodic CBAM report files in JSON/XML/TXT/PDF)
- `GET /api/v1/reports/{report_id}/download?format=json|xml|txt|pdf` (download generated report file)
- `GET /api/v1/emission/fuel-mappings` (list product -> fuel mappings)
- `PUT /api/v1/emission/fuel-mappings` (upsert mapping)
- `GET /api/v1/emission/factors` (list fuel emission factors)
- `PUT /api/v1/emission/factors` (upsert factor)

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
   - `direct = quantity_used * EF`
   - `indirect (electricity bill) = electricity_consumption_kwh * GRID_EMISSION_FACTOR_VN`
   - `SEE = (precursors + indirect + direct) / total_product_output`
6. Save result to MongoDB.
7. Aggregate at case-level via `/api/v1/cases/{case_id}/see` when multiple docs are uploaded.

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

## Direct Emissions Lookup (MVP)

`direct_emissions` is computed in backend from MongoDB:
1. OCR extracts `product_name`, `quantity_used`, and optionally `total_product_output`
2. Backend resolves `product_name -> fuel_type` via `fuel_mappings`
3. Backend resolves `fuel_type -> direct_ef` via `emission_factors`
4. Backend computes `direct_emissions = quantity_used * direct_ef`

If mapping/factor is missing, SEE returns `MANUAL_REQUIRED` with missing fields and reason.

## Electricity Bill Strategy

- `document_type=electricity_bill` routes to `ElectricityBillStrategy`
- OCR extracts `electricity_consumption_kwh`
- Backend computes:
  - `indirect_emissions = electricity_consumption_kwh * GRID_EMISSION_FACTOR_VN`
- Default Vietnam grid factor is configured by:
  - `GRID_EMISSION_FACTOR_VN=0.6592`

## Case Aggregation

- Each upload job belongs to a `case_id`.
- `POST /api/v1/jobs` accepts optional `case_id` form field:
  - if omitted, backend creates a new case automatically.
  - if provided, upload is attached to that existing case.
- Upload both:
  - `document_type=fuel_invoice` for direct emissions.
  - `document_type=electricity_bill` for indirect emissions.
- Or upload one document type only. Aggregator still returns SEE status and missing components.
- Case-level formula:
  - `SEE = (sum(direct) + sum(indirect) + case.precursors_emissions) / case.total_product_output`

## CBAM Tax

- Store `export_quantity` in case config (`PATCH /api/v1/cases/{case_id}`).
- Endpoint:
  - `GET /api/v1/cases/{case_id}/cbam-tax`
- Formula:
  - `CBAM Tax = export_quantity * EU_Carbon_Price * SEE`
- Carbon price source:
  - `yfinance` with configured tickers (`CARBON_PRICE_TICKERS`)
  - optional fallback (`CARBON_PRICE_FALLBACK_EUR`) if market quote fails
  - default tickers: `CO2.L,^ICEEUA`
- FX rate source (EUR -> VND):
  - `yfinance` with ticker `FX_RATE_TICKER` (default `EURVND=X`)
  - optional fallback (`FX_RATE_FALLBACK_EUR_VND`) if FX quote fails

## Periodic CBAM Report (Hybrid LLM + Deterministic Rules)

- Part 1 (LLM draft):
  - OpenRouter receives case summary + selected `product_type`
  - Returns strict JSON draft (notes/labels)
- Part 2 (code-enforced):
  - Backend applies deterministic CBAM rule mapping by `product_type`
  - Validates output with Pydantic schema
  - Exports JSON/XML/TXT/PDF files in `REPORT_STORAGE_PATH`

Supported `product_type`:
- `cement`
- `fertilizer`
- `iron_steel`
- `aluminum`
- `hydrogen`
- `electricity`
