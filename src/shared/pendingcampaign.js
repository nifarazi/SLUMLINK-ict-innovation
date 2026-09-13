function qs(){
  return new URLSearchParams(window.location.search);
}

function getReturnUrl(){
  const params = qs();
  const raw = params.get("return") || params.get("back");
  if(!raw) return "./viewcampaign.html";
  try{ return decodeURIComponent(raw); }
  catch{ return raw; }
}

function goBack(){
  window.location.href = getReturnUrl();
}

function getSession(){
  try { return JSON.parse(localStorage.getItem("SLUMLINK_SESSION") || "null"); }
  catch { return null; }
}

function toast(msg){
  const toastEl = document.getElementById("toast");
  if(!toastEl) return;
  window.clearTimeout(toastEl.__t);
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  toastEl.__t = window.setTimeout(() => toastEl.classList.remove("show"), 2200);
}

function showReq(category){
  const c = (category || "").toLowerCase();
  const show = (c === "employment" || c === "workshop");
  document.getElementById("eduField")?.classList.toggle("hidden", !show);
  document.getElementById("skillsField")?.classList.toggle("hidden", !show);
}

/**
 * ✅ FIXED date normalizer (same as above)
 */
function extractDateOnly(dbDateString){
  if(!dbDateString) return "";

  if(typeof dbDateString === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dbDateString.trim())){
    return dbDateString.trim();
  }

  const d = new Date(dbDateString);
  if(!isNaN(d.getTime())){
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return String(dbDateString).trim().slice(0, 10);
}

function normalizeDateInput(v){
  return (v || "").slice(0, 10);
}

function normalizeTimeInput(v){
  return (v || "").slice(0, 5);
}

function todayPlusDaysIso(days){
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function applyDateConstraints(){
  const elStartDate = document.getElementById("startDate");
  const elEndDate = document.getElementById("endDate");
  if(!elStartDate || !elEndDate) return;

  // Requirement: start date can be today or later
  const minStart = todayPlusDaysIso(0);
  elStartDate.min = minStart;

  // Ensure end date cannot be before start date (or before minStart if start is blank)
  const minEnd = elStartDate.value ? elStartDate.value : minStart;
  elEndDate.min = minEnd;

  // If current values are invalid, push them forward to the minimum.
  if(elStartDate.value && elStartDate.value < minStart){
    elStartDate.value = minStart;
  }
  if(elEndDate.value && elEndDate.value < elEndDate.min){
    elEndDate.value = elEndDate.min;
  }
}

function validateDatesForSave(){
  const elStartDate = document.getElementById("startDate");
  const elEndDate = document.getElementById("endDate");
  if(!elStartDate || !elEndDate) return { ok: true };

  const minStart = todayPlusDaysIso(0);
  const start = normalizeDateInput(elStartDate.value);
  const end = normalizeDateInput(elEndDate.value);

  if(!start) return { ok: false, message: "Please select a Start Date." };
  if(start < minStart) return { ok: false, message: `Start Date must be ${minStart} or later.` };
  if(!end) return { ok: false, message: "Please select an End Date." };
  if(end < start) return { ok: false, message: "End Date must be the same as Start Date or a future date." };

  return { ok: true };
}

function confirmAction({ title, message, variant }){
  const modal = document.getElementById("confirmModal");
  const elTitle = document.getElementById("confirmTitle");
  const elMsg = document.getElementById("confirmMessage");
  const btnYes = document.getElementById("confirmYes");
  const btnNo = document.getElementById("confirmNo");

  // Fallback if modal markup isn't present
  if(!modal || !btnYes || !btnNo){
    return Promise.resolve(confirm(message || "Are you sure?"));
  }

  if(elTitle) elTitle.textContent = title || "Confirm";
  if(elMsg) elMsg.textContent = message || "Are you sure?";

  btnYes.className = (variant === "danger") ? "danger-btn" : "primary-btn";
  btnYes.textContent = (variant === "danger") ? "Yes, Cancel" : "Yes, Save";
  btnNo.textContent = "No";

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");

  return new Promise((resolve) => {
    let done = false;
    const cleanup = () => {
      if(done) return;
      done = true;
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
      btnYes.removeEventListener("click", onYes);
      btnNo.removeEventListener("click", onNo);
      modal.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKey);
    };

    const onYes = () => { cleanup(); resolve(true); };
    const onNo = () => { cleanup(); resolve(false); };
    const onBackdrop = (e) => { if(e.target === modal) onNo(); };
    const onKey = (e) => { if(e.key === "Escape") onNo(); };

    btnYes.addEventListener("click", onYes);
    btnNo.addEventListener("click", onNo);
    modal.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKey);
  });
}

