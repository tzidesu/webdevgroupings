// ── HELPERS ───────────────────────────────────────────────
function getReports() {
  try { return JSON.parse(localStorage.getItem("pup_reports") || "[]"); }
  catch { return []; }
}

function getPins() {
  try { return JSON.parse(localStorage.getItem("pup_pins") || "[]"); }
  catch { return []; }
}

function fmtDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

function fmtDateShort(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric"
  });
}

// ── FILTER REPORTS ────────────────────────────────────────
function getFilteredReports() {
  let reports = getReports();

  const rptType   = document.querySelector('input[name="rpt-type"]:checked')?.value   || "all";
  const rptStatus = document.querySelector('input[name="rpt-status"]:checked')?.value || "all";
  const dateFrom  = document.getElementById("rpt-date-from")?.value;
  const dateTo    = document.getElementById("rpt-date-to")?.value;

  if (rptType !== "all")   reports = reports.filter(r => r.type === rptType);
  if (rptStatus !== "all") reports = reports.filter(r => r.status === rptStatus);
  if (dateFrom) {
    const from = new Date(dateFrom).setHours(0, 0, 0, 0);
    reports = reports.filter(r => r.timestamp >= from);
  }
  if (dateTo) {
    const to = new Date(dateTo).setHours(23, 59, 59, 999);
    reports = reports.filter(r => r.timestamp <= to);
  }

  return reports;
}

