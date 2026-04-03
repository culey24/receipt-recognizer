import { List, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const POLL_INTERVAL_MS = 1500;
const POLL_MAX_ATTEMPTS = 120;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function statusClass(status) {
  if (status === "COMPLETED") return "text-emerald-700";
  if (status === "FAILED") return "text-red-700";
  return "text-amber-700";
}

export default function App() {
  const [screen, setScreen] = useState("upload");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);

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
      ["product_output_quantity", d.product_output_quantity],
      ["precursors_emissions", d.precursors_emissions],
      ["indirect_emissions", d.indirect_emissions],
      ["direct_emissions", d.direct_emissions],
    ];
  }, [selectedJob]);

  const fetchJobs = async () => {
    const response = await fetch(`${API_BASE_URL}/api/v1/jobs?limit=30`);
    const payload = await response.json();
    if (response.ok === false) {
      throw new Error(payload?.detail || "Failed to fetch jobs");
    }
    setJobs(payload);
  };

  useEffect(() => {
    fetchJobs().catch(() => {
      // keep initial UI usable even if backend is not ready yet
    });
  }, []);

  const pollJob = async (jobId) => {
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt += 1) {
      await sleep(POLL_INTERVAL_MS);
      const response = await fetch(`${API_BASE_URL}/api/v1/jobs/${jobId}`);
      const payload = await response.json();
      if (response.ok === false) {
        throw new Error(payload?.detail || "Failed to poll OCR job");
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
    throw new Error("Polling timed out before job completion");
  };

  const handleUpload = async () => {
    if (file === null) {
      setError("Please choose an image first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const createResponse = await fetch(`${API_BASE_URL}/api/v1/jobs`, {
        method: "POST",
        body: formData,
      });
      const createPayload = await createResponse.json();
      if (createResponse.ok === false) {
        throw new Error(createPayload?.detail || "Failed to create async OCR job");
      }

      setSelectedJob(createPayload);
      setScreen("detail");
      await pollJob(createPayload.job_id);
    } catch (uploadError) {
      setError(uploadError.message || "Unexpected error");
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
      throw new Error(payload?.detail || "Failed to open job detail");
    }
    setSelectedJob(payload);
  };

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">CBAM MVP Dashboard</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setScreen("upload")}
          className={`inline-flex items-center gap-2 rounded px-3 py-2 text-sm ${
            screen === "upload" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-900"
          }`}
        >
          <Upload size={16} />
          Upload
        </button>
        <button
          type="button"
          onClick={async () => {
            setScreen("jobs");
            try {
              await fetchJobs();
            } catch (e) {
              setError(e.message || "Failed to refresh jobs");
            }
          }}
          className={`inline-flex items-center gap-2 rounded px-3 py-2 text-sm ${
            screen === "jobs" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-900"
          }`}
        >
          <List size={16} />
          Job List
        </button>
      </div>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      {screen === "upload" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <label className="mb-3 block text-sm font-medium text-slate-700">Invoice Image</label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="w-full rounded border border-slate-300 p-2"
          />
          <button
            type="button"
            onClick={handleUpload}
            disabled={loading}
            className="mt-4 inline-flex items-center gap-2 rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Upload size={16} />
            {loading ? "Processing..." : "Upload"}
          </button>
        </section>
      ) : null}

      {screen === "jobs" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Jobs</h2>
            <button
              type="button"
              onClick={async () => {
                try {
                  await fetchJobs();
                } catch (e) {
                  setError(e.message || "Failed to refresh jobs");
                }
              }}
              className="rounded bg-slate-900 px-3 py-1.5 text-xs text-white"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-left">
                  <th className="border border-slate-200 px-2 py-1">Job ID</th>
                  <th className="border border-slate-200 px-2 py-1">File</th>
                  <th className="border border-slate-200 px-2 py-1">Status</th>
                  <th className="border border-slate-200 px-2 py-1">Updated</th>
                  <th className="border border-slate-200 px-2 py-1">Action</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.job_id}>
                    <td className="border border-slate-200 px-2 py-1 font-mono text-xs">{job.job_id}</td>
                    <td className="border border-slate-200 px-2 py-1">{job.file_name}</td>
                    <td className={`border border-slate-200 px-2 py-1 font-medium ${statusClass(job.status)}`}>
                      {job.status}
                    </td>
                    <td className="border border-slate-200 px-2 py-1">{job.updated_at}</td>
                    <td className="border border-slate-200 px-2 py-1">
                      <button
                        type="button"
                        className="rounded bg-slate-800 px-2 py-1 text-xs text-white"
                        onClick={async () => {
                          try {
                            await openDetail(job.job_id);
                          } catch (e) {
                            setError(e.message || "Failed to open detail");
                          }
                        }}
                      >
                        View
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
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">Image</h2>
            {selectedJob ? (
              <img
                src={`${API_BASE_URL}/api/v1/jobs/${selectedJob.job_id}/image`}
                alt="Uploaded invoice"
                className="h-auto max-h-[600px] w-full rounded border border-slate-200 object-contain"
              />
            ) : (
              <p className="text-sm text-slate-500">No job selected.</p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">Data & SEE Result</h2>
            {selectedJob ? (
              <>
                <p className="text-sm">
                  <span className="font-medium">Job ID:</span> <span className="font-mono">{selectedJob.job_id}</span>
                </p>
                <p className={`text-sm font-medium ${statusClass(selectedJob.status)}`}>
                  Status: {selectedJob.status}
                </p>
                <p className="mb-3 text-sm">
                  <span className="font-medium">Model:</span> {selectedJob.model_used || "-"}
                </p>

                <div className="mb-4 overflow-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-left">
                        <th className="border border-slate-200 px-2 py-1">Field</th>
                        <th className="border border-slate-200 px-2 py-1">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRows.map(([k, v]) => (
                        <tr key={k}>
                          <td className="border border-slate-200 px-2 py-1 font-mono text-xs">{k}</td>
                          <td className="border border-slate-200 px-2 py-1">{v ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="font-semibold">SEE Calculation</p>
                  <p>Status: {selectedJob.result?.calculation?.status || "-"}</p>
                  <p>SEE: {selectedJob.result?.calculation?.specific_embedded_emissions ?? "-"}</p>
                  <p>Total emissions: {selectedJob.result?.calculation?.total_emissions ?? "-"}</p>
                  <p>Total output: {selectedJob.result?.calculation?.total_product_output ?? "-"}</p>
                  {selectedJob.result?.calculation?.reason ? (
                    <p className="text-red-600">Reason: {selectedJob.result.calculation.reason}</p>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">No job selected.</p>
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}