async function load(){
  const id = qs().get("id");
  if(!id){ toast("No campaign id."); return; }

  const session = getSession();
  const extra = session?.org_id ? `?org_id=${encodeURIComponent(session.org_id)}` : "";

  const elTitle = document.getElementById("title");
  const elCategory = document.getElementById("category");
  const elStatus = document.getElementById("status");
  const elDivision = document.getElementById("division");
  const elDistrict = document.getElementById("district");
  const elSlumArea = document.getElementById("slumArea");
  const elStartDate = document.getElementById("startDate");
  const elEndDate = document.getElementById("endDate");
  const elTime = document.getElementById("time");
  const elGender = document.getElementById("gender");
  const elAgeGroup = document.getElementById("ageGroup");
  const elEducation = document.getElementById("education");
  const elSkills = document.getElementById("skills");
  const elDescription = document.getElementById("description");

  try{
    const res = await fetch(`/api/campaigns/${encodeURIComponent(id)}${extra}`);
    if(!res.ok) throw new Error("fetch failed");
    const payload = await res.json().catch(()=>null);
    const c = payload?.data || payload;

    if((c?.status || "").toLowerCase() === "cancelled"){
      goBack();
      return;
    }

    if(elTitle) elTitle.value = c?.title || "";
    if(elCategory) elCategory.value = c?.category || "";
    if(elStatus) elStatus.value = c?.status || "pending";

    if(elDivision) elDivision.value = c?.division || "";
    if(elDistrict) elDistrict.value = c?.district || "";
    if(elSlumArea) elSlumArea.value = c?.slum_area || "";

    // ✅ fixed date handling
    if(elStartDate) elStartDate.value = extractDateOnly(c?.start_date);
    if(elEndDate) elEndDate.value = extractDateOnly(c?.end_date);
    if(elTime) elTime.value = normalizeTimeInput(c?.start_time);

    if(elGender) elGender.value = c?.target_gender || "";
    if(elAgeGroup) elAgeGroup.value = c?.age_group || "";

    if(elEducation) elEducation.value = c?.education_required || "";
    if(elSkills) elSkills.value = c?.skills_required || "";
    if(elDescription) elDescription.value = c?.description || "";

    showReq(c?.category);
    applyDateConstraints();
  }catch{
    toast("Could not load campaign.");
  }
}

async function save(){
  const id = qs().get("id");
  if(!id){ toast("No campaign id."); return; }

  applyDateConstraints();
  const v = validateDatesForSave();
  if(!v.ok){ toast(v.message); return; }

  const ok = await confirmAction({
    title: "Save Changes",
    message: "Are you sure you want to save these changes?",
    variant: "primary"
  });
  if(!ok) return;

  const session = getSession();
  const elStartDate = document.getElementById("startDate");
  const elEndDate = document.getElementById("endDate");
  const elTime = document.getElementById("time");

  const start_date = normalizeDateInput(elStartDate?.value);
  const end_date = normalizeDateInput(elEndDate?.value);
  const start_time = normalizeTimeInput(elTime?.value);

  try{
    const res = await fetch(`/api/campaigns/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        org_id: session?.org_id,
        start_date,
        end_date,
        start_time
      })
    });
    if(!res.ok) throw new Error("put failed");
    toast("Saved.");
  }catch{
    toast("Save failed.");
  }
}

async function cancelCampaign(){
  const id = qs().get("id");
  if(!id){ toast("No campaign id."); return; }

  const ok = await confirmAction({
    title: "Cancel Campaign",
    message: "Are you sure you want to cancel this campaign?",
    variant: "danger"
  });
  if(!ok) return;

  const session = getSession();
  try{
    const res = await fetch(`/api/campaigns/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        org_id: session?.org_id,
        status: "cancelled"
      })
    });
    if(!res.ok) throw new Error("cancel failed");
    toast("Cancelled.");
    setTimeout(goBack, 350);
  }catch{
    toast("Cancel failed.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("backBtn")?.addEventListener("click", goBack);

  const brandBtn = document.getElementById("brandBtn");
  brandBtn?.addEventListener("click", goBack);
  brandBtn?.addEventListener("keydown", (e) => {
    if(e.key === "Enter" || e.key === " "){
      e.preventDefault();
      goBack();
    }
  });

  const elStartDate = document.getElementById("startDate");
  const elEndDate = document.getElementById("endDate");
  const elTime = document.getElementById("time");

  elStartDate?.addEventListener("change", () => {
    applyDateConstraints();
    // Keep end date >= start date
    if(elEndDate && elEndDate.value && elEndDate.value < elEndDate.min){
      elEndDate.value = elEndDate.min;
    }
  });

  elEndDate?.addEventListener("change", applyDateConstraints);
  elTime?.addEventListener("change", () => {});

  document.getElementById("saveBtn")?.addEventListener("click", save);
  document.getElementById("cancelBtn")?.addEventListener("click", cancelCampaign);

  applyDateConstraints();
  load();
  
  // ✅ NEW: Load eligible families table
  const campaignId = qs().get("id");
  if(campaignId) {
    loadEligibleFamilies(campaignId);
  }
});

/**
 * ✅ NEW: Load and display eligible families
 */
async function loadEligibleFamilies(campaignId){
  const containerId = "eligibleFamiliesContainer";
  const container = document.getElementById(containerId);
  if(!container) return;

  try {
    // Dynamic import the component
    const script = document.createElement("script");
    script.src = "./eligible-families-table.js";
    script.onload = async () => {
      try {
        const table = new EligibleFamiliesTable(containerId);
        await table.load(campaignId);
        await table.loadCampaignDetails(campaignId);
        table.render();
      } catch(err) {
        console.error("Error loading families:", err);
        container.innerHTML = `<div class="families-section"><p style="color:red;">Error loading eligible families: ${err.message}</p></div>`;
      }
    };
    document.head.appendChild(script);
  } catch(err) {
    console.error("Error initializing families table:", err);
    container.innerHTML = `<div class="families-section"><p style="color:red;">Error: ${err.message}</p></div>`;
  }
}