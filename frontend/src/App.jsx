import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Database,
  Download,
  FileText,
  Flame,
  List,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const POLL_INTERVAL_MS = 1500;
const POLL_MAX_ATTEMPTS = 120;
const DECIMALS = 2;
const LANG_STORAGE_KEY = "cbam_lang";
const AUDIT_LOG_STORAGE_KEY = "cbam_audit_log";

// ─── i18n ─────────────────────────────────────────────────────────────────────
const MESSAGES = {
  en: {
    workspaceLabel: "CBAM Workspace",
    workspaceName: "Receipt Recognizer",
    navUpload: "Upload",
    navJobs: "Job List",
    navCases: "Cases",
    navEmission: "Emission Admin",
    navResult: "Job Detail",
    caseWorkspace: "Active Case",
    caseIdPlaceholder: "Paste existing case_id",
    loadCase: "Load Case",
    newCase: "New Case",
    dashboardTitle: "CBAM Calculation Workspace",
    selectDocType: "Select Document Type",
    fuelInvoice: "Fuel Invoice",
    fuelInvoiceDesc: "Fuel consumption invoice with quantity used",
    electricityBill: "Electricity Bill",
    electricityDesc: "Electricity bill with kWh consumption",
    imageFile: "Image File",
    dragOrClick: "Drag & drop or click to select",
    capturePhoto: "Take Photo",
    uploadToCase: "Upload to Case",
    processing: "Processing...",
    caseSeeSnapshot: "Case SEE Snapshot",
    refresh: "Refresh",
    status: "Status",
    see: "SEE",
    totalEmissions: "Total emissions",
    totalOutput: "Total output",
    docs: "Docs",
    cbamTaxShort: "CBAM tax",
    loadCaseHint: "Load or create a case to view aggregated SEE.",
    caseConfig: "Case Config",
    precursorsEmissions: "Precursors emissions",
    totalProductOutput: "Total product output",
    exportQuantity: "Export quantity",
    saveCaseConfig: "Save Case Config",
    recentJobs: "Recent Jobs",
    jobId: "Job ID",
    caseId: "Case ID",
    type: "Type",
    file: "File",
    action: "Action",
    open: "Open",
    documentPreview: "Document Preview",
    noJobSelected: "No job selected.",
    jobOverview: "Job Overview",
    model: "Model",
    extractedData: "Extracted Data (OCR)",
    field: "Field",
    value: "Value",
    jobCalculation: "Job Calculation",
    source: "Source",
    directEF: "Direct EF",
    directEmissions: "Direct emissions",
    indirectEmissions: "Indirect emissions",
    caseSeeAggregated: "Case SEE (Aggregated)",
    precursorsLabel: "Precursors emissions",
    jobsLine: "Jobs",
    missing: "Missing",
    reason: "Reason",
    cbamTaxTitle: "CBAM Tax",
    autoRefresh30s: "Auto-refresh: every 30s",
    lastUpdate: "Last update",
    euCarbonPrice: "EU Carbon Price",
    fxRate: "FX EUR→VND",
    priceTicker: "Price ticker",
    tax: "Tax",
    jobOverrides: "Manual Overrides",
    jobOverridesHint: "Enter or adjust values that could not be extracted from the document.",
    quantityUsed: "Quantity used",
    indirectEmissionsInput: "Indirect emissions",
    recalculateJob: "Save & Recalculate",
    recalculating: "Recalculating...",
    missingValueHint: "Missing — click to enter",
    ocrValue: "OCR",
    chooseImageFirst: "Please choose an image first.",
    pollTimeout: "Polling timed out before job completion",
    failedFetchJobs: "Failed to fetch jobs",
    failedFetchCaseSee: "Failed to fetch case SEE",
    failedFetchCbamTax: "Failed to fetch CBAM tax",
    failedFetchCase: "Failed to fetch case",
    failedPollJob: "Failed to poll OCR job",
    failedCreateJob: "Failed to create async OCR job",
    unexpectedError: "Unexpected error",
    failedOpenDetail: "Failed to open job detail",
    failedRecalculate: "Failed to recalculate job",
    recalcFailed: "Recalculation failed",
    failedCreateCase: "Failed to create case",
    failedLoadCase: "Failed to load case",
    failedSaveCase: "Failed to save case settings",
    failedRefreshCase: "Failed to refresh case SEE",
    failedRefreshJobs: "Failed to refresh jobs",
    failedFetchCases: "Failed to fetch cases",
    failedFetchEmission: "Failed to fetch emission data",
    failedUpsertMapping: "Failed to save fuel mapping",
    failedUpsertFactor: "Failed to save emission factor",
    allCases: "All Cases",
    caseCreatedAt: "Created",
    fuelMappings: "Fuel Mappings",
    emissionFactors: "Emission Factors",
    productKey: "Product key",
    fuelTypeLabel: "Fuel type",
    directEFUnit: "EF (tCO2/unit)",
    exportCSV: "Export CSV",
    auditLog: "Edit History",
    auditField: "Field",
    auditOldValue: "Old value",
    auditNewValue: "New value",
    auditTime: "Time",
    noAuditLog: "No edits recorded for this job.",
    noData: "No data available.",
    add: "Add",
    documentType: "Document Type",
  },
  vi: {
    workspaceLabel: "Không gian CBAM",
    workspaceName: "Nhận diện Hóa đơn",
    navUpload: "Tải lên",
    navJobs: "Danh sách Job",
    navCases: "Danh sách Case",
    navEmission: "Quản trị phát thải",
    navResult: "Chi tiết Job",
    caseWorkspace: "Case đang hoạt động",
    caseIdPlaceholder: "Dán case_id có sẵn",
    loadCase: "Tải Case",
    newCase: "Case Mới",
    dashboardTitle: "Không gian tính toán CBAM",
    selectDocType: "Chọn loại tài liệu",
    fuelInvoice: "Hóa đơn nhiên liệu",
    fuelInvoiceDesc: "Hóa đơn tiêu thụ nhiên liệu có thông tin khối lượng",
    electricityBill: "Hóa đơn điện",
    electricityDesc: "Hóa đơn tiền điện theo kWh tiêu thụ",
    imageFile: "Tệp ảnh",
    dragOrClick: "Kéo thả hoặc nhấn để chọn tệp",
    capturePhoto: "Chụp ảnh",
    uploadToCase: "Tải lên Case",
    processing: "Đang xử lý...",
    caseSeeSnapshot: "Tóm tắt SEE theo Case",
    refresh: "Làm mới",
    status: "Trạng thái",
    see: "SEE",
    totalEmissions: "Tổng phát thải",
    totalOutput: "Tổng đầu ra",
    docs: "Tài liệu",
    cbamTaxShort: "Thuế CBAM",
    loadCaseHint: "Tải hoặc tạo case để xem SEE tổng hợp.",
    caseConfig: "Cấu hình Case",
    precursorsEmissions: "Phát thải tiền chất",
    totalProductOutput: "Tổng sản lượng đầu ra",
    exportQuantity: "Sản lượng xuất khẩu",
    saveCaseConfig: "Lưu cấu hình Case",
    recentJobs: "Các Job gần đây",
    jobId: "Job ID",
    caseId: "Case ID",
    type: "Loại",
    file: "Tệp",
    action: "Thao tác",
    open: "Mở",
    documentPreview: "Xem trước tài liệu",
    noJobSelected: "Chưa chọn job.",
    jobOverview: "Tổng quan Job",
    model: "Mô hình",
    extractedData: "Dữ liệu trích xuất (OCR)",
    field: "Trường",
    value: "Giá trị",
    jobCalculation: "Tính toán theo Job",
    source: "Nguồn",
    directEF: "Hệ số EF trực tiếp",
    directEmissions: "Phát thải trực tiếp",
    indirectEmissions: "Phát thải gián tiếp",
    caseSeeAggregated: "SEE theo Case (Tổng hợp)",
    precursorsLabel: "Phát thải tiền chất",
    jobsLine: "Số Job",
    missing: "Thiếu",
    reason: "Lý do",
    cbamTaxTitle: "Thuế CBAM",
    autoRefresh30s: "Tự làm mới: mỗi 30 giây",
    lastUpdate: "Cập nhật lúc",
    euCarbonPrice: "Giá Carbon EU",
    fxRate: "Tỷ giá EUR→VND",
    priceTicker: "Mã giá",
    tax: "Thuế",
    jobOverrides: "Nhập tay / Điều chỉnh",
    jobOverridesHint: "Nhập hoặc điều chỉnh các giá trị không trích xuất được từ tài liệu.",
    quantityUsed: "Lượng nhiên liệu tiêu thụ",
    indirectEmissionsInput: "Phát thải gián tiếp",
    recalculateJob: "Lưu & Tính lại",
    recalculating: "Đang tính lại...",
    missingValueHint: "Bị thiếu — nhấn để nhập",
    ocrValue: "OCR",
    chooseImageFirst: "Vui lòng chọn ảnh trước.",
    pollTimeout: "Hết thời gian chờ khi poll job",
    failedFetchJobs: "Không lấy được danh sách job",
    failedFetchCaseSee: "Không lấy được SEE theo case",
    failedFetchCbamTax: "Không lấy được thuế CBAM",
    failedFetchCase: "Không lấy được case",
    failedPollJob: "Không poll được job OCR",
    failedCreateJob: "Không tạo được job OCR bất đồng bộ",
    unexpectedError: "Lỗi không xác định",
    failedOpenDetail: "Không mở được chi tiết job",
    failedRecalculate: "Không tính lại được job",
    recalcFailed: "Tính lại thất bại",
    failedCreateCase: "Không tạo được case",
    failedLoadCase: "Không tải được case",
    failedSaveCase: "Không lưu được cấu hình case",
    failedRefreshCase: "Không làm mới được SEE theo case",
    failedRefreshJobs: "Không làm mới được danh sách job",
    failedFetchCases: "Không lấy được danh sách case",
    failedFetchEmission: "Không lấy được dữ liệu phát thải",
    failedUpsertMapping: "Không lưu được ánh xạ nhiên liệu",
    failedUpsertFactor: "Không lưu được hệ số phát thải",
    allCases: "Tất cả Case",
    caseCreatedAt: "Tạo lúc",
    fuelMappings: "Ánh xạ nhiên liệu",
    emissionFactors: "Hệ số phát thải",
    productKey: "Mã sản phẩm",
    fuelTypeLabel: "Loại nhiên liệu",
    directEFUnit: "Hệ số (tCO2/đơn vị)",
    exportCSV: "Xuất CSV",
    auditLog: "Lịch sử chỉnh sửa",
    auditField: "Trường",
    auditOldValue: "Giá trị cũ",
    auditNewValue: "Giá trị mới",
    auditTime: "Thời gian",
    noAuditLog: "Chưa có chỉnh sửa nào được ghi lại cho job này.",
    noData: "Không có dữ liệu.",
    add: "Thêm",
    documentType: "Loại tài liệu",
  },
};

