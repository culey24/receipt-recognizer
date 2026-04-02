import { Upload } from "lucide-react";
import { useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handleUpload = async () => {
    if (file === null) {
      setError("Please choose an image first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(API_BASE_URL + "/api/v1/ocr/extract", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (response.ok === false) {
        throw new Error(payload?.detail || "Upload failed");
      }

      setResult(payload);
    } catch (uploadError) {
      setError(uploadError.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-4 py-10">
      <h1 className="text-2xl font-bold">CBAM OCR Phase 1 Tester</h1>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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
          {loading ? "Uploading..." : "Upload"}
        </button>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-medium text-slate-700">JSON Result</p>
        <pre className="max-h-[500px] overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
          {result ? JSON.stringify(result, null, 2) : "No result yet."}
        </pre>
      </div>
    </main>
  );
}
