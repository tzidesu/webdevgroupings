let currentUser = null;
let allReports  = [];   
let historyFilter = "all";

// ── INIT APP ────────────
function initApp(user) {
  currentUser = user;

  loadReports();
  setupNavigation();
  setupForms();
  setupStarRating();
  setupHistoryFilters();
  setupAdminBroadcast();
  startClock();

  showSection("dashboard");
  updateDashboardStats();

  // Init mini map 
  setTimeout(() => {
    initMiniMap();
    initFullMap(user);
    updateAdminPinCount();
    restoreActivityFeed();
  }, 200);
}

// ── NAVIGATION ────────────────────────────────────────────
function setupNavigation() {
  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const section = link.dataset.section;
      showSection(section);
    });
  });
}

function showSection(id) {
  // Hide all sections
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));

  // Show target
  const target = document.getElementById("section-" + id);
  if (target) target.classList.add("active");

  // Update nav active state
  document.querySelectorAll(".nav-link").forEach(l => {
    l.classList.toggle("active", l.dataset.section === id);
  });

  // Update page title
  const titles = {
    dashboard: "Dashboard",
    map:       "Hazard Map",
    feedback:  "Classroom Feedback",
    readiness: "Disaster Readiness",
    history:   "Request History",
    admin:     "Admin Panel",
  };
  const titleEl = document.getElementById("page-title");
  if (titleEl) titleEl.textContent = titles[id] || id;

  // Invalidate maps when shown
  if (id === "map" || id === "dashboard") refreshMaps();

  // Refresh admin table when admin opens
  if (id === "admin") renderAdminTable();

  // Refresh history
  if (id === "history") renderHistory();
}

// ── REPORT STORAGE ────────────────────────────────────────
function loadReports() {
  try {
    allReports = JSON.parse(localStorage.getItem("pup_reports") || "[]");
  } catch { allReports = []; }
}

function saveReports() {
  localStorage.setItem("pup_reports", JSON.stringify(allReports));
}

function addReport(report) {
  report.id        = "rpt_" + Date.now();
  report.timestamp = Date.now();
  report.user      = currentUser?.name || "Anonymous";
  allReports.unshift(report);
  saveReports();
  updateDashboardStats();
  updateAdminCounters();
  addActivityItem(report);
}

// ── FORMS ─────────────────────────────────────────────────
function setupForms() {
  // Classroom Feedback
  const fbForm = document.getElementById("feedbackForm");
  if (fbForm) {
    fbForm.addEventListener("submit", e => {
      e.preventDefault();

      const name    = document.getElementById("fb-name").value.trim();
      const section = document.getElementById("fb-section").value;
      const room    = document.getElementById("fb-room").value;
      const rating  = document.getElementById("fb-rating").value;
      const issues  = [...document.querySelectorAll('input[name="issues"]:checked')].map(i => i.value);
      const suggestions = document.getElementById("fb-suggestions").value.trim();
      const anon    = document.getElementById("fb-anon").checked;

      if (!room) { showToast("Please select a room number.", "warning"); return; }
      if (rating === "0") { showToast("Please give a classroom rating.", "warning"); return; }

      const urgentWords = ["fire", "flood", "earthquake", "injury", "help", "danger", "smoke"];
      const isUrgent = urgentWords.some(w => suggestions.toLowerCase().includes(w));

      addReport({
        type:     "Classroom Feedback",
        status:   isUrgent ? "URGENT" : "pending",
        name:     anon ? "Anonymous Student" : name,
        section,
        room:     "Room " + room,
        rating,
        issues:   issues.join(", "),
        suggestions,
      });

      showToast(
        isUrgent ? "🚨 Urgent feedback sent to admin!" : `✅ Feedback for Room ${room} submitted!`,
        isUrgent ? "danger" : "success"
      );
      fbForm.reset();
      resetStars();
      showSection("history");
    });
  }

  // Disaster Readiness
  const rdForm = document.getElementById("readinessForm");
  if (rdForm) {
    rdForm.addEventListener("submit", e => {
      e.preventDefault();

      const address   = document.getElementById("rd-address").value.trim();
      const contact   = document.getElementById("rd-contact").value.trim();
      const evacpath  = document.querySelector('input[name="evacpath"]:checked')?.value;
      const necessities = [...document.querySelectorAll('input[name="necessity"]:checked')].map(i => i.value);
      const urgency   = document.querySelector('input[name="urgency"]:checked')?.value || "low";
      const experience = document.getElementById("rd-experience").value.trim();

      if (!address || !contact) {
        showToast("Please fill in address and emergency contact.", "warning");
        return;
      }

      const isUrgent = urgency === "high";
      const urgentWords = ["fire", "flood", "earthquake", "injury", "help", "danger"];
      const textUrgent = urgentWords.some(w => experience.toLowerCase().includes(w));

      addReport({
        type:        "Disaster Readiness",
        status:      (isUrgent || textUrgent) ? "URGENT" : "pending",
        address,
        contact,
        evacpath:    evacpath || "not answered",
        necessities: necessities.join(", ") || "None",
        urgency,
        experience,
      });

      showToast(
        (isUrgent || textUrgent) ? "🚨 Urgent report submitted!" : "✅ Readiness report submitted!",
        (isUrgent || textUrgent) ? "danger" : "success"
      );
      rdForm.reset();
      showSection("history");
    });
  }
}

