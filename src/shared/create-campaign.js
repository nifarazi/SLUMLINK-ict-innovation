// ===== Helpers =====
const $ = (id) => document.getElementById(id);

function getRole(){
  const params = new URLSearchParams(window.location.search);
  return (params.get("role") || "").toLowerCase(); // "ngo" | "localauthority"
}

function getBackLink(){
  const params = new URLSearchParams(window.location.search);
  const explicit = params.get("back");
  if(explicit) return explicit;

  const role = getRole();
  if(role === "ngo") return "../ngo/ngo-dashboard.html";
  return "../localauthority/local-dashboard.html";
}

function goHome(){ window.location.href = "/"; }

// ===== Header actions =====
const brandBtn = $("brandBtn");
const backBtn  = $("backBtn");

brandBtn.addEventListener("click", goHome);
brandBtn.addEventListener("keydown", (e)=> {
  if(e.key==="Enter" || e.key===" "){ e.preventDefault(); goHome(); }
});

backBtn.addEventListener("click", ()=> {
  window.location.href = getBackLink();
});

// ===== Toast =====
const toastEl = $("toast");
let toastTimer;
function toast(msg){
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  toastTimer = setTimeout(()=> toastEl.classList.remove("show"), 2200);
}

// ===== Date Rules =====
const startDateEl = $("startDate");
const endDateEl = $("endDate");

function toISODate(d){
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}

(function initDateMins(){
  const now = new Date();
  now.setHours(0,0,0,0);

  const minStart = toISODate(now);
  startDateEl.min = minStart;

  // End date cannot be before start date; initially min = start min
  endDateEl.min = minStart;

  if(startDateEl.value && startDateEl.value < minStart) startDateEl.value = "";
  if(endDateEl.value && endDateEl.value < endDateEl.min) endDateEl.value = "";
})();

startDateEl.addEventListener("change", () => {
  const v = (startDateEl.value || "").trim();

  if(!v){
    const now = new Date();
    now.setHours(0,0,0,0);
    endDateEl.min = toISODate(now);
    return;
  }

  endDateEl.min = v;

  if(endDateEl.value && endDateEl.value < v){
    endDateEl.value = "";
  }
});

// ===== Division -> District -> Slum Data =====
const AREA_DATA = {
  "Dhaka": {
    "Dhaka (North)": [
      "Korail",
      "Begun Bari",
      "Duaripara",
      "Kallyanpur",
      "Pora Basti",
      "Chalantika",
      "Agargaon",
      "Sattola (Mohakhali)",
      "Mohammadpur",
      "Basbari",
      "Molla"
    ],
    "Dhaka (South)": [
      "Nama Para",
      "Pura",
      "Nubur",
      "Mannan"
    ],
    "Narayanganj": [
      "Bhuigar",
      "Chashara",
      "Fatullah Cluster"
    ],
    "Gazipur": [
      "Tongi Cluster",
      "Board Bazar Cluster"
    ]
  },

  "Chattogram": {
    "Chattogram (City)": ["Halishahar", "Pahartali", "Agrabad Cluster"],
    "Cox's Bazar": ["Teknaf Cluster", "Kutupalong (Nearby)"]
  },

  "Khulna": { "Khulna": ["Rupsha Ghat Cluster", "Khalishpur Cluster"] },
  "Rajshahi": { "Rajshahi": ["Kazla Cluster", "Bornali Cluster"] },
  "Barishal": { "Barishal": ["Nathullabad Cluster", "Battala Cluster"] },
  "Sylhet": { "Sylhet": ["Ambarkhana Cluster", "Subidbazar Cluster"] },
  "Rangpur": { "Rangpur": ["Jahaj Company Cluster", "Modern Mor Cluster"] },
  "Mymensingh": { "Mymensingh": ["Town Hall Cluster", "Charpara Cluster"] }
};

const divisionEl = $("division");
const districtEl = $("district");
const slumAreaEl = $("slumArea");

