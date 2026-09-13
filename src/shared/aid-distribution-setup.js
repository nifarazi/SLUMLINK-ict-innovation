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
  const ok = campaignSelect.value && typeSelect.value;
  startBtn.classList.toggle('is-disabled', !ok);
  startBtn.setAttribute('aria-disabled', String(!ok));
  // Remove disabled attribute so click still fires
  startBtn.disabled = false;
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

/**
 * Show a toast notification
 */
function showToast(message, type = "error") {
  // Remove any existing toast
  const existing = document.getElementById("toast-notification");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "toast-notification";
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: ${type === "error" ? "#D32F2F" : "#388E3C"};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    font-size: 14px;
    font-weight: 500;
    font-family: Poppins, sans-serif;
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.style.animation = "slideOut 0.3s ease-out";
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// Add CSS animations for toast 
if (!document.getElementById("toast-styles")) {
  const style = document.createElement("style");
  style.id = "toast-styles";
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Show inline form validation error
 */
function showFormError(selectElement, message) {
  if (!selectElement) {
    console.error('showFormError: Select element not found');
    return;
  }
  
  console.log('showFormError called for:', selectElement.id, 'message:', message);
  
  // Add error class to select
  selectElement.classList.add('form-error');
  
  // FORCE INLINE STYLES (highest priority)
  selectElement.style.border = '3px solid #D32F2F';
  selectElement.style.backgroundColor = '#FFEBEE';
  selectElement.style.boxShadow = '0 0 8px rgba(211, 47, 47, 0.5)';
  selectElement.style.outline = 'none';
  
  console.log('Inline styles applied to:', selectElement.id);
  
  // Get the parent field div
  const fieldDiv = selectElement.closest('.field');
  console.log('fieldDiv found:', !!fieldDiv);
  
  if (!fieldDiv) {
    console.error('Field div not found for', selectElement.id);
    return;
  }
  
  // Remove any existing error message
  const existingError = fieldDiv.querySelector('.form-error-message');
  if (existingError) {
    console.log('Removing existing error message');
    existingError.remove();
  }
  
  // Create and insert error message DIRECTLY AFTER SELECT
  const errorMsg = document.createElement('div');
  errorMsg.className = 'form-error-message';
  errorMsg.textContent = '⚠ ' + message;
  
  // WEBSITE-THEMED STYLING (soft beige/terra colors, not harsh yellow/red)
  errorMsg.style.color = '#613729';
  errorMsg.style.fontSize = '13px';
  errorMsg.style.fontWeight = '600';
  errorMsg.style.marginTop = '8px';
  errorMsg.style.display = 'block';
  errorMsg.style.padding = '10px 12px';
  errorMsg.style.backgroundColor = 'rgba(164, 98, 77, 0.08)';
  errorMsg.style.border = '1px solid rgba(164, 98, 77, 0.22)';
  errorMsg.style.borderRadius = '8px';
  errorMsg.style.fontFamily = 'Poppins, sans-serif';
  
  // Insert immediately after select element
  selectElement.insertAdjacentElement('afterend', errorMsg);
  console.log('Error message inserted with website theme');
}

/**
 * Clear form validation error
 */
function clearFormError(selectElement) {
  if (!selectElement) {
    console.log('clearFormError: Select element is null or undefined');
    return;
  }
  
  console.log('clearFormError called for:', selectElement.id);
  
  selectElement.classList.remove('form-error');
  
  // REMOVE inline styles
  selectElement.style.border = '';
  selectElement.style.backgroundColor = '';
  selectElement.style.boxShadow = '';
  selectElement.style.outline = '';
  
  const fieldDiv = selectElement.closest('.field');
  if (fieldDiv) {
    const errorMsg = fieldDiv.querySelector('.form-error-message');
    if (errorMsg) {
      errorMsg.remove();
      console.log('Error message removed from', selectElement.id);
    }
  }
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
  clearFormError(campaignSelect);  // Clear error when user selects
  const opt = campaignSelect.selectedOptions[0];
  const camp = opt ? JSON.parse(opt.dataset.raw) : null;
  renderPreview(camp);
  
  // ✅ NEW: Load eligible families when campaign is selected
  if (camp && camp.campaign_id) {
    loadEligibleFamilies(camp.campaign_id);
  } else {
    document.getElementById("eligibleFamiliesContainer").innerHTML = "";
  }
});

typeSelect.addEventListener("change", () => {
  updateStartState();
  clearFormError(typeSelect);  // Clear error when user selects
});

startBtn.addEventListener("click", async () => {
  console.log('START BUTTON CLICKED');
  
  if (isCreating) {
    console.log('Already creating, ignoring click');
    return;
  }

  const session = readSession();
  const org_id = session?.org_id;

  // ✅ FIX: Check .value instead of selectedOptions[0]
  const hasCampaign = !!campaignSelect.value;
  const hasType = !!typeSelect.value;
  
  console.log('Campaign selected:', hasCampaign);
  console.log('Aid type selected:', hasType);
  
  // Validation with inline error messages
  let hasErrors = false;
  
  if (!hasCampaign) {
    console.log('VALIDATION ERROR: No campaign selected');
    showFormError(campaignSelect, "Please select a campaign");
    hasErrors = true;
  }
  
  if (!hasType) {
    console.log('VALIDATION ERROR: No aid type selected');
    showFormError(typeSelect, "Please select an aid type");
    hasErrors = true;
  }
  
  if (hasErrors) {
    console.log('Form has errors - validation complete');
    return;
  }
  
  const campOpt = campaignSelect.selectedOptions[0];
  const typeOpt = typeSelect.selectedOptions[0];
  
  if (!org_id) {
    showToast("No organization session found. Please sign in again.", "error");
    return;
  }

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
    showToast(e.message || "Failed to start distribution. Please try again.", "error");
    startBtn.disabled = false; // allow retry
  } finally {
    isCreating = false;
    updateStartState();
  }
});

/**
 * ✅ NEW: Load and display eligible families for distribution setup
 */
async function loadEligibleFamilies(campaignId) {
  const containerId = "eligibleFamiliesContainer";
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const table = new EligibleFamiliesTable(containerId);
    await table.load(campaignId);
    await table.loadCampaignDetails(campaignId);
    table.render();
    // Store globally so distribution session can access it
    window.eligibleFamiliesTable = table;
    // Also store in localStorage for persistence across page navigation
    if (table.data?.families) {
      localStorage.setItem(
        "slumlink_eligible_families",
        JSON.stringify(table.data.families)
      );
    }
  } catch (err) {
    console.error("Error loading eligible families:", err);
    container.innerHTML = `<div class="families-section"><p style="color:red;">Error loading eligible families: ${err.message}</p></div>`;
  }
}

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