function getRole(){
  const params = new URLSearchParams(window.location.search);
  return (params.get("role") || "").toLowerCase();
}

function getBackLink(){
  const params = new URLSearchParams(window.location.search);
  return params.get("back") || (getRole() === "ngo" ? "../ngo/ngo-dashboard.html" : "../localauthority/local-dashboard.html");
}

function goDashboard(){
  window.location.href = getBackLink();
}

function getSession(){
  try { return JSON.parse(localStorage.getItem("SLUMLINK_SESSION") || "null"); }
  catch { return null; }
}

function inferRoleFromSession(){
  const session = getSession();
  const t = (session?.org_type || "").toLowerCase();
  if(t === "ngo") return "ngo";
  if(t === "localauthority") return "localauthority";
  return getRole();
}

function mapDbStatusToUi(dbStatusRaw){
  if(!dbStatusRaw) return "pending";
  const s = dbStatusRaw.toString().trim().toLowerCase();
  if(s === "completed") return "completed";
  if(s === "in_progress") return "in_progress";
  if(s === "pending") return "pending";
  if(s === "not_executed") return "completed"; // treat as locked result view (safer than editing)
  if(s === "cancelled") return "cancelled";
  return "pending";
}

function prettyStatus(ui){
  if(ui === "in_progress") return "In Progress";
  return ui.charAt(0).toUpperCase() + ui.slice(1);
}

function currentViewCampaignUrl(){
  return `viewcampaign.html${window.location.search || ""}`;
}

function handleCampaignClick(campaignId, campaignTitle, uiStatus){
  // cancelled never appears; but keep defensive
  if(uiStatus === "cancelled") return;

  const role = encodeURIComponent(inferRoleFromSession() || "");
  const ret = encodeURIComponent(currentViewCampaignUrl());
  const idPart = campaignId ? `&id=${encodeURIComponent(String(campaignId))}` : "";
  const namePart = `campaign=${encodeURIComponent(campaignTitle || "Untitled campaign")}`;
  const stPart = `&status=${encodeURIComponent(uiStatus)}`;

  if(uiStatus === "pending"){
    window.location.href = `pendingcampaign.html?${namePart}&return=${ret}&role=${role}${idPart}${stPart}`;
    return;
  }
  if(uiStatus === "in_progress"){
    window.location.href = `inprogresscampaign.html?${namePart}&return=${ret}&role=${role}${idPart}${stPart}`;
    return;
  }
  // completed + not_executed goes here
  window.location.href = `completedcampaigns.html?${namePart}&return=${ret}&role=${role}${idPart}${stPart}`;
}

function filterCampaigns(){
  const filter = document.getElementById("campaignFilter")?.value || "all";

  document.querySelectorAll(".campaign-card").forEach(card=>{
    const st = (card.dataset.status || "").toLowerCase();
    const show = (filter === "all" || st === filter);
    card.style.display = show ? "flex" : "none";
  });
}

async function loadCampaigns(){
  const campaignList = document.getElementById("campaignList");
  if(!campaignList) return;

  campaignList.innerHTML = `<div style="font-weight:700; padding:12px 0; opacity:.75;">Loading campaigns…</div>`;

  const session = getSession();
  const orgId = session?.org_id;
  const qs = orgId ? `?org_id=${encodeURIComponent(orgId)}` : "";

  let items = [];
  try{
    const res = await fetch(`/api/campaigns${qs}`);
    if(res.ok){
      const payload = await res.json().catch(()=>null);
      const list = (payload?.success && Array.isArray(payload.data)) ? payload.data
                 : Array.isArray(payload) ? payload : [];

      items = list.map(c => {
        const status = mapDbStatusToUi(c.status);
        return {
          id: c.campaign_id ?? c.id ?? "",
          title: c.title ?? "Untitled campaign",
          status
        };
      });

      // ✅ HARD RULE: cancelled must not be visible at all
      items = items.filter(x => x.status !== "cancelled");
    }
  }catch{}

  // fallback demo (no cancelled)
  if(!items.length){
    items = [
      { id:"1", title:"Winter Blanket Drive", status:"pending" },
      { id:"2", title:"Medical Camp Support", status:"in_progress" },
      { id:"3", title:"Garbage Collection Campaign", status:"completed" }
    ];
  }

  campaignList.innerHTML = "";

  items.forEach(c=>{
    const card = document.createElement("div");
    card.className = "campaign-card";
    card.dataset.status = c.status;

    const titleSpan = document.createElement("span");
    titleSpan.textContent = c.title;

    const statusSpan = document.createElement("span");
    statusSpan.className = `campaign-status ${c.status}`;
    statusSpan.textContent = prettyStatus(c.status);

    card.appendChild(titleSpan);
    card.appendChild(statusSpan);

    card.addEventListener("click", ()=>handleCampaignClick(c.id, c.title, c.status));
    statusSpan.addEventListener("click", (e)=>{ e.stopPropagation(); handleCampaignClick(c.id, c.title, c.status); });

    campaignList.appendChild(card);
  });

  filterCampaigns();
}

window.goDashboard = goDashboard;
window.filterCampaigns = filterCampaigns;

document.addEventListener("DOMContentLoaded", ()=>{
  loadCampaigns();
  document.getElementById("campaignFilter")?.addEventListener("change", filterCampaigns);
});