// ─── Utilities ────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function statusClass(status) {
  if (status === "COMPLETED") return "text-emerald-700";
  if (status === "FAILED") return "text-rose-700";
  return "text-amber-700";
}

function statusChipClass(status) {
  if (status === "COMPLETED") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "FAILED") return "bg-rose-50 text-rose-700 ring-rose-200";
  return "bg-amber-50 text-amber-700 ring-amber-200";
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function round2(value) {
  if (!isFiniteNumber(value)) return value;
  return Math.round(value * 10 ** DECIMALS) / 10 ** DECIMALS;
}

function formatNumber(value, locale = "en-US") {
  if (!isFiniteNumber(value)) return "-";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: DECIMALS,
    maximumFractionDigits: DECIMALS,
  }).format(round2(value));
}

function formatVND(value) {
  if (!isFiniteNumber(value)) return "-";
  return `${new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: DECIMALS,
    maximumFractionDigits: DECIMALS,
  }).format(round2(value))} VND`;
}

function formatCellValue(value, locale) {
  if (value === null || value === undefined || value === "") return "-";
  if (isFiniteNumber(value)) return formatNumber(value, locale);
  return value;
}

function cardClassName(extra = "") {
  return `rounded-2xl bg-white p-5 shadow-[0_6px_22px_rgba(16,24,40,0.06)] ring-1 ring-[#EAF2EE] ${extra}`;
}

function inputClass(extra = "") {
  return `w-full rounded-xl border border-[#E6EFEA] bg-white px-3 py-2 text-sm outline-none focus:border-emerald-300 ${extra}`;
}

