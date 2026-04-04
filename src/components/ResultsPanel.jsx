"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { C, F } from "@/lib/design";
import { api } from "@/lib/api";
import { CloseIcon, DownloadIcon } from "@/components/Icons";
import { getParamGroups, getRequiredParams } from "@/lib/paramConfig";

function confidenceColor(c) {
  return c >= 85 ? C.ok : c >= 70 ? C.warn : C.err;
}

// Shorten a filename for display (max 22 chars)
function shortName(filename) {
  if (!filename) return "Unknown";
  const name = filename.replace(/\.[^.]+$/, ""); // strip extension
  return name.length > 22 ? name.slice(0, 20) + "…" : name;
}

// File-type icon char
function fileIcon(fileType) {
  if (!fileType) return "📄";
  if (fileType.includes("pdf"))  return "📕";
  if (fileType.includes("docx") || fileType.includes("doc")) return "📘";
  if (fileType.includes("excel") || fileType.includes("xlsx")) return "📗";
  if (fileType.includes("dxf") || fileType.includes("dwg")) return "📐";
  return "📄";
}

function mergeWithRequired(extracted, projectType = "commercial") {
  const REQUIRED_PARAMS = getRequiredParams(projectType);
  const map = {};
  (extracted || []).forEach(item => {
    const name = item.parameter_name || item.parameter || item.name || "";
    map[name] = item;
  });

  const requiredKeys = new Set(REQUIRED_PARAMS.map(r => r.key));

  const requiredRows = REQUIRED_PARAMS.map(req => {
    const found = map[req.key];
    if (found) {
      const rawConf = found.confidence ?? found.score ?? 0;
      const conf = Math.round(rawConf * (rawConf > 1 ? 1 : 100));
      // Prefer rich sources array; fall back to legacy source field
      const sources = found.sources?.length
        ? found.sources
        : (found.source?.document || found.source?.pages?.length)
          ? [{ document: found.source.document, pages: found.source.pages?.length ? found.source.pages : (found.source.page ? [found.source.page] : []), section: found.source.section }]
          : [];
      return {
        label: req.label,
        key: req.key,
        unit: req.unit,
        group: req.group,
        groupLabel: req.groupLabel,
        value: found.value ?? found.value_text ?? "-",
        confidence: conf,
        notes: found.notes || null,
        sources,
        section: sources[0]?.section ?? found.source?.section ?? null,
        sourceText: found.source_text || null,
        multiSource: found.multi_source || false,
        available: true,
      };
    }
    return {
      label: req.label,
      key: req.key,
      unit: req.unit,
      group: req.group,
      groupLabel: req.groupLabel,
      value: null,
      confidence: null,
      notes: null,
      sources: [],
      sourceText: null,
      multiSource: false,
      available: false,
    };
  });

  // Append any extra parameters from backend not in the required list
  const extraRows = (extracted || [])
    .filter(item => {
      const name = item.parameter_name || item.parameter || item.name || "";
      const isFound = item.found !== false && (item.value ?? item.value_text);
      return isFound && !requiredKeys.has(name);
    })
    .map(item => {
      const name = item.parameter_name || item.parameter || item.name || "";
      const rawConf = item.confidence ?? item.score ?? 0;
      const conf = Math.round(rawConf * (rawConf > 1 ? 1 : 100));
      const sources = item.sources?.length
        ? item.sources
        : (item.source?.document || item.source?.pages?.length)
          ? [{ document: item.source.document, pages: item.source.pages?.length ? item.source.pages : (item.source.page ? [item.source.page] : []), section: item.source.section }]
          : [];
      return {
        label: item.display_name || name,
        unit: item.unit || item.expected_unit || "",
        group: "extra",
        groupLabel: "Additional",
        value: item.value ?? item.value_text ?? "-",
        confidence: conf,
        notes: item.notes || null,
        sources,
        section: sources[0]?.section ?? null,
        available: true,
        extra: true,
      };
    });

  return [...requiredRows, ...extraRows];
}

