"use client";
/**
 * useParameterStream
 * ───────────────────
 * React hook that subscribes to the backend SSE endpoint
 *   GET /projects/:id/parameters/stream
 * and returns the live state of parameter extraction as documents index.
 *
 * Event protocol (see routers/parameters.py):
 *   snapshot       — full initial state: { parameters, documents, indexed_count, total_count, ... }
 *   doc_indexed    — { document_id, filename, indexed_count }
 *   param_updated  — { parameter_name, value, confidence, unit, sources, lifecycle_status, change_count, changed }
 *   pass_complete  — { pass_number, is_final, updated_count, total_found, duration_ms }
 *   done           — coordinator finished (or project was already terminal)
 *   error          — fatal coordinator error
 *
 * On connection failure the hook sets `status: "error"`; the caller can
 * fall back to polling via the existing /parameters endpoint.
 */
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

export function useParameterStream(projectId, enabled = true) {
  // Parameters keyed by parameter_name (backend `parameter_key`).
  const [paramsByKey, setParamsByKey] = useState({});
  const [documents, setDocuments] = useState([]);
  const [progress, setProgress] = useState({ indexed: 0, total: 0 });
  const [pipelineStep, setPipelineStep] = useState(null);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [lastUpdatedKey, setLastUpdatedKey] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | connecting | open | done | error
  // Per-pass telemetry: { pass_number, is_final, updated_count, new_count, total_found, duration_ms }
  const [passes, setPasses] = useState([]);

  // Track which params were just flipped, so UI can flash them briefly.
  const [flashingKeys, setFlashingKeys] = useState(new Set());
  const flashTimers = useRef({});

  useEffect(() => {
    if (!enabled || !projectId) return;
    setStatus("connecting");

    let es;
    try {
      es = api.openParameterStream(projectId);
    } catch (e) {
      console.error("[useParameterStream] Failed to open EventSource:", e);
      setStatus("error");
      return;
    }

    es.addEventListener("open", () => setStatus("open"));

    es.addEventListener("snapshot", (e) => {
      try {
        const data = JSON.parse(e.data);
        const map = {};
        (data.parameters || []).forEach((p) => {
          map[p.parameter_key] = p;
        });
        setParamsByKey(map);
        setDocuments(data.documents || []);
        setProgress({
          indexed: data.indexed_count || 0,
          total: data.total_count || 0,
        });
        setPipelineStep(data.pipeline_step || null);
        setProcessingStatus(data.processing_status || null);
      } catch (err) {
        console.warn("[useParameterStream] snapshot parse error", err);
      }
    });

    es.addEventListener("doc_indexed", (e) => {
      try {
        const data = JSON.parse(e.data);
        setProgress((prev) => ({
          indexed: data.indexed_count ?? prev.indexed + 1,
          total: prev.total || data.total_count || 0,
        }));
        // Flip the matching document row to "indexed" if we have it.
        setDocuments((prev) =>
          prev.map((d) =>
            d.document_id === data.document_id
              ? { ...d, processing_status: "indexed" }
              : d
          )
        );
      } catch {}
    });

    es.addEventListener("param_updated", (e) => {
      try {
        const data = JSON.parse(e.data);
        const key = data.parameter_name; // backend sends raw key here
        if (!key) return;

        setParamsByKey((prev) => ({
          ...prev,
          [key]: {
            ...(prev[key] || {}),
            parameter_key: key,
            value: data.value,
            confidence: data.confidence,
            unit: data.unit,
            sources: data.sources,
            lifecycle_status: data.lifecycle_status,
            change_count: data.change_count,
          },
        }));
        setLastUpdatedKey(key);

        // Flash the row amber for 1.5s if the value actually changed.
        if (data.changed) {
          setFlashingKeys((prev) => {
            const next = new Set(prev);
            next.add(key);
            return next;
          });
          if (flashTimers.current[key]) clearTimeout(flashTimers.current[key]);
          flashTimers.current[key] = setTimeout(() => {
            setFlashingKeys((prev) => {
              const next = new Set(prev);
              next.delete(key);
              return next;
            });
          }, 1500);
        }
      } catch {}
    });

    es.addEventListener("pass_complete", (e) => {
      try {
        const data = JSON.parse(e.data);
        setPipelineStep(
          data.is_final
            ? `Final pass complete · ${data.total_found || 0} parameters found`
            : `Pass ${data.pass_number} complete · ${data.total_found || 0} parameters found`
        );
        setPasses((prev) => [...prev, data]);
      } catch {}
    });

    es.addEventListener("done", () => {
      setStatus("done");
      setProcessingStatus("completed");
      es.close();
    });

    es.addEventListener("error", (e) => {
      // Browsers fire "error" both for fatal issues and transient reconnects.
      // We surface it as `error` only if the connection is not still open.
      if (es.readyState === EventSource.CLOSED) {
        console.warn("[useParameterStream] connection closed", e);
        setStatus("error");
      }
    });

    return () => {
      try {
        es.close();
      } catch {}
      Object.values(flashTimers.current).forEach(clearTimeout);
      flashTimers.current = {};
    };
  }, [projectId, enabled]);

  // Parameters as an ordered array (caller usually wants to merge with a
  // required-params template, so we return the raw map too).
  const parametersArray = Object.values(paramsByKey);

  return {
    parameters: parametersArray,
    paramsByKey,
    documents,
    progress,
    pipelineStep,
    processingStatus,
    status,
    lastUpdatedKey,
    flashingKeys,
    passes,
  };
}