// ── BUILD REPORT HTML ─────────────────────────────────────
function buildReportHTML(reports) {
  const incSummary = document.getElementById("inc-summary")?.checked !== false;
  const incTable   = document.getElementById("inc-table")?.checked   !== false;
  const incPins    = document.getElementById("inc-pins")?.checked    !== false;
  const incChart   = document.getElementById("inc-chart")?.checked   !== false;

  const session = (() => {
    try { return JSON.parse(localStorage.getItem("pup_session") || "{}"); } catch { return {}; }
  })();

  const pins     = getPins();
  const now      = new Date();
  const nowStr   = now.toLocaleString("en-PH", { dateStyle: "full", timeStyle: "short" });

  const total    = reports.length;
  const urgent   = reports.filter(r => r.status === "URGENT").length;
  const pending  = reports.filter(r => r.status === "pending").length;
  const resolved = reports.filter(r => r.status === "resolved").length;
  const feedback = reports.filter(r => r.type === "Classroom Feedback").length;
  const readiness= reports.filter(r => r.type === "Disaster Readiness").length;

  // ── HEADER ──────────────────────────────────────────────
  const header = `
    <div class="pr-header">
      <div class="pr-logo-circle">PUP</div>
      <div>
        <div class="pr-title">PUP School Safety System</div>
        <div class="pr-subtitle">Polytechnic University of the Philippines · Safety & Disaster Readiness Report</div>
      </div>
      <div class="pr-meta">
        Generated: ${nowStr}<br>
        Prepared by: ${session.name || "System"}<br>
        Role: ${session.role === "admin" ? "Administrator" : "Student"}
      </div>
    </div>`;

  // ── SUMMARY STATS ────────────────────────────────────────
  const summary = incSummary ? `
    <div class="pr-section-title">📊 Summary Statistics</div>
    <div class="pr-summary">
      <div class="pr-stat">
        <div class="pr-stat-val" style="color:#1a1a2e">${total}</div>
        <div class="pr-stat-lbl">Total Reports</div>
      </div>
      <div class="pr-stat">
        <div class="pr-stat-val" style="color:#ef4444">${urgent}</div>
        <div class="pr-stat-lbl">Urgent</div>
      </div>
      <div class="pr-stat">
        <div class="pr-stat-val" style="color:#f59e0b">${pending}</div>
        <div class="pr-stat-lbl">Pending</div>
      </div>
      <div class="pr-stat">
        <div class="pr-stat-val" style="color:#10b981">${resolved}</div>
        <div class="pr-stat-lbl">Resolved</div>
      </div>
    </div>
    <div class="pr-summary" style="grid-template-columns:1fr 1fr 1fr; max-width:520px">
      <div class="pr-stat">
        <div class="pr-stat-val" style="color:#8B1A1A">${feedback}</div>
        <div class="pr-stat-lbl">Feedback Reports</div>
      </div>
      <div class="pr-stat">
        <div class="pr-stat-val" style="color:#1d4ed8">${readiness}</div>
        <div class="pr-stat-lbl">Readiness Surveys</div>
      </div>
      <div class="pr-stat">
        <div class="pr-stat-val" style="color:#7c3aed">${pins.length}</div>
        <div class="pr-stat-lbl">Map Pins</div>
      </div>
    </div>` : "";

  // ── STATUS BAR CHART ─────────────────────────────────────
  const maxVal = Math.max(urgent, pending, resolved, 1);
  const barH   = (val) => Math.max(8, Math.round((val / maxVal) * 110));

  const chart = (incChart && total > 0) ? `
    <div class="pr-section-title">📈 Status Distribution</div>
    <div class="pr-chart">
      <div class="pr-bar-wrap">
        <div class="pr-bar-val" style="color:#ef4444">${urgent}</div>
        <div class="pr-bar" style="height:${barH(urgent)}px;background:#ef4444"></div>
        <div class="pr-bar-label">Urgent</div>
      </div>
      <div class="pr-bar-wrap">
        <div class="pr-bar-val" style="color:#f59e0b">${pending}</div>
        <div class="pr-bar" style="height:${barH(pending)}px;background:#f59e0b"></div>
        <div class="pr-bar-label">Pending</div>
      </div>
      <div class="pr-bar-wrap">
        <div class="pr-bar-val" style="color:#10b981">${resolved}</div>
        <div class="pr-bar" style="height:${barH(resolved)}px;background:#10b981"></div>
        <div class="pr-bar-label">Resolved</div>
      </div>
      <div class="pr-bar-wrap">
        <div class="pr-bar-val" style="color:#8B1A1A">${feedback}</div>
        <div class="pr-bar" style="height:${barH(feedback)}px;background:#8B1A1A"></div>
        <div class="pr-bar-label">Feedback</div>
      </div>
      <div class="pr-bar-wrap">
        <div class="pr-bar-val" style="color:#1d4ed8">${readiness}</div>
        <div class="pr-bar" style="height:${barH(readiness)}px;background:#1d4ed8"></div>
        <div class="pr-bar-label">Readiness</div>
      </div>
    </div>` : "";

  // ── REPORT TABLE ─────────────────────────────────────────
  let tableRows = "";
  if (reports.length === 0) {
    tableRows = `<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:20px">No reports match the selected filters.</td></tr>`;
  } else {
    tableRows = reports.map((r, i) => {
      const details = r.type === "Classroom Feedback"
        ? `<strong>${r.room || "N/A"}</strong><br>${r.name || "Anonymous"} · ${r.section || ""}${r.rating ? `<br>Rating: ${"★".repeat(+r.rating)}` : ""}${r.issues ? `<br><em>Issues: ${r.issues}</em>` : ""}`
        : `<strong>${r.address || "N/A"}</strong><br>📞 ${r.contact || "N/A"}<br>Evac route: ${r.evacpath || "N/A"}${r.necessities ? `<br><em>Missing: ${r.necessities}</em>` : ""}`;

      const urgencyColor = r.status === "URGENT" ? "#ef4444" : r.status === "pending" ? "#f59e0b" : "#10b981";

      return `
        <tr style="${r.status === "URGENT" ? "background:#fff5f5;" : ""}">
          <td style="color:#6b7280;font-size:0.75rem">${i + 1}</td>
          <td style="white-space:nowrap;font-size:0.78rem">${fmtDateShort(r.timestamp)}</td>
          <td><span style="font-size:0.8rem;font-weight:600;color:#8B1A1A">${r.type}</span></td>
          <td style="font-size:0.8rem">${details}</td>
          <td style="font-size:0.78rem;color:#555;max-width:180px">${(r.suggestions || r.experience || "—").slice(0, 120)}${(r.suggestions || r.experience || "").length > 120 ? "…" : ""}</td>
          <td><span class="pr-badge ${r.status}" style="background:${r.status === 'URGENT' ? '#7f1d1d' : r.status === 'pending' ? '#fffbeb' : '#f0fdf4'};color:${r.status === 'URGENT' ? 'white' : urgencyColor};border:1px solid ${urgencyColor}40">${r.status?.toUpperCase()}</span></td>
        </tr>`;
    }).join("");
  }

  const table = incTable ? `
    <div class="pr-section-title">📋 Detailed Report Log</div>
    <table class="pr-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Date</th>
          <th>Type</th>
          <th>Details</th>
          <th>Notes / Description</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>` : "";

  // ── MAP PINS TABLE ────────────────────────────────────────
  const pinTypeLabels = { hazard: "🔴 Hazard", resource: "🟢 Resource", evacuation: "🟡 Evacuation" };

  const pinsTable = (incPins && pins.length > 0) ? `
    <div class="pr-section-title">📍 Map Pin Records</div>
    <table class="pr-pins-table">
      <thead>
        <tr style="background:#1e3a5f;color:white">
          <th>#</th>
          <th>Type</th>
          <th>Description</th>
          <th>Reported By</th>
          <th>Coordinates</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${pins.map((p, i) => `
          <tr style="${i % 2 === 0 ? "" : "background:#f9fafb"}">
            <td>${i + 1}</td>
            <td>${pinTypeLabels[p.type] || p.type}</td>
            <td>${p.label || "—"}</td>
            <td>${p.user || "Anonymous"}</td>
            <td style="font-size:0.72rem;color:#6b7280">${p.lat?.toFixed(5)}, ${p.lng?.toFixed(5)}</td>
            <td style="font-size:0.75rem">${fmtDateShort(p.timestamp)}</td>
          </tr>`).join("")}
      </tbody>
    </table>` : (incPins ? `<div class="pr-section-title">📍 Map Pin Records</div><p style="color:#9ca3af;font-size:0.84rem">No map pins recorded.</p>` : "");

  // ── FOOTER ────────────────────────────────────────────────
  const footer = `
    <div class="pr-footer">
      <div>
        <strong>PUP School Safety System</strong><br>
        Polytechnic University of the Philippines · sta.mesa, Manila<br>
        This report is system-generated and is for internal use only.
      </div>
      <div class="pr-signature">
        <div class="pr-sig-line"></div>
        <div>${session.name || "Authorized Personnel"}</div>
        <div style="color:#9ca3af">${session.role === "admin" ? "System Administrator" : "Student Reporter"}</div>
        <div style="color:#9ca3af;margin-top:4px">Date: ${now.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</div>
      </div>
    </div>`;

  return `
    <div id="printable-report">
      ${header}
      ${summary}
      ${chart}
      ${table}
      ${pinsTable}
      ${footer}
    </div>`;
}

