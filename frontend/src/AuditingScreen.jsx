import { ClipboardList, Download, Trash2 } from "lucide-react";

const cardClassName = (extra = "") =>
  `rounded-2xl bg-white p-5 shadow-[0_6px_22px_rgba(16,24,40,0.06)] ring-1 ring-[#EAF2EE] ${extra}`;

function formatEntryPayload(entry, t) {
  const type = entry.type || (entry.field != null && entry.jobId != null ? "parameter_edit" : "unknown");

  switch (type) {
    case "parameter_edit":
      return {
        action: t("auditAction_parameter_edit"),
        detail: `${entry.field}: ${entry.oldValue ?? "—"} → ${entry.newValue ?? "—"}`,
        jobId: entry.jobId,
        caseId: entry.caseId,
      };
    case "case_created":
      return { action: t("auditAction_case_created"), detail: entry.caseId || "—", caseId: entry.caseId };
    case "case_loaded":
      return { action: t("auditAction_case_loaded"), detail: entry.caseId || "—", caseId: entry.caseId };
    case "case_opened":
      return { action: t("auditAction_case_opened"), detail: entry.caseId || "—", caseId: entry.caseId };
    case "case_cleared":
      return { action: t("auditAction_case_cleared"), detail: entry.caseId || "—", caseId: entry.caseId };
    case "job_opened":
      return {
        action: t("auditAction_job_opened"),
        detail: entry.jobId || "—",
        jobId: entry.jobId,
        caseId: entry.caseId,
      };
    case "document_uploaded":
      return {
        action: t("auditAction_document_uploaded"),
        detail: entry.documentType ? `${entry.documentType}` : "—",
        jobId: entry.jobId,
        caseId: entry.caseId,
      };
    case "job_recalculate":
      return {
        action: t("auditAction_job_recalculate"),
        detail: "",
        jobId: entry.jobId,
        caseId: entry.caseId,
      };
    case "case_config_saved":
      return { action: t("auditAction_case_config_saved"), detail: "", caseId: entry.caseId };
    case "csv_exported":
      return { action: t("auditAction_csv_exported"), detail: entry.fileName || "", caseId: entry.caseId };
    case "report_generated":
      return {
        action: t("auditAction_report_generated"),
        detail: [entry.productType, entry.reportId].filter(Boolean).join(" · ") || "—",
        caseId: entry.caseId,
      };
    case "emission_mapping_saved":
      return {
        action: t("auditAction_emission_mapping_saved"),
        detail: `${entry.product_key ?? "—"} → ${entry.fuel_type ?? "—"}`,
      };
    case "emission_factor_saved":
      return {
        action: t("auditAction_emission_factor_saved"),
        detail: `${entry.fuel_type ?? "—"}: ${entry.direct_ef ?? "—"}`,
      };
    default:
      return {
        action: type,
        detail: JSON.stringify(
          Object.fromEntries(Object.entries(entry).filter(([k]) => !["id", "timestamp"].includes(k))),
        ),
        jobId: entry.jobId,
        caseId: entry.caseId,
      };
  }
}

export function AuditingScreen({ t, locale, auditLog, onClearAll, onExportJson }) {
  return (
    <div className="space-y-4">
      <section className={cardClassName()}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-600">
              <ClipboardList size={22} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t("auditTrailTitle")}</h2>
              <p className="text-sm text-slate-500">{t("auditTrailSubtitle")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onExportJson}
              disabled={!auditLog?.length}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E6EFEA] bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <Download size={14} />
              {t("auditExportJson")}
            </button>
            <button
              type="button"
              onClick={onClearAll}
              disabled={!auditLog?.length}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-40"
            >
              <Trash2 size={14} />
              {t("auditClearAll")}
            </button>
          </div>
        </div>

        {!auditLog?.length ? (
          <p className="py-12 text-center text-sm text-slate-400">{t("auditTrailEmpty")}</p>
        ) : (
          <div className="max-h-[min(70vh,800px)] overflow-auto rounded-xl border border-[#EEF4F0]">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[#F9FCFA] text-left text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">{t("auditColTime")}</th>
                  <th className="px-3 py-2 font-medium">{t("auditColAction")}</th>
                  <th className="px-3 py-2 font-medium">{t("auditColDetail")}</th>
                  <th className="px-3 py-2 font-medium">{t("caseId")}</th>
                  <th className="px-3 py-2 font-medium">{t("jobId")}</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((entry, idx) => {
                  const { action, detail, jobId, caseId } = formatEntryPayload(entry, t);
                  const ts = entry.timestamp || "";
                  return (
                    <tr key={entry.id || `${ts}-${idx}`} className="border-t border-[#EEF4F0] hover:bg-[#FAFCFB]">
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600">
                        {ts ? new Date(ts).toLocaleString(locale) : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs font-medium text-emerald-800">{action}</td>
                      <td className="max-w-md break-words px-3 py-2 text-xs text-slate-700">{detail || "—"}</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-slate-500">{caseId || entry.caseId || "—"}</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-slate-500">{jobId || entry.jobId || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-slate-400">{t("auditStorageHint")}</p>
    </div>
  );
}