// ── STAR RATING ───────────────────────────────────────────
function setupStarRating() {
  const stars = document.querySelectorAll(".star");
  const ratingInput = document.getElementById("fb-rating");

  stars.forEach(star => {
    star.addEventListener("mouseover", () => highlightStars(star.dataset.val));
    star.addEventListener("mouseleave", () => {
      const val = ratingInput?.value || "0";
      highlightStars(val);
    });
    star.addEventListener("click", () => {
      if (ratingInput) ratingInput.value = star.dataset.val;
      highlightStars(star.dataset.val);
      stars.forEach(s => s.classList.remove("active"));
      [...stars].filter(s => +s.dataset.val <= +star.dataset.val)
                .forEach(s => s.classList.add("active"));
    });
  });
}

function highlightStars(val) {
  document.querySelectorAll(".star").forEach(s => {
    s.style.color = +s.dataset.val <= +val ? "#f59e0b" : "#d1d5db";
  });
}

function resetStars() {
  document.querySelectorAll(".star").forEach(s => {
    s.style.color = "#d1d5db";
    s.classList.remove("active");
  });
  const ri = document.getElementById("fb-rating");
  if (ri) ri.value = "0";
}

// ── HISTORY ───────────────────────────────────────────────
function setupHistoryFilters() {
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      historyFilter = btn.dataset.filter;
      renderHistory();
    });
  });
}

function renderHistory() {
  const container = document.getElementById("history-list");
  if (!container) return;

  loadReports();
  const filtered = historyFilter === "all"
    ? allReports
    : allReports.filter(r => r.type === historyFilter);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <p>No submissions yet. Submit a report to see it here.</p>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(r => {
    const date = new Date(r.timestamp).toLocaleString("en-PH", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
    const details = r.type === "Classroom Feedback"
      ? `${r.room || ""} · Rating: ${"★".repeat(+r.rating || 0)} · ${r.name || "Student"}`
      : `${r.address || ""} · Contact: ${r.contact || "N/A"}`;

    return `
      <div class="history-item ${r.status}">
        <div>
          <div class="history-type">${r.type}</div>
          <div class="history-meta">${details}</div>
          <div class="history-meta" style="margin-top:2px">🕐 ${date}</div>
        </div>
        <span class="status-pill ${r.status}">${r.status?.toUpperCase()}</span>
      </div>`;
  }).join("");
}

function clearHistory() {
  if (!confirm("Clear all your submission history?")) return;
  allReports = [];
  saveReports();
  renderHistory();
  updateDashboardStats();
  updateAdminCounters();
  showToast("History cleared.", "warning");
}

// ── ADMIN PANEL ───────────────────────────────────────────
function renderAdminTable() {
  const tbody  = document.getElementById("admin-tbody");
  if (!tbody) return;

  loadReports();
  const filter = document.getElementById("admin-filter")?.value || "all";
  const rows   = filter === "all" ? allReports : allReports.filter(r => r.status === filter);

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:32px">No reports found.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const date = new Date(r.timestamp).toLocaleString("en-PH", {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    });

    const details = r.type === "Classroom Feedback"
      ? `<strong>${r.room || "N/A"}</strong><br><small>${r.name || "Anonymous"} · ${r.section || ""}</small>`
      : `<strong>${r.address || "N/A"}</strong><br><small>📞 ${r.contact || "N/A"}</small>`;

    const action = r.status !== "resolved"
      ? `<button class="resolve-btn" onclick="resolveReport('${r.id}')">✓ Resolve</button>`
      : `<span style="color:#10b981;font-weight:600">✓ Fixed</span>`;

    return `
      <tr>
        <td style="white-space:nowrap">${date}</td>
        <td>${r.type}</td>
        <td>${details}</td>
        <td><span class="status-pill ${r.status}">${r.status?.toUpperCase()}</span></td>
        <td>${action}</td>
      </tr>`;
  }).join("");
}

