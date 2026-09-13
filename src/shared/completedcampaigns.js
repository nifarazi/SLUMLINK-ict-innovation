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

/**
 * ✅ FIXED:
 * - If backend sends "YYYY-MM-DD" -> keep it (perfect for <input type="date">)
 * - If backend sends ISO datetime like "2026-02-08T18:00:00.000Z"
 *   -> convert to LOCAL date string (Bangladesh: +6) and return YYYY-MM-DD
 */
function extractDateOnly(dbDateString){
  if(!dbDateString) return "";

  // already correct format
  if(typeof dbDateString === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dbDateString.trim())){
    return dbDateString.trim();
  }

  // ISO datetime -> local date
  const d = new Date(dbDateString);
  if(!isNaN(d.getTime())){
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  // fallback
  return String(dbDateString).trim().slice(0, 10);
}

function showReq(category){
  const c = (category || "").toLowerCase();
  const show = (c === "employment" || c === "workshop");
  document.getElementById("eduField")?.classList.toggle("hidden", !show);
  document.getElementById("skillsField")?.classList.toggle("hidden", !show);
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
  const elPeopleHelped = document.getElementById("peopleHelped");

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
    if(elStatus) elStatus.value = c?.status || "completed";

    if(elDivision) elDivision.value = c?.division || "";
    if(elDistrict) elDistrict.value = c?.district || "";
    if(elSlumArea) elSlumArea.value = c?.slum_area || "";

    // ✅ fixed date handling
    if(elStartDate) elStartDate.value = extractDateOnly(c?.start_date);
    if(elEndDate) elEndDate.value = extractDateOnly(c?.end_date);

    if(elTime) elTime.value = (c?.start_time || "").slice(0, 5);

    if(elGender) elGender.value = c?.target_gender || "";
    if(elAgeGroup) elAgeGroup.value = c?.age_group || "";

    if(elEducation) elEducation.value = c?.education_required || "";
    if(elSkills) elSkills.value = c?.skills_required || "";
    if(elDescription) elDescription.value = c?.description || "";

    showReq(c?.category);
  }catch{
    toast("Could not load campaign.");
  }

  // beneficiaries (optional route)
  if(elPeopleHelped){
    try{
      const res2 = await fetch(`/api/campaigns/${encodeURIComponent(id)}/impact${extra}`);
      if(!res2.ok) throw new Error("impact failed");
      const p2 = await res2.json().catch(()=>null);
      const imp = p2?.data || p2;
      const people = imp?.beneficiaries ?? imp?.people_helped ?? "—";
      elPeopleHelped.value = String(people);
    }catch{
      elPeopleHelped.value = "—";
    }
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

  load();
});