function fillSelect(selectEl, items, placeholder="Select"){
  selectEl.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = placeholder;
  selectEl.appendChild(opt0);

  items.forEach((it) => {
    const opt = document.createElement("option");
    opt.value = it;
    opt.textContent = it;
    selectEl.appendChild(opt);
  });
}

function initDivision(){
  const divisions = Object.keys(AREA_DATA);
  fillSelect(divisionEl, divisions, "Select");
  districtEl.disabled = true;
  slumAreaEl.disabled = true;
  fillSelect(districtEl, [], "Select");
  fillSelect(slumAreaEl, [], "Select");
}
initDivision();

divisionEl.addEventListener("change", () => {
  const division = divisionEl.value;
  if(!division){
    districtEl.disabled = true;
    slumAreaEl.disabled = true;
    fillSelect(districtEl, [], "Select");
    fillSelect(slumAreaEl, [], "Select");
    return;
  }

  const districts = Object.keys(AREA_DATA[division] || {});
  fillSelect(districtEl, districts, "Select");
  districtEl.disabled = false;

  slumAreaEl.disabled = true;
  fillSelect(slumAreaEl, [], "Select");
});

districtEl.addEventListener("change", () => {
  const division = divisionEl.value;
  const district = districtEl.value;

  if(!division || !district){
    slumAreaEl.disabled = true;
    fillSelect(slumAreaEl, [], "Select");
    return;
  }

  const slums = (AREA_DATA[division]?.[district] || []);
  fillSelect(slumAreaEl, slums, "Select");
  slumAreaEl.disabled = false;
});

// ===== Conditional fields (Employment/Workshop/Skill Training) =====
const categoryEl = $("category");
const eduField = $("eduField");
const skillsField = $("skillsField");
const eduEl = $("education");
const skillsEl = $("skills");

function toggleExtraFields(){
  const v = categoryEl.value;

  // ✅ Show for employment, workshop, AND skill_training
  const show = (v === "workshop" || v === "employment" || v === "skill_training");

  eduField.classList.toggle("hidden", !show);
  skillsField.classList.toggle("hidden", !show);

  if(!show){
    eduEl.value = "";
    skillsEl.value = "";
  }
}
categoryEl.addEventListener("change", toggleExtraFields);
toggleExtraFields();

// ===== Modal helpers =====
const form = $("campaignForm");
const createBtn = $("createBtn");

const confirmModal = $("confirmModal");
const successModal = $("successModal");
const cancelConfirm = $("cancelConfirm");
const confirmCreate = $("confirmCreate");
const goDashboard = $("goDashboard");
const confirmBody = $("confirmBody");

function openModal(el){
  el.classList.add("show");
  el.setAttribute("aria-hidden","false");
}
function closeModal(el){
  el.classList.remove("show");
  el.setAttribute("aria-hidden","true");
}

function getValue(id){
  return ($(id).value || "").trim();
}

function isValid(){
  // clear custom validity
  ["title","category","division","district","slumArea","startDate","endDate","time","gender","ageGroup","description","education","skills"]
    .forEach(id => $(id).setCustomValidity(""));

  if(!getValue("title")) { $("title").setCustomValidity("Please fill out this field."); return false; }
  if(!getValue("category")) { $("category").setCustomValidity("Please fill out this field."); return false; }

  if(!getValue("division")) { $("division").setCustomValidity("Please fill out this field."); return false; }
  if(!getValue("district")) { $("district").setCustomValidity("Please fill out this field."); return false; }
  if(!getValue("slumArea")) { $("slumArea").setCustomValidity("Please fill out this field."); return false; }

  if(!getValue("startDate")) { $("startDate").setCustomValidity("Please fill out this field."); return false; }
  if(!getValue("endDate")) { $("endDate").setCustomValidity("Please fill out this field."); return false; }
  if(getValue("endDate") < getValue("startDate")) { $("endDate").setCustomValidity("End Date must be on or after Start Date."); return false; }

  if(!getValue("time")) { $("time").setCustomValidity("Please fill out this field."); return false; }
  if(!getValue("gender")) { $("gender").setCustomValidity("Please fill out this field."); return false; }
  if(!getValue("ageGroup")) { $("ageGroup").setCustomValidity("Please fill out this field."); return false; }

  const desc = ($("description").value || "").trim();
  if(!desc) { $("description").setCustomValidity("Please fill out this field."); return false; }

  // ✅ Require education + skills for workshop/employment/skill_training
  const cat = getValue("category");
  if(cat === "workshop" || cat === "employment" || cat === "skill_training"){
    if(!getValue("education")) { $("education").setCustomValidity("Please fill out this field."); return false; }
    if(!getValue("skills")) { $("skills").setCustomValidity("Please fill out this field."); return false; }
  }

  return true;
}

