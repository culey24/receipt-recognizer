import { Loader2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

/** Tesseract word confidence is 0–100; below this we show a light-red overlay. */
const LOW_CONFIDENCE_THRESHOLD = 60;
const MIN_ZOOM = 1;
const MAX_ZOOM = 2.75;
const ZOOM_STEP = 0.25;
const MAX_BASE_WIDTH_PX = 920;

function mapBBoxProportional(bbox, scale) {
  if (!bbox) return null;
  const x0 = bbox.x0 ?? bbox.x;
  const y0 = bbox.y0 ?? bbox.y;
  const x1 = bbox.x1 ?? x0 + (bbox.width ?? 0);
  const y1 = bbox.y1 ?? y0 + (bbox.height ?? 0);
  return {
    left: x0 * scale,
    top: y0 * scale,
    width: (x1 - x0) * scale,
    height: (y1 - y0) * scale,
  };
}

export function DocumentImagePreview({ imageUrl, jobStatus, t }) {
  const [zoom, setZoom] = useState(1);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  /** CSS width at zoom=1 (fits layout, capped). */
  const [baseWidth, setBaseWidth] = useState(null);
  const [words, setWords] = useState([]);
  const [layoutLoading, setLayoutLoading] = useState(false);
  const [layoutNote, setLayoutNote] = useState(null);

  const displayWidth = natural.w && baseWidth ? Math.round(baseWidth * zoom) : null;
  const pixelScale = natural.w && displayWidth ? displayWidth / natural.w : 1;

  useEffect(() => {
    if (jobStatus !== "COMPLETED" || !imageUrl) {
      setWords([]);
      setLayoutNote(null);
      return;
    }

    let cancelled = false;
    setLayoutLoading(true);
    setLayoutNote(null);
    setWords([]);

    (async () => {
      try {
        // Load pixels in the main thread so the worker does not need to fetch a cross-origin URL
        // (avoids CORS quirks with Worker + fetch).
        const imgRes = await fetch(imageUrl, { mode: "cors", credentials: "omit", cache: "no-store" });
        if (!imgRes.ok) {
          throw new Error(`${t?.("layoutFetchFailed") || "Image fetch failed"} (HTTP ${imgRes.status})`);
        }
        const imageBlob = await imgRes.blob();

        const { createWorker } = await import("tesseract.js");
        // Try English first (small, reliable on default lang CDN); then Vietnamese+English.
        const langAttempts = ["eng", "vie+eng"];
        let lastErr = null;
        let wordsOut = [];

        for (const langs of langAttempts) {
          if (cancelled) return;
          let worker;
          try {
            worker = await createWorker(langs, 1, {
              logger: () => {},
            });
            const { data } = await worker.recognize(imageBlob);
            await worker.terminate();
            wordsOut = Array.isArray(data.words) ? data.words : [];
            lastErr = null;
            break;
          } catch (e) {
            lastErr = e;
            if (worker) {
              try {
                await worker.terminate();
              } catch {
                /* ignore */
              }
            }
          }
        }

        if (cancelled) return;
        if (lastErr) {
          throw lastErr;
        }
        setWords(wordsOut);
      } catch (e) {
        if (!cancelled) {
          const detail = e?.message ? ` — ${e.message}` : "";
          setLayoutNote(`${t?.("layoutFailed") || "Layout analysis failed"}${detail}`);
          setWords([]);
        }
      } finally {
        if (!cancelled) setLayoutLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [imageUrl, jobStatus, t]);

  const onImageLoad = useCallback((e) => {
    const nw = e.target.naturalWidth;
    const nh = e.target.naturalHeight;
    setNatural({ w: nw, h: nh });
    if (nw > 0) {
      setBaseWidth((prev) => {
        if (prev != null) return prev;
        return Math.min(MAX_BASE_WIDTH_PX, nw);
      });
    }
  }, []);

  // Reset geometry when switching document
  useEffect(() => {
    setNatural({ w: 0, h: 0 });
    setBaseWidth(null);
  }, [imageUrl]);

  const lowConfidenceWords = useMemo(() => {
    return words.filter((w) => {
      const c = w.confidence;
      if (typeof c !== "number" || Number.isNaN(c)) return false;
      if (c >= LOW_CONFIDENCE_THRESHOLD) return false;
      const text = (w.text || "").trim();
      if (!text) return false;
      const bb = w.bbox;
      if (!bb) return false;
      const wpx = (bb.x1 ?? 0) - (bb.x0 ?? 0);
      const hpx = (bb.y1 ?? 0) - (bb.y0 ?? 0);
      if (wpx < 2 || hpx < 2) return false;
      return true;
    });
  }, [words]);

  const handleZoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, Math.round((z + ZOOM_STEP) * 100) / 100));
  const handleZoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, Math.round((z - ZOOM_STEP) * 100) / 100));
  const handleZoomReset = () => setZoom(1);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500">{t?.("previewZoom") || "Zoom"}</span>
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoom <= MIN_ZOOM}
          className="inline-flex items-center gap-1 rounded-lg border border-[#E6EFEA] bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          title={t?.("zoomOut") || "Zoom out"}
        >
          <ZoomOut size={14} />
        </button>
        <span className="min-w-[3rem] text-center font-mono text-xs text-slate-700">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoom >= MAX_ZOOM}
          className="inline-flex items-center gap-1 rounded-lg border border-[#E6EFEA] bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          title={t?.("zoomIn") || "Zoom in"}
        >
          <ZoomIn size={14} />
        </button>
        <button
          type="button"
          onClick={handleZoomReset}
          className="inline-flex items-center gap-1 rounded-lg border border-[#E6EFEA] bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
          title={t?.("zoomReset") || "Reset zoom"}
        >
          <RotateCcw size={14} />
        </button>
        {layoutLoading && (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <Loader2 size={14} className="animate-spin" />
            {t?.("layoutAnalyzing") || "Mapping low-confidence text…"}
          </span>
        )}
      </div>

      <div className="max-h-[680px] overflow-auto rounded-xl border border-[#EAF2EE] bg-[#F8FAF9] p-2">
        <div className="relative mx-auto w-fit">
          <img
            src={imageUrl}
            alt="Document"
            width={displayWidth || undefined}
            style={
              displayWidth
                ? { width: displayWidth, height: "auto", maxWidth: "none", display: "block" }
                : { maxHeight: 380, width: "auto", maxWidth: "100%", display: "block" }
            }
            className={displayWidth ? "" : "mx-auto object-contain"}
            onLoad={onImageLoad}
          />
          {displayWidth && natural.w > 0 && lowConfidenceWords.length > 0 && (
            <div
              className="pointer-events-none absolute left-0 top-0"
              style={{
                width: displayWidth,
                height: Math.round(natural.h * pixelScale),
              }}
            >
              {lowConfidenceWords.map((w, idx) => {
                const style = mapBBoxProportional(w.bbox, pixelScale);
                if (!style || style.width < 1 || style.height < 1) return null;
                return (
                  <div
                    key={`${w.text}-${idx}-${style.left}`}
                    className="absolute rounded-sm bg-rose-400/30 ring-1 ring-rose-300/40"
                    style={{
                      left: style.left,
                      top: style.top,
                      width: style.width,
                      height: style.height,
                    }}
                    title={`${w.text} (${Math.round(w.confidence)}%)`}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {!layoutLoading && lowConfidenceWords.length > 0 && (
        <p className="text-xs text-slate-500">
          {t?.("lowConfidenceLegend") ||
            "Light red: Tesseract confidence below threshold (often blurry or unclear). Independent from LLM extraction."}
        </p>
      )}
      {layoutNote && <p className="text-xs text-amber-700">{layoutNote}</p>}
    </div>
  );
}
