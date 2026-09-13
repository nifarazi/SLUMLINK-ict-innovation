const toastEl = document.getElementById("toast");
let toastTimer;

function toast(msg){
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

// Toast hooks
document.querySelectorAll("[data-toast]").forEach(el=>{
  el.addEventListener("click", function(e){
    e.preventDefault();
    toast(this.getAttribute("data-toast"));
  });
});

// Navigation
document.getElementById("qaAnalytics")?.addEventListener("click", (e)=>{
  e.preventDefault(); e.stopPropagation();
  window.location.href = "./analytics-dashboard.html";
});

document.getElementById("qaCreateCampaign")?.addEventListener("click", (e)=>{
  e.preventDefault(); e.stopPropagation();
  const back = encodeURIComponent("../localauthority/local-dashboard.html");
  window.location.href = `../shared/create-campaign.html?role=localauthority&back=${back}`;
});

document.getElementById("qaViewCampaigns")?.addEventListener("click", (e)=>{
  e.preventDefault(); e.stopPropagation();
  const back = encodeURIComponent("../localauthority/local-dashboard.html");
  window.location.href = `../shared/viewcampaign.html?back=${back}`;
});

document.getElementById("qaComplaints")?.addEventListener("click", (e)=>{
  e.preventDefault(); e.stopPropagation();
  window.location.href = "./complaintcategory.html";
});

document.getElementById("qaAidDistribution")?.addEventListener("click", (e)=>{
  e.preventDefault(); e.stopPropagation();
  const back = encodeURIComponent("../localauthority/local-dashboard.html");
  window.location.href = `../shared/aid-distribution-setup.html?back=${back}`;
});

document.getElementById("brandBtn")?.addEventListener("click", (e)=> {
  e.preventDefault();
  window.location.href = "/";
});

// Logout modal
const logoutBtn = document.getElementById("logoutBtn");
const modal = document.getElementById("logoutModal");
const cancelBtn = document.getElementById("cancelLogout");
const confirmBtn = document.getElementById("confirmLogout");

function openModal(){
  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
  cancelBtn.focus();
}
function closeModal(){
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden","true");
  logoutBtn.focus();
}

logoutBtn?.addEventListener("click", (e)=>{
  e.preventDefault();
  openModal();
});

cancelBtn?.addEventListener("click", closeModal);

modal?.addEventListener("click", (e)=>{
  if(e.target === modal) closeModal();
});

document.addEventListener("keydown", (e)=>{
  if(!modal?.classList.contains("show")) return;
  if(e.key === "Escape") closeModal();
});

confirmBtn?.addEventListener("click", ()=>{
  toast("Logging out...");
  localStorage.removeItem("SLUMLINK_SESSION"); // ✅ simple “session” clear
  setTimeout(()=> { window.location.href = "/"; }, 450);
});