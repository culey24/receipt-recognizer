import { FileText, List, RefreshCw, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const POLL_INTERVAL_MS = 1500;
const POLL_MAX_ATTEMPTS = 120;
const DECIMALS = 2;
const LANG_STORAGE_KEY = "cbam_lang";

const MESSAGES = {
  en: {
    workspaceLabel: "CBAM Workspace",
    workspaceName: "Receipt Recognizer",
    navUpload: "Upload Documents",
    navJobs: "Job List",
    navDetail: "Split Workspace",
    caseWorkspace: "Case Workspace",
    caseIdPlaceholder: "Paste existing case_id",
    loadCase: "Load Case",
    newCase: "New Case",
    dashboardTitle: "CBAM Calculation Workspace",
    uploadReceipt: "Upload Receipt",
    documentType: "Document Type",
    fuelInvoice: "Fuel Invoice",
    electricityBill: "Electricity Bill",
    imageFile: "Image File",
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
    extractedData: "Extracted Data",
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
    jobOverrides: "Job Overrides",
    quantityUsed: "Quantity used",
    indirectEmissionsInput: "Indirect emissions",
    recalculateJob: "Recalculate Job",
    recalculating: "Recalculating...",
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
    reportGenerator: "Periodic CBAM Report",
    reportProductType: "Product type",
    reportYear: "Year",
    reportQuarter: "Quarter",
    reportLanguage: "Report language",
    generateReport: "Generate Report Files",
    generatingReport: "Generating report...",
    reportStatus: "Report status",
    llmStatus: "LLM draft",
    reportId: "Report ID",
    downloadJson: "Download JSON",
    downloadXml: "Download XML",
    downloadTxt: "Download TXT",
    downloadPdf: "Download PDF",
    reportReason: "Report reason",
    productTypeCement: "Cement",
    productTypeFertilizer: "Fertilizer",
    productTypeIronSteel: "Iron/Steel",
    productTypeAluminum: "Aluminum",
    productTypeHydrogen: "Hydrogen",
    productTypeElectricity: "Electricity",
    failedGenerateReport: "Failed to generate report",
  },
  vi: {
    workspaceLabel: "Không gian CBAM",
    workspaceName: "Nhận diện Hóa đơn",
    navUpload: "Tải tài liệu",
    navJobs: "Danh sách Job",
    navDetail: "Không gian làm việc",
    caseWorkspace: "Không gian Case",
    caseIdPlaceholder: "Dán case_id có sẵn",
    loadCase: "Tải Case",
    newCase: "Case Mới",
    dashboardTitle: "Không gian tính toán CBAM",
    uploadReceipt: "Tải hóa đơn",
    documentType: "Loại tài liệu",
    fuelInvoice: "Hóa đơn nhiên liệu",
    electricityBill: "Hóa đơn điện",
    imageFile: "Tệp ảnh",
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
    extractedData: "Dữ liệu trích xuất",
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
    jobOverrides: "Ghi đè theo Job",
    quantityUsed: "Lượng nhiên liệu tiêu thụ",
    indirectEmissionsInput: "Phát thải gián tiếp",
    recalculateJob: "Tính lại Job",
    recalculating: "Đang tính lại...",
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
    reportGenerator: "Báo cáo CBAM định kỳ",
    reportProductType: "Nhóm sản phẩm",
    reportYear: "Năm",
    reportQuarter: "Quý",
    reportLanguage: "Ngôn ngữ báo cáo",
    generateReport: "Tạo tệp báo cáo",
    generatingReport: "Đang tạo báo cáo...",
    reportStatus: "Trạng thái báo cáo",
    llmStatus: "Bản nháp LLM",
    reportId: "Mã báo cáo",
    downloadJson: "Tải JSON",
    downloadXml: "Tải XML",
    downloadTxt: "Tải TXT",
    downloadPdf: "Tải PDF",
    reportReason: "Lý do báo cáo",
    productTypeCement: "Xi măng",
    productTypeFertilizer: "Phân bón",
    productTypeIronSteel: "Sắt/Thép",
    productTypeAluminum: "Nhôm",
    productTypeHydrogen: "Hydro",
    productTypeElectricity: "Điện",
    failedGenerateReport: "Không tạo được báo cáo",
  },
};

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

export default function App() {
  const now = new Date();
  const defaultQuarter = Math.floor(now.getMonth() / 3) + 1;

  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    return saved === "vi" ? "vi" : "en";
  });
  const [screen, setScreen] = useState("upload");
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState("fuel_invoice");
  const [activeCaseId, setActiveCaseId] = useState("");
  const [caseSummary, setCaseSummary] = useState(null);
  const [cbamTax, setCbamTax] = useState(null);
  const [lastPriceRefreshAt, setLastPriceRefreshAt] = useState(null);
  const [caseConfig, setCaseConfig] = useState({
    precursors_emissions: "",
    total_product_output: "",
    export_quantity: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [manualValues, setManualValues] = useState({
    quantity_used: "",
    precursors_emissions: "",
    indirect_emissions: "",
    total_product_output: "",
  });
  const [reportConfig, setReportConfig] = useState({
    product_type: "iron_steel",
    period_year: now.getFullYear(),
    period_quarter: defaultQuarter,
    language: "en",
  });
  const [reportResult, setReportResult] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const t = (key) => MESSAGES[lang][key] || MESSAGES.en[key] || key;
  const locale = lang === "vi" ? "vi-VN" : "en-US";
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

  const productTypeLabel = (value) => {
    if (value === "cement") return t("productTypeCement");
    if (value === "fertilizer") return t("productTypeFertilizer");
    if (value === "iron_steel") return t("productTypeIronSteel");
    if (value === "aluminum") return t("productTypeAluminum");
    if (value === "hydrogen") return t("productTypeHydrogen");
    if (value === "electricity") return t("productTypeElectricity");
    return value || "-";
  };

  const formatMissingFields = (fields) => {
    if (!Array.isArray(fields) || fields.length === 0) return "-";
    if (lang !== "vi") return fields.join(", ");
    return fields.map((field) => missingFieldViMap[field] || field).join(", ");
  };

  const formatReason = (reason) => {
    if (!reason) return "-";
    if (lang !== "vi") return reason;
    return reasonViMap[reason] || reason;
  };

  useEffect(() => {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  }, [lang]);

  useEffect(() => {
    setReportConfig((prev) => ({ ...prev, language: lang }));
  }, [lang]);

  useEffect(() => {
    setReportResult(null);
  }, [activeCaseId]);

  const selectedRows = useMemo(() => {
    if (!selectedJob?.result?.data) return [];
    const d = selectedJob.result.data;
    return [
      ["vendor_name", d.vendor_name],
      ["invoice_number", d.invoice_number],
      ["invoice_date", d.invoice_date],
      ["currency", d.currency],
      ["total_amount", d.total_amount],
      ["fuel_type", d.fuel_type],
      ["product_name", d.product_name],
      ["electricity_consumption_kwh", d.electricity_consumption_kwh],
      ["quantity_used", d.quantity_used],
      ["total_product_output", d.total_product_output],
      ["legacy_product_output_quantity", d.product_output_quantity],
      ["precursors_emissions", d.precursors_emissions],
      ["indirect_emissions", d.indirect_emissions],
      ["direct_emissions", d.direct_emissions],
    ];
  }, [selectedJob]);

  const fetchJobs = async () => {
    const response = await fetch(`${API_BASE_URL}/api/v1/jobs?limit=30`);
    const payload = await response.json();
    if (response.ok === false) {
      throw new Error(payload?.detail || t("failedFetchJobs"));
    }
    setJobs(payload);
  };

  const fetchCaseSummary = async (caseId) => {
    if (!caseId) {
      setCaseSummary(null);
      return;
    }
    const response = await fetch(`${API_BASE_URL}/api/v1/cases/${caseId}/see`);
    const payload = await response.json();
    if (response.ok === false) {
      throw new Error(payload?.detail || t("failedFetchCaseSee"));
    }
    setCaseSummary(payload);
  };

  const fetchCaseCbamTax = async (caseId) => {
    if (!caseId) {
      setCbamTax(null);
      setLastPriceRefreshAt(null);
      return;
    }
    const response = await fetch(`${API_BASE_URL}/api/v1/cases/${caseId}/cbam-tax`);
    const payload = await response.json();
    if (response.ok === false) {
      throw new Error(payload?.detail || t("failedFetchCbamTax"));
    }
    setCbamTax(payload);
    setLastPriceRefreshAt(new Date().toISOString());
  };

  const fetchCaseConfig = async (caseId) => {
    if (!caseId) return;
    const response = await fetch(`${API_BASE_URL}/api/v1/cases/${caseId}`);
    const payload = await response.json();
    if (response.ok === false) {
      throw new Error(payload?.detail || t("failedFetchCase"));
    }
    setCaseConfig({
      precursors_emissions: payload?.precursors_emissions ?? "",
      total_product_output: payload?.total_product_output ?? "",
      export_quantity: payload?.export_quantity ?? "",
    });
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

  const pollJob = async (jobId) => {
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt += 1) {
      await sleep(POLL_INTERVAL_MS);
      const response = await fetch(`${API_BASE_URL}/api/v1/jobs/${jobId}`);
      const payload = await response.json();
      if (response.ok === false) {
        throw new Error(payload?.detail || t("failedPollJob"));
      }
      setSelectedJob(payload);
      if (payload.status === "COMPLETED") {
        await fetchJobs();
        return payload;
      }
      if (payload.status === "FAILED") {
        throw new Error(payload.error_message || "OCR job failed");
      }
    }
    throw new Error(t("pollTimeout"));
  };

  const handleUpload = async () => {
    if (file === null) {
      setError(t("chooseImageFirst"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_type", documentType);
      if (activeCaseId.trim()) {
        formData.append("case_id", activeCaseId.trim());
      }
      const createResponse = await fetch(`${API_BASE_URL}/api/v1/jobs`, {
        method: "POST",
        body: formData,
      });
      const createPayload = await createResponse.json();
      if (createResponse.ok === false) {
        throw new Error(createPayload?.detail || t("failedCreateJob"));
      }
      setSelectedJob(createPayload);
      if (createPayload.case_id) {
        setActiveCaseId(createPayload.case_id);
      }
      fillManualFromJob(createPayload);
      setScreen("detail");
      const finalJob = await pollJob(createPayload.job_id);
      if (finalJob?.case_id) {
        await fetchCaseSummary(finalJob.case_id);
        await fetchCaseCbamTax(finalJob.case_id);
      }
    } catch (uploadError) {
      setError(uploadError.message || t("unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (jobId) => {
    setError("");
    setScreen("detail");
    const response = await fetch(`${API_BASE_URL}/api/v1/jobs/${jobId}`);
    const payload = await response.json();
    if (response.ok === false) {
      throw new Error(payload?.detail || t("failedOpenDetail"));
    }
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
  };

  const parseNullableNumber = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  };

  const recalculate = async () => {
    if (!selectedJob) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/jobs/${selectedJob.job_id}/recalculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity_used: parseNullableNumber(manualValues.quantity_used),
          precursors_emissions: parseNullableNumber(manualValues.precursors_emissions),
          indirect_emissions: parseNullableNumber(manualValues.indirect_emissions),
          total_product_output: parseNullableNumber(manualValues.total_product_output),
        }),
      });
      const payload = await response.json();
      if (response.ok === false) {
        throw new Error(payload?.detail || t("failedRecalculate"));
      }
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
      const response = await fetch(`${API_BASE_URL}/api/v1/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = await response.json();
      if (response.ok === false) {
        throw new Error(payload?.detail || t("failedCreateCase"));
      }
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
      const response = await fetch(`${API_BASE_URL}/api/v1/cases/${activeCaseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          precursors_emissions: parseNullableNumber(caseConfig.precursors_emissions),
          total_product_output: parseNullableNumber(caseConfig.total_product_output),
          export_quantity: parseNullableNumber(caseConfig.export_quantity),
        }),
      });
      const payload = await response.json();
      if (response.ok === false) {
        throw new Error(payload?.detail || t("failedSaveCase"));
      }
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

  const generatePeriodicReport = async () => {
    if (!activeCaseId) return;
    setReportLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/reports/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: activeCaseId,
          product_type: reportConfig.product_type,
          language: reportConfig.language,
          period_year: Number(reportConfig.period_year),
          period_quarter: Number(reportConfig.period_quarter),
          export_quantity: parseNullableNumber(caseConfig.export_quantity),
          include_llm_draft: true,
        }),
      });
      const payload = await response.json();
      if (response.ok === false) {
        throw new Error(payload?.detail || t("failedGenerateReport"));
      }
      setReportResult(payload);
    } catch (e) {
      setError(e.message || t("failedGenerateReport"));
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3FAF6] text-slate-800">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-6 lg:flex-row lg:px-8">
        <aside className={cardClassName("w-full lg:sticky lg:top-6 lg:h-fit lg:w-80")}>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <FileText size={18} />
            </div>
            <div>
              <p className="text-sm text-slate-500">{t("workspaceLabel")}</p>
              <p className="text-base font-semibold text-slate-900">{t("workspaceName")}</p>
            </div>
          </div>

          <div className="mb-4 flex gap-3">
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${lang === "en" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"}`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang("vi")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${lang === "vi" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"}`}
            >
              VI
            </button>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setScreen("upload")}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
                screen === "upload"
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "text-slate-600 hover:bg-[#F8FBF9]"
              }`}
            >
              <Upload size={16} />
              {t("navUpload")}
            </button>
            <button
              type="button"
              onClick={async () => {
                setScreen("jobs");
                try {
                  await fetchJobs();
                } catch (e) {
                  setError(e.message || t("failedRefreshJobs"));
                }
              }}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
                screen === "jobs"
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "text-slate-600 hover:bg-[#F8FBF9]"
              }`}
            >
              <List size={16} />
              {t("navJobs")}
            </button>
            <button
              type="button"
              disabled={!selectedJob}
              onClick={() => setScreen("detail")}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
                screen === "detail"
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "text-slate-600 hover:bg-[#F8FBF9]"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <FileText size={16} />
              {t("navDetail")}
            </button>
          </div>

          <div className="mt-6 rounded-xl bg-[#F9FCFA] p-4 ring-1 ring-[#EAF2EE]">
            <p className="mb-2 text-sm font-semibold text-slate-900">{t("caseWorkspace")}</p>
            <input
              type="text"
              value={activeCaseId}
              onChange={(event) => setActiveCaseId(event.target.value.trim())}
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
                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {t("newCase")}
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 space-y-6">
          <section className={cardClassName()}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">{t("dashboardTitle")}</h1>
              </div>
              {selectedJob ? (
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusChipClass(
                    selectedJob.status,
                  )}`}
                >
                  {selectedJob.status}
                </span>
              ) : null}
            </div>
          </section>

          {error ? (
            <section className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
              {error}
            </section>
          ) : null}

          {screen === "upload" ? (
            <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
              <div className={cardClassName()}>
                <p className="mb-4 text-lg font-semibold text-slate-900">{t("uploadReceipt")}</p>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t("documentType")}</label>
                <select
                  value={documentType}
                  onChange={(event) => setDocumentType(event.target.value)}
                  className="mb-4 w-full rounded-xl border border-[#E6EFEA] bg-white px-3 py-2 text-sm outline-none focus:border-emerald-300"
                >
                  <option value="fuel_invoice">{t("fuelInvoice")}</option>
                  <option value="electricity_bill">{t("electricityBill")}</option>
                </select>

                <label className="mb-2 block text-sm font-medium text-slate-700">{t("imageFile")}</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-dashed border-[#CCE2D8] bg-[#F9FCFA] p-4 text-sm"
                />

                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={loading}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Upload size={16} />
                  {loading ? t("processing") : t("uploadToCase")}
                </button>
              </div>

              <div className="space-y-6">
                <div className={cardClassName()}>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-lg font-semibold text-slate-900">{t("caseSeeSnapshot")}</p>
                    <button
                      type="button"
                      disabled={!activeCaseId}
                      onClick={async () => {
                        if (!activeCaseId) return;
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
                  {caseSummary ? (
                    <div className="space-y-1 text-sm text-slate-700">
                      <p>
                        {t("status")}:{" "}
                        <span className={`font-semibold ${statusClass(caseSummary.status)}`}>{caseSummary.status}</span>
                      </p>
                      <p>
                        {t("see")}: {formatNumber(caseSummary.specific_embedded_emissions, locale)}
                      </p>
                      <p>
                        {t("totalEmissions")}: {formatNumber(caseSummary.total_emissions, locale)}
                      </p>
                      <p>
                        {t("totalOutput")}: {formatNumber(caseSummary.total_product_output, locale)}
                      </p>
                      <p>
                        {t("docs")}: fuel={caseSummary.breakdown?.fuel_job_count ?? 0}, electricity=
                        {caseSummary.breakdown?.electricity_job_count ?? 0}
                      </p>
                      <p>
                        {t("cbamTaxShort")}: {formatNumber(cbamTax?.cbam_tax, locale)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">{t("loadCaseHint")}</p>
                  )}
                </div>

                <div className={cardClassName()}>
                  <p className="mb-3 text-lg font-semibold text-slate-900">{t("caseConfig")}</p>
                  <div className="space-y-2">
                    <input
                      type="number"
                      step="any"
                      value={caseConfig.precursors_emissions}
                      onChange={(event) =>
                        setCaseConfig((prev) => ({ ...prev, precursors_emissions: event.target.value }))
                      }
                      placeholder={t("precursorsEmissions")}
                      className="w-full rounded-lg border border-[#E6EFEA] bg-white px-3 py-2 text-sm outline-none focus:border-emerald-300"
                    />
                    <input
                      type="number"
                      step="any"
                      value={caseConfig.total_product_output}
                      onChange={(event) =>
                        setCaseConfig((prev) => ({ ...prev, total_product_output: event.target.value }))
                      }
                      placeholder={t("totalProductOutput")}
                      className="w-full rounded-lg border border-[#E6EFEA] bg-white px-3 py-2 text-sm outline-none focus:border-emerald-300"
                    />
                    <input
                      type="number"
                      step="any"
                      value={caseConfig.export_quantity}
                      onChange={(event) =>
                        setCaseConfig((prev) => ({ ...prev, export_quantity: event.target.value }))
                      }
                      placeholder={t("exportQuantity")}
                      className="w-full rounded-lg border border-[#E6EFEA] bg-white px-3 py-2 text-sm outline-none focus:border-emerald-300"
                    />
                    <button
                      type="button"
                      disabled={!activeCaseId || loading}
                      onClick={saveCaseConfig}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {t("saveCaseConfig")}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {screen === "jobs" ? (
            <section className={cardClassName()}>
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
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200"
                >
                  <RefreshCw size={14} />
                  {t("refresh")}
                </button>
              </div>

              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
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
                      <tr key={job.job_id} className="border-t border-[#EEF4F0]">
                        <td className="px-3 py-2 font-mono text-xs">{job.job_id}</td>
                        <td className="px-3 py-2 font-mono text-xs">{job.case_id || "-"}</td>
                        <td className="px-3 py-2">{documentTypeLabel(job.document_type)}</td>
                        <td className="px-3 py-2">{job.file_name}</td>
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
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {screen === "detail" ? (
            <section className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
              <div className={cardClassName("h-fit")}>
                <p className="mb-3 text-lg font-semibold text-slate-900">{t("documentPreview")}</p>
                {selectedJob ? (
                  <img
                    src={`${API_BASE_URL}/api/v1/jobs/${selectedJob.job_id}/image`}
                    alt="Uploaded document"
                    className="h-auto max-h-[700px] w-full rounded-xl border border-[#EAF2EE] object-contain"
                  />
                ) : (
                  <p className="text-sm text-slate-500">{t("noJobSelected")}</p>
                )}
              </div>

              <div className="space-y-6">
                <div className={cardClassName()}>
                  <p className="mb-2 text-lg font-semibold text-slate-900">{t("jobOverview")}</p>
                  {selectedJob ? (
                    <div className="grid gap-1 text-sm text-slate-700">
                      <p>
                        {t("jobId")}: <span className="font-mono text-xs">{selectedJob.job_id}</span>
                      </p>
                      <p>
                        {t("caseId")}: <span className="font-mono text-xs">{selectedJob.case_id || "-"}</span>
                      </p>
                      <p>
                        {t("documentType")}: {documentTypeLabel(selectedJob.document_type)}
                      </p>
                      <p>
                        {t("model")}: {selectedJob.model_used || "-"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">{t("noJobSelected")}</p>
                  )}
                </div>

                <div className={cardClassName()}>
                  <p className="mb-3 text-lg font-semibold text-slate-900">{t("extractedData")}</p>
                  <div className="max-h-72 overflow-auto rounded-xl border border-[#EEF4F0]">
                    <table className="min-w-full text-sm">
                      <thead className="bg-[#F9FCFA] text-left text-slate-500">
                        <tr>
                          <th className="px-3 py-2">{t("field")}</th>
                          <th className="px-3 py-2">{t("value")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRows.map(([k, v]) => (
                          <tr key={k} className="border-t border-[#EEF4F0]">
                            <td className="px-3 py-2 font-mono text-xs text-slate-500">{k}</td>
                            <td className="px-3 py-2">{formatCellValue(v, locale)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={cardClassName()}>
                  <p className="mb-2 text-lg font-semibold text-slate-900">{t("jobCalculation")}</p>
                  <div className="grid gap-1 text-sm text-slate-700">
                    <p>
                      {t("status")}: {selectedJob?.result?.calculation?.status || "-"}
                    </p>
                    <p>
                      {t("source")}: {selectedJob?.result?.calculation?.source || "-"}
                    </p>
                    <p>
                      {t("directEF")}: {formatNumber(selectedJob?.result?.calculation?.direct_emission_factor, locale)}
                    </p>
                    <p>
                      {t("directEmissions")}: {formatNumber(selectedJob?.result?.data?.direct_emissions, locale)}
                    </p>
                    <p>
                      {t("indirectEmissions")}: {formatNumber(selectedJob?.result?.data?.indirect_emissions, locale)}
                    </p>
                    <p>
                      {t("totalOutput")}: {formatNumber(selectedJob?.result?.calculation?.total_product_output, locale)}
                    </p>
                    <p>
                      {t("see")}: {formatNumber(selectedJob?.result?.calculation?.specific_embedded_emissions, locale)}
                    </p>
                  </div>
                </div>

                <div className={cardClassName()}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-lg font-semibold text-slate-900">{t("caseSeeAggregated")}</p>
                    <button
                      type="button"
                      disabled={!activeCaseId}
                      onClick={async () => {
                        if (!activeCaseId) return;
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

                  {caseSummary ? (
                    <div className="grid gap-1 text-sm text-slate-700">
                      <p>
                        {t("status")}:{" "}
                        <span className={`font-semibold ${statusClass(caseSummary.status)}`}>{caseSummary.status}</span>
                      </p>
                      <p>
                        {t("directEmissions")}: {formatNumber(caseSummary.direct_emissions, locale)}
                      </p>
                      <p>
                        {t("indirectEmissions")}: {formatNumber(caseSummary.indirect_emissions, locale)}
                      </p>
                      <p>
                        {t("precursorsLabel")}: {formatNumber(caseSummary.precursors_emissions, locale)}
                      </p>
                      <p>
                        {t("totalEmissions")}: {formatNumber(caseSummary.total_emissions, locale)}
                      </p>
                      <p>
                        {t("totalOutput")}: {formatNumber(caseSummary.total_product_output, locale)}
                      </p>
                      <p>
                        {t("see")}: {formatNumber(caseSummary.specific_embedded_emissions, locale)}
                      </p>
                      <p>
                        {t("jobsLine")}: fuel={caseSummary.breakdown?.fuel_job_count ?? 0}, electricity=
                        {caseSummary.breakdown?.electricity_job_count ?? 0}
                      </p>
                      {caseSummary.missing_fields?.length ? (
                        <p>
                          {t("missing")}: {formatMissingFields(caseSummary.missing_fields)}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">{t("loadCaseHint")}</p>
                  )}

                  {cbamTax ? (
                    <div className="mt-3 rounded-xl bg-[#F8FBF9] p-3 text-sm text-slate-700 ring-1 ring-[#EAF2EE]">
                      <p className="font-semibold text-slate-900">{t("cbamTaxTitle")}</p>
                      <p className="text-xs text-slate-500">{t("autoRefresh30s")}</p>
                      <p className="text-xs text-slate-500">
                        {t("lastUpdate")}: {lastPriceRefreshAt ? new Date(lastPriceRefreshAt).toLocaleString(locale) : "-"}
                      </p>
                      <p>
                        {t("exportQuantity")}: {formatNumber(cbamTax.export_quantity, locale)}
                      </p>
                      <p>
                        {t("euCarbonPrice")}: €{formatNumber(cbamTax.carbon_price?.price, locale)} / tCO2 (~{" "}
                        {formatVND(cbamTax.carbon_price_vnd_per_tco2)} / tCO2)
                      </p>
                      <p>
                        {t("fxRate")}: {formatNumber(cbamTax.fx_rate?.rate, locale)}
                      </p>
                      <p>
                        {t("priceTicker")}: {cbamTax.carbon_price?.ticker ?? "-"}
                      </p>
                      <p>
                        {t("tax")}: €{formatNumber(cbamTax.cbam_tax, locale)} (~ {formatVND(cbamTax.cbam_tax_vnd)})
                      </p>
                      {cbamTax.missing_fields?.length ? (
                        <p>
                          {t("missing")}: {formatMissingFields(cbamTax.missing_fields)}
                        </p>
                      ) : null}
                      {cbamTax.reason ? (
                        <p className="text-amber-700">
                          {t("reason")}: {formatReason(cbamTax.reason)}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className={cardClassName()}>
                  <p className="mb-2 text-lg font-semibold text-slate-900">{t("caseConfig")}</p>
                  <div className="grid gap-2">
                    <input
                      type="number"
                      step="any"
                      value={caseConfig.precursors_emissions}
                      onChange={(event) =>
                        setCaseConfig((prev) => ({ ...prev, precursors_emissions: event.target.value }))
                      }
                      placeholder={t("precursorsEmissions")}
                      className="w-full rounded-lg border border-[#E6EFEA] bg-white px-3 py-2 text-sm outline-none focus:border-emerald-300"
                    />
                    <input
                      type="number"
                      step="any"
                      value={caseConfig.total_product_output}
                      onChange={(event) =>
                        setCaseConfig((prev) => ({ ...prev, total_product_output: event.target.value }))
                      }
                      placeholder={t("totalProductOutput")}
                      className="w-full rounded-lg border border-[#E6EFEA] bg-white px-3 py-2 text-sm outline-none focus:border-emerald-300"
                    />
                    <input
                      type="number"
                      step="any"
                      value={caseConfig.export_quantity}
                      onChange={(event) =>
                        setCaseConfig((prev) => ({ ...prev, export_quantity: event.target.value }))
                      }
                      placeholder={t("exportQuantity")}
                      className="w-full rounded-lg border border-[#E6EFEA] bg-white px-3 py-2 text-sm outline-none focus:border-emerald-300"
                    />
                    <button
                      type="button"
                      disabled={!activeCaseId || loading}
                      onClick={saveCaseConfig}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {t("saveCaseConfig")}
                    </button>
                  </div>
                </div>

                <div className={cardClassName()}>
                  <p className="mb-2 text-lg font-semibold text-slate-900">{t("reportGenerator")}</p>
                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-slate-600">{t("reportProductType")}</label>
                    <select
                      value={reportConfig.product_type}
                      onChange={(event) => setReportConfig((prev) => ({ ...prev, product_type: event.target.value }))}
                      className="w-full rounded-lg border border-[#E6EFEA] bg-white px-3 py-2 text-sm outline-none focus:border-emerald-300"
                    >
                      <option value="cement">{t("productTypeCement")}</option>
                      <option value="fertilizer">{t("productTypeFertilizer")}</option>
                      <option value="iron_steel">{t("productTypeIronSteel")}</option>
                      <option value="aluminum">{t("productTypeAluminum")}</option>
                      <option value="hydrogen">{t("productTypeHydrogen")}</option>
                      <option value="electricity">{t("productTypeElectricity")}</option>
                    </select>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">{t("reportYear")}</label>
                        <input
                          type="number"
                          min="2023"
                          max="2100"
                          value={reportConfig.period_year}
                          onChange={(event) =>
                            setReportConfig((prev) => ({ ...prev, period_year: Number(event.target.value) }))
                          }
                          className="w-full rounded-lg border border-[#E6EFEA] bg-white px-3 py-2 text-sm outline-none focus:border-emerald-300"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">{t("reportQuarter")}</label>
                        <select
                          value={reportConfig.period_quarter}
                          onChange={(event) =>
                            setReportConfig((prev) => ({ ...prev, period_quarter: Number(event.target.value) }))
                          }
                          className="w-full rounded-lg border border-[#E6EFEA] bg-white px-3 py-2 text-sm outline-none focus:border-emerald-300"
                        >
                          <option value={1}>Q1</option>
                          <option value={2}>Q2</option>
                          <option value={3}>Q3</option>
                          <option value={4}>Q4</option>
                        </select>
                      </div>
                    </div>

                    <label className="text-xs font-medium text-slate-600">{t("reportLanguage")}</label>
                    <select
                      value={reportConfig.language}
                      onChange={(event) => setReportConfig((prev) => ({ ...prev, language: event.target.value }))}
                      className="w-full rounded-lg border border-[#E6EFEA] bg-white px-3 py-2 text-sm outline-none focus:border-emerald-300"
                    >
                      <option value="en">English</option>
                      <option value="vi">Tiếng Việt</option>
                    </select>

                    <button
                      type="button"
                      disabled={!activeCaseId || reportLoading}
                      onClick={generatePeriodicReport}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {reportLoading ? t("generatingReport") : t("generateReport")}
                    </button>
                  </div>

                  {reportResult ? (
                    <div className="mt-3 rounded-xl bg-[#F8FBF9] p-3 text-sm text-slate-700 ring-1 ring-[#EAF2EE]">
                      <p>
                        {t("reportStatus")}: <span className="font-semibold">{reportResult.status}</span>
                      </p>
                      <p>
                        {t("llmStatus")}: {reportResult.report?.llm_status || "-"}
                      </p>
                      <p>
                        {t("reportId")}: <span className="font-mono text-xs">{reportResult.report?.report_id || "-"}</span>
                      </p>
                      <p>
                        {t("reportProductType")}: {productTypeLabel(reportResult.report?.product_type)}
                      </p>
                      {reportResult.reason ? (
                        <p className="text-amber-700">
                          {t("reportReason")}: {formatReason(reportResult.reason)}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a
                          href={`${API_BASE_URL}${reportResult.files?.json_download_url || ""}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                        >
                          {t("downloadJson")}
                        </a>
                        <a
                          href={`${API_BASE_URL}${reportResult.files?.xml_download_url || ""}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                        >
                          {t("downloadXml")}
                        </a>
                        <a
                          href={`${API_BASE_URL}${reportResult.files?.txt_download_url || ""}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                        >
                          {t("downloadTxt")}
                        </a>
                        <a
                          href={`${API_BASE_URL}${reportResult.files?.pdf_download_url || ""}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                        >
                          {t("downloadPdf")}
                        </a>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className={cardClassName()}>
                  <p className="mb-2 text-lg font-semibold text-slate-900">{t("jobOverrides")}</p>
                  <div className="grid gap-2">
                    <input
                      type="number"
                      step="any"
                      value={manualValues.quantity_used}
                      onChange={(event) => setManualValues((prev) => ({ ...prev, quantity_used: event.target.value }))}
                      placeholder={t("quantityUsed")}
                      className="w-full rounded-lg border border-[#E6EFEA] bg-white px-3 py-2 text-sm outline-none focus:border-emerald-300"
                    />
                    <input
                      type="number"
                      step="any"
                      value={manualValues.precursors_emissions}
                      onChange={(event) =>
                        setManualValues((prev) => ({ ...prev, precursors_emissions: event.target.value }))
                      }
                      placeholder={t("precursorsEmissions")}
                      className="w-full rounded-lg border border-[#E6EFEA] bg-white px-3 py-2 text-sm outline-none focus:border-emerald-300"
                    />
                    <input
                      type="number"
                      step="any"
                      value={manualValues.indirect_emissions}
                      onChange={(event) =>
                        setManualValues((prev) => ({ ...prev, indirect_emissions: event.target.value }))
                      }
                      placeholder={t("indirectEmissionsInput")}
                      className="w-full rounded-lg border border-[#E6EFEA] bg-white px-3 py-2 text-sm outline-none focus:border-emerald-300"
                    />
                    <input
                      type="number"
                      step="any"
                      value={manualValues.total_product_output}
                      onChange={(event) =>
                        setManualValues((prev) => ({ ...prev, total_product_output: event.target.value }))
                      }
                      placeholder={t("totalProductOutput")}
                      className="w-full rounded-lg border border-[#E6EFEA] bg-white px-3 py-2 text-sm outline-none focus:border-emerald-300"
                    />
                    <button
                      type="button"
                      onClick={recalculate}
                      disabled={loading || !selectedJob}
                      className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {loading ? t("recalculating") : t("recalculateJob")}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
