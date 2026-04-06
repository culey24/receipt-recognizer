# CBAM Web App - User Guide (Frontend)

This guide is for end users who only interact with the web interface.

## 1. What This App Does

The app helps you calculate **SEE (Specific Embedded Emissions)** by combining:

- Fuel receipt data (for direct emissions)
- Electricity bill data (for indirect emissions)
- Case-level inputs (precursors emissions and total product output)

You can upload one document type or both.

## 2. Main Concept: Case

A **Case** is one calculation workspace.

- Upload all related documents into the same `case_id`.
- The app aggregates all uploaded jobs in that case.
- Final SEE is shown in **Case SEE (Aggregated)**.

## 3. Basic Workflow

1. Open the app and go to **Upload Documents**.
2. In **Case Workspace**:
   - Click **New Case** to create a case, or
   - Paste an existing `case_id` and click **Load Case**.
3. Choose **Document Type**:
   - `Fuel Invoice`
   - `Electricity Bill`
4. Upload the image file.
5. Repeat upload for the second document type if needed (same `case_id`).
6. Set case-level inputs in **Case Config**:
   - `precursors_emissions` (optional)
   - `total_product_output` (required for final SEE)
   - `export_quantity` (required for CBAM Tax)
7. Click **Save Case Config**.
8. Check **Case SEE (Aggregated)** and click **Refresh**.
9. Check **CBAM Tax** in the Case panels (uses realtime EU carbon price).
10. In **Periodic CBAM Report**:
   - Select product type and period (year/quarter)
   - Click **Generate JSON/XML**
   - Download report files directly from the UI (`JSON`, `XML`, `TXT`, `PDF`).

## 4. Where to View Results

- **Job List**: all uploaded jobs, their case IDs, status, and type.
- **Split Workspace**:
  - Left: uploaded image preview
  - Right: extracted fields, job calculation, aggregated case SEE

## 5. Status Meaning

### Job Status

- `PENDING`: processing
- `COMPLETED`: extraction/calculation done
- `FAILED`: job error

### Case SEE Status

- `COMPLETED`: enough data for full SEE
- `ESTIMATED`: SEE calculated but some document type is missing
- `MANUAL_REQUIRED`: required fields (usually `total_product_output`) are missing
- `FAILED`: invalid values (for example, zero output)

### CBAM Tax

Formula used:

`CBAM Tax = Export Quantity * EU Carbon Price * SEE`

- `Export Quantity`: user input in Case Config
- `EU Carbon Price`: fetched from market data source
- Also converted to VND using EUR->VND FX rate
- `SEE`: aggregated case SEE result

Displayed example:

`EU Carbon Price: €67.21 / tCO2 (~ 1.835.500,00 VND / tCO2)`

## 6. Notes

- Uploading only one document type is allowed.
- For best result, upload both:
  - fuel receipt + electricity bill
- If extraction is imperfect, use **Job Overrides** or update **Case Config**.
- Report generation uses hybrid logic:
  - LLM draft for narrative mapping
  - deterministic backend rules for CBAM structure and final schema output.

## 7. Quick Troubleshooting

- If upload fails: check file type (PNG/JPG/WEBP) and try again.
- If SEE is blank:
  - Ensure `total_product_output` is set in **Case Config**.
  - Ensure at least one successful job exists in that case.
- If CBAM Tax is blank:
  - Ensure `export_quantity` is set in **Case Config**.
  - Ensure SEE is available.
  - Refresh the case panel to retry carbon price fetch.
- If case data looks outdated: click **Refresh** in Case SEE panel.
