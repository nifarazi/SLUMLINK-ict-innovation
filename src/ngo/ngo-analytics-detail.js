/**
 * NGO Analytics Detail Report - ngo-analytics-detail.js
 * Displays comprehensive analytics with PDF export capability
 */

let charts = {};
let analyticsData = null;

document.addEventListener('DOMContentLoaded', function () {
  // Navigation
  document.getElementById('brandBtn').addEventListener('click', () => {
    window.location.href = '/';
  });

  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = './ngo-analytics-overview.html';
    });
  }

  const goBackBtn = document.getElementById('goBackBtn');
  if (goBackBtn) {
    goBackBtn.addEventListener('click', () => {
      window.location.href = './ngo-analytics-overview.html';
    });
  }

  // PDF Export
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportReportPDF);
  }

  const exportBtn2 = document.getElementById('exportBtn2');
  if (exportBtn2) {
    exportBtn2.addEventListener('click', exportReportPDF);
  }

  // Load analytics
  loadAnalytics();
});

/**
 * Get NGO ID from session/localStorage
 */
function getNgoId() {
  // Try to get from localStorage first (where the session is stored)
  let session = null;
  try {
    session = JSON.parse(localStorage.getItem('SLUMLINK_SESSION'));
  } catch (e) {
    console.warn('Could not parse session:', e);
  }

  if (session && session.org_id) {
    return session.org_id;
  }

  // Fallback: try to get from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('orgId') || null;
}

/**
 * Load analytics data
 */
async function loadAnalytics() {
  const orgId = getNgoId();

  if (!orgId) {
    displayError('Unable to load analytics. Please ensure you are logged in.');
    return;
  }

  try {
    const response = await fetch(`/api/ngo/analytics?orgId=${encodeURIComponent(orgId)}`);
    const result = await response.json();

    if (result.status !== 'success') {
      displayError(result.message || 'Failed to fetch analytics');
      return;
    }

    analyticsData = result.data;
    renderContent(analyticsData);

  } catch (error) {
    console.error('Error loading analytics:', error);
    displayError('An error occurred while loading analytics.');
  }
}

/**
 * Render all content
 */
function renderContent(data) {
  const ngoName = data.ngo?.org_name || 'Your NGO';
  document.getElementById('reportTitle').textContent = ngoName + ' - Detailed Analytics Report';

  // Populate metrics
  const fmt = (num) => new Intl.NumberFormat().format(Math.round(num || 0));
  document.getElementById('cardTotalCampaigns').textContent = fmt(data.totals.totalProjects);
  document.getElementById('cardDwellersHelped').textContent = fmt(data.totals.dwellersHelped);
  document.getElementById('cardAidsDistributed').textContent = fmt(data.totals.aidsDistributed);
  document.getElementById('cardActiveProjects').textContent = fmt(data.totals.activeProjects);

  // Render charts
  renderCampaignStatusChart(data.projectsByStatus);
  renderCategoryChart(data.campaigns);
  renderAidTypeChart(data.aidDistribution);
  renderMonthlyChart(data.monthlyGrowth);

  // Render tables
  renderCampaignsTable(data.campaigns);
  renderAidSummaryTable(data.aidDistribution);
}

/**
 * Campaign Status Chart (Pie)
 */
function renderCampaignStatusChart(statusData) {
  const ctx = document.getElementById('campaignStatusChart').getContext('2d');
  if (charts.status) charts.status.destroy();

  const labels = Object.keys(statusData).map(capitalizeWords);
  const values = Object.values(statusData);

  charts.status = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: ['#A4624D', '#DFA477', '#C0E0D0', '#AD7562', '#C86459'],
        borderColor: '#FFF4E6',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { size: 12, weight: '600' }, color: '#613729', padding: 12 }
        }
      }
    }
  });
}

/**
 * Category Chart (Bar)
 */
function renderCategoryChart(campaigns) {
  const ctx = document.getElementById('categoryChart').getContext('2d');
  if (charts.category) charts.category.destroy();

  const categoryCount = {};
  campaigns.forEach(c => {
    const cat = c.category || 'Uncategorized';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });

  const labels = Object.keys(categoryCount);
  const values = Object.values(categoryCount);

  charts.category = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Campaigns',
        data: values,
        backgroundColor: '#A4624D',
        borderColor: '#8B5A3C',
        borderWidth: 1,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { ticks: { color: '#613729' }, grid: { color: 'rgba(97, 55, 41, 0.08)' } },
        y: { ticks: { color: '#613729' }, grid: { display: false } }
      }
    }
  });
}

/**
 * Aid Type Chart (Bar)
 */
function renderAidTypeChart(aidData) {
  const ctx = document.getElementById('aidTypeChart').getContext('2d');
  if (charts.aidType) charts.aidType.destroy();

  if (!aidData || aidData.length === 0) {
    ctx.canvas.parentElement.innerHTML = '<div class="no-data">No distribution data available</div>';
    return;
  }

  const labels = aidData.map(a => a.aid_type);
  const values = aidData.map(a => a.total);

  charts.aidType = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Quantity',
        data: values,
        backgroundColor: '#DFA477',
        borderColor: '#C9844A',
        borderWidth: 1,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true, ticks: { color: '#613729' }, grid: { color: 'rgba(97, 55, 41, 0.08)' } },
        x: { ticks: { color: '#613729' }, grid: { display: false } }
      }
    }
  });
}

/**
 * Monthly Trend Chart (Line)
 */
