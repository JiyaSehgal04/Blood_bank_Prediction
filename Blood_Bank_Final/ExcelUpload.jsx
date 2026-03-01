// ═══════════════════════════════════════════════════════════════
// ExcelUpload.jsx — Excel / CSV Upload Component
// Uses SheetJS (xlsx) for client-side parsing
// ═══════════════════════════════════════════════════════════════

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { T } from "../styles/theme.js";
import { mapExcelRow, normalizeBG } from "../utils/data.js";

const REQUIRED_COLS = ["unit", "comp", "expiry", "qty", "bg"];

/**
 * ExcelUpload
 * Props:
 *   onDataLoaded(rows)  — called with parsed + validated rows
 *   recordCount         — current number of records loaded
 *   onReset()           — revert to default data
 */
export default function ExcelUpload({ onDataLoaded, recordCount, onReset }) {
  const [dragging,  setDragging]  = useState(false);
  const [status,    setStatus]    = useState(null);   // null | "loading" | "success" | "error"
  const [message,   setMessage]   = useState("");
  const [preview,   setPreview]   = useState(null);   // first 3 rows for preview
  const fileRef = useRef();

  // ── Parse file ───────────────────────────────────────────────
  async function parseFile(file) {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx","xls","csv"].includes(ext)) {
      setStatus("error");
      setMessage("Unsupported file type. Please upload .xlsx, .xls, or .csv");
      return;
    }

    setStatus("loading");
    setMessage(`Reading ${file.name}…`);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(ws, { defval: "" });

      if (!rawRows.length) {
        setStatus("error");
        setMessage("The file appears to be empty.");
        return;
      }

      // Map & normalise
      const mapped = rawRows.map(mapExcelRow).map(r => ({
        ...r,
        bg: normalizeBG(r.bg),
      }));

      // Validate required columns
      const missing = REQUIRED_COLS.filter(c => mapped[0][c] === undefined);
      if (missing.length) {
        setStatus("error");
        setMessage(`Missing required columns: ${missing.join(", ")}. Check your Excel headers.`);
        return;
      }

      // Filter rows with at least a blood group
      const valid = mapped.filter(r => r.bg && r.unit);

      setPreview(valid.slice(0, 3));
      setStatus("success");
      setMessage(`✓ ${valid.length} records loaded from "${file.name}"`);
      onDataLoaded(valid);
    } catch (err) {
      setStatus("error");
      setMessage("Failed to parse file: " + err.message);
    }
  }

  // ── Drag & Drop ──────────────────────────────────────────────
  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    parseFile(file);
  }

  function onDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  const statusColors = {
    loading: { bg: T.blueBg,  border: T.blueL,   text: T.blueL  },
    success: { bg: T.greenBg, border: T.greenL,  text: T.greenL },
    error:   { bg: "#FEF2F2", border: T.crimson, text: T.crimson },
  };
  const sc = status ? statusColors[status] : null;

  return (
    <div style={{ fontFamily: T.sans }}>
      {/* Upload zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => setDragging(false)}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? T.blueL : T.border}`,
          borderRadius: 10,
          padding: "24px 20px",
          background: dragging ? T.blueBg : "#FAFBFC",
          cursor: "pointer",
          textAlign: "center",
          transition: "all 0.2s",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 }}>
          {dragging ? "Release to upload" : "Upload Excel / CSV"}
        </div>
        <div style={{ fontSize: 11, color: T.text3 }}>
          Drag & drop or <span style={{ color: T.blueL, fontWeight: 600 }}>click to browse</span>
          <br />
          <span style={{ fontFamily: T.mono, fontSize: 10 }}>.xlsx · .xls · .csv</span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: "none" }}
          onChange={e => parseFile(e.target.files[0])}
        />
      </div>

      {/* Status message */}
      {sc && (
        <div style={{
          marginTop: 10,
          padding: "9px 13px",
          borderRadius: 7,
          background: sc.bg,
          border: `1px solid ${sc.border}30`,
          color: sc.text,
          fontSize: 12,
          fontFamily: T.mono,
          display: "flex",
          alignItems: "center",
          gap: 8,
          animation: "fadeIn 0.2s ease",
        }}>
          {status === "loading" && (
            <span style={{ display: "inline-block", animation: "blink 1s infinite" }}>⟳</span>
          )}
          {message}
        </div>
      )}

      {/* Preview rows */}
      {preview && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10, color: T.text3, fontFamily: T.mono, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Preview — first 3 rows
          </div>
          <div style={{ overflowX: "auto", borderRadius: 7, border: `1px solid ${T.border}` }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: T.mono }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {["Unit","Component","Blood Grp","Expiry","Qty (ml)"].map(h => (
                    <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontSize: 9, color: T.text3, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${T.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: "6px 10px", color: T.text2, borderBottom: i < preview.length - 1 ? `1px solid ${T.border}` : "none" }}>{r.unit}</td>
                    <td style={{ padding: "6px 10px", color: T.text2, borderBottom: i < preview.length - 1 ? `1px solid ${T.border}` : "none" }}>{r.comp}</td>
                    <td style={{ padding: "6px 10px", color: T.crimson, fontWeight: 600, borderBottom: i < preview.length - 1 ? `1px solid ${T.border}` : "none" }}>{r.bg}</td>
                    <td style={{ padding: "6px 10px", color: T.text2, borderBottom: i < preview.length - 1 ? `1px solid ${T.border}` : "none" }}>{r.expiry}</td>
                    <td style={{ padding: "6px 10px", color: T.text2, borderBottom: i < preview.length - 1 ? `1px solid ${T.border}` : "none" }}>{r.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record count & reset */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <span style={{ fontSize: 10, color: T.text3, fontFamily: T.mono }}>
          {recordCount} records currently loaded
        </span>
        <button
          onClick={onReset}
          style={{
            background: "transparent",
            border: `1px solid ${T.border}`,
            borderRadius: 5,
            padding: "4px 10px",
            fontSize: 10,
            color: T.text3,
            cursor: "pointer",
            fontFamily: T.mono,
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = T.crimson; e.currentTarget.style.color = T.crimson; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.text3; }}
        >
          ↺ Reset to default data
        </button>
      </div>

      {/* Column format hint */}
      <details style={{ marginTop: 12 }}>
        <summary style={{ fontSize: 11, color: T.text3, cursor: "pointer", fontFamily: T.mono }}>
          Expected Excel column headers ▾
        </summary>
        <div style={{ marginTop: 8, padding: "10px 12px", background: "#F8FAFC", borderRadius: 6, fontSize: 10, fontFamily: T.mono, color: T.text3, lineHeight: 1.8 }}>
          <strong style={{ color: T.text2 }}>Required:</strong> unit, comp, expiry, qty, bg<br />
          <strong style={{ color: T.text2 }}>Optional:</strong> sno, col<br />
          <strong style={{ color: T.text2 }}>Aliases accepted:</strong><br />
          unit → unit_no, bag_no | comp → component, product<br />
          bg → blood_group, group | qty → quantity, volume, ml<br />
          expiry → expiry_date, exp | col → collection_date<br />
          <strong style={{ color: T.text2 }}>Blood group formats:</strong> "A Pos", "A+", "A positive"
        </div>
      </details>
    </div>
  );
}
