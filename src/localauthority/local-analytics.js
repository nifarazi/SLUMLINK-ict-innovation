// Local Authority Analytics Dashboard
// Filters data by the logged-in authority's division

const toastEl = document.getElementById("toast");
let toastTimer;

function toast(msg) {
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem("SLUMLINK_SESSION") || "null");
  } catch {
    return null;
  }
}

function extractDivisionFromName(orgName) {
  // Extract division from org names like "Dhaka Local Authority", "Chattogram Local Authority", etc.
  if (!orgName) return null;
  const match = orgName.match(/^([A-Za-z\s]+)\s+Local Authority$/i);
  return match ? match[1].trim() : null;
}

function fmtNum(n) {
  return (Number(n) || 0).toLocaleString();
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

async function safeJSON(res) {
  return res.json().catch(() => null);
}

let complaintData = [];
let campaignData = [];
let organizationInfo = {};

async function initAnalytics() {
  try {
    // Get session info
    const session = readSession();
    if (!session || !session.org_id) {
      toast("Session expired. Please log in again.");
      setTimeout(() => window.location.href = "../index.html", 2000);
      return;
    }

    const org_id = session.org_id;
    let division = session.org_name ? extractDivisionFromName(session.org_name) : null;

    // If division not available from session, try fetching org details
    if (!division) {
      try {
        const orgRes = await fetch(`/api/ngo/${org_id}`);
        const orgData = await safeJSON(orgRes);
        
        if (orgRes.ok && orgData) {
          organizationInfo = orgData.data || orgData;
          division = extractDivisionFromName(organizationInfo.org_name);
        }
      } catch (e) {
        console.warn("Could not fetch org details:", e);
      }
    } else {
      organizationInfo.org_name = session.org_name;
    }

    if (!division) {
      throw new Error("Could not determine division. Please contact administrator.");
    }

    // Fetch all complaints and campaigns
    const [complaintsRes, campaignsRes] = await Promise.all([
      fetch("/api/complaint"),
      fetch("/api/campaigns")
    ]);

    const complaintsData = await safeJSON(complaintsRes);
    const campaignsData = await safeJSON(campaignsRes);

    if (!complaintsRes.ok || !campaignsRes.ok) {
      throw new Error("Failed to load data");
    }

    // Filter by division
    complaintData = (complaintsData.data || []).filter(c => c.division === division);
    campaignData = (campaignsData.data || []).filter(c => c.division === division);

    // Load analytics
    loadAnalytics();
  } catch (error) {
    console.error("Error initializing analytics:", error);
    toast("Error loading analytics. " + error.message);
  }
}

function loadAnalytics() {
  // Calculate statistics
  const stats = {
    totalComplaints: complaintData.length,
    pendingComplaints: complaintData.filter(c => c.status === "pending").length,
    inProgressComplaints: complaintData.filter(c => c.status === "in progress").length,
    resolvedComplaints: complaintData.filter(c => c.status === "resolved").length,
    totalCampaigns: campaignData.length,
    activeCampaigns: campaignData.filter(c => c.status === "in_progress").length,
    completedCampaigns: campaignData.filter(c => c.status === "completed").length,
    areasCovered: new Set(campaignData.map(c => c.slum_area)).size
  };

  // Update stat cards
  document.getElementById("totalComplaints").textContent = fmtNum(stats.totalComplaints);
  document.getElementById("pendingComplaints").textContent = fmtNum(stats.pendingComplaints);
  document.getElementById("inProgressComplaints").textContent = fmtNum(stats.inProgressComplaints);
  document.getElementById("resolvedComplaints").textContent = fmtNum(stats.resolvedComplaints);
  document.getElementById("totalCampaigns").textContent = fmtNum(stats.totalCampaigns);
  document.getElementById("activeCampaigns").textContent = fmtNum(stats.activeCampaigns);
  document.getElementById("completedCampaigns").textContent = fmtNum(stats.completedCampaigns);
  document.getElementById("areasCovered").textContent = fmtNum(stats.areasCovered);

  // Create charts
  createComplaintStatusChart();
  createComplaintCategoryChart();
  createCampaignStatusChart();
  createCampaignGenderChart();
  createTopAreasChart();
  createTopCategoriesChart();
  createComplaintTimelineChart();
  createCampaignTimelineChart();
}

// ===== Charts =====

let charts = {};

function createComplaintStatusChart() {
  const ctx = document.getElementById("complaintStatusChart");
  if (!ctx) return;

  if (charts.complaintStatus) charts.complaintStatus.destroy();

  const statuses = {
    pending: complaintData.filter(c => c.status === "pending").length,
    "in progress": complaintData.filter(c => c.status === "in progress").length,
    resolved: complaintData.filter(c => c.status === "resolved").length
  };

  const labels = Object.keys(statuses).map(s => s.charAt(0).toUpperCase() + s.slice(1));
  const values = Object.values(statuses);
  const colors = ["rgba(237, 141, 131, 0.8)", "rgba(241, 221, 140, 0.8)", "rgba(162, 231, 191, 0.8)"];

  charts.complaintStatus = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: "rgba(255, 244, 230, 1)",
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { font: { size: 12 }, color: "rgba(97, 55, 41, 0.78)" } }
      }
    }
  });
}