// ── PREVIEW IN-PAGE ───────────────────────────────────────
function previewReport() {
  const reports = getFilteredReports();
  const html    = buildReportHTML(reports);

  const card = document.getElementById("report-preview-card");
  const body = document.getElementById("report-preview-body");
  if (!card || !body) return;

  body.innerHTML = html;
  card.style.display = "block";
  card.scrollIntoView({ behavior: "smooth", block: "start" });

  if (typeof showToast === "function")
    showToast(`Preview ready — ${reports.length} report(s) shown.`, "success");
}

// ── PRINT VIA OVERLAY WINDOW ──────────────────────────────
function printReport() {
  const reports = getFilteredReports();
  const html    = buildReportHTML(reports);

  // Build a self-contained print window
  const printWindow = window.open("", "_blank", "width=960,height=800");
  if (!printWindow) {
    alert("Pop-up blocked. Please allow pop-ups for this site to print.");
    return;
  }

  printWindow.document.write(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PUP Safety System — Report</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'DM Sans', Arial, sans-serif;
      color: #1a1a2e; background: #f6f5f7;
      padding: 0; margin: 0;
    }
    .print-shell {
      max-width: 900px; margin: 0 auto;
      background: white; padding: 48px 52px;
      min-height: 100vh;
    }
    .no-print-bar {
      position: fixed; top: 0; left: 0; right: 0;
      background: #8B1A1A; color: white;
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 24px; z-index: 999;
      font-family: 'DM Sans', sans-serif; font-size: 0.88rem;
    }
    .no-print-bar button {
      padding: 8px 20px; border-radius: 6px; border: none;
      cursor: pointer; font-family: 'DM Sans', sans-serif; font-weight: 600;
      font-size: 0.85rem;
    }
    .btn-print-now { background: white; color: #8B1A1A; }
    .btn-close-win { background: rgba(255,255,255,0.2); color: white; margin-left: 10px; }
    .print-content { margin-top: 52px; }

    /* ── Report styles ── */
    #printable-report { font-family: 'DM Sans', Arial, sans-serif; color: #1a1a2e; }
    .pr-header { display:flex; align-items:center; gap:18px; padding-bottom:18px; border-bottom:3px solid #8B1A1A; margin-bottom:24px; }
    .pr-logo-circle { width:64px;height:64px;border-radius:50%;background:#8B1A1A;color:white;display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:700;flex-shrink:0; }
    .pr-title { font-family:'Playfair Display',serif;font-size:1.5rem;font-weight:900;color:#8B1A1A; }
    .pr-subtitle { font-size:0.82rem;color:#6b7280;margin-top:2px; }
    .pr-meta { margin-left:auto;text-align:right;font-size:0.78rem;color:#9ca3af;line-height:1.7; }
    .pr-summary { display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px; }
    .pr-stat { border:1.5px solid #e5e7eb;border-radius:10px;padding:14px 16px;text-align:center; }
    .pr-stat-val { font-size:2rem;font-weight:700;line-height:1; }
    .pr-stat-lbl { font-size:0.72rem;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:0.05em; }
    .pr-section-title { font-family:'Playfair Display',serif;font-size:1.05rem;font-weight:700;color:#8B1A1A;margin:24px 0 12px;padding-bottom:6px;border-bottom:1.5px solid #fce8e8; }
    .pr-table { width:100%;border-collapse:collapse;font-size:0.82rem; }
    .pr-table th { background:#8B1A1A;color:white;padding:10px 12px;text-align:left;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.05em; }
    .pr-table td { padding:9px 12px;border-bottom:1px solid #f3f4f6;vertical-align:top; }
    .pr-table tr:nth-child(even) td { background:#fdf8f8; }
    .pr-badge { display:inline-block;padding:2px 8px;border-radius:99px;font-size:0.68rem;font-weight:700;text-transform:uppercase; }
    .pr-chart { display:flex;align-items:flex-end;gap:16px;height:140px;padding:16px;background:#f9fafb;border-radius:10px;border:1px solid #e5e7eb; }
    .pr-bar-wrap { display:flex;flex-direction:column;align-items:center;gap:6px;flex:1; }
    .pr-bar { width:100%;border-radius:6px 6px 0 0;min-height:6px; }
    .pr-bar-label { font-size:0.72rem;color:#6b7280;text-align:center; }
    .pr-bar-val { font-size:0.78rem;font-weight:700; }
    .pr-pins-table { width:100%;border-collapse:collapse;font-size:0.82rem; }
    .pr-pins-table th { background:#1e3a5f;color:white;padding:9px 12px;text-align:left;font-size:0.72rem;text-transform:uppercase; }
    .pr-pins-table td { padding:8px 12px;border-bottom:1px solid #f3f4f6; }
    .pr-footer { margin-top:32px;padding-top:14px;border-top:1.5px solid #e5e7eb;display:flex;justify-content:space-between;align-items:flex-end;font-size:0.75rem;color:#9ca3af; }
    .pr-sig-line { width:180px;border-top:1px solid #374151;margin-bottom:4px;margin-left:auto; }
    .pr-signature { text-align:right; }

    @media print {
      .no-print-bar { display: none !important; }
      .print-content { margin-top: 0 !important; }
      body { background: white !important; }
      @page { size: A4; margin: 16mm 14mm; }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <span>🖨️ PUP Safety Report — Ready to Print</span>
    <div>
      <button class="btn-print-now" onclick="window.print()">🖨️ Print / Save as PDF</button>
      <button class="btn-close-win" onclick="window.close()">✕ Close</button>
    </div>
  </div>
  <div class="print-content">
    <div class="print-shell">
      ${html}
    </div>
  </div>
</body>
</html>`);

  printWindow.document.close();

  if (typeof showToast === "function")
    showToast(`📄 Report opened — ${reports.length} record(s) included.`, "success");
}