// ===== Create flow =====
createBtn.addEventListener("click", ()=>{
  const ok = isValid();
  if(!form.reportValidity()) return;
  if(!ok) return;

  const title = getValue("title");
  const categoryText = categoryEl.options[categoryEl.selectedIndex].text;

  const division = getValue("division");
  const district = getValue("district");
  const slumArea = getValue("slumArea");

  const startDate = getValue("startDate");
  const endDate = getValue("endDate");

  confirmBody.innerHTML = `
    You're about to create <b>${title}</b> in <b>${categoryText}</b>.<br/>
    Area: <b>${division}</b> → <b>${district}</b> → <b>${slumArea}</b>.<br/>
    Dates: <b>${startDate}</b> → <b>${endDate}</b>.<br/>
    Do you want to continue?
  `;

  openModal(confirmModal);
  cancelConfirm.focus();
});

cancelConfirm.addEventListener("click", ()=> closeModal(confirmModal));
confirmModal.addEventListener("click", (e)=> { if(e.target === confirmModal) closeModal(confirmModal); });

function getSession(){
  try { return JSON.parse(localStorage.getItem("SLUMLINK_SESSION") || "null"); }
  catch { return null; }
}

confirmCreate.addEventListener("click", ()=>{
  closeModal(confirmModal);

  const role = getRole(); // "ngo" | "localauthority"
  const session = getSession();

  if (!session || !session.org_id) {
    toast("Please sign in again. Session missing.");
    setTimeout(() => window.location.href = "/src/signin.html", 900);
    return;
  }

  if (role === "ngo" && session.role !== "ngo") {
    toast("Please sign in as NGO.");
    return;
  }
  if (role === "localauthority" && session.role !== "localauthority") {
    toast("Please sign in as Local Authority.");
    return;
  }

  const payload = {
    org_id: session.org_id,
    title: getValue("title"),
    category: getValue("category"),
    division: getValue("division"),
    district: getValue("district"),
    slum_area: getValue("slumArea"),
    start_date: getValue("startDate"),
    end_date: getValue("endDate"),
    start_time: getValue("time"),
    target_gender: getValue("gender"),
    age_group: getValue("ageGroup"),
    education_required: getValue("education") || null,
    skills_required: getValue("skills") || null,
    description: ($("description").value || "").trim()
  };

  fetch("/api/campaigns/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(async (r) => {
      const data = await r.json().catch(() => null);
      if(!r.ok){
        toast(data?.message || "Failed to create campaign. Please try again.");
        return;
      }
      toast("✓ New campaign has been created");
      setTimeout(() => openModal(successModal), 700);
    })
    .catch(() => toast("Network error. Please try again."));
});

goDashboard.addEventListener("click", ()=> {
  window.location.href = getBackLink();
});

document.addEventListener("keydown", (e)=>{
  if(e.key === "Escape"){
    if(confirmModal.classList.contains("show")) closeModal(confirmModal);
    if(successModal.classList.contains("show")) closeModal(successModal);
  }
});