function createComplaintCategoryChart() {
  const ctx = document.getElementById("complaintCategoryChart");
  if (!ctx) return;

  if (charts.complaintCategory) charts.complaintCategory.destroy();

  const categories = {};
  complaintData.forEach(c => {
    categories[c.category] = (categories[c.category] || 0) + 1;
  });

  const labels = Object.keys(categories);
  const values = Object.values(categories);

  charts.complaintCategory = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Complaints",
        data: values,
        backgroundColor: "rgba(223, 164, 119, 0.8)",
        borderColor: "rgba(164, 98, 77, 0.8)",
        borderWidth: 1,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { color: "rgba(97, 55, 41, 0.78)" } },
        x: { ticks: { color: "rgba(97, 55, 41, 0.78)" } }
      }
    }
  });
}

function createCampaignStatusChart() {
  const ctx = document.getElementById("campaignStatusChart");
  if (!ctx) return;

  if (charts.campaignStatus) charts.campaignStatus.destroy();

  const statuses = {
    pending: campaignData.filter(c => c.status === "pending").length,
    in_progress: campaignData.filter(c => c.status === "in_progress").length,
    completed: campaignData.filter(c => c.status === "completed").length,
    not_executed: campaignData.filter(c => c.status === "not_executed").length
  };

  const labels = Object.keys(statuses).map(s => s.replace(/_/g, " ").charAt(0).toUpperCase() + s.replace(/_/g, " ").slice(1));
  const values = Object.values(statuses);
  const colors = ["rgba(240, 208, 142, 0.8)", "rgba(239, 154, 198, 0.8)", "rgba(163, 247, 197, 0.8)", "rgba(189, 195, 199, 0.8)"];

  charts.campaignStatus = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: "rgba(255, 244, 230, 1)",
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { font: { size: 12 }, color: "rgba(97, 55, 41, 0.78)" } }
      }
    }
  });
}

function createCampaignGenderChart() {
  const ctx = document.getElementById("campaignGenderChart");
  if (!ctx) return;

  if (charts.campaignGender) charts.campaignGender.destroy();

  const genders = {};
  campaignData.forEach(c => {
    genders[c.target_gender] = (genders[c.target_gender] || 0) + 1;
  });

  const labels = Object.keys(genders).map(g => g.charAt(0).toUpperCase() + g.slice(1));
  const values = Object.values(genders);
  const colors = ["rgba(192, 224, 208, 0.8)", "rgba(179, 155, 147, 0.8)", "rgba(206, 176, 171, 0.8)", "rgba(160, 180, 172, 0.8)"];

  charts.campaignGender = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Campaigns",
        data: values,
        backgroundColor: colors,
        borderColor: "rgba(97, 55, 41, 0.2)",
        borderWidth: 1,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { color: "rgba(97, 55, 41, 0.78)" } },
        x: { ticks: { color: "rgba(97, 55, 41, 0.78)" } }
      }
    }
  });
}

function createTopAreasChart() {
  const container = document.getElementById("topAreasContainer");
  if (!container) return;

  const areas = {};
  complaintData.forEach(c => {
    areas[c.area] = (areas[c.area] || 0) + 1;
  });

  const sorted = Object.entries(areas)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (sorted.length === 0) {
    container.innerHTML = '<div class="chart-list-item"><div class="chart-list-label">No data available</div></div>';
    return;
  }

  const maxValue = Math.max(...sorted.map(s => s[1]));
  container.innerHTML = sorted.map(([area, count]) => {
    const width = (count / maxValue) * 100;
    return `
      <div class="chart-list-item">
        <div class="chart-list-label">${area || "Unknown"}</div>
        <div class="chart-list-bar" style="width: ${width}%"></div>
        <div class="chart-list-count">${count}</div>
      </div>
    `;
  }).join("");
}

function createTopCategoriesChart() {
  const container = document.getElementById("topCategoriesContainer");
  if (!container) return;

  const categories = {};
  complaintData.forEach(c => {
    categories[c.category] = (categories[c.category] || 0) + 1;
  });

  const sorted = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (sorted.length === 0) {
    container.innerHTML = '<div class="chart-list-item"><div class="chart-list-label">No data available</div></div>';
    return;
  }

  const maxValue = Math.max(...sorted.map(s => s[1]));
  container.innerHTML = sorted.map(([category, count]) => {
    const width = (count / maxValue) * 100;
    return `
      <div class="chart-list-item">
        <div class="chart-list-label">${category}</div>
        <div class="chart-list-bar" style="width: ${width}%"></div>
        <div class="chart-list-count">${count}</div>
      </div>
    `;
  }).join("");
}

