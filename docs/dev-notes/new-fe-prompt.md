# Frontend Redesign Spec

## Phase 1 — Màn hình tải tài liệu
**Mục tiêu:** Onboarding rõ ràng, chuyên nghiệp hơn giao diện upload cũ.

- Chọn **loại tài liệu** bằng card icon to (Hóa đơn nhiên liệu 🔥 / Hóa đơn điện ⚡)
- Vùng **drag & drop** với preview ảnh trước khi gửi; nút "X" để đổi file
- Nút **Chụp ảnh** (dùng `capture="environment"` cho mobile)
- Cột phải: **Case SEE Snapshot** + **Case Config** form (nhập precursors, output, export qty)
- Case workspace (Load / New Case) trong sidebar

---

## Phase 2 — Màn hình xử lý & kết quả OCR
**Mục tiêu:** Hiển thị pipeline đang chạy, sau đó show kết quả có thể chỉnh sửa.

### 2a — Processing screen (stepper)
- 5 bước: Uploading → OCR Model → Validating → Calculating SEE → Done
- Mỗi bước: done=xanh✓ / active=spinner+highlight / pending=mờ
- Hiển thị `job_id` đang xử lý

### 2b — Result screen (split view)
- **Trái**: Preview ảnh (sticky) + warning amber nếu có giá trị bị thiếu
- **Phải** (scroll):
  1. Job Overview (status chip, job_id, model)
  2. Extracted Data table (read-only fields từ OCR)
  3. **Override form** — 4 trường có thể chỉnh: `quantity_used`, `precursors_emissions`, `indirect_emissions`, `total_product_output`
     - Trường null → amber background + icon ⚠️ + placeholder "Nhấn để nhập"
     - Trường có giá trị → hiển thị giá trị OCR gốc bên cạnh
  4. "Lưu & Tính lại" → gọi `POST /jobs/{id}/recalculate`
  5. Job Calculation results (SEE, EF, emissions)
  6. Case SEE Aggregated + CBAM Tax (refresh + export CSV)
  7. Case Config
  8. **Audit Log** — mỗi lần save lưu field nào đã sửa, giá trị cũ → mới, timestamp → localStorage

---

## Phase 3 — Case Dashboard
**Mục tiêu:** Dùng `GET /api/v1/cases` (API đã có nhưng FE chưa dùng).

- Bảng tất cả cases: `case_id`, created_at, nút "Mở"
- Mở case → load config + SEE + CBAM, chuyển sang upload screen với case đó
- Nav item mới: "Danh sách Case"

---

## Phase 4 — Emission Admin Panel
**Mục tiêu:** Expose `GET/PUT /api/v1/emission/fuel-mappings` và `GET/PUT /api/v1/emission/factors` (API có nhưng FE chưa dùng).

- Bảng **Fuel Mappings**: product_key → fuel_type (thêm / upsert inline)
- Bảng **Emission Factors**: fuel_type → direct_ef tCO2/unit (thêm / upsert inline)
- Khi job trả `MANUAL_REQUIRED` do thiếu mapping → có thể fix ngay tại đây
- Nav item mới: "Quản trị phát thải"

---

## Phase 5 — Export CSV
**Mục tiêu:** Xuất báo cáo CBAM cho cơ quan chức năng.

- Nút Download trên Case SEE section của Result screen
- CSV chứa: case_id, SEE, direct/indirect/precursors emissions, total output, export qty, carbon price, FX rate, CBAM tax EUR + VND, exported_at timestamp

---

## API Mapping

| Phase | Endpoints dùng | Trạng thái |
|---|---|---|
| 1–2 | POST /jobs, GET /jobs/{id}, GET /jobs/{id}/image, POST /jobs/{id}/recalculate | Đã có, UX mới |
| 3 | GET /api/v1/cases | **Chưa dùng** |
| 4 | GET/PUT /api/v1/emission/fuel-mappings, GET/PUT /api/v1/emission/factors | **Chưa dùng** |
| 5 | Tổng hợp data đã có, render CSV | Chưa có |