// ── Compact source badges component ──────────────────────────────────────────
function SourceBadges({ sources, isExpanded }) {
  if (!sources?.length) return null;

  // Collapsed: show max 3 page pills across all docs
  if (!isExpanded) {
    const allPages = sources.flatMap(s => (s.pages || []).map(pg => ({ pg, doc: s.document })));
    const shown = allPages.slice(0, 3);
    const more  = allPages.length - shown.length;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, justifyContent: "flex-end", marginTop: 4 }}>
        {shown.map(({ pg, doc }, idx) => (
          <span key={idx} title={doc ? `${doc} · Page ${pg}` : `Page ${pg}`}
            style={{ display: "inline-flex", alignItems: "center", padding: "2px 6px", background: C.greenSubtle, border: `1px solid ${C.greenBorder}`, borderRadius: 4, fontSize: 9, fontWeight: 600, color: C.green, cursor: "default" }}>
            Pg.{pg}
          </span>
        ))}
        {more > 0 && (
          <span style={{ padding: "2px 6px", background: "rgba(255,255,255,0.05)", borderRadius: 4, fontSize: 9, color: C.text3 }}>
            +{more}
          </span>
        )}
      </div>
    );
  }

  // Expanded: show each document with its pages
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6, alignItems: "flex-end" }}>
      {sources.map((src, idx) => (
        <div key={idx} style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {src.document && (
            <span style={{ fontSize: 9, color: C.text3, fontWeight: 500, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={src.document}>
              {shortName(src.document)}
            </span>
          )}
          {(src.pages || []).map(pg => (
            <span key={pg}
              style={{ display: "inline-flex", alignItems: "center", padding: "2px 6px", background: C.greenSubtle, border: `1px solid ${C.greenBorder}`, borderRadius: 4, fontSize: 9, fontWeight: 600, color: C.green }}>
              Pg.{pg}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function ResultsPanel({ token, projectId, projectName, onClose, isMobile }) {
  const [params, setParams] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [projectType, setProjectType] = useState("commercial");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [popup, setPopup] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setShowExportMenu(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const [polling, setPolling] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [reExtracting, setReExtracting] = useState(false);
  const [reExtractingParam, setReExtractingParam] = useState(null); // key of single param being re-extracted
  const [timings, setTimings] = useState(null);
  const [showTimings, setShowTimings] = useState(false);
  const [timingView, setTimingView] = useState("summary"); // "summary" | "all"
  const [filterText, setFilterText] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // "all" | "found" | "missing"
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  // Derive PARAM_GROUPS and REQUIRED_PARAMS based on project type
  const PARAM_GROUPS = useMemo(() => getParamGroups(projectType), [projectType]);
  const REQUIRED_PARAMS = useMemo(() => getRequiredParams(projectType), [projectType]);

  // ── Poll timings endpoint ─────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    setTimings(null);
    let cancelled = false;
    let timer = null;

    const fetchTimings = () => {
      api.getTimings(token, projectId).then(data => {
        if (cancelled || !data) return;
        setTimings(data);
        // Keep polling while still processing
        if (data.processing_status === "processing" || data.processing_status === "uploaded") {
          timer = setTimeout(fetchTimings, 3000);
        }
      });
    };
    fetchTimings();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [token, projectId, refreshKey]);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    setError("");
    setPolling(false);
    setPipelineStep(null);
    setParams([]);
    setDocuments([]);

    let cancelled = false;
    let timer = null;
    let attempts = 0;
    const MAX_ATTEMPTS = 200;    // 200 × 3s = 10 min — covers 20-file uploads
    const POLL_INTERVAL = 3000;

    const fetchParams = () => {
      api.getParameters(token, projectId)
        .then(data => {
          if (cancelled) return;
          const pType = data.project_type || "commercial";
          setProjectType(pType);
          const merged = mergeWithRequired(data.parameters, pType);
          setParams(merged);
          setDocuments(data.documents || []);
          setPipelineStep(data.pipeline_step || null);
          setLoading(false);
          const stillProcessing = data.processing_status === "processing" || data.processing_status === "uploaded";
          if (stillProcessing && attempts < MAX_ATTEMPTS) {
            attempts++;
            setPolling(true);
            timer = setTimeout(fetchParams, POLL_INTERVAL);
          } else {
            setPolling(false);
            setReExtracting(false);
          }
        })
        .catch(() => {
          if (cancelled) return;
          if (attempts < MAX_ATTEMPTS) {
            attempts++;
            timer = setTimeout(fetchParams, POLL_INTERVAL);
          } else {
            setError("Processing is taking longer than expected. Refresh the page to check progress.");
            setLoading(false);
            setPolling(false);
            setReExtracting(false);
          }
        });
    };

    fetchParams();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [token, projectId, refreshKey]);

  const handleReExtract = async () => {
    if (reExtracting || polling) return;
    setReExtracting(true);
    setError("");
    try {
      await api.reExtract(token, projectId);
      setRefreshKey(k => k + 1);
    } catch (e) {
      setError(`Re-extraction failed: ${e.message}`);
      setReExtracting(false);
    }
  };

  const found = params.filter(p => p.available);

  const exportCSV = () => {
    const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Section", "Parameter", "Value", "Unit", "Confidence %", "Source Document", "Source Pages", "Status"];
    const rows = [head];
    PARAM_GROUPS.forEach(group => {
      const groupParams = params.filter(p => p.group === group.id);
      groupParams.forEach(p => {
        const srcDoc = p.available && p.sources?.length ? p.sources.map(s => s.document || "").filter(Boolean).join(" / ") : "";
        const srcPg  = p.available && p.sources?.length ? p.sources.flatMap(s => (s.pages || []).map(pg => `Pg.${pg}`)).join(", ") : "";
        rows.push([
          group.label, p.label,
          p.available ? (p.value || "—") : "—",
          p.unit || "",
          p.available ? (p.confidence != null ? `${p.confidence}%` : "—") : "—",
          srcDoc || "—", srcPg || "—",
          p.available ? "Available" : "Not Available",
        ]);
      });
    });
    // Extra params not in groups
    params.filter(p => p.extra).forEach(p => {
      const srcDoc = p.sources?.map(s => s.document || "").filter(Boolean).join(" / ") || "";
      const srcPg  = p.sources?.flatMap(s => (s.pages || []).map(pg => `Pg.${pg}`)).join(", ") || "";
      rows.push(["Additional", p.label, p.value || "—", p.unit || "", p.confidence != null ? `${p.confidence}%` : "—", srcDoc || "—", srcPg || "—", "Available"]);
    });
    const csv = rows.map(r => r.map(esc).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `TenderIQ_${projectName ? projectName.replace(/[^a-z0-9]/gi, "_") : projectId}.csv`;
    a.click();
  };

  const exportXLS = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "TenderIQ"; wb.created = new Date();
    const ws = wb.addWorksheet("TenderIQ Parameters", { views: [{ state: "frozen", ySplit: 3 }] });

    // Column definitions
    ws.columns = [
      { key: "no",    width: 5  },
      { key: "param", width: 38 },
      { key: "value", width: 40 },
      { key: "unit",  width: 16 },
      { key: "conf",  width: 13 },
      { key: "srcDoc",width: 30 },
      { key: "srcPg", width: 18 },
      { key: "status",width: 13 },
    ];

    const SECTION_COLORS = {
      technical_spec:  "1E3A5F",
      tender_drawing:  "1A4A3A",
      boq_hardware:    "3D1A5F",
      commercial:      "5F3300",
    };
    const SECTION_TEXT   = "FFFFFF";
    const COL_HDR_BG     = "2D3748";
    const COL_HDR_FG     = "FFFFFF";
    const FOUND_STRIPE_A = "FFFFFF";
    const FOUND_STRIPE_B = "F7F8FA";
    const MISS_BG        = "F4F4F4";
    const MISS_FG        = "AAAAAA";

    const style = (cell, opts = {}) => {
      if (opts.bg)   cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + opts.bg } };
      if (opts.fg)   cell.font = { ...cell.font, color: { argb: "FF" + opts.fg }, bold: opts.bold || false, italic: opts.italic || false, size: opts.size || 10, name: "Arial" };
      else           cell.font = { ...cell.font, bold: opts.bold || false, italic: opts.italic || false, size: opts.size || 10, name: "Arial" };
      cell.alignment = { vertical: "middle", horizontal: opts.align || "left", wrapText: opts.wrap || false };
      if (opts.border) {
        const b = { style: "thin", color: { argb: "FFD0D5DD" } };
        cell.border = { top: b, left: b, bottom: b, right: b };
      }
    };

    // ── Row 1: Title ──
    ws.mergeCells("A1:H1");
    const t = ws.getCell("A1");
    t.value = `TenderIQ  ·  ${projectName || "Analysis Results"}`;
    style(t, { bg: "0A0E14", fg: "FFFFFF", bold: true, size: 13, align: "center" });
    ws.getRow(1).height = 28;

    // ── Row 2: Subtitle ──
    ws.mergeCells("A2:H2");
    const s = ws.getCell("A2");
    s.value = `Generated ${new Date().toLocaleDateString()}  ·  ${found.length} parameters found  ·  ${params.length - found.length} not available`;
    style(s, { bg: "1A1E28", fg: "8899AA", size: 9, align: "center" });
    ws.getRow(2).height = 18;

    // ── Row 3: blank ──
    ws.getRow(3).height = 6;

    let rowNum = 4;

    const COL_LABELS = ["#", "Parameter", "Value", "Unit", "Confidence %", "Source Document", "Source Pages", "Status"];

    PARAM_GROUPS.forEach(group => {
      const groupParams = params.filter(p => p.group === group.id);
      if (!groupParams.length) return;

      // Section header
      ws.mergeCells(`A${rowNum}:H${rowNum}`);
      const sh = ws.getCell(`A${rowNum}`);
      sh.value = group.label.toUpperCase();
      style(sh, { bg: SECTION_COLORS[group.id] || "333333", fg: SECTION_TEXT, bold: true, size: 10.5, align: "center" });
      ws.getRow(rowNum).height = 22;
      rowNum++;

      // Column headers
      const hdr = ws.getRow(rowNum);
      hdr.height = 18;
      COL_LABELS.forEach((lbl, ci) => {
        const cell = hdr.getCell(ci + 1);
        cell.value = lbl;
        style(cell, { bg: COL_HDR_BG, fg: COL_HDR_FG, bold: true, size: 9, align: ci === 1 ? "left" : "center", border: true });
      });
      rowNum++;

      // Data rows
      let altIdx = 0;
      groupParams.forEach((p, pi) => {
        const srcDoc = p.available && p.sources?.length
          ? p.sources.map(s => s.document || "").filter(Boolean).join(" / ")
          : "";
        const srcPg = p.available && p.sources?.length
          ? p.sources.flatMap(s => (s.pages || []).map(pg => `Pg.${pg}`)).join(", ")
          : "";
        const row = ws.getRow(rowNum);
        row.height = 16;
        const isEven = altIdx % 2 === 0;
        altIdx++;

        const vals = [
          pi + 1,
          p.label,
          p.available ? (p.value || "—") : "—",
          p.unit || "",
          p.available ? (p.confidence != null ? `${p.confidence}%` : "—") : "—",
          srcDoc || "—",
          srcPg  || "—",
          p.available ? "Available" : "Not Available",
        ];

        vals.forEach((v, ci) => {
          const cell = row.getCell(ci + 1);
          cell.value = v;
          if (p.available) {
            style(cell, {
              bg: isEven ? FOUND_STRIPE_A : FOUND_STRIPE_B,
              fg: ci === 1 ? "111827" : ci === 2 ? "1E3A5F" : ci === 4 ? (p.confidence >= 85 ? "15803D" : p.confidence >= 70 ? "B45309" : "B91C1C") : ci === 7 ? "15803D" : "374151",
              bold: ci === 1 || ci === 2,
              size: 9,
              align: ci === 0 ? "center" : ci >= 3 ? "center" : "left",
              border: true,
            });
          } else {
            style(cell, {
              bg: MISS_BG, fg: MISS_FG, italic: ci >= 1,
              size: 9, align: ci === 0 ? "center" : ci >= 3 ? "center" : "left", border: true,
            });
          }
        });
        rowNum++;
      });

      // Blank separator
      ws.getRow(rowNum).height = 8;
      rowNum++;
    });

    // Stream to blob and trigger download
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `TenderIQ_${projectName ? projectName.replace(/[^a-z0-9]/gi, "_") : projectId}.xlsx`;
    a.click(); URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const loadImg = (src) => new Promise(res => {
      const img = new Image(); img.crossOrigin = "anonymous";
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext("2d").drawImage(img, 0, 0);
        res({ data: c.toDataURL("image/png"), w: img.naturalWidth, h: img.naturalHeight });
      };
      img.src = src;
    });

    const [schuecoData, sooruData, teiqData] = await Promise.all([
      loadImg("/schu.png"),
      loadImg("/suru.png"),
      loadImg("/teiq.png"),
    ]);

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();

    doc.setFillColor(10, 14, 20);
    doc.rect(0, 0, W, 54, "F");

    const cx = W / 2;
    const schuH = 16; const schuW = (schuecoData.w / schuecoData.h) * schuH;
    const suruH = 8;  const suruW = (sooruData.w  / sooruData.h)  * suruH;
    const teiqH = 10; const teiqW = (teiqData.w   / teiqData.h)   * teiqH;

    const row1W = teiqW + 3 + 28;
    const row1X = cx - row1W / 2;
    doc.addImage(teiqData.data, "PNG", row1X, 6, teiqW, teiqH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text("TenderIQ", row1X + teiqW + 3, 14);

    const row2W = schuW + 6 + 5 + 6 + suruW + 4 + 16;
    const row2X = cx - row2W / 2;
    const row2Y = 22;
    doc.addImage(schuecoData.data, "PNG", row2X, row2Y, schuW, schuH);
    doc.setFontSize(11); doc.setTextColor(180, 180, 180);
    doc.text("×", row2X + schuW + 3, row2Y + schuH / 2 + 1.5);
    doc.addImage(sooruData.data, "PNG", row2X + schuW + 9, row2Y + (schuH - suruH) / 2, suruW, suruH);
    doc.setFontSize(9); doc.setTextColor(200, 200, 200);
    doc.text("Sooru.AI", row2X + schuW + 9 + suruW + 3, row2Y + schuH / 2 + 1.5);

    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(160, 160, 160);
    doc.text(projectName || "Analysis Results", cx, 62, { align: "center" });

    const foundCount = params.filter(p => p.available).length;
    doc.setFontSize(9); doc.setTextColor(100, 100, 100);
    doc.text(`${foundCount} Found  ·  ${params.length - foundCount} Not Available  ·  Generated ${new Date().toLocaleDateString()}`, cx, 68, { align: "center" });

    const SECTION_COLORS = {
      technical_spec: [30, 58, 95],
      tender_drawing: [26, 74, 58],
      boq_hardware:   [61, 26, 95],
      commercial:     [95, 51, 0],
    };
    const COL_LABELS = ["#", "Parameter", "Value", "Unit", "Conf.", "Source Doc", "Pages", "Status"];
    const COL_WIDTHS = { 0: 8, 1: 40, 2: 42, 3: 16, 4: 12, 5: 28, 6: 18, 7: 14 };

    let y = 73;
    PARAM_GROUPS.forEach(group => {
      const groupParams = params.filter(p => p.group === group.id);
      if (!groupParams.length) return;

      const sc = SECTION_COLORS[group.id] || [50, 50, 50];
      const body = groupParams.map((p, pi) => {
        const srcDoc = p.available && p.sources?.length ? p.sources.map(s => shortName(s.document || "")).filter(Boolean).join(" / ") : "—";
        const srcPg  = p.available && p.sources?.length ? p.sources.flatMap(s => (s.pages || []).map(pg => `${pg}`)).join(", ") : "—";
        return [
          pi + 1,
          p.label,
          p.available ? (p.value || "—") : "—",
          p.unit || "",
          p.available ? (p.confidence != null ? `${p.confidence}%` : "—") : "—",
          srcDoc, srcPg,
          p.available ? "Available" : "N/A",
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [[{ content: group.label.toUpperCase(), colSpan: 8, styles: { halign: "left", fillColor: sc, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9, cellPadding: { top: 4, bottom: 4, left: 6, right: 6 } } }], COL_LABELS],
        body,
        styles: { fontSize: 7.5, cellPadding: 2.5, overflow: "linebreak", font: "helvetica" },
        headStyles: { fillColor: [45, 55, 72], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
        alternateRowStyles: { fillColor: [247, 248, 250] },
        columnStyles: COL_WIDTHS,
        margin: { left: 10, right: 10 },
        didParseCell: (data) => {
          if (data.section === "body") {
            const raw = groupParams[data.row.index];
            if (!raw?.available) {
              data.cell.styles.textColor = [180, 180, 180];
              data.cell.styles.fontStyle = "italic";
            }
            if (data.column.index === 7 && raw?.available) {
              data.cell.styles.textColor = [21, 128, 61];
              data.cell.styles.fontStyle = "bold";
            }
            if (data.column.index === 4 && raw?.available && raw.confidence != null) {
              data.cell.styles.textColor = raw.confidence >= 85 ? [21, 128, 61] : raw.confidence >= 70 ? [180, 83, 9] : [185, 28, 28];
            }
          }
        },
      });
      y = doc.lastAutoTable.finalY + 6;
    });

    doc.save(`TenderIQ_${projectName ? projectName.replace(/[^a-z0-9]/gi, "_") : projectId}.pdf`);
  };

  // ── Filtered param list ───────────────────────────────────────────────────
  const toggleGroup = (gid) => setCollapsedGroups(prev => {
    const next = new Set(prev);
    next.has(gid) ? next.delete(gid) : next.add(gid);
    return next;
  });

  const filteredParams = params.filter(p => {
    if (activeTab === "found"   && !p.available) return false;
    if (activeTab === "missing" &&  p.available) return false;
    if (filterText) {
      const t = filterText.toLowerCase();
      return p.label.toLowerCase().includes(t) || (p.value || "").toLowerCase().includes(t);
    }
    return true;
  });

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg, borderLeft: isMobile ? "none" : `1px solid ${C.border}`, fontFamily: F.sans }}>

      {/* Header */}
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text1 }}>Extracted Parameters</div>
          <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{projectName || "Analysis Results"}</div>
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {/* Export dropdown */}
          <div style={{ position: "relative" }} ref={exportRef}>
            <button onClick={() => setShowExportMenu(v => !v)}
              style={{ padding: "5px 10px", background: showExportMenu ? C.bg2 : "transparent", border: `1px solid ${C.border}`, borderRadius: 6, color: C.text2, cursor: "pointer", fontSize: 11, fontFamily: F.sans, display: "flex", alignItems: "center", gap: 4, fontWeight: 500, transition: "all 0.15s" }}>
              <DownloadIcon /> Export ▾
            </button>
            {showExportMenu && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: C.bg1, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", zIndex: 50, minWidth: 110, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                {[
                  { label: "CSV", fn: exportCSV, ext: ".csv" },
                  { label: "Excel (XLS)", fn: exportXLS, ext: ".xlsx" },
                  { label: "PDF", fn: exportPDF, ext: ".pdf" },
                ].map(opt => (
                  <button key={opt.label}
                    onClick={() => { opt.fn(); setShowExportMenu(false); }}
                    style={{ width: "100%", padding: "9px 14px", background: "none", border: "none", color: C.text2, cursor: "pointer", fontSize: 12, fontFamily: F.sans, textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, transition: "background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = C.bg2}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    {opt.label}
                    <span style={{ fontSize: 10, color: C.text3 }}>{opt.ext}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ padding: 4, background: "none", border: "none", color: C.text3, cursor: "pointer" }}>
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* Summary + Re-extract bar */}
      {polling && (
        <div style={{ padding: "10px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8, flexShrink: 0, background: "rgba(52,211,153,0.04)" }}>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: C.green, animation: `pulse 1.2s ease ${i * 0.2}s infinite` }} />
            ))}
          </div>
          <span style={{ fontSize: 11, color: C.text2, flex: 1 }}>
            {pipelineStep || (reExtracting ? `Re-extracting ${REQUIRED_PARAMS.length} parameters…` : "Processing documents…")}
          </span>
        </div>
      )}
      {!loading && !polling && params.length > 0 && (
        <div style={{ padding: "10px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.ok }} />
              <span style={{ color: C.text2 }}><strong style={{ color: C.text1 }}>{found.length}</strong> Found</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.text3 }} />
              <span style={{ color: C.text2 }}><strong style={{ color: C.text1 }}>{params.length - found.length}</strong> Not Available</span>
            </div>
          </div>
          {/* Re-extract always visible — lets users refresh with new parameter catalog */}
          <button
            onClick={handleReExtract}
            disabled={reExtracting || polling}
            title={`Re-run extraction to pick up all ${REQUIRED_PARAMS.length} parameters`}
            style={{ padding: "4px 12px", background: "transparent", border: `1px solid ${C.greenBorder}`, borderRadius: 6, color: C.green, cursor: (reExtracting || polling) ? "default" : "pointer", fontSize: 11, fontFamily: F.sans, fontWeight: 500, opacity: (reExtracting || polling) ? 0.5 : 1, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5 }}
            onMouseEnter={e => { if (!reExtracting && !polling) e.currentTarget.style.background = C.greenSubtle; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
            {reExtracting ? (
              <>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, animation: "pulse 1s ease infinite" }} />
                Re-extracting…
              </>
            ) : "↺ Re-extract"}
          </button>
        </div>
      )}

      {/* Documents bar */}
      {!loading && documents.length > 0 && (
        <div style={{ borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <button
            onClick={() => setShowDocs(v => !v)}
            style={{ width: "100%", padding: "8px 18px", background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", color: C.text2 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.text3, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 8 }}>
              {documents.length} Document{documents.length !== 1 ? "s" : ""}
              {polling && <span style={{ color: C.warn }}>• scanning</span>}
              {!polling && !reExtracting && (
                <span
                  onClick={(e) => { e.stopPropagation(); handleReExtract(); }}
                  style={{ fontSize: 10, padding: "2px 8px", background: "transparent", border: `1px solid ${C.greenBorder}`, borderRadius: 5, color: C.green, cursor: "pointer", fontWeight: 500, letterSpacing: 0, textTransform: "none", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.greenSubtle; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                  Re-extract
                </span>
              )}
              {reExtracting && (
                <span style={{ fontSize: 10, color: C.green, letterSpacing: 0, textTransform: "none", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, animation: "pulse 1s ease infinite", display: "inline-block" }} />
                  Re-extracting...
                </span>
              )}
            </span>
            <span style={{ fontSize: 10, color: C.text3 }}>{showDocs ? "▲" : "▼"}</span>
          </button>
          {showDocs && (
            <div style={{ padding: "0 14px 10px", maxHeight: 220, overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: `${C.text3}40 transparent` }}>
              {documents.map((doc, i) => {
                const st = doc.processing_status;
                const statusColorMap = {
                  "pending":    "#4A9EFF",
                  "processing": "#FFB340",
                  "indexed":    "#FF8C42",
                  "completed":  "#00C48C",
                  "failed":     "#FF5A5A",
                };
                const statusColor = statusColorMap[st] || C.text3;
                const isProcessing = st === "processing";
                const isFailed = st === "failed";
                const statusLabel = {
                  "pending":    "pending",
                  "processing": "parsing...",
                  "indexed":    "indexed",
                  "completed":  "done",
                  "failed":     "failed",
                }[st] || st || "ready";
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: C.bg2, borderRadius: 7, marginBottom: 4, border: `1px solid ${statusColor}25` }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>{fileIcon(doc.file_type)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.text1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={doc.filename}>
                        {doc.filename}
                      </div>
                      <div style={{ fontSize: 10, color: C.text3, marginTop: 1 }}>
                        {doc.page_count ? `${doc.page_count} pages · ` : ""}{doc.num_chunks ? `${doc.num_chunks} chunks` : ""}
                        {isFailed && doc.processing_error && (
                          <span style={{ color: C.err }}> · {doc.processing_error.slice(0, 60)}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor, animation: isProcessing ? "pulse 1.2s ease infinite" : "none" }} />
                      <span style={{ fontSize: 10, color: statusColor, fontWeight: 600 }}>
                        {statusLabel}
                      </span>
                      {(st === "completed" || st === "failed") && (
                        <button
                          title="Re-process this document"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await api.reprocessDocument(token, projectId, doc.document_id);
                              setRefreshKey(k => k + 1);
                            } catch (err) {
                              console.error("Reprocess failed:", err);
                            }
                          }}
                          style={{
                            background: "none", border: `1px solid ${C.border}`, borderRadius: 4,
                            color: C.text3, cursor: "pointer", padding: "1px 5px", fontSize: 10,
                            fontWeight: 600, marginLeft: 2, transition: "all 0.15s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = C.green; e.currentTarget.style.borderColor = C.green; }}
                          onMouseLeave={e => { e.currentTarget.style.color = C.text3; e.currentTarget.style.borderColor = C.border; }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle" }}>
                            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Pipeline Timings */}
      {timings && (timings.summary?.length > 0 || timings.details?.length > 0) && (
        <div style={{ borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <button
            onClick={() => setShowTimings(v => !v)}
            style={{ width: "100%", padding: "8px 18px", background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", color: C.text2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.text3, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                ⏱ Pipeline Timings
              </span>
              {timings.total_seconds != null && (
                <span style={{ fontSize: 10, color: C.green, fontWeight: 700 }}>
                  {timings.total_seconds.toFixed(1)}s total
                </span>
              )}
              {polling && (
                <span style={{ fontSize: 10, color: C.warn }}>• live</span>
              )}
            </div>
            <span style={{ fontSize: 10, color: C.text3 }}>{showTimings ? "▲" : "▼"}</span>
          </button>

          {showTimings && (
            <div style={{ padding: "0 14px 12px" }}>
              {/* Summary / All toggle */}
              <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                {["summary", "all"].map(v => (
                  <button key={v} onClick={() => setTimingView(v)}
                    style={{ padding: "3px 10px", fontSize: 10, fontWeight: 600, fontFamily: F.sans, border: `1px solid ${timingView === v ? C.green : C.border}`, borderRadius: 4, background: timingView === v ? C.greenSubtle : "transparent", color: timingView === v ? C.green : C.text3, cursor: "pointer", transition: "all 0.15s", textTransform: "capitalize" }}>
                    {v === "summary" ? "Key Steps" : "All Logs"}
                  </button>
                ))}
              </div>

              {/* Timing rows */}
              {(() => {
                const rows = timingView === "summary"
                  ? (timings.summary || [])
                  : (timings.all || []);
                if (!rows.length) return (
                  <div style={{ fontSize: 11, color: C.text3, padding: "6px 0" }}>
                    No timing data yet — processing may still be starting…
                  </div>
                );
                // Max duration for proportional bar width
                const maxDur = Math.max(...rows.map(r => r.duration), 1);
                return rows.map((entry, i) => {
                  const pct = Math.max(4, Math.round((entry.duration / maxDur) * 100));
                  const barColor = entry.duration < 2 ? C.ok : entry.duration < 10 ? C.warn : C.err;
                  return (
                    <div key={i} style={{ marginBottom: 6, padding: "7px 10px", background: C.bg1, borderRadius: 7, border: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: C.text1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
                            {entry.label}
                          </span>
                          {entry.detail && (
                            <span style={{ fontSize: 10, color: C.text3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
                              {entry.detail}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: barColor, flexShrink: 0 }}>
                          {entry.duration.toFixed(2)}s
                        </span>
                      </div>
                      {/* Duration bar */}
                      <div style={{ height: 3, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 2, transition: "width 0.4s ease" }} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      )}

      {/* ── Filter / Tab bar ── */}
      {!loading && params.length > 0 && (
        <div style={{ padding: "8px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 8, alignItems: "center", flexShrink: 0, background: C.bg }}>
          <input
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            placeholder="Search parameters…"
            style={{ flex: 1, padding: "5px 10px", background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text1, fontSize: 11, fontFamily: F.sans, outline: "none", minWidth: 0 }}
          />
          {[
            { id: "all",     label: `All (${params.length})` },
            { id: "found",   label: `Found (${found.length})` },
            { id: "missing", label: `Missing (${params.length - found.length})` },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ padding: "4px 10px", fontSize: 10, fontWeight: 600, fontFamily: F.sans, borderRadius: 5, border: `1px solid ${activeTab === tab.id ? C.greenBorder : C.border}`, background: activeTab === tab.id ? C.greenSubtle : "transparent", color: activeTab === tab.id ? C.green : C.text3, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.12s" }}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Compact table ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {(loading || (polling && params.length === 0)) && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 120 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, animation: `pulse 1.2s ease ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        {error && (
          <div style={{ margin: "12px 14px", padding: "10px 14px", background: "rgba(255,90,90,0.06)", border: `1px solid rgba(255,90,90,0.15)`, borderRadius: 8, color: C.err, fontSize: 12 }}>
            {error}
          </div>
        )}

        {!loading && (() => {
          const allGroups = [...PARAM_GROUPS, ...(filteredParams.some(p => p.extra) ? [{ id: "extra", label: "Additional" }] : [])];
          return allGroups.map(group => {
            const gParams = filteredParams.filter(p => (p.group || "extra") === group.id);
            if (!gParams.length) return null;
            const gFound = gParams.filter(p => p.available).length;
            const collapsed = collapsedGroups.has(group.id);
            return (
              <div key={group.id}>
                {/* Section header */}
                <div
                  onClick={() => toggleGroup(group.id)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px 6px", cursor: "pointer", position: "sticky", top: 0, background: C.bg, zIndex: 10, borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: C.text3, whiteSpace: "nowrap" }}>
                    {group.label}
                  </span>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                  <span style={{ fontSize: 9, color: gFound > 0 ? C.ok : C.text3, fontWeight: 700, whiteSpace: "nowrap" }}>
                    {gFound}/{gParams.length}
                  </span>
                  <span style={{ fontSize: 9, color: C.text3, marginLeft: 2 }}>{collapsed ? "▶" : "▼"}</span>
                </div>

                {/* Column sub-header */}
                {!collapsed && (
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2.2fr) minmax(0,1.8fr) 56px 90px", padding: "4px 14px", background: C.bg2, borderBottom: `1px solid ${C.border}` }}>
                    {["Parameter", "Value", "Conf.", "Source"].map(h => (
                      <span key={h} style={{ fontSize: 9, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
                    ))}
                  </div>
                )}

                {/* Rows */}
                {!collapsed && gParams.map((r, ri) => {
                  const srcStr = r.available && r.sources?.length
                    ? r.sources.map(s => {
                        const pgs = (s.pages || []).slice(0, 2).map(pg => `p${pg}`).join(",");
                        const more = (s.pages || []).length > 2 ? `+${(s.pages || []).length - 2}` : "";
                        return pgs ? `${pgs}${more}` : shortName(s.document || "");
                      }).join(" ")
                    : "";
                  const isEven = ri % 2 === 0;
                  return (
                    <div key={ri}
                      onClick={() => setPopup(r)}
                      style={{ display: "grid", gridTemplateColumns: "minmax(0,2.2fr) minmax(0,1.8fr) 56px 90px", padding: "6px 14px", background: isEven ? "transparent" : `${C.bg2}80`, borderBottom: `1px solid ${C.border}40`, cursor: "pointer", opacity: r.available ? 1 : 0.5, transition: "background 0.1s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${C.greenSubtle}`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = isEven ? "transparent" : `${C.bg2}80`; }}>
                      {/* Parameter name */}
                      <div style={{ minWidth: 0, paddingRight: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 500, color: r.available ? C.text1 : C.text3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.label}>
                          {r.label}
                        </div>
                        <div style={{ fontSize: 9, color: C.text3, marginTop: 1 }}>{r.unit}</div>
                      </div>
                      {/* Value */}
                      <div style={{ minWidth: 0, paddingRight: 8 }}>
                        {r.available ? (
                          <div style={{ fontSize: 11, fontWeight: 600, color: C.text1, fontFamily: F.mono, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.value}>
                            {r.value}
                          </div>
                        ) : (
                          <div style={{ fontSize: 10, color: C.text3, fontStyle: "italic" }} title={r.notes || "Not specified in documents"}>
                            {polling ? "scanning…" : "Not specified"}
                          </div>
                        )}
                      </div>
                      {/* Confidence */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 3 }}>
                        {r.available && r.confidence != null ? (
                          <span style={{ fontSize: 10, fontWeight: 700, color: confidenceColor(r.confidence), background: `${confidenceColor(r.confidence)}14`, padding: "2px 6px", borderRadius: 4 }}>
                            {r.confidence}%
                          </span>
                        ) : <span style={{ fontSize: 10, color: C.text3 }}>—</span>}
                        {r.multiSource && (
                          <span title="Sourced from multiple documents" style={{ fontSize: 9, color: "#f59e0b", fontWeight: 700 }}>⚠</span>
                        )}
                      </div>
                      {/* Source */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 3, flexWrap: "wrap" }}>
                        {srcStr ? (
                          <span style={{ fontSize: 9, color: C.green, fontWeight: 600, background: C.greenSubtle, border: `1px solid ${C.greenBorder}`, padding: "2px 5px", borderRadius: 3 }} title={r.sources?.map(s => `${s.document}: ${(s.pages || []).map(p => `Pg.${p}`).join(", ")}`).join(" | ")}>
                            {srcStr}
                          </span>
                        ) : <span style={{ fontSize: 9, color: C.text3 }}>—</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          });
        })()}

        {/* Empty state */}
        {!loading && filteredParams.length === 0 && params.length > 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: C.text3, fontSize: 12 }}>
            No parameters match your filter
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{ padding: "8px 14px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: C.text3 }}>{params.length} params · {found.length} found</div>
        {found.length > 0 && (
          <div style={{ fontSize: 10, color: C.ok, fontWeight: 600 }}>
            avg {Math.round(found.reduce((a, b) => a + b.confidence, 0) / found.length)}% confidence
          </div>
        )}
      </div>

      {/* ── Click Popup Modal ── */}
      {popup && (
        <div onClick={() => setPopup(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.bg1, borderRadius: 14, border: `1px solid ${C.greenBorder}`, width: "100%", maxWidth: 500, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", overflow: "hidden" }}>
            {/* Modal header */}
            <div style={{ padding: "14px 18px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: C.text3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{popup.groupLabel}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>{popup.label}</div>
                <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{popup.unit}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                {popup.confidence != null && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: confidenceColor(popup.confidence), background: `${confidenceColor(popup.confidence)}14`, padding: "3px 8px", borderRadius: 6 }}>
                    {popup.confidence}%
                  </span>
                )}
                <button onClick={() => setPopup(null)} style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", padding: 2, display: "flex" }}>
                  <CloseIcon />
                </button>
              </div>
            </div>
            {/* Value */}
            <div style={{ padding: "16px 18px 0" }}>
              {popup.available ? (
                <div style={{ fontSize: 18, color: C.text1, fontWeight: 700, fontFamily: F.mono, wordBreak: "break-word", lineHeight: 1.5, marginBottom: 14 }}>
                  {popup.value}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: C.text3, fontStyle: "italic", marginBottom: 14, padding: "8px 12px", background: C.bg, borderRadius: 7, border: `1px solid ${C.border}` }}>
                  Not specified in the uploaded documents
                </div>
              )}
              {/* Sources */}
              {popup.sources?.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
                  {popup.sources.map((src, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: C.bg, borderRadius: 7, border: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 13 }}>{fileIcon(src.document?.split(".").pop())}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: C.text1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={src.document}>
                          {src.document || "Unknown document"}
                        </div>
                        {src.section && <div style={{ fontSize: 9, color: C.text3, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{src.section}</div>}
                      </div>
                      <div style={{ display: "flex", gap: 3, flexShrink: 0, flexWrap: "wrap" }}>
                        {(src.pages || []).map(pg => (
                          <span key={pg} style={{ padding: "2px 6px", background: C.greenSubtle, border: `1px solid ${C.greenBorder}`, borderRadius: 4, fontSize: 10, fontWeight: 600, color: C.green }}>
                            Pg.{pg}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Multi-source notice */}
              {popup.multiSource && (
                <div style={{ fontSize: 11, color: "#f59e0b", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 7, padding: "7px 11px", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>⚠</span> Value sourced from multiple documents — verify for consistency
                </div>
              )}
              {/* Explanation / notes */}
              {popup.notes && (
                <div style={{ fontSize: 11, color: C.text2, lineHeight: 1.65, padding: "9px 11px", background: C.bg, borderRadius: 7, border: `1px solid ${C.border}`, whiteSpace: "pre-wrap", marginBottom: 10 }}>
                  {popup.notes}
                </div>
              )}
              {/* Source evidence text */}
              {popup.sourceText && (
                <details style={{ marginBottom: 10 }}>
                  <summary style={{ fontSize: 10, color: C.text3, cursor: "pointer", userSelect: "none", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Source Evidence ▸
                  </summary>
                  <div style={{ fontSize: 11, color: C.text2, lineHeight: 1.7, padding: "8px 10px", background: C.bg, borderRadius: 7, border: `1px solid ${C.border}`, whiteSpace: "pre-wrap", marginTop: 5, maxHeight: 140, overflowY: "auto", fontFamily: "monospace" }}>
                    {popup.sourceText}
                  </div>
                </details>
              )}
            </div>
            <div style={{ padding: "8px 18px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, color: C.text3 }}>Click outside to close</span>
              {popup.key && (
                <button
                  disabled={reExtractingParam === popup.key}
                  onClick={async () => {
                    if (!popup.key || reExtractingParam) return;
                    setReExtractingParam(popup.key);
                    try {
                      await api.reExtractSingle(token, projectId, popup.key);
                      // Poll until value changes — just trigger a refresh after 15s
                      setTimeout(() => { setRefreshKey(k => k + 1); setReExtractingParam(null); }, 15000);
                    } catch { setReExtractingParam(null); }
                  }}
                  style={{ fontSize: 10, padding: "4px 10px", background: "transparent", border: `1px solid ${C.greenBorder}`, borderRadius: 5, color: reExtractingParam === popup.key ? C.text3 : C.green, cursor: reExtractingParam === popup.key ? "default" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                  {reExtractingParam === popup.key ? "↻ Re-extracting…" : "↻ Re-extract this"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
