/* =========================
   Aid Distribution (Session)
   - Uses backend storage (sessions + entries)
   - Snapshot shows: family size + ages + ALL aid history (ALL orgs)
   - Campaign eligibility enforced by campaign_targets/notifications on backend
========================= */

const API_BASE = "";
const STORAGE_KEY = "slumlink_distribution_session_draft";
const ENTRIES_KEY_PREFIX = "slumlink_distribution_entries_";

// DOM
const sessionMeta = document.getElementById("sessionMeta");
const aidTypePill = document.getElementById("aidTypePill");

const familyCodeEl = document.getElementById("familyCode");
const qtyWrap = document.getElementById("qtyFieldWrap");
const qtyEl = document.getElementById("quantity");
const qtyHintEl = document.getElementById("qtyHint");

const toggleSnapshotBtn = document.getElementById("toggleSnapshotBtn");
const snapshotPanel = document.getElementById("snapshotPanel");
const familySummaryEl = document.getElementById("familySummary");
const orgHistoryEl = document.getElementById("orgHistory");

const commentEl = document.getElementById("comment");
const clearBtn = document.getElementById("clearBtn");
const confirmBtn = document.getElementById("confirmBtn");
const finishBtn = document.getElementById("finishBtn");

const statusBox = document.getElementById("statusBox");
const entriesBody = document.getElementById("entriesBody");
const entryCount = document.getElementById("entryCount");

// Finish modal
const finishModal = document.getElementById("finishModal");
const cancelFinish = document.getElementById("cancelFinish");
const confirmFinish = document.getElementById("confirmFinish");

document.getElementById("brandBtn")?.addEventListener("click", () => (window.location.href = "/"));

function openFinishModal() {
  finishModal?.classList.add("show");
  finishModal?.setAttribute("aria-hidden", "false");
  cancelFinish?.focus();
}
function closeFinishModal() {
  finishModal?.classList.remove("show");
  finishModal?.setAttribute("aria-hidden", "true");
}

function setStatus(msg, kind = "") {
  statusBox.className = "status" + (kind ? ` ${kind}` : "");
  statusBox.textContent = msg || "";
}

function readDraft() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function entriesKey(sessionId) {
  return `${ENTRIES_KEY_PREFIX}${sessionId}`;
}
function readEntries(sessionId) {
  const raw = localStorage.getItem(entriesKey(sessionId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) || [];
  } catch {
    return [];
  }
}
function writeEntries(sessionId, entries) {
  localStorage.setItem(entriesKey(sessionId), JSON.stringify(entries));
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (s) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[s]));
}

function requiresQuantity(aidType) {
  return !!(aidType?.requires_quantity ?? aidType?.requiresQuantity);
}
function normalizeUnit(aidType) {
  return aidType?.unit_label ?? aidType?.unitLabel ?? "";
}

function renderEntries(entries) {
  entryCount.textContent = `${entries.length} recorded`;
  entriesBody.innerHTML = "";

  if (!entries.length) {
    const div = document.createElement("div");
    div.className = "empty muted";
    div.textContent = "No entries yet.";
    entriesBody.appendChild(div);
    return;
  }

  for (const e of entries.slice().reverse()) {
    const row = document.createElement("div");
    row.className = "table-row";
    row.innerHTML = `
      <div>${new Date(e.createdAt).toLocaleString()}</div>
      <div><b>${escapeHtml(e.familyCode)}</b>${e.roundNo ? ` <span class="muted">#${escapeHtml(e.roundNo)}</span>` : ""}</div>
      <div>${e.quantity ?? "—"}</div>
      <div>${escapeHtml(e.comment || "—")}</div>
    `;
    entriesBody.appendChild(row);
  }
}

function resetSnapshotUI() {
  toggleSnapshotBtn.disabled = true;
  snapshotPanel.classList.add("hidden");
  familySummaryEl.innerHTML = `<span class="muted">No data yet.</span>`;
  orgHistoryEl.innerHTML = `<span class="muted">No data yet.</span>`;
}

function clearFamilySection() {
  familyCodeEl.value = "";
  qtyEl.value = "";
  commentEl.value = "";
  resetSnapshotUI();
  familyCodeEl.focus();
}

async function safeJson(res) {
  return await res.json().catch(() => null);
}

/* Snapshot API */
async function fetchSnapshotAll(code) {
  const url = `${API_BASE}/api/distribution/families/${encodeURIComponent(code)}/snapshot`;
  const res = await fetch(url);
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.message || "Snapshot failed");
  return data?.data;
}

function renderSnapshot(data) {
  const size = data?.family?.size ?? "—";
  const ages = Array.isArray(data?.family?.ages) ? data.family.ages : [];
  const agesText = ages.length ? ages.join(", ") : "—";

  familySummaryEl.innerHTML = `
    <div><b>Family size:</b> ${escapeHtml(size)}</div>
    <div style="margin-top:6px"><b>Member ages:</b> ${escapeHtml(agesText)}</div>
  `;

  const history = data?.allHistory ?? [];
  if (!Array.isArray(history) || !history.length) {
    orgHistoryEl.innerHTML = `<span class="muted">No previous aid records found.</span>`;
    return;
  }

  orgHistoryEl.innerHTML = history.slice(0, 50).map(h => `
    <div style="padding:8px 0; border-bottom:1px solid rgba(97,55,41,0.10)">
      <div>
        <b>${escapeHtml(h.date || "")}</b>
        • ${escapeHtml(h.orgName || "")}
        • ${escapeHtml(h.aidType || "")}
        ${h.quantity != null ? ` • Qty: ${escapeHtml(h.quantity)}` : ""}
        ${h.roundNo ? ` • Round: ${escapeHtml(h.roundNo)}` : ""}
      </div>
      <div class="muted" style="font-size:12px; margin-top:2px">
        Campaign: ${escapeHtml(h.campaignTitle || "—")} • ${escapeHtml(h.comment || "—")}
      </div>
    </div>
  `).join("");
}

/* Entry API */
async function postEntry(sessionId, payload) {
  const res = await fetch(`${API_BASE}/api/distribution-sessions/${encodeURIComponent(sessionId)}/entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.message || "Failed to record entry");
  return data;
}

