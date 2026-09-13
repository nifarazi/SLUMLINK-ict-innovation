const toastEl = document.getElementById("toast");
let toastTimer;

function toast(msg){
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

// Navigation hooks (do NOT let the generic data-toast handler block these)
document.getElementById("qaAnalytics")?.addEventListener("click", (e)=>{
  e.preventDefault();
  e.stopPropagation();
  window.location.href = "./ngoanalytics-dashboard.html";
});

document.getElementById("qaCreateCampaign")?.addEventListener("click", (e)=>{
  e.preventDefault();
  e.stopPropagation();
  const back = encodeURIComponent("../ngo/ngo-dashboard.html");
  window.location.href = `../shared/create-campaign.html?role=ngo&back=${back}`;
});

document.getElementById("qaViewCampaigns")?.addEventListener("click", (e)=>{
  e.preventDefault();
  e.stopPropagation();
  const back = encodeURIComponent("../ngo/ngo-dashboard.html");
  window.location.href = `../shared/viewcampaign.html?back=${back}`;
});

// ✅ NEW: Aid Distribution
document.getElementById("qaAidDistribution")?.addEventListener("click", (e)=>{
  e.preventDefault();
  e.stopPropagation();
  const back = encodeURIComponent("../ngo/ngo-dashboard.html");
  window.location.href = `../shared/aid-distribution-setup.html?back=${back}`;
});

document.getElementById("profileBtn")?.addEventListener("click", (e)=> {
  e.preventDefault();
  window.location.href = "/src/ngo/ngo-profile.html?role=ngo";
});

document.getElementById("brandBtn")?.addEventListener("click", (e)=> {
  e.preventDefault();
  window.location.href = "/";
});

// Generic toast click handler (safe for non-navigation buttons/cards)
document.querySelectorAll("[data-toast]").forEach(el=>{
  el.addEventListener("click", function(e){
    // only toast; navigation buttons already stopped propagation above
    e.preventDefault();
    toast(this.getAttribute("data-toast"));
  });
});
