const PUP_CENTER = [14.5995, 120.9842];
const PUP_ZOOM   = 17;

let fullMap  = null;
let miniMap  = null;
let pinningEnabled = false;
let allPins  = [];   // { id, type, lat, lng, label, timestamp, user }
let pinLayers = {};  // id → leaflet marker

// ── PIN COLORS / ICONS ────────────────────────────────────
const PIN_CONFIG = {
  hazard:     { color: "#ef4444", emoji: "🔴", label: "Hazard" },
  resource:   { color: "#10b981", emoji: "🟢", label: "Resource" },
  evacuation: { color: "#f59e0b", emoji: "🟡", label: "Evacuation" },
  user:       { color: "#2563eb", emoji: "🔵", label: "Your Location" },
};

function makeIcon(type) {
  const cfg = PIN_CONFIG[type] || PIN_CONFIG.hazard;
  return L.divIcon({
    className: "",
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${cfg.color};border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
      font-size:12px;cursor:pointer;
    ">${cfg.emoji}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

// ── LOAD PINS FROM localStorage ───────────────────────────
function loadPins() {
  try {
    allPins = JSON.parse(localStorage.getItem("pup_pins") || "[]");
  } catch { allPins = []; }
}

function savePins() {
  localStorage.setItem("pup_pins", JSON.stringify(allPins));
}

// ── ADD A PIN TO THE MAP ──────────────────────────────────
function addPinToMap(map, pin) {
  if (!map) return;
  const cfg = PIN_CONFIG[pin.type] || PIN_CONFIG.hazard;
  const marker = L.marker([pin.lat, pin.lng], { icon: makeIcon(pin.type) })
    .addTo(map)
    .bindPopup(`
      <div style="font-family:'DM Sans',sans-serif;min-width:160px">
        <strong style="color:#8B1A1A">${cfg.label}</strong><br>
        <span style="font-size:0.82rem;color:#555">${pin.label || "No description"}</span><br>
        <span style="font-size:0.75rem;color:#999">${pin.user || "Anonymous"} · ${new Date(pin.timestamp).toLocaleDateString()}</span>
        ${pin.mine ? `<br><button onclick="removePin('${pin.id}')" style="margin-top:6px;padding:4px 10px;background:#8B1A1A;color:white;border:none;border-radius:5px;font-size:0.75rem;cursor:pointer;">Remove</button>` : ""}
      </div>
    `);
  pinLayers[pin.id] = marker;
}

// ── INIT FULL MAP ─────────────────────────────────────────
function initFullMap(currentUser) {
  if (fullMap) return; // already initialized

  fullMap = L.map("full-map", { zoomControl: true }).setView(PUP_CENTER, PUP_ZOOM);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(fullMap);

  // User location marker
  L.marker(PUP_CENTER, { icon: makeIcon("user") })
    .addTo(fullMap)
    .bindPopup(`<strong>PUP Main Campus</strong><br>Your base location`);

  // Load saved pins
  loadPins();
  allPins.forEach(pin => addPinToMap(fullMap, { ...pin, mine: pin.user === currentUser?.name }));
  renderPinsList(currentUser);

  // Click to add pin
  fullMap.on("click", (e) => {
    if (!pinningEnabled) return;

    const type  = document.getElementById("map-pin-type")?.value || "hazard";
    const label = prompt(`Describe this ${PIN_CONFIG[type]?.label || "pin"}:`);
    if (label === null) return; // cancelled

    const pin = {
      id:        "pin_" + Date.now(),
      type,
      lat:       e.latlng.lat,
      lng:       e.latlng.lng,
      label:     label || PIN_CONFIG[type]?.label,
      user:      currentUser?.name || "Anonymous",
      timestamp: Date.now(),
      mine:      true,
    };

    allPins.push(pin);
    savePins();
    addPinToMap(fullMap, pin);
    renderPinsList(currentUser);
    showToast(`📍 ${PIN_CONFIG[type]?.label} pinned!`, "success");

    // Update admin pin count
    updateAdminPinCount();
  });
}

// ── INIT MINI MAP (Dashboard) ─────────────────────────────
function initMiniMap() {
  if (miniMap) return;

  miniMap = L.map("mini-map", { zoomControl: false, dragging: false, scrollWheelZoom: false })
    .setView(PUP_CENTER, PUP_ZOOM);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "", maxZoom: 19,
  }).addTo(miniMap);

  // Show existing pins on mini map
  loadPins();
  allPins.forEach(pin => {
    L.marker([pin.lat, pin.lng], { icon: makeIcon(pin.type) })
      .addTo(miniMap)
      .bindPopup(pin.label || "Pin");
  });

  // User location
  L.marker(PUP_CENTER, { icon: makeIcon("user") }).addTo(miniMap);
}

// ── TOGGLE PINNING MODE ───────────────────────────────────
function toggleMapPin() {
  pinningEnabled = !pinningEnabled;
  const btn = document.getElementById("map-toggle-btn");
  if (btn) {
    btn.textContent = pinningEnabled ? "✋ Stop Pinning" : "📍 Click to Pin";
    btn.style.background = pinningEnabled ? "#10b981" : "";
  }
  if (fullMap) {
    fullMap.getContainer().style.cursor = pinningEnabled ? "crosshair" : "";
  }
  showToast(pinningEnabled ? "Click the map to drop a pin." : "Pinning disabled.", "info");
}

// ── REMOVE A PIN ──────────────────────────────────────────
function removePin(id) {
  allPins = allPins.filter(p => p.id !== id);
  savePins();

  if (pinLayers[id]) {
    if (fullMap) fullMap.removeLayer(pinLayers[id]);
    delete pinLayers[id];
  }

  const currentUser = getSession ? getSession() : null;
  renderPinsList(currentUser);
  updateAdminPinCount();
  showToast("Pin removed.", "warning");
}

// ── CLEAR MY PINS ─────────────────────────────────────────
function clearMyPins() {
  const session = getSession ? getSession() : null;
  const myPins  = allPins.filter(p => p.user === session?.name);

  if (myPins.length === 0) { showToast("No pins to clear.", "info"); return; }
  if (!confirm(`Remove your ${myPins.length} pin(s)?`)) return;

  myPins.forEach(p => {
    if (pinLayers[p.id]) {
      if (fullMap) fullMap.removeLayer(pinLayers[p.id]);
      delete pinLayers[p.id];
    }
  });

  allPins = allPins.filter(p => p.user !== session?.name);
  savePins();
  renderPinsList(session);
  updateAdminPinCount();
  showToast("Your pins cleared.", "success");
}

// ── RENDER PINS LIST BELOW FULL MAP ──────────────────────
function renderPinsList(currentUser) {
  const el = document.getElementById("pins-list");
  if (!el) return;

  if (allPins.length === 0) {
    el.innerHTML = `<p style="color:#9ca3af;font-size:0.84rem;margin-top:8px;">No pins on the map yet. Enable pinning and click the map to add one.</p>`;
    return;
  }

  el.innerHTML = allPins.map(pin => {
    const cfg  = PIN_CONFIG[pin.type] || PIN_CONFIG.hazard;
    const mine = pin.user === currentUser?.name;
    return `
      <div class="pin-item">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:1.3rem">${cfg.emoji}</span>
          <div>
            <div style="font-weight:600;font-size:0.88rem">${pin.label || cfg.label}</div>
            <div style="font-size:0.75rem;color:#6b7280">${pin.user} · ${new Date(pin.timestamp).toLocaleDateString()}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="status-pill ${pin.type === 'hazard' ? 'URGENT' : 'resolved'}" style="font-size:0.7rem">${cfg.label}</span>
          ${mine ? `<button class="resolve-btn" onclick="removePin('${pin.id}')">Remove</button>` : ""}
          <button class="btn-sm" onclick="flyToPin(${pin.lat}, ${pin.lng})">📍 View</button>
        </div>
      </div>
    `;
  }).join("");
}

// ── FLY TO PIN ────────────────────────────────────────────
function flyToPin(lat, lng) {
  if (fullMap) {
    fullMap.flyTo([lat, lng], 19, { duration: 1.2 });
    const pin = allPins.find(p => p.lat === lat && p.lng === lng);
    if (pin && pinLayers[pin.id]) pinLayers[pin.id].openPopup();
  }
  showSection("map");
}

// ── UPDATE ADMIN PIN COUNT ────────────────────────────────
function updateAdminPinCount() {
  const el = document.getElementById("admin-pins");
  if (el) el.textContent = allPins.length;
}

// ── INVALIDATE MAP SIZE (called when tab shown) ───────────
function refreshMaps() {
  setTimeout(() => {
    if (fullMap) fullMap.invalidateSize();
    if (miniMap) miniMap.invalidateSize();
  }, 100);
}