/* Finish API */
async function finishSession(sessionId, org_id) {
  const res = await fetch(`${API_BASE}/api/distribution-sessions/${encodeURIComponent(sessionId)}/finish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ org_id }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.message || "Failed to finish session");
  return data;
}

function getBackLink() {
  const params = new URLSearchParams(location.search);
  return params.get("back") || "../localauthority/local-dashboard.html";
}

/* =========================
   INIT
========================= */
(function init() {
  const draft = readDraft();

  if (!draft?.sessionId || !draft?.campaign || !draft?.aidType || !draft?.org_id) {
    setStatus("No active distribution session found. Please start again from setup.", "bad");
    confirmBtn.disabled = true;
    toggleSnapshotBtn.disabled = true;

    finishBtn.addEventListener("click", () => {
      location.href = getBackLink();
    });
    return;
  }

  const campTitle = draft.campaign.title || draft.campaign.name || draft.campaign.campaign_id;
  sessionMeta.textContent = `Campaign: ${campTitle} • Started: ${new Date(draft.startedAt).toLocaleString()}`;
  aidTypePill.textContent = (draft.aidType.name || draft.aidType.id || "Aid Type").toString();

  // Quantity UI
  if (requiresQuantity(draft.aidType)) {
    qtyWrap.classList.remove("hidden");
    const unit = normalizeUnit(draft.aidType);
    qtyHintEl.textContent = unit ? `Unit: ${unit}` : "Enter quantity (required for this aid type).";
  } else {
    qtyWrap.classList.add("hidden");
  }

  renderEntries(readEntries(draft.sessionId));

  familyCodeEl.addEventListener("input", () => {
    const code = familyCodeEl.value.trim();
    toggleSnapshotBtn.disabled = code.length < 3;
    if (!snapshotPanel.classList.contains("hidden")) snapshotPanel.classList.add("hidden");
  });

  toggleSnapshotBtn.addEventListener("click", async () => {
    const code = familyCodeEl.value.trim();
    if (!code) return;

    if (!snapshotPanel.classList.contains("hidden")) {
      snapshotPanel.classList.add("hidden");
      return;
    }

    setStatus("Loading family snapshot…");
    snapshotPanel.classList.remove("hidden");

    try {
      const snap = await fetchSnapshotAll(code);
      renderSnapshot(snap);
      setStatus("Snapshot loaded.", "ok");
    } catch (e) {
      setStatus(e.message || "Failed to load snapshot.", "bad");
      resetSnapshotUI();
    }
  });

  clearBtn.addEventListener("click", () => {
    setStatus("");
    clearFamilySection();
  });

  confirmBtn.addEventListener("click", async () => {
    const code = familyCodeEl.value.trim();
    if (!code) {
      setStatus("Slum code is required.", "bad");
      return;
    }

    const qtyNeeded = requiresQuantity(draft.aidType);
    const qtyVal = qtyNeeded ? Number(qtyEl.value) : null;

    if (qtyNeeded) {
      if (!Number.isFinite(qtyVal) || qtyVal <= 0) {
        setStatus("Quantity is required for this aid type and must be > 0.", "bad");
        return;
      }
    }

    const payload = {
      org_id: draft.org_id,
      familyCode: code,
      quantity: qtyNeeded ? qtyVal : null,
      comment: commentEl.value.trim() || null,
      verification_method: "CODE",
    };

    setStatus("Recording entry…");

    try {
      const result = await postEntry(draft.sessionId, payload);

      const entries = readEntries(draft.sessionId);
      entries.push({
        ...payload,
        createdAt: result?.data?.distributed_at || new Date().toISOString(),
        roundNo: result?.data?.round_no || null,
      });

      writeEntries(draft.sessionId, entries);
      renderEntries(entries);

      setStatus("Entry recorded. Ready for next family.", "ok");
      clearFamilySection();
    } catch (e) {
      setStatus(e.message || "Failed to record entry.", "bad");
    }
  });

  finishBtn.addEventListener("click", () => openFinishModal());

  cancelFinish?.addEventListener("click", () => closeFinishModal());
  finishModal?.addEventListener("click", (e) => {
    if (e.target === finishModal) closeFinishModal();
  });

  confirmFinish?.addEventListener("click", async () => {
    closeFinishModal();
    setStatus("Finishing session…");

    try {
      await finishSession(draft.sessionId, draft.org_id);
      localStorage.removeItem(STORAGE_KEY);
      location.href = getBackLink();
    } catch (e) {
      setStatus(e.message || "Failed to finish session.", "bad");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && finishModal?.classList.contains("show")) closeFinishModal();
  });

  clearFamilySection();
})();