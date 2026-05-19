const DEMO_USERS = [
  { username: "admin",       password: "admin123",   role: "admin",   name: "Admin",    section: "Faculty" },
  { username: "student",     password: "student123", role: "student", name: "James Lao",   section: "DIT 2-3" },
  { username: "2024-08845",  password: "student123",    role: "student", name: "Jamaica Laigo",   section: "DIT 2-3" },
];

// ── SESSION ──────────────────────────────────────────────
function saveSession(user) {
  localStorage.setItem("pup_session", JSON.stringify(user));
}

function getSession() {
  try { return JSON.parse(localStorage.getItem("pup_session")); }
  catch { return null; }
}

function clearSession() {
  localStorage.removeItem("pup_session");
}

// ── TOGGLE PASSWORD VISIBILITY ────────────────────────────
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";
  btn.textContent = isHidden ? "-" : "👁";
}

// ── LOGIN TABS ────────────────────────────────────────────
document.querySelectorAll(".login-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".login-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".login-form-panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
  });
});

// ── HANDLE LOGIN ──────────────────────────────────────────
function handleLogin() {
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  const errEl    = document.getElementById("login-error");

  if (!username || !password) {
    showLoginError(errEl, "Please enter your username and password.");
    return;
  }

  const user = DEMO_USERS.find(
    u => u.username === username && u.password === password
  );

  if (!user) {
    showLoginError(errEl, "❌ Invalid credentials. Try: admin / admin123 or student / student123");
    return;
  }

  errEl.style.display = "none";
  saveSession(user);
  bootApp(user);
}

// ── QUICK DEMO LOGINS ─────────────────────────────────────
function loginAs(role) {
  const user = DEMO_USERS.find(u => u.role === role);
  if (user) {
    saveSession(user);
    bootApp(user);
  }
}

// ── HANDLE REGISTER (COMBINED AND FIXED) ───────────────────
function handleRegister() {
  const name     = document.getElementById("reg-name").value.trim();
  const id       = document.getElementById("reg-id").value.trim();
  const section  = document.getElementById("reg-section").value;
  const password = document.getElementById("reg-password").value;
  const errEl    = document.getElementById("reg-error");

  // 1. Check if empty
  if (!name || !id || !section || !password) {
    showLoginError(errEl, "Please fill in all fields.");
    return;
  }

  // 2. UX FIX: Check if the name contains numbers or symbols
  const nameRegex = /^[a-zA-Z\s.\-]+$/;
  if (!nameRegex.test(name)) {
    showLoginError(errEl, "⚠️ Full Name should only contain letters, spaces, hyphens, or periods.");
    return;
  }

  // 3. Password length validation
  if (password.length < 6) {
    showLoginError(errEl, "Password must be at least 6 characters.");
    return;
  }

  // 4. Duplicate ID check
  if (DEMO_USERS.find(u => u.username === id)) {
    showLoginError(errEl, "Student ID already registered.");
    return;
  }

  // 5. Success Flow: Add to array, save state, and trigger redirect
  const newUser = { username: id, password, role: "student", name, section };
  DEMO_USERS.push(newUser);
  saveSession(newUser);
  errEl.style.display = "none";
  bootApp(newUser);
}

// ── BOOT APP AFTER LOGIN ──────────────────────────────────
function bootApp(user) {
  document.getElementById("login-page").style.display = "none";
  document.getElementById("app").style.display = "flex";

  const initials = user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  document.getElementById("user-avatar").textContent = initials;
  document.getElementById("user-display-name").textContent = user.name;
  document.getElementById("user-role-badge").textContent =
    user.role === "admin" ? "🔐 Administrator" : `🎓 ${user.section}`;

  const adminLink = document.getElementById("admin-nav-link");
  if (adminLink) adminLink.style.display = user.role === "admin" ? "flex" : "none";

  const fbName = document.getElementById("fb-name");
  if (fbName) fbName.value = user.name;

  const fbSection = document.getElementById("fb-section");
  if (fbSection && user.section) {
    [...fbSection.options].forEach(o => {
      if (o.value === user.section) o.selected = true;
    });
  }

  if (typeof initApp === "function") initApp(user);
}

// ── HANDLE LOGOUT ─────────────────────────────────────────
function handleLogout() {
  if (!confirm("Are you sure you want to sign out?")) return;
  clearSession();
  document.getElementById("app").style.display = "none";
  document.getElementById("login-page").style.display = "flex";

  document.getElementById("login-username").value = "";
  document.getElementById("login-password").value = "";
  document.getElementById("login-error").style.display = "none";
}

// ── HELPER ───────────────────────────────────────────────
function showLoginError(el, msg) {
  el.textContent = msg;
  el.style.display = "block";
}

// ── AUTO-LOGIN on page load if session exists ─────────────
window.addEventListener("DOMContentLoaded", () => {
  const session = getSession();
  if (session) {
    bootApp(session);
  }
});