function resolveReport(id) {
  loadReports();
  const idx = allReports.findIndex(r => r.id === id);
  if (idx > -1) {
    allReports[idx].status = "resolved";
    saveReports();
    renderAdminTable();
    updateAdminCounters();
    updateDashboardStats();
    showToast("✅ Report marked as resolved.", "success");
  }
}

function updateAdminCounters() {
  loadReports();
  const pending  = allReports.filter(r => r.status === "pending").length;
  const urgent   = allReports.filter(r => r.status === "URGENT").length;
  const resolved = allReports.filter(r => r.status === "resolved").length;

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl("admin-pending",  pending);
  setEl("admin-urgent",   urgent);
  setEl("admin-resolved", resolved);
}

function setupAdminBroadcast() {
  // Broadcast alert button
  document.querySelector(".btn-danger[onclick='broadcastAlert()']")?.addEventListener
    ? null : null;
}

function broadcastAlert() {
  const msg = prompt("Enter your emergency broadcast message:");
  if (!msg) return;
  showToast(`📢 BROADCAST: ${msg}`, "danger");
  // In production: push to Firestore → all clients show alert
  alert(`📢 Emergency Alert Broadcast:\n\n"${msg}"\n\n(In production, this would notify all connected users in real-time.)`);
}

// ── DASHBOARD STATS ───────────────────────────────────────
function updateDashboardStats() {
  loadReports();
  const pending = allReports.filter(r => r.status !== "resolved").length;
  const el = document.getElementById("dash-pending");
  if (el) el.textContent = pending;
  updateAdminCounters();
}

function addActivityItem(report) {
  const feed = document.getElementById("recent-activity");
  if (!feed) return;

  // Remove empty state
  const empty = feed.querySelector(".activity-empty");
  if (empty) empty.remove();

  const color = report.status === "URGENT" ? "#ef4444" : "#f59e0b";
  const icon  = report.type === "Classroom Feedback" ? "📝" : "🚨";

  const item = document.createElement("div");
  item.className = "activity-item";
  item.style.borderLeftColor = color;
  item.innerHTML = `
    <div>
      <span>${icon} <strong>${report.type}</strong></span><br>
      <span style="color:#6b7280;font-size:0.76rem">${report.room || report.address || "N/A"}</span>
    </div>
    <span class="status-pill ${report.status}" style="font-size:0.7rem">${report.status?.toUpperCase()}</span>
  `;
  feed.prepend(item);
}

// ── CLOCK ─────────────────────────────────────────────────
function startClock() {
  const el = document.getElementById("topbar-time");
  if (!el) return;

  function tick() {
    const now = new Date();
    el.textContent = now.toLocaleTimeString("en-PH", {
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
  }
  tick();
  setInterval(tick, 1000);
}

// ── TOAST NOTIFICATIONS ───────────────────────────────────
function showToast(msg, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const icons = { success: "✅", danger: "🚨", warning: "⚠️", info: "ℹ️" };

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span style="font-size:1.1rem">${icons[type] || "ℹ️"}</span>
    <span>${msg}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "toastOut 0.3s ease forwards";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ── GLOBAL quickSwitch (for backwards compat) ─────────────
window.quickSwitch = showSection;

// ── RESTORE ACTIVITY FEED ON INIT ────────────────────────
function restoreActivityFeed() {
  loadReports();
  const recentFive = allReports.slice(0, 5);
  if (recentFive.length > 0) {
    const feed = document.getElementById("recent-activity");
    if (feed) feed.innerHTML = "";
    recentFive.reverse().forEach(r => addActivityItem(r));
  }
}

// POPULATE ACTIVITY : SAVED REPORTS ON BOOTINGPopulate activity feed from saved reports on boot
function restoreAndInit() {
  restoreActivityFeed();
}