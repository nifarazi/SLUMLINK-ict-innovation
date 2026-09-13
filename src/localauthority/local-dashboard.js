const toastEl = document.getElementById("toast");
let toastTimer;

function toast(msg) {
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

document.querySelectorAll("[data-toast]").forEach((el) => {
  el.addEventListener("click", function (e) {
    e.preventDefault();
    toast(this.getAttribute("data-toast"));
  });
});

function readSession() {
  try {
    return JSON.parse(localStorage.getItem("SLUMLINK_SESSION") || "null");
  } catch {
    return null;
  }
}

function fmtNum(n) {
  const x = Number(n) || 0;
  return x.toLocaleString();
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

async function safeJSON(res) {
  return res.json().catch(() => null);
}

async function fetchSummary(org_id) {
  const res = await fetch(`/api/dashboard/summary?org_id=${encodeURIComponent(org_id)}`);
  const data = await safeJSON(res);
  if (!res.ok) throw new Error(data?.message || "Failed to load dashboard summary");
  return data?.data;
}

async function fetchRecent(org_id, limit = 5) {
  const res = await fetch(`/api/dashboard/recent-distributions?org_id=${encodeURIComponent(org_id)}&limit=${limit}`);
  const data = await safeJSON(res);
  if (!res.ok) throw new Error(data?.message || "Failed to load recent distributions");
  return data?.data || [];
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function renderRecent(list) {
  const container = document.getElementById("recentAidList");
  if (!container) return;

  if (!list.length) {
    container.innerHTML = `<div class="aid-item"><div class="aid-title">No distributions yet</div><div class="aid-meta">Start a distribution session to see history here.</div></div>`;
    return;
  }

  container.innerHTML = list
    .map((x) => {
      const title = x.campaign_title || "Campaign";
      const area = x.slum_area || "—";
      const families = Number(x.families_assisted) || 0;
      const date = fmtDate(x.finished_at || x.started_at);

      return `
        <div class="aid-item clickable" data-toast="Session #${x.session_id} • ${families} families assisted">
          <div class="aid-title">${title}</div>
          <div class="aid-meta">${area} • ${families} families assisted</div>
          <div class="aid-date">${date}</div>
        </div>
      `;
    })
    .join("");

  // rebind toasts for newly rendered items
  container.querySelectorAll("[data-toast]").forEach((el) => {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      toast(this.getAttribute("data-toast"));
    });
  });
}

// Navigation (your existing)
document.getElementById("qaAnalytics")?.addEventListener("click", (e) => {
  e.preventDefault(); e.stopPropagation();
  window.location.href = "./local-analytics.html";
});

document.getElementById("qaCreateCampaign")?.addEventListener("click", (e) => {
  e.preventDefault(); e.stopPropagation();
  const back = encodeURIComponent("../localauthority/local-dashboard.html");
  window.location.href = `../shared/create-campaign.html?role=localauthority&back=${back}`;
});

document.getElementById("qaViewCampaigns")?.addEventListener("click", (e) => {
  e.preventDefault(); e.stopPropagation();
  const back = encodeURIComponent("../localauthority/local-dashboard.html");
  window.location.href = `../shared/viewcampaign.html?back=${back}`;
});

document.getElementById("qaComplaints")?.addEventListener("click", (e) => {
  e.preventDefault(); e.stopPropagation();
  window.location.href = "./complaintcategory.html";
});

document.getElementById("qaAidDistribution")?.addEventListener("click", (e) => {
  e.preventDefault(); e.stopPropagation();
  const back = encodeURIComponent("../localauthority/local-dashboard.html");
  window.location.href = `../shared/aid-distribution-setup.html?back=${back}`;
});

document.getElementById("brandBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  window.location.href = "/";
});

// Logout modal (your existing)
const logoutBtn = document.getElementById("logoutBtn");
const modal = document.getElementById("logoutModal");
const cancelBtn = document.getElementById("cancelLogout");
const confirmBtn = document.getElementById("confirmLogout");

function openModal() {
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  cancelBtn.focus();
}
function closeModal() {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  logoutBtn.focus();
}
logoutBtn?.addEventListener("click", (e) => { e.preventDefault(); openModal(); });
cancelBtn?.addEventListener("click", closeModal);
modal?.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", (e) => {
  if (!modal?.classList.contains("show")) return;
  if (e.key === "Escape") closeModal();
});
confirmBtn?.addEventListener("click", () => {
  toast("Logging out...");
  localStorage.removeItem("SLUMLINK_SESSION");
  setTimeout(() => { window.location.href = "/"; }, 450);
});

// ✅ Load dashboard data
(async function initDashboard() {
  const session = readSession();
  const org_id = session?.org_id;

  if (!org_id) {
    toast("Session missing. Please sign in again.");
    return;
  }

  try {
    const summary = await fetchSummary(org_id);
    setText("familiesHelpedNum", fmtNum(summary.families_helped));
    setText("areasCoveredNum", fmtNum(summary.areas_covered));
    setText("completedCampaignsNum", fmtNum(summary.completed_campaigns));
    setText("activeCampaignsNum", fmtNum(summary.active_campaigns));

    const recent = await fetchRecent(org_id, 5);
    renderRecent(recent);
  } catch (err) {
    console.error(err);
    toast(err.message || "Failed to load dashboard data");
  }
})();