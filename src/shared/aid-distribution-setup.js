// src/shared/aid-distribution-setup.js
const API_BASE = ""; // same server
const STORAGE_KEY = "slumlink_distribution_session_draft";

const campaignSelect = document.getElementById("campaignSelect");
const typeSelect = document.getElementById("typeSelect");
const startBtn = document.getElementById("startBtn");
const preview = document.getElementById("campaignPreview");
const backBtn = document.getElementById("backBtn");

document.getElementById("brandBtn")?.addEventListener("click", () => (window.location.href = "/"));

function safeJSON(res) {
  return res.json().catch(() => null);
}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem("SLUMLINK_SESSION") || "null");
  } catch {
    return null;
  }
}

function getBackLink() {
  const params = new URLSearchParams(location.search);
  return params.get("back") || "../localauthority/local-dashboard.html";
}

backBtn?.addEventListener("click", () => {
  window.location.href = getBackLink();
});

function fillSelect(select, list, labelKey, valueKey = "id") {
  select.innerHTML = `<option value="" selected disabled>Select</option>`;
  list.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item[valueKey];
    opt.textContent = item[labelKey] ?? item.name ?? item[valueKey];
    opt.dataset.raw = JSON.stringify(item);
    select.appendChild(opt);
  });
}

function fillAidTypeSelectGrouped(select, types) {
  select.innerHTML = `<option value="" selected disabled>Select</option>`;

  const needsQty = [];
  const noQty = [];

  for (const t of (types || [])) {
    (t.requires_quantity ? needsQty : noQty).push(t);
  }

  // Sort alphabetically inside groups (nice UX)
  const byName = (a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), undefined, {
      sensitivity: "base",
    });
  needsQty.sort(byName);
  noQty.sort(byName);

  function makeLabel(t) {
    // Show unit if exists, helps a LOT
    const unit = (t.unit_label || "").trim();
    return unit ? `${t.name} (Unit: ${unit})` : t.name;
  }

  function addGroup(label, list) {
    if (!list.length) return;
    const og = document.createElement("optgroup");
    og.label = label;

    list.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = makeLabel(item);
      opt.dataset.raw = JSON.stringify(item);
      og.appendChild(opt);
    });

    select.appendChild(og);
  }

  addGroup("Quantity Required", needsQty);
  addGroup("No Quantity Needed", noQty);
}

function updateStartState() {
  startBtn.disabled = !(campaignSelect.value && typeSelect.value);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[ch]));
}

function renderPreview(camp, extraMsg = "") {
  if (!camp) {
    preview.innerHTML = `
      <div class="preview-title">Campaign Preview</div>
      <div class="preview-body muted">Select a campaign to see basic details (title + target area).</div>
      ${extraMsg ? `<div class="preview-body" style="margin-top:10px"><b>${escapeHtml(extraMsg)}</b></div>` : ""}
    `;
    return;
  }

  const title = camp.title ?? "—";
  const area = camp.slum_area ?? camp.targetSlumArea ?? "—";
  const start = String(camp.start_date || camp.startDate || "").slice(0, 10);
  const end = String(camp.end_date || camp.endDate || "").slice(0, 10);
  const dateText = start || end ? `${start || "—"} → ${end || "—"}` : "";

  preview.innerHTML = `
    <div class="preview-title">Campaign Preview</div>
    <div class="preview-body">
      <div><b>Title:</b> ${escapeHtml(title)}</div>
      <div style="margin-top:6px"><b>Target area:</b> ${escapeHtml(area)}</div>
      ${dateText ? `<div style="margin-top:6px"><b>Date:</b> ${escapeHtml(dateText)}</div>` : ""}
      ${extraMsg ? `<div style="margin-top:10px"><b>${escapeHtml(extraMsg)}</b></div>` : ""}
    </div>
  `;
}

async function fetchCampaignsActiveToday(org_id) {
  const res = await fetch(`${API_BASE}/api/campaigns/mine-active?org_id=${encodeURIComponent(org_id)}`);
  const data = await safeJSON(res);
  if (!res.ok) throw new Error(data?.message || "Failed to load campaigns");
  return data?.data || [];
}

async function fetchAidTypes() {
  const res = await fetch(`${API_BASE}/api/aid-types`);
  const data = await safeJSON(res);
  if (!res.ok) throw new Error(data?.message || "Failed to load aid types");
  return (data?.data || []).map((t) => ({
    id: t.id,
    name: t.name,
    requires_quantity: !!t.requires_quantity,
    unit_label: t.unit_label || "",
  }));
}

async function createSession({ org_id, campaignId, aidTypeId, performed_by }) {
  const res = await fetch(`${API_BASE}/api/distribution-sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ org_id, campaignId, aidTypeId, performed_by }),
  });
  const data = await safeJSON(res);
  if (!res.ok) throw new Error(data?.message || "Failed to create session");
  return data?.sessionId;
}

let campaignsCache = [];
let typesCache = [];
let isCreating = false;

campaignSelect.addEventListener("change", () => {
  updateStartState();
  const opt = campaignSelect.selectedOptions[0];
  const camp = opt ? JSON.parse(opt.dataset.raw) : null;
  renderPreview(camp);
});
typeSelect.addEventListener("change", updateStartState);

startBtn.addEventListener("click", async () => {
  if (isCreating) return;

  const session = readSession();
  const org_id = session?.org_id;

  const campOpt = campaignSelect.selectedOptions[0];
  const typeOpt = typeSelect.selectedOptions[0];
  if (!campOpt || !typeOpt || !org_id) return;

  const campaign = JSON.parse(campOpt.dataset.raw);
  const aidType = JSON.parse(typeOpt.dataset.raw);

  try {
    isCreating = true;
    startBtn.disabled = true;
    renderPreview(campaign, "Creating session…");

    const sessionId = await createSession({
      org_id,
      campaignId: campaign.campaign_id,
      aidTypeId: aidType.id,
      performed_by: session?.org_name || session?.email || null,
    });

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sessionId,
        campaign,
        aidType,
        org_id,
        startedAt: new Date().toISOString(),
      })
    );

    const params = new URLSearchParams(location.search);
    const back = params.get("back") || getBackLink();
    window.location.href = `./aid-distribution-session.html?back=${encodeURIComponent(back)}`;
  } catch (e) {
    console.error(e);
    renderPreview(campaign, e.message || "Failed to start distribution.");
    startBtn.disabled = false; // allow retry
  } finally {
    isCreating = false;
    updateStartState();
  }
});

(async function init() {
  try {
    const session = readSession();
    const org_id = session?.org_id;

    if (!org_id) {
      renderPreview(null, "No org session found. Please sign in again.");
      startBtn.disabled = true;
      return;
    }

    campaignsCache = await fetchCampaignsActiveToday(org_id);
    fillSelect(campaignSelect, campaignsCache, "title", "campaign_id");

    typesCache = await fetchAidTypes();
    fillAidTypeSelectGrouped(typeSelect, typesCache);

    renderPreview(null);
    updateStartState();
  } catch (e) {
    console.error(e);
    renderPreview(null, "Failed to load campaigns/types. Check backend routes.");
    startBtn.disabled = true;
  }
})();