// ─── Phase 1: Upload Screen ───────────────────────────────────────────────────
function UploadScreen({
  t,
  documentType,
  setDocumentType,
  file,
  setFile,
  uploadPreview,
  setUploadPreview,
  activeCaseId,
  setActiveCaseId,
  loading,
  handleUpload,
  createCase,
  loadCase,
  caseSummary,
  cbamTax,
  caseConfig,
  setCaseConfig,
  saveCaseConfig,
  formatNumber,
  locale,
}) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileSelect = (f) => {
    setFile(f || null);
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    setUploadPreview(f ? URL.createObjectURL(f) : null);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
      {/* Left — upload form */}
      <div className="space-y-6">
        {/* Document type cards */}
        <section className={cardClassName()}>
          <p className="mb-4 text-lg font-semibold text-slate-900">{t("selectDocType")}</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: "fuel_invoice", label: t("fuelInvoice"), desc: t("fuelInvoiceDesc"), Icon: Flame },
              { value: "electricity_bill", label: t("electricityBill"), desc: t("electricityDesc"), Icon: Zap },
            ].map(({ value, label, desc, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setDocumentType(value)}
                className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-5 text-center transition-all ${
                  documentType === value
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-[#E6EFEA] bg-white text-slate-600 hover:border-emerald-200 hover:bg-[#F9FCFA]"
                }`}
              >
                <div
                  className={`rounded-2xl p-3 ${
                    documentType === value ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icon size={28} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="mt-1 text-xs text-slate-400">{desc}</p>
                </div>
                {documentType === value && <CheckCircle2 size={16} className="text-emerald-500" />}
              </button>
            ))}
          </div>
        </section>

        {/* File drop zone */}
        <section className={cardClassName()}>
          <p className="mb-4 text-lg font-semibold text-slate-900">{t("imageFile")}</p>

          {uploadPreview ? (
            <div className="relative">
              <img
                src={uploadPreview}
                alt="Preview"
                className="max-h-64 w-full rounded-xl border border-[#EAF2EE] object-contain"
              />
              <button
                type="button"
                onClick={() => handleFileSelect(null)}
                className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 shadow hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors"
              >
                <X size={14} />
              </button>
              <p className="mt-2 text-center text-xs text-slate-400">{file?.name}</p>
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f && ["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
                  handleFileSelect(f);
                }
              }}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-[#CCE2D8] bg-[#F9FCFA] p-12 transition-all hover:border-emerald-400 hover:bg-emerald-50"
            >
              <div className="rounded-2xl bg-emerald-100 p-4 text-emerald-500">
                <Upload size={32} />
              </div>
              <div className="text-center">
                <p className="font-medium text-slate-700">{t("dragOrClick")}</p>
                <p className="mt-1 text-xs text-slate-400">PNG · JPEG · WEBP</p>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
          />

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border border-[#E6EFEA] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              📷 {t("capturePhoto")}
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={loading || !file}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload size={16} />
              {loading ? t("processing") : t("uploadToCase")}
            </button>
          </div>
        </section>
      </div>

      {/* Right — case snapshot + config */}
      <div className="space-y-6">
        <section className={cardClassName()}>
          <p className="mb-3 text-lg font-semibold text-slate-900">{t("caseSeeSnapshot")}</p>
          {caseSummary ? (
            <div className="space-y-1.5 text-sm text-slate-700">
              <p>
                {t("status")}:{" "}
                <span className={`font-semibold ${statusClass(caseSummary.status)}`}>{caseSummary.status}</span>
              </p>
              <p>
                {t("see")}: <span className="font-mono">{formatNumber(caseSummary.specific_embedded_emissions, locale)}</span>
              </p>
              <p>
                {t("totalEmissions")}: <span className="font-mono">{formatNumber(caseSummary.total_emissions, locale)}</span>
              </p>
              <p>
                {t("totalOutput")}: <span className="font-mono">{formatNumber(caseSummary.total_product_output, locale)}</span>
              </p>
              <p>
                {t("docs")}: fuel={caseSummary.breakdown?.fuel_job_count ?? 0}, electricity=
                {caseSummary.breakdown?.electricity_job_count ?? 0}
              </p>
              <p>
                {t("cbamTaxShort")}: <span className="font-mono">{formatNumber(cbamTax?.cbam_tax, locale)}</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">{t("loadCaseHint")}</p>
          )}
        </section>

        <section className={cardClassName()}>
          <p className="mb-3 text-lg font-semibold text-slate-900">{t("caseConfig")}</p>
          <div className="space-y-2">
            <input
              type="number"
              step="any"
              value={caseConfig.precursors_emissions}
              onChange={(e) => setCaseConfig((p) => ({ ...p, precursors_emissions: e.target.value }))}
              placeholder={t("precursorsEmissions")}
              className={inputClass()}
            />
            <input
              type="number"
              step="any"
              value={caseConfig.total_product_output}
              onChange={(e) => setCaseConfig((p) => ({ ...p, total_product_output: e.target.value }))}
              placeholder={t("totalProductOutput")}
              className={inputClass()}
            />
            <input
              type="number"
              step="any"
              value={caseConfig.export_quantity}
              onChange={(e) => setCaseConfig((p) => ({ ...p, export_quantity: e.target.value }))}
              placeholder={t("exportQuantity")}
              className={inputClass()}
            />
            <button
              type="button"
              disabled={!activeCaseId || loading}
              onClick={saveCaseConfig}
              className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {t("saveCaseConfig")}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Phase 2a: Processing Screen ─────────────────────────────────────────────
function ProcessingScreen({ lang, processingStep, selectedJob }) {
  const steps =
    lang === "vi"
      ? [
          "Đang tải tài liệu lên...",
          "Đang chạy mô hình OCR...",
          "Đang xác thực dữ liệu trích xuất...",
          "Đang tính toán phát thải SEE...",
          "Hoàn tất xử lý!",
        ]
      : [
          "Uploading document...",
          "Running OCR model...",
          "Validating extracted data...",
          "Calculating SEE emissions...",
          "Processing complete!",
        ];

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <div className={cardClassName("w-full max-w-md")}>
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            {processingStep >= steps.length - 1 ? (
              <CheckCircle2 size={32} />
            ) : (
              <Loader2 size={32} className="animate-spin" />
            )}
          </div>
          <h2 className="text-xl font-semibold text-slate-900">
            {lang === "vi" ? "Đang xử lý tài liệu..." : "Processing your document..."}
          </h2>
          {selectedJob?.job_id && (
            <p className="mt-1 font-mono text-xs text-slate-400">{selectedJob.job_id}</p>
          )}
        </div>

        <div className="space-y-2">
          {steps.map((label, idx) => {
            const done = idx < processingStep;
            const active = idx === processingStep;
            return (
              <div
                key={idx}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-300 ${
                  active ? "bg-emerald-50 ring-1 ring-emerald-200" : done ? "bg-[#F9FCFA]" : "opacity-30"
                }`}
              >
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    done
                      ? "bg-emerald-500 text-white"
                      : active
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 size={14} />
                  ) : active ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <span
                  className={`text-sm font-medium ${
                    active ? "text-emerald-700" : done ? "text-slate-600" : "text-slate-400"
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Phase 2b: Result Screen ──────────────────────────────────────────────────
function ResultScreen({
  t,
  lang,
  locale,
  selectedJob,
  formatNumber,
  formatCellValue,
  manualValues,
  setManualValues,
  recalculate,
  loading,
  caseSummary,
  cbamTax,
  lastPriceRefreshAt,
  formatMissingFields,
  formatReason,
  auditLog,
  addAuditEntry,
  activeCaseId,
  caseConfig,
  setCaseConfig,
  saveCaseConfig,
  fetchCaseSummary,
  fetchCaseCbamTax,
  setError,
  exportCaseCSV,
}) {
  const [overrides, setOverrides] = useState({ ...manualValues });

  // Sync when job changes
  useEffect(() => {
    setOverrides({ ...manualValues });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJob?.job_id]);

  const handleSave = async () => {
    const d = selectedJob?.result?.data;
    ["quantity_used", "precursors_emissions", "indirect_emissions", "total_product_output"].forEach((field) => {
      if (overrides[field] === "") return;
      const newVal = Number(overrides[field]);
      const oldVal = d?.[field];
      if (!Number.isNaN(newVal) && oldVal !== newVal) {
        addAuditEntry(selectedJob.job_id, field, oldVal, newVal);
      }
    });
    setManualValues(overrides);
    await recalculate(overrides);
  };

  const data = selectedJob?.result?.data;
  const calc = selectedJob?.result?.calculation;

  const readOnlyFields = [
    ["vendor_name", data?.vendor_name],
    ["invoice_number", data?.invoice_number],
    ["invoice_date", data?.invoice_date],
    ["currency", data?.currency],
    ["total_amount", data?.total_amount],
    ["fuel_type", data?.fuel_type],
    ["product_name", data?.product_name],
    ["electricity_consumption_kwh", data?.electricity_consumption_kwh],
    ["direct_emissions", data?.direct_emissions],
  ];

  const overridableFields = [
    { key: "quantity_used", label: t("quantityUsed"), ocrValue: data?.quantity_used },
    { key: "precursors_emissions", label: t("precursorsEmissions"), ocrValue: data?.precursors_emissions },
    { key: "indirect_emissions", label: t("indirectEmissionsInput"), ocrValue: data?.indirect_emissions },
    { key: "total_product_output", label: t("totalProductOutput"), ocrValue: data?.total_product_output },
  ];

  const hasMissingOverrides = overridableFields.some(
    (f) => f.ocrValue === null || f.ocrValue === undefined,
  );

  const jobAuditEntries = auditLog.filter((e) => e.jobId === selectedJob?.job_id);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.35fr]">
      {/* Left — image (sticky) */}
      <div className="space-y-4">
        <div className={cardClassName("xl:sticky xl:top-6")}>
          <p className="mb-3 text-lg font-semibold text-slate-900">{t("documentPreview")}</p>
          <img
            src={`${API_BASE_URL}/api/v1/jobs/${selectedJob?.job_id}/image`}
            alt="Document"
            className="max-h-[680px] w-full rounded-xl border border-[#EAF2EE] object-contain"
          />
          {hasMissingOverrides && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-700 ring-1 ring-amber-200">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <span>
                {lang === "vi"
                  ? "Một số giá trị không trích xuất được. Vui lòng nhập thủ công bên phải."
                  : "Some values could not be extracted. Please fill them in on the right."}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right — data panels */}
      <div className="space-y-6">
        {/* Job overview */}
        <div className={cardClassName()}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-lg font-semibold text-slate-900">{t("jobOverview")}</p>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusChipClass(selectedJob?.status)}`}
            >
              {selectedJob?.status}
            </span>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <span className="text-slate-400">{t("jobId")}</span>
            <span className="truncate font-mono text-xs">{selectedJob?.job_id}</span>
            <span className="text-slate-400">{t("caseId")}</span>
            <span className="truncate font-mono text-xs">{selectedJob?.case_id || "-"}</span>
            <span className="text-slate-400">{t("documentType")}</span>
            <span>
              {selectedJob?.document_type === "fuel_invoice" ? t("fuelInvoice") : t("electricityBill")}
            </span>
            <span className="text-slate-400">{t("model")}</span>
            <span className="text-xs">{selectedJob?.model_used || "-"}</span>
          </div>
        </div>

        {/* Extracted data — read-only */}
        <div className={cardClassName()}>
          <p className="mb-3 text-lg font-semibold text-slate-900">{t("extractedData")}</p>
          <div className="max-h-56 overflow-auto rounded-xl border border-[#EEF4F0]">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-[#F9FCFA] text-left text-slate-500">
                <tr>
                  <th className="px-3 py-2">{t("field")}</th>
                  <th className="px-3 py-2">{t("value")}</th>
                </tr>
              </thead>
              <tbody>
                {readOnlyFields.map(([key, val]) => (
                  <tr key={key} className="border-t border-[#EEF4F0]">
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">{key}</td>
                    <td
                      className={`px-3 py-2 ${
                        val === null || val === undefined ? "italic text-slate-300" : "text-slate-800"
                      }`}
                    >
                      {formatCellValue(val, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Override form (Phase 2 — editable, amber highlight for missing) */}
        <div className={cardClassName()}>
          <p className="mb-1 text-lg font-semibold text-slate-900">{t("jobOverrides")}</p>
          <p className="mb-4 text-sm text-slate-400">{t("jobOverridesHint")}</p>
          <div className="space-y-3">
            {overridableFields.map(({ key, label, ocrValue }) => {
              const isMissing = ocrValue === null || ocrValue === undefined;
              return (
                <div key={key}>
                  <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-600">
                    {isMissing && <AlertTriangle size={12} className="text-amber-500" />}
                    <span>{label}</span>
                    <span className={`ml-auto text-xs ${isMissing ? "text-amber-500" : "text-slate-400"}`}>
                      {t("ocrValue")}: {isMissing ? "—" : formatCellValue(ocrValue, locale)}
                    </span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={overrides[key]}
                    onChange={(e) => setOverrides((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={isMissing ? t("missingValueHint") : ""}
                    className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition-colors ${
                      isMissing
                        ? "border-amber-300 bg-amber-50 placeholder:text-amber-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
                        : "border-[#E6EFEA] bg-white focus:border-emerald-300 focus:ring-1 focus:ring-emerald-100"
                    }`}
                  />
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || !selectedJob}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Save size={16} />
            {loading ? t("recalculating") : t("recalculateJob")}
          </button>
        </div>

        {/* Calculation results */}
        <div className={cardClassName()}>
          <p className="mb-3 text-lg font-semibold text-slate-900">{t("jobCalculation")}</p>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <span className="text-slate-400">{t("status")}</span>
            <span className="font-semibold">{calc?.status || "-"}</span>
            <span className="text-slate-400">{t("directEF")}</span>
            <span className="font-mono">{formatNumber(calc?.direct_emission_factor, locale)}</span>
            <span className="text-slate-400">{t("directEmissions")}</span>
            <span className="font-mono">{formatNumber(data?.direct_emissions, locale)}</span>
            <span className="text-slate-400">{t("indirectEmissions")}</span>
            <span className="font-mono">{formatNumber(data?.indirect_emissions, locale)}</span>
            <span className="text-slate-400">{t("totalOutput")}</span>
            <span className="font-mono">{formatNumber(calc?.total_product_output, locale)}</span>
            <span className="text-slate-400">{t("see")}</span>
            <span className="font-mono font-semibold text-emerald-700">
              {formatNumber(calc?.specific_embedded_emissions, locale)}
            </span>
          </div>
        </div>

        {/* Case SEE aggregated (Phase 5 — export button) */}
        <div className={cardClassName()}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-lg font-semibold text-slate-900">{t("caseSeeAggregated")}</p>
            <div className="flex gap-2">
              {caseSummary && (
                <button
                  type="button"
                  title={t("exportCSV")}
                  onClick={exportCaseCSV}
                  className="rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <Download size={14} />
                </button>
              )}
              <button
                type="button"
                disabled={!activeCaseId}
                onClick={async () => {
                  try {
                    await fetchCaseSummary(activeCaseId);
                    await fetchCaseCbamTax(activeCaseId);
                  } catch (e) {
                    setError(e.message || t("failedRefreshCase"));
                  }
                }}
                className="rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {caseSummary ? (
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <span className="text-slate-400">{t("status")}</span>
              <span className={`font-semibold ${statusClass(caseSummary.status)}`}>{caseSummary.status}</span>
              <span className="text-slate-400">{t("directEmissions")}</span>
              <span className="font-mono">{formatNumber(caseSummary.direct_emissions, locale)}</span>
              <span className="text-slate-400">{t("indirectEmissions")}</span>
              <span className="font-mono">{formatNumber(caseSummary.indirect_emissions, locale)}</span>
              <span className="text-slate-400">{t("precursorsLabel")}</span>
              <span className="font-mono">{formatNumber(caseSummary.precursors_emissions, locale)}</span>
              <span className="text-slate-400">{t("totalEmissions")}</span>
              <span className="font-mono">{formatNumber(caseSummary.total_emissions, locale)}</span>
              <span className="text-slate-400">{t("totalOutput")}</span>
              <span className="font-mono">{formatNumber(caseSummary.total_product_output, locale)}</span>
              <span className="text-slate-400">{t("see")}</span>
              <span className="font-mono font-semibold text-emerald-700">
                {formatNumber(caseSummary.specific_embedded_emissions, locale)}
              </span>
              <span className="text-slate-400">{t("jobsLine")}</span>
              <span>
                fuel={caseSummary.breakdown?.fuel_job_count ?? 0}, electricity=
                {caseSummary.breakdown?.electricity_job_count ?? 0}
              </span>
              {caseSummary.missing_fields?.length > 0 && (
                <>
                  <span className="text-amber-600">{t("missing")}</span>
                  <span className="text-amber-700">{formatMissingFields(caseSummary.missing_fields)}</span>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">{t("loadCaseHint")}</p>
          )}

          {cbamTax && (
            <div className="mt-4 rounded-xl bg-[#F8FBF9] p-4 ring-1 ring-[#EAF2EE]">
              <p className="mb-1 font-semibold text-slate-900">{t("cbamTaxTitle")}</p>
              <p className="mb-2 text-xs text-slate-400">
                {t("autoRefresh30s")} · {t("lastUpdate")}:{" "}
                {lastPriceRefreshAt ? new Date(lastPriceRefreshAt).toLocaleString(locale) : "-"}
              </p>
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <span className="text-slate-400">{t("exportQuantity")}</span>
                <span className="font-mono">{formatNumber(cbamTax.export_quantity, locale)}</span>
                <span className="text-slate-400">{t("euCarbonPrice")}</span>
                <span className="font-mono">
                  €{formatNumber(cbamTax.carbon_price?.price, locale)} (~{" "}
                  {formatVND(cbamTax.carbon_price_vnd_per_tco2)} / tCO2)
                </span>
                <span className="text-slate-400">{t("fxRate")}</span>
                <span className="font-mono">{formatNumber(cbamTax.fx_rate?.rate, locale)}</span>
                <span className="text-slate-400">{t("tax")}</span>
                <span className="font-mono font-semibold text-emerald-700">
                  €{formatNumber(cbamTax.cbam_tax, locale)} (~{formatVND(cbamTax.cbam_tax_vnd)})
                </span>
              </div>
              {cbamTax.missing_fields?.length > 0 && (
                <p className="mt-2 text-xs text-amber-600">
                  {t("missing")}: {formatMissingFields(cbamTax.missing_fields)}
                </p>
              )}
              {cbamTax.reason && (
                <p className="mt-1 text-xs text-amber-600">
                  {t("reason")}: {formatReason(cbamTax.reason)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Case Config */}
        <div className={cardClassName()}>
          <p className="mb-3 text-lg font-semibold text-slate-900">{t("caseConfig")}</p>
          <div className="space-y-2">
            <input
              type="number"
              step="any"
              value={caseConfig.precursors_emissions}
              onChange={(e) => setCaseConfig((p) => ({ ...p, precursors_emissions: e.target.value }))}
              placeholder={t("precursorsEmissions")}
              className={inputClass()}
            />
            <input
              type="number"
              step="any"
              value={caseConfig.total_product_output}
              onChange={(e) => setCaseConfig((p) => ({ ...p, total_product_output: e.target.value }))}
              placeholder={t("totalProductOutput")}
              className={inputClass()}
            />
            <input
              type="number"
              step="any"
              value={caseConfig.export_quantity}
              onChange={(e) => setCaseConfig((p) => ({ ...p, export_quantity: e.target.value }))}
              placeholder={t("exportQuantity")}
              className={inputClass()}
            />
            <button
              type="button"
              disabled={!activeCaseId || loading}
              onClick={saveCaseConfig}
              className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {t("saveCaseConfig")}
            </button>
          </div>
        </div>

        {/* Audit Log */}
        <div className={cardClassName()}>
          <p className="mb-3 text-lg font-semibold text-slate-900">{t("auditLog")}</p>
          {jobAuditEntries.length === 0 ? (
            <p className="text-sm text-slate-400">{t("noAuditLog")}</p>
          ) : (
            <div className="max-h-48 overflow-auto rounded-xl border border-[#EEF4F0]">
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 bg-[#F9FCFA] text-left text-slate-500">
                  <tr>
                    <th className="px-3 py-2">{t("auditField")}</th>
                    <th className="px-3 py-2">{t("auditOldValue")}</th>
                    <th className="px-3 py-2">{t("auditNewValue")}</th>
                    <th className="px-3 py-2">{t("auditTime")}</th>
                  </tr>
                </thead>
                <tbody>
                  {jobAuditEntries.map((entry, idx) => (
                    <tr key={idx} className="border-t border-[#EEF4F0]">
                      <td className="px-3 py-2 font-mono">{entry.field}</td>
                      <td className="px-3 py-2 text-slate-400">{entry.oldValue ?? "—"}</td>
                      <td className="px-3 py-2 font-medium text-emerald-700">{entry.newValue ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-400">
                        {new Date(entry.timestamp).toLocaleString(locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Phase 3: Cases Screen ────────────────────────────────────────────────────
function CasesScreen({ t, locale, cases, loading, fetchCases, openCase, setError }) {
  return (
    <div className={cardClassName()}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-lg font-semibold text-slate-900">{t("allCases")}</p>
        <button
          type="button"
          onClick={async () => {
            try {
              await fetchCases();
            } catch (e) {
              setError(e.message || t("failedFetchCases"));
            }
          }}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
        >
          <RefreshCw size={14} />
          {t("refresh")}
        </button>
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[#EEF4F0] text-left text-slate-500">
              <th className="px-3 py-2">{t("caseId")}</th>
              <th className="px-3 py-2">{t("caseCreatedAt")}</th>
              <th className="px-3 py-2">{t("action")}</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.case_id} className="border-t border-[#EEF4F0] hover:bg-[#F9FCFA]">
                <td className="px-3 py-2 font-mono text-xs">{c.case_id}</td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {c.created_at ? new Date(c.created_at).toLocaleString(locale) : "-"}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => openCase(c.case_id)}
                    className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                  >
                    {t("open")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cases.length === 0 && !loading && (
          <p className="py-10 text-center text-sm text-slate-400">{t("noData")}</p>
        )}
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-emerald-500" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Phase 4: Emission Admin Screen ──────────────────────────────────────────
function EmissionAdminScreen({
  t,
  fuelMappings,
  emissionFactors,
  loading,
  fetchEmissionData,
  upsertFuelMapping,
  upsertEmissionFactor,
  setError,
}) {
  const [newMapping, setNewMapping] = useState({ product_key: "", fuel_type: "" });
  const [newFactor, setNewFactor] = useState({ fuel_type: "", direct_ef: "" });

  const fieldClass =
    "flex-1 rounded-xl border border-[#E6EFEA] bg-white px-3 py-2 text-sm outline-none focus:border-emerald-300";

  const handleAddMapping = async () => {
    if (!newMapping.product_key.trim() || !newMapping.fuel_type.trim()) return;
    const ok = await upsertFuelMapping(newMapping);
    if (ok) {
      setNewMapping({ product_key: "", fuel_type: "" });
    } else {
      setError(t("failedUpsertMapping"));
    }
  };

  const handleAddFactor = async () => {
    if (!newFactor.fuel_type.trim() || !newFactor.direct_ef) return;
    const ok = await upsertEmissionFactor({ fuel_type: newFactor.fuel_type, direct_ef: Number(newFactor.direct_ef) });
    if (ok) {
      setNewFactor({ fuel_type: "", direct_ef: "" });
    } else {
      setError(t("failedUpsertFactor"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Fuel Mappings */}
      <div className={cardClassName()}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-slate-900">{t("fuelMappings")}</p>
            <p className="text-xs text-slate-400">product_name → fuel_type</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                await fetchEmissionData();
              } catch (e) {
                setError(e.message || t("failedFetchEmission"));
              }
            }}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200"
          >
            <RefreshCw size={14} />
            {t("refresh")}
          </button>
        </div>

        <div className="mb-4 max-h-64 overflow-auto rounded-xl border border-[#EEF4F0]">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-[#F9FCFA] text-left text-slate-500">
              <tr>
                <th className="px-3 py-2">{t("productKey")}</th>
                <th className="px-3 py-2">{t("fuelTypeLabel")}</th>
              </tr>
            </thead>
            <tbody>
              {fuelMappings.map((m, idx) => (
                <tr key={idx} className="border-t border-[#EEF4F0] hover:bg-[#F9FCFA]">
                  <td className="px-3 py-2 font-mono text-xs">{m.product_key}</td>
                  <td className="px-3 py-2">{m.fuel_type}</td>
                </tr>
              ))}
              {fuelMappings.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-center text-sm text-slate-400">
                    {t("noData")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2">
          <input
            value={newMapping.product_key}
            onChange={(e) => setNewMapping((p) => ({ ...p, product_key: e.target.value }))}
            placeholder={t("productKey")}
            className={fieldClass}
          />
          <input
            value={newMapping.fuel_type}
            onChange={(e) => setNewMapping((p) => ({ ...p, fuel_type: e.target.value }))}
            placeholder={t("fuelTypeLabel")}
            className={fieldClass}
          />
          <button
            type="button"
            onClick={handleAddMapping}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Plus size={14} />
            {t("add")}
          </button>
        </div>
      </div>

      {/* Emission Factors */}
      <div className={cardClassName()}>
        <div className="mb-4">
          <p className="text-lg font-semibold text-slate-900">{t("emissionFactors")}</p>
          <p className="text-xs text-slate-400">fuel_type → direct EF (tCO2/unit)</p>
        </div>

        <div className="mb-4 max-h-64 overflow-auto rounded-xl border border-[#EEF4F0]">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-[#F9FCFA] text-left text-slate-500">
              <tr>
                <th className="px-3 py-2">{t("fuelTypeLabel")}</th>
                <th className="px-3 py-2">{t("directEFUnit")}</th>
              </tr>
            </thead>
            <tbody>
              {emissionFactors.map((f, idx) => (
                <tr key={idx} className="border-t border-[#EEF4F0] hover:bg-[#F9FCFA]">
                  <td className="px-3 py-2">{f.fuel_type}</td>
                  <td className="px-3 py-2 font-mono">{f.direct_ef}</td>
                </tr>
              ))}
              {emissionFactors.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-center text-sm text-slate-400">
                    {t("noData")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2">
          <input
            value={newFactor.fuel_type}
            onChange={(e) => setNewFactor((p) => ({ ...p, fuel_type: e.target.value }))}
            placeholder={t("fuelTypeLabel")}
            className={fieldClass}
          />
          <input
            type="number"
            step="any"
            value={newFactor.direct_ef}
            onChange={(e) => setNewFactor((p) => ({ ...p, direct_ef: e.target.value }))}
            placeholder={t("directEFUnit")}
            className={fieldClass}
          />
          <button
            type="button"
            onClick={handleAddFactor}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Plus size={14} />
            {t("add")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Jobs Screen ──────────────────────────────────────────────────────────────
function JobsScreen({ t, jobs, loading, fetchJobs, openDetail, documentTypeLabel, setError }) {
  return (
    <div className={cardClassName()}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-lg font-semibold text-slate-900">{t("recentJobs")}</p>
        <button
          type="button"
          onClick={async () => {
            try {
              await fetchJobs();
            } catch (e) {
              setError(e.message || t("failedRefreshJobs"));
            }
          }}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
        >
          <RefreshCw size={14} />
          {t("refresh")}
        </button>
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[#EEF4F0] text-left text-slate-500">
              <th className="px-3 py-2">{t("jobId")}</th>
              <th className="px-3 py-2">{t("caseId")}</th>
              <th className="px-3 py-2">{t("type")}</th>
              <th className="px-3 py-2">{t("file")}</th>
              <th className="px-3 py-2">{t("status")}</th>
              <th className="px-3 py-2">{t("action")}</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.job_id} className="border-t border-[#EEF4F0] hover:bg-[#F9FCFA]">
                <td className="px-3 py-2 font-mono text-xs">{job.job_id}</td>
                <td className="px-3 py-2 font-mono text-xs">{job.case_id || "-"}</td>
                <td className="px-3 py-2">{documentTypeLabel(job.document_type)}</td>
                <td className="max-w-[140px] truncate px-3 py-2 text-xs text-slate-500">{job.file_name}</td>
                <td className={`px-3 py-2 font-semibold ${statusClass(job.status)}`}>{job.status}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await openDetail(job.job_id);
                      } catch (e) {
                        setError(e.message || t("failedOpenDetail"));
                      }
                    }}
                    className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                  >
                    {t("open")}
                  </button>
                </td>
              </tr>
            ))}
            {jobs.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-sm text-slate-400">
                  {t("noData")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-emerald-500" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    return saved === "vi" ? "vi" : "en";
  });

  // screens: "upload" | "processing" | "result" | "jobs" | "cases" | "emission-admin"
  const [screen, setScreen] = useState("upload");
  const [processingStep, setProcessingStep] = useState(0);

  const [file, setFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [documentType, setDocumentType] = useState("fuel_invoice");

  const [activeCaseId, setActiveCaseId] = useState("");
  const [caseSummary, setCaseSummary] = useState(null);
  const [cbamTax, setCbamTax] = useState(null);
  const [lastPriceRefreshAt, setLastPriceRefreshAt] = useState(null);
  const [caseConfig, setCaseConfig] = useState({ precursors_emissions: "", total_product_output: "", export_quantity: "" });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [jobs, setJobs] = useState([]);
  const [cases, setCases] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [manualValues, setManualValues] = useState({
    quantity_used: "",
    precursors_emissions: "",
    indirect_emissions: "",
    total_product_output: "",
  });

  const [fuelMappings, setFuelMappings] = useState([]);
  const [emissionFactors, setEmissionFactors] = useState([]);

  const [auditLog, setAuditLog] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(AUDIT_LOG_STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });

  // ── i18n helpers ────────────────────────────────────────────────────────────
  const t = (key) => MESSAGES[lang][key] || MESSAGES.en[key] || key;
  const locale = lang === "vi" ? "vi-VN" : "en-US";

  useEffect(() => {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  }, [lang]);

  // ── Mapping helpers ─────────────────────────────────────────────────────────
  const missingFieldViMap = {
    electricity_bill: "hóa đơn điện",
    fuel_receipt: "hóa đơn nhiên liệu",
    fuel_invoice: "hóa đơn nhiên liệu",
    export_quantity: "sản lượng xuất khẩu",
    specific_embedded_emissions: "SEE",
    total_product_output: "tổng sản lượng đầu ra",
    carbon_price: "giá carbon EU",
    eur_vnd_rate: "tỷ giá EUR->VND",
  };
  const reasonViMap = {
    "Missing required values for CBAM tax calculation": "Thiếu dữ liệu cần thiết để tính thuế CBAM",
    "Missing total_product_output for SEE calculation": "Thiếu tổng sản lượng đầu ra để tính SEE",
    "SEE computed with partial document set; upload missing documents for full scope":
      "SEE được tính với bộ chứng từ chưa đầy đủ; vui lòng tải thêm tài liệu còn thiếu",
  };

  const documentTypeLabel = (value) => {
    if (value === "fuel_invoice") return t("fuelInvoice");
    if (value === "electricity_bill") return t("electricityBill");
    return value || "-";
  };

  const formatMissingFields = (fields) => {
    if (!Array.isArray(fields) || fields.length === 0) return "-";
    if (lang !== "vi") return fields.join(", ");
    return fields.map((f) => missingFieldViMap[f] || f).join(", ");
  };

  const formatReason = (reason) => {
    if (!reason) return "-";
    if (lang !== "vi") return reason;
    return reasonViMap[reason] || reason;
  };

  // ── Audit log ───────────────────────────────────────────────────────────────
  const addAuditEntry = (jobId, field, oldValue, newValue) => {
    const entry = { jobId, field, oldValue, newValue, timestamp: new Date().toISOString() };
    setAuditLog((prev) => {
      const next = [entry, ...prev].slice(0, 300);
      localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // ── API helpers ─────────────────────────────────────────────────────────────
  const fetchJobs = async () => {
    const res = await fetch(`${API_BASE_URL}/api/v1/jobs?limit=30`);
    const payload = await res.json();
    if (!res.ok) throw new Error(payload?.detail || t("failedFetchJobs"));
    setJobs(payload);
  };

  const fetchCaseSummary = async (caseId) => {
    if (!caseId) { setCaseSummary(null); return; }
    const res = await fetch(`${API_BASE_URL}/api/v1/cases/${caseId}/see`);
    const payload = await res.json();
    if (!res.ok) throw new Error(payload?.detail || t("failedFetchCaseSee"));
    setCaseSummary(payload);
  };

  const fetchCaseCbamTax = async (caseId) => {
    if (!caseId) { setCbamTax(null); setLastPriceRefreshAt(null); return; }
    const res = await fetch(`${API_BASE_URL}/api/v1/cases/${caseId}/cbam-tax`);
    const payload = await res.json();
    if (!res.ok) throw new Error(payload?.detail || t("failedFetchCbamTax"));
    setCbamTax(payload);
    setLastPriceRefreshAt(new Date().toISOString());
  };

  const fetchCaseConfig = async (caseId) => {
    if (!caseId) return;
    const res = await fetch(`${API_BASE_URL}/api/v1/cases/${caseId}`);
    const payload = await res.json();
    if (!res.ok) throw new Error(payload?.detail || t("failedFetchCase"));
    setCaseConfig({
      precursors_emissions: payload?.precursors_emissions ?? "",
      total_product_output: payload?.total_product_output ?? "",
      export_quantity: payload?.export_quantity ?? "",
    });
  };

  const fetchCases = async () => {
    const res = await fetch(`${API_BASE_URL}/api/v1/cases?limit=50`);
    const payload = await res.json();
    if (!res.ok) throw new Error(payload?.detail || t("failedFetchCases"));
    setCases(payload);
  };

  const fetchEmissionData = async () => {
    const [mRes, fRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/v1/emission/fuel-mappings`),
      fetch(`${API_BASE_URL}/api/v1/emission/factors`),
    ]);
    const mappings = await mRes.json();
    const factors = await fRes.json();
    if (mRes.ok) setFuelMappings(mappings);
    if (fRes.ok) setEmissionFactors(factors);
  };

  const upsertFuelMapping = async (payload) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/emission/fuel-mappings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) { await fetchEmissionData(); return true; }
      return false;
    } catch {
      return false;
    }
  };

  const upsertEmissionFactor = async (payload) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/emission/factors`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) { await fetchEmissionData(); return true; }
      return false;
    } catch {
      return false;
    }
  };

  // ── Job helpers ─────────────────────────────────────────────────────────────
  const parseNullableNumber = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  };

  const fillManualFromJob = (job) => {
    const d = job?.result?.data;
    setManualValues({
      quantity_used: "",
      precursors_emissions: d?.precursors_emissions ?? "",
      indirect_emissions: d?.indirect_emissions ?? "",
      total_product_output: d?.total_product_output ?? "",
    });
  };

  // ── Polling ─────────────────────────────────────────────────────────────────
  const pollJob = async (jobId) => {
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt += 1) {
      await sleep(POLL_INTERVAL_MS);
      if (attempt === 1) setProcessingStep(2); // Validating
      if (attempt === 3) setProcessingStep(3); // Calculating

      const res = await fetch(`${API_BASE_URL}/api/v1/jobs/${jobId}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.detail || t("failedPollJob"));
      setSelectedJob(payload);
      if (payload.status === "COMPLETED") {
        setProcessingStep(4);
        await fetchJobs();
        return payload;
      }
      if (payload.status === "FAILED") {
        throw new Error(payload.error_message || "OCR job failed");
      }
    }
    throw new Error(t("pollTimeout"));
  };

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) { setError(t("chooseImageFirst")); return; }
    setLoading(true);
    setError("");
    setProcessingStep(0);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_type", documentType);
      if (activeCaseId.trim()) formData.append("case_id", activeCaseId.trim());

      setScreen("processing");

      const createRes = await fetch(`${API_BASE_URL}/api/v1/jobs`, { method: "POST", body: formData });
      const createPayload = await createRes.json();
      if (!createRes.ok) throw new Error(createPayload?.detail || t("failedCreateJob"));

      setSelectedJob(createPayload);
      if (createPayload.case_id) setActiveCaseId(createPayload.case_id);
      fillManualFromJob(createPayload);
      setProcessingStep(1);

      const finalJob = await pollJob(createPayload.job_id);
      if (finalJob?.case_id) {
        await fetchCaseSummary(finalJob.case_id);
        await fetchCaseCbamTax(finalJob.case_id);
        await fetchCaseConfig(finalJob.case_id);
      }
      fillManualFromJob(finalJob);
      setScreen("result");
    } catch (err) {
      setError(err.message || t("unexpectedError"));
      setScreen("upload");
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (jobId) => {
    setError("");
    const res = await fetch(`${API_BASE_URL}/api/v1/jobs/${jobId}`);
    const payload = await res.json();
    if (!res.ok) throw new Error(payload?.detail || t("failedOpenDetail"));
    setSelectedJob(payload);
    setActiveCaseId(payload.case_id || "");
    fillManualFromJob(payload);
    if (payload.case_id) {
      await fetchCaseSummary(payload.case_id);
      await fetchCaseConfig(payload.case_id);
      await fetchCaseCbamTax(payload.case_id);
    } else {
      setCaseSummary(null);
      setCbamTax(null);
    }
    setScreen("result");
  };

  const openCase = async (caseId) => {
    setActiveCaseId(caseId);
    try {
      await fetchCaseConfig(caseId);
      await fetchCaseSummary(caseId);
      await fetchCaseCbamTax(caseId);
    } catch (e) {
      setError(e.message || t("failedLoadCase"));
    }
    setScreen("upload");
  };

  const recalculate = async (overrideValues = null) => {
    if (!selectedJob) return;
    setLoading(true);
    setError("");
    try {
      const values = overrideValues || manualValues;
      const res = await fetch(`${API_BASE_URL}/api/v1/jobs/${selectedJob.job_id}/recalculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity_used: parseNullableNumber(values.quantity_used),
          precursors_emissions: parseNullableNumber(values.precursors_emissions),
          indirect_emissions: parseNullableNumber(values.indirect_emissions),
          total_product_output: parseNullableNumber(values.total_product_output),
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.detail || t("failedRecalculate"));
      setSelectedJob(payload);
      if (payload.case_id) {
        await fetchCaseSummary(payload.case_id);
        await fetchCaseCbamTax(payload.case_id);
      }
      fillManualFromJob(payload);
      await fetchJobs();
    } catch (e) {
      setError(e.message || t("recalcFailed"));
    } finally {
      setLoading(false);
    }
  };

  const createCase = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.detail || t("failedCreateCase"));
      setActiveCaseId(payload.case_id);
      await fetchCaseSummary(payload.case_id);
      await fetchCaseConfig(payload.case_id);
      await fetchCaseCbamTax(payload.case_id);
    } catch (e) {
      setError(e.message || t("failedCreateCase"));
    } finally {
      setLoading(false);
    }
  };

  const loadCase = async () => {
    if (!activeCaseId) return;
    setLoading(true);
    setError("");
    try {
      await fetchCaseConfig(activeCaseId);
      await fetchCaseSummary(activeCaseId);
      await fetchCaseCbamTax(activeCaseId);
    } catch (e) {
      setError(e.message || t("failedLoadCase"));
    } finally {
      setLoading(false);
    }
  };

  const saveCaseConfig = async () => {
    if (!activeCaseId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/cases/${activeCaseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          precursors_emissions: parseNullableNumber(caseConfig.precursors_emissions),
          total_product_output: parseNullableNumber(caseConfig.total_product_output),
          export_quantity: parseNullableNumber(caseConfig.export_quantity),
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.detail || t("failedSaveCase"));
      setCaseConfig({
        precursors_emissions: payload?.precursors_emissions ?? "",
        total_product_output: payload?.total_product_output ?? "",
        export_quantity: payload?.export_quantity ?? "",
      });
      await fetchCaseSummary(activeCaseId);
      await fetchCaseCbamTax(activeCaseId);
    } catch (e) {
      setError(e.message || t("failedSaveCase"));
    } finally {
      setLoading(false);
    }
  };

  // ── Phase 5: CSV export ─────────────────────────────────────────────────────
  const exportCaseCSV = () => {
    if (!caseSummary) return;
    const rows = [
      ["case_id", activeCaseId],
      ["status", caseSummary.status],
      ["direct_emissions", caseSummary.direct_emissions ?? ""],
      ["indirect_emissions", caseSummary.indirect_emissions ?? ""],
      ["precursors_emissions", caseSummary.precursors_emissions ?? ""],
      ["total_emissions", caseSummary.total_emissions ?? ""],
      ["total_product_output", caseSummary.total_product_output ?? ""],
      ["specific_embedded_emissions_SEE", caseSummary.specific_embedded_emissions ?? ""],
      ["fuel_job_count", caseSummary.breakdown?.fuel_job_count ?? ""],
      ["electricity_job_count", caseSummary.breakdown?.electricity_job_count ?? ""],
      ["export_quantity", cbamTax?.export_quantity ?? ""],
      ["carbon_price_eur_per_tco2", cbamTax?.carbon_price?.price ?? ""],
      ["fx_rate_eur_vnd", cbamTax?.fx_rate?.rate ?? ""],
      ["cbam_tax_eur", cbamTax?.cbam_tax ?? ""],
      ["cbam_tax_vnd", cbamTax?.cbam_tax_vnd ?? ""],
      ["exported_at", new Date().toISOString()],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cbam_case_${activeCaseId}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchJobs().catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeCaseId) return undefined;
    const timer = setInterval(() => {
      fetchCaseSummary(activeCaseId).catch(() => {});
      fetchCaseCbamTax(activeCaseId).catch(() => {});
    }, 30000);
    return () => clearInterval(timer);
  }, [activeCaseId]);

  // ── Nav items ────────────────────────────────────────────────────────────────
  const navItems = useMemo(
    () => [
      { key: "upload", label: t("navUpload"), Icon: Upload },
      { key: "cases", label: t("navCases"), Icon: Database },
      { key: "jobs", label: t("navJobs"), Icon: List },
      { key: "result", label: t("navResult"), Icon: FileText, disabled: !selectedJob },
      { key: "emission-admin", label: t("navEmission"), Icon: Settings },
    ],
    [lang, selectedJob],
  );

  const handleNavClick = async (key) => {
    setError("");
    if (key === "cases") {
      setScreen("cases");
      try { await fetchCases(); } catch (e) { setError(e.message || t("failedFetchCases")); }
    } else if (key === "jobs") {
      setScreen("jobs");
      try { await fetchJobs(); } catch (e) { setError(e.message || t("failedRefreshJobs")); }
    } else if (key === "emission-admin") {
      setScreen("emission-admin");
      try { await fetchEmissionData(); } catch (e) { setError(e.message || t("failedFetchEmission")); }
    } else {
      setScreen(key);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F3FAF6] text-slate-800">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 lg:flex-row lg:px-8">
        {/* ── Sidebar ── */}
        <aside className={cardClassName("w-full lg:sticky lg:top-6 lg:h-fit lg:w-72 flex-shrink-0")}>
          {/* Logo */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <BarChart3 size={18} />
            </div>
            <div>
              <p className="text-xs text-slate-400">{t("workspaceLabel")}</p>
              <p className="text-sm font-semibold text-slate-900">{t("workspaceName")}</p>
            </div>
          </div>

          {/* Language */}
          <div className="mb-5 flex gap-2">
            {["en", "vi"].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold uppercase ${
                  lang === l ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Nav */}
          <nav className="space-y-1">
            {navItems.map(({ key, label, Icon, disabled }) => (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => handleNavClick(key)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  screen === key
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                    : "text-slate-600 hover:bg-[#F8FBF9]"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>

          {/* Active case */}
          <div className="mt-6 rounded-xl bg-[#F9FCFA] p-4 ring-1 ring-[#EAF2EE]">
            <p className="mb-2 text-sm font-semibold text-slate-900">{t("caseWorkspace")}</p>
            {activeCaseId && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 ring-1 ring-emerald-100">
                <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                <span className="truncate font-mono text-xs text-emerald-700">{activeCaseId}</span>
              </div>
            )}
            <input
              type="text"
              value={activeCaseId}
              onChange={(e) => setActiveCaseId(e.target.value.trim())}
              placeholder={t("caseIdPlaceholder")}
              className="mb-2 w-full rounded-lg border border-[#E6EFEA] bg-white px-3 py-2 font-mono text-xs outline-none focus:border-emerald-300"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={loadCase}
                disabled={loading || !activeCaseId}
                className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                {t("loadCase")}
              </button>
              <button
                type="button"
                onClick={createCase}
                disabled={loading}
                className="flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Plus size={12} />
                {t("newCase")}
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="min-w-0 flex-1 space-y-6">
          {/* Header */}
          <section className={cardClassName()}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl font-semibold text-slate-900">{t("dashboardTitle")}</h1>
              {selectedJob && (
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusChipClass(selectedJob.status)}`}
                >
                  {selectedJob.status}
                </span>
              )}
            </div>
          </section>

          {/* Error banner */}
          {error && (
            <section className="flex items-center gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
              <AlertTriangle size={16} className="flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button type="button" onClick={() => setError("")} className="text-rose-400 hover:text-rose-700">
                <X size={16} />
              </button>
            </section>
          )}

          {/* Screen routing */}
          {screen === "upload" && (
            <UploadScreen
              t={t}
              documentType={documentType}
              setDocumentType={setDocumentType}
              file={file}
              setFile={setFile}
              uploadPreview={uploadPreview}
              setUploadPreview={setUploadPreview}
              activeCaseId={activeCaseId}
              setActiveCaseId={setActiveCaseId}
              loading={loading}
              handleUpload={handleUpload}
              createCase={createCase}
              loadCase={loadCase}
              caseSummary={caseSummary}
              cbamTax={cbamTax}
              caseConfig={caseConfig}
              setCaseConfig={setCaseConfig}
              saveCaseConfig={saveCaseConfig}
              formatNumber={formatNumber}
              locale={locale}
            />
          )}

          {screen === "processing" && (
            <ProcessingScreen lang={lang} processingStep={processingStep} selectedJob={selectedJob} />
          )}

          {screen === "result" && selectedJob && (
            <ResultScreen
              t={t}
              lang={lang}
              locale={locale}
              selectedJob={selectedJob}
              formatNumber={formatNumber}
              formatCellValue={formatCellValue}
              manualValues={manualValues}
              setManualValues={setManualValues}
              recalculate={recalculate}
              loading={loading}
              caseSummary={caseSummary}
              cbamTax={cbamTax}
              lastPriceRefreshAt={lastPriceRefreshAt}
              formatMissingFields={formatMissingFields}
              formatReason={formatReason}
              auditLog={auditLog}
              addAuditEntry={addAuditEntry}
              activeCaseId={activeCaseId}
              caseConfig={caseConfig}
              setCaseConfig={setCaseConfig}
              saveCaseConfig={saveCaseConfig}
              fetchCaseSummary={fetchCaseSummary}
              fetchCaseCbamTax={fetchCaseCbamTax}
              setError={setError}
              exportCaseCSV={exportCaseCSV}
            />
          )}

          {screen === "result" && !selectedJob && (
            <div className={cardClassName("flex items-center justify-center py-16 text-slate-400")}>
              <p>{t("noJobSelected")}</p>
            </div>
          )}

          {screen === "jobs" && (
            <JobsScreen
              t={t}
              jobs={jobs}
              loading={loading}
              fetchJobs={fetchJobs}
              openDetail={openDetail}
              documentTypeLabel={documentTypeLabel}
              setError={setError}
            />
          )}

          {screen === "cases" && (
            <CasesScreen
              t={t}
              locale={locale}
              cases={cases}
              loading={loading}
              fetchCases={fetchCases}
              openCase={openCase}
              setError={setError}
            />
          )}

          {screen === "emission-admin" && (
            <EmissionAdminScreen
              t={t}
              fuelMappings={fuelMappings}
              emissionFactors={emissionFactors}
              loading={loading}
              fetchEmissionData={fetchEmissionData}
              upsertFuelMapping={upsertFuelMapping}
              upsertEmissionFactor={upsertEmissionFactor}
              setError={setError}
            />
          )}
        </main>
      </div>
    </div>
  );
}