function createComplaintTimelineChart() {
  const ctx = document.getElementById("complaintTimelineChart");
  if (!ctx) return;

  if (charts.complaintTimeline) charts.complaintTimeline.destroy();

  // Get last 12 months of complaint data
  const months = {};
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    months[key] = 0;
  }

  complaintData.forEach(c => {
    const date = new Date(c.created_at);
    const key = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    if (months.hasOwnProperty(key)) {
      months[key]++;
    }
  });

  const labels = Object.keys(months);
  const values = Object.values(months);

  charts.complaintTimeline = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Complaints",
        data: values,
        borderColor: "rgba(231, 76, 60, 0.8)",
        backgroundColor: "rgba(231, 76, 60, 0.1)",
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: "rgba(231, 76, 60, 0.8)",
        pointBorderColor: "#FFF",
        pointBorderWidth: 2,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: "bottom" }
      },
      scales: {
        y: { beginAtZero: true, ticks: { color: "rgba(97, 55, 41, 0.78)" } },
        x: { ticks: { color: "rgba(97, 55, 41, 0.78)" } }
      }
    }
  });
}

function createCampaignTimelineChart() {
  const ctx = document.getElementById("campaignTimelineChart");
  if (!ctx) return;

  if (charts.campaignTimeline) charts.campaignTimeline.destroy();

  // Get last 12 months of campaign data
  const months = {};
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    months[key] = 0;
  }

  campaignData.forEach(c => {
    const date = new Date(c.created_at);
    const key = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    if (months.hasOwnProperty(key)) {
      months[key]++;
    }
  });

  const labels = Object.keys(months);
  const values = Object.values(months);

  charts.campaignTimeline = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Campaigns Created",
        data: values,
        borderColor: "rgba(52, 152, 219, 0.8)",
        backgroundColor: "rgba(52, 152, 219, 0.1)",
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: "rgba(52, 152, 219, 0.8)",
        pointBorderColor: "#FFF",
        pointBorderWidth: 2,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: "bottom" }
      },
      scales: {
        y: { beginAtZero: true, ticks: { color: "rgba(97, 55, 41, 0.78)" } },
        x: { ticks: { color: "rgba(97, 55, 41, 0.78)" } }
      }
    }
  });
}

// ===== Navigation =====


document.getElementById("backBtn").addEventListener("click", () => {
  window.location.href = "./local-dashboard.html";
});

// ===== Export Report =====

document.getElementById("exportBtn").addEventListener("click", () => {
  const jsPDFCtor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
  if (!jsPDFCtor) {
    toast("PDF library not available");
    return;
  }

  const doc = new jsPDFCtor({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  function addText(text, size, weight, color) {
    doc.setFont("helvetica", weight);
    doc.setFontSize(size);
    doc.setTextColor(...(color || [97, 55, 41]));
    const lines = doc.splitTextToSize(text, contentWidth);
    doc.text(lines, margin, y);
    y += (lines.length * 6) + 4;
  }

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(97, 55, 41);
  doc.text("SlumLink Analytics Report", pageWidth / 2, y, { align: "center" });
  y += 12;

  // Division
  const division = extractDivisionFromName(organizationInfo.org_name) || "Unknown";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(division + " Division", margin, y);
  y += 10;

  // Date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(97, 55, 41);
  doc.text("Generated on: " + new Date().toLocaleString(), margin, y);
  y += 12;

  // Statistics
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Complaint Statistics", margin, y);
  y += 8;

  const stats = [
    ["Total Complaints", complaintData.length],
    ["Pending", complaintData.filter(c => c.status === "pending").length],
    ["In Progress", complaintData.filter(c => c.status === "in progress").length],
    ["Resolved", complaintData.filter(c => c.status === "resolved").length]
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  stats.forEach(([label, value]) => {
    doc.text(label + ": " + value, margin + 5, y);
    y += 6;
  });

  y += 4;

  // Campaign Statistics
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Campaign Statistics", margin, y);
  y += 8;

  const campaignStats = [
    ["Total Campaigns", campaignData.length],
    ["Active", campaignData.filter(c => c.status === "in_progress").length],
    ["Completed", campaignData.filter(c => c.status === "completed").length],
    ["Areas Covered", new Set(campaignData.map(c => c.slum_area)).size]
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  campaignStats.forEach(([label, value]) => {
    doc.text(label + ": " + value, margin + 5, y);
    y += 6;
  });

  // Save PDF
  const filename = (division.replace(/[^a-z0-9]+/gi, "_").toLowerCase() || "analytics") + "_report.pdf";
  doc.save(filename);
  toast("Report exported successfully");
});

// Initialize on page load
document.addEventListener("DOMContentLoaded", initAnalytics);