function renderMonthlyChart(monthlyData) {
  const ctx = document.getElementById('monthlyChart').getContext('2d');
  if (charts.monthly) charts.monthly.destroy();

  const currentMonth = monthlyData.currentMonth || 0;
  const previousMonth = monthlyData.previousMonth || 0;

  charts.monthly = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Previous Month', 'Current Month'],
      datasets: [{
        label: 'Aids Distributed',
        data: [previousMonth, currentMonth],
        borderColor: '#A4624D',
        backgroundColor: 'rgba(164, 98, 77, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointBackgroundColor: '#A4624D',
        pointBorderColor: '#FFF4E6',
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true, ticks: { color: '#613729' }, grid: { color: 'rgba(97, 55, 41, 0.08)' } },
        x: { ticks: { color: '#613729' }, grid: { display: false } }
      }
    }
  });
}

/**
 * Render campaigns table
 */
function renderCampaignsTable(campaigns) {
  const tbody = document.getElementById('campaignsTableBody');

  if (!campaigns || campaigns.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No campaigns found</td></tr>';
    return;
  }

  tbody.innerHTML = campaigns.slice(0, 10).map(campaign => `
    <tr>
      <td><strong>${campaign.title || '—'}</strong></td>
      <td>${campaign.category || '—'}</td>
      <td>${campaign.division || '—'}</td>
      <td>${formatDate(campaign.start_date)} to ${formatDate(campaign.end_date)}</td>
      <td><span class="status-badge status-${campaign.status || 'pending'}">${capitalizeWords(campaign.status || 'pending')}</span></td>
    </tr>
  `).join('');
}

/**
 * Render aid summary table
 */
function renderAidSummaryTable(aidData) {
  const tbody = document.getElementById('aidSummaryTableBody');

  if (!aidData || aidData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px;">No distribution data found</td></tr>';
    return;
  }

  const total = aidData.reduce((sum, a) => sum + (a.total || 0), 0);

  tbody.innerHTML = aidData.map(aid => {
    const percent = total > 0 ? Math.round((aid.total / total) * 1000) / 10 : 0;
    return `
      <tr>
        <td><strong>${aid.aid_type || '—'}</strong></td>
        <td>${new Intl.NumberFormat().format(aid.total || 0)}</td>
        <td>${percent}%</td>
      </tr>
    `;
  }).join('');
}

/**
 * Export report as PDF
 */
function exportReportPDF() {
  if (!analyticsData) {
    alert('Analytics data not loaded. Please refresh the page.');
    return;
  }

  const jsPDFCtor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
  if (!jsPDFCtor) {
    alert('PDF library not loaded');
    return;
  }

  const doc = new jsPDFCtor({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(97, 55, 41);
  doc.text('NGO Analytics Report', pageWidth / 2, y, { align: 'center' });
  y += 12;

  // NGO Name
  doc.setFontSize(14);
  doc.text(analyticsData.ngo?.org_name || 'NGO Name', margin, y);
  y += 10;

  // Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Generated on: ' + new Date().toLocaleString(), margin, y);
  y += 12;

  // Summary Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Campaign Summary', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const campaigns = analyticsData.campaigns || [];
  doc.text(`Total Campaigns: ${analyticsData.totals.totalProjects}`, margin, y);
  y += 6;
  doc.text(`Active Projects: ${analyticsData.totals.activeProjects}`, margin, y);
  y += 10;

  // Top Campaigns
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Recent Campaigns', margin, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  campaigns.slice(0, 5).forEach(cam => {
    doc.text(`• ${cam.title} (${cam.category} - ${capitalizeWords(cam.status)})`, margin + 3, y);
    y += 5;
    if (y > 270) {
      doc.addPage();
      y = margin;
    }
  });

  y += 5;

  // Aid Distribution Summary
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Aid Distribution', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Families Helped: ${analyticsData.totals.dwellersHelped}`, margin, y);
  y += 6;
  doc.text(`Total Aids Distributed: ${analyticsData.totals.aidsDistributed}`, margin, y);
  y += 10;

  // Aid Breakdown
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Distribution Breakdown', margin, y);
  y += 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const aidData = analyticsData.aidDistribution || [];
  const totalAids = aidData.reduce((sum, a) => sum + (a.total || 0), 0);

  aidData.forEach(aid => {
    const percent = totalAids > 0 ? Math.round((aid.total / totalAids) * 1000) / 10 : 0;
    doc.text(`• ${aid.aid_type}: ${aid.total} units (${percent}%)`, margin + 3, y);
    y += 5;
  });

  y += 5;

  // Monthly Growth
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Monthly Growth', margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const growth = analyticsData.monthlyGrowth || {};
  doc.text(`Previous Month: ${growth.previousMonth || 0} aids`, margin, y);
  y += 5;
  doc.text(`Current Month: ${growth.currentMonth || 0} aids`, margin, y);
  y += 5;
  doc.text(`Growth: ${growth.percent || 0}%`, margin, y);

  // Save PDF
  const filename = `NGO_Analytics_${analyticsData.ngo?.org_name || 'Report'}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

/**
 * Utility functions
 */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function capitalizeWords(str) {
  if (!str) return '';
  return str.toLowerCase().split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function displayError(message) {
  const container = document.querySelector('.container');
  container.innerHTML = `
    <div style="
      background: rgba(255, 244, 230, 0.92);
      border: 1px solid rgba(97, 55, 41, 0.18);
      border-radius: 26px;
      padding: 40px;
      text-align: center;
      font-size: 16px;
      color: rgba(97, 55, 41, 0.8);
    ">
      <i class="fas fa-exclamation-triangle" style="font-size: 32px; color: #A4624D; margin-bottom: 12px; display: block;"></i>
      <p>${message}</p>
    </div>
  `;
}
