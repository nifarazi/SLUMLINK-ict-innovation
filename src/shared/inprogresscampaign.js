function qs(){ return new URLSearchParams(window.location.search); }

function getReturnUrl(){
  const params = qs();
  const raw = params.get("return") || params.get("back");
  if(!raw) return "./viewcampaign.html";
  try{ return decodeURIComponent(raw); }
  catch{ return raw; }
}

function goBack(){ window.location.href = getReturnUrl(); }

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
  toastEl.__t = window.setTimeout(()=>toastEl.classList.remove("show"), 2200);
}

/**
 * ✅ FIXED date normalizer (same as other files)
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

function todayIso(){
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function applyDateConstraints(){
  const elStartDate = document.getElementById("startDate");
  const elEndDate = document.getElementById("endDate");
  if(!elEndDate) return;

  const minToday = todayIso();
  const start = normalizeDateInput(elStartDate?.value);

  // End date cannot be in the past, and cannot be before the (locked) start date.
  const minEnd = start && start > minToday ? start : minToday;
  elEndDate.min = minEnd;

  if(elEndDate.value && normalizeDateInput(elEndDate.value) < minEnd){
    elEndDate.value = minEnd;
  }
}

function validateForSave(){
  const elStartDate = document.getElementById("startDate");
  const elEndDate = document.getElementById("endDate");

  const start = normalizeDateInput(elStartDate?.value);
  const end = normalizeDateInput(elEndDate?.value);
  const minToday = todayIso();

  if(!end) return { ok: false, message: "Please select an End Date." };
  if(end < minToday) return { ok: false, message: `End Date cannot be before ${minToday}.` };
  if(start && end < start) return { ok: false, message: "End Date must be the same as Start Date or a future date." };
  return { ok: true };
}

function confirmAction({ title, message, variant }){
  const modal = document.getElementById("confirmModal");
  const elTitle = document.getElementById("confirmTitle");
  const elMsg = document.getElementById("confirmMessage");
  const btnYes = document.getElementById("confirmYes");
  const btnNo = document.getElementById("confirmNo");

  if(!modal || !btnYes || !btnNo){
    return Promise.resolve(confirm(message || "Are you sure?"));
  }

  if(elTitle) elTitle.textContent = title || "Confirm";
  if(elMsg) elMsg.textContent = message || "Are you sure?";
  btnYes.className = (variant === "danger") ? "danger-btn" : "primary-btn";
  btnYes.textContent = "Yes, Save";
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

function showReq(category){
  const c = (category || "").toLowerCase();
  const show = (c === "employment" || c === "workshop");
  document.getElementById("eduField")?.classList.toggle("hidden", !show);
  document.getElementById("skillsField")?.classList.toggle("hidden", !show);
}

async function load(){
  const id = qs().get("id");
  if(!id) return toast("No campaign id.");

  const session = getSession();
  const extra = session?.org_id ? `?org_id=${encodeURIComponent(session.org_id)}` : "";

  try{
    const res = await fetch(`/api/campaigns/${encodeURIComponent(id)}${extra}`);
    if(!res.ok) throw new Error();
    const payload = await res.json().catch(()=>null);
    const c = payload?.data || payload;

    if((c?.status || "").toLowerCase() === "cancelled"){ goBack(); return; }

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

    if(elTitle) elTitle.value = c?.title || "";
    if(elCategory) elCategory.value = c?.category || "";
    if(elStatus) elStatus.value = c?.status || "in_progress";

    if(elDivision) elDivision.value = c?.division || "";
    if(elDistrict) elDistrict.value = c?.district || "";
    if(elSlumArea) elSlumArea.value = c?.slum_area || "";

    // ✅ fixed date handling
    if(elStartDate) elStartDate.value = extractDateOnly(c?.start_date);
    if(elEndDate) elEndDate.value = extractDateOnly(c?.end_date);
    if(elTime) elTime.value = (c?.start_time || "").slice(0,5);

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
  const session = getSession();

  applyDateConstraints();
  const v = validateForSave();
  if(!v.ok){ toast(v.message); return; }

  const ok = await confirmAction({
    title: "Save Changes",
    message: "Are you sure you want to save these changes?",
    variant: "primary"
  });
  if(!ok) return;

  try{
    const res = await fetch(`/api/campaigns/${encodeURIComponent(id)}`,{
      method:"PUT",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        org_id: session?.org_id,
        end_date: document.getElementById("endDate")?.value,
        start_time: document.getElementById("time")?.value
      })
    });
    if(!res.ok) throw new Error();
    toast("Saved.");
  }catch{
    toast("Save failed (needs PUT /api/campaigns/:id).");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("backBtn")?.addEventListener("click", goBack);

  const brandBtn = document.getElementById("brandBtn");
  brandBtn?.addEventListener("click", goBack);
  brandBtn?.addEventListener("keydown", (e)=>{ 
    if(e.key==="Enter"||e.key===" "){ e.preventDefault(); goBack(); } 
  });

  document.getElementById("saveBtn")?.addEventListener("click", save);

  const elEndDate = document.getElementById("endDate");
  elEndDate?.addEventListener("change", applyDateConstraints);

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