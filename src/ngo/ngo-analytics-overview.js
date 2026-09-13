/**
 * NGO Analytics Overview - ngo-analytics-overview.js
 * Fetches and displays analytics data for the logged-in NGO
 */

let charts = {};

document.addEventListener('DOMContentLoaded', function () {
  // Navigation handlers
  document.getElementById('brandBtn').addEventListener('click', () => {
    window.location.href = '/';
  });

  document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = './ngo-dashboard.html';
  });

  // Load analytics
  loadAnalytics();
});

/**
 * Get NGO ID from session/localStorage
 * This assumes the NGO is logged in and their ID is stored
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
 * Fetch analytics data from backend
 */
async function loadAnalytics() {
  const orgId = getNgoId();

  if (!orgId) {
    console.error('NGO ID not found');
    displayError('Unable to load analytics. Please ensure you are logged in.');
    return;
  }

  try {
    const response = await fetch(`/api/ngo/analytics?orgId=${encodeURIComponent(orgId)}`);
    const result = await response.json();

    if (result.status !== 'success') {
      displayError(result.message || 'Failed to fetch analytics data');
      return;
    }

    const data = result.data;
    populateStatistics(data);
    renderCharts(data);
    populateCampaignsTable(data.campaigns);

  } catch (error) {
    console.error('Error loading analytics:', error);
    displayError('An error occurred while loading analytics.');
  }
}

/**
 * Populate statistics cards
 */
function populateStatistics(data) {
  const ngoName = data.ngo?.org_name || 'NGO';
  document.getElementById('ngoTitle').textContent = ngoName + ' Analytics';
  document.getElementById('ngoSubtitle').textContent = 'Overview of your campaigns, aid distribution, and community impact.';

  // Format numbers with commas
  const fmt = (num) => new Intl.NumberFormat().format(Math.round(num || 0));

  document.getElementById('totalCampaigns').textContent = fmt(data.totals.totalProjects);
  document.getElementById('activeCampaigns').textContent = fmt(data.totals.activeProjects);
  document.getElementById('totalDwellers').textContent = fmt(data.totals.dwellersHelped);
  document.getElementById('totalAids').textContent = fmt(data.totals.aidsDistributed);
}

/**
 * Render all charts
 */
function renderCharts(data) {
  renderCampaignStatusChart(data.projectsByStatus);
  renderCampaignCategoryChart(data.campaigns);
  renderAidDistributionChart(data.aidDistribution);
  renderMonthlyTrendChart(data.monthlyGrowth);
}

/**
 * Campaign Status Distribution (Pie/Doughnut Chart)
 */
function renderCampaignStatusChart(statusData) {
  const ctx = document.getElementById('campaignStatusChart').getContext('2d');

  if (charts.campaignStatus) {
    charts.campaignStatus.destroy();
  }

  const labels = Object.keys(statusData);
  const values = Object.values(statusData);

  if (labels.length === 0) {
    document.getElementById('campaignStatusChart').parentElement.innerHTML = '<div class="no-data">No campaign data available</div>';
    return;
  }

  charts.campaignStatus = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.map(str => capitalizeWords(str)),
      datasets: [{
        data: values,
        backgroundColor: [
          'rgba(164, 98, 77, 0.8)',
          'rgba(223, 164, 119, 0.8)',
          'rgba(192, 224, 208, 0.8)',
          'rgba(173, 117, 98, 0.8)',
          'rgba(200, 100, 90, 0.8)'
        ],
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
          labels: {
            font: { family: "'Poppins', sans-serif", size: 12, weight: '600' },
            color: '#613729',
            padding: 12,
            generateLabels: (chart) => {
              const data = chart.data;
              return data.labels.map((label, i) => ({
                text: `${label} (${data.datasets[0].data[i]})`,
                fillStyle: data.datasets[0].backgroundColor[i],
                hidden: false,
                index: i
              }));
            }
          }
        }
      }
    }
  });
}

/**
 * Campaigns by Category (Bar Chart)
 */
function renderCampaignCategoryChart(campaigns) {
  const ctx = document.getElementById('campaignCategoryChart').getContext('2d');

  if (charts.campaignCategory) {
    charts.campaignCategory.destroy();
  }

  // Group campaigns by category
  const categoryCount = {};
  campaigns.forEach(cam => {
    const cat = cam.category || 'Uncategorized';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });

  const labels = Object.keys(categoryCount);
  const values = Object.values(categoryCount);

  if (labels.length === 0) {
    document.getElementById('campaignCategoryChart').parentElement.innerHTML = '<div class="no-data">No campaign data available</div>';
    return;
  }

  charts.campaignCategory = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Number of Campaigns',
        data: values,
        backgroundColor: 'rgba(164, 98, 77, 0.7)',
        borderColor: 'rgba(164, 98, 77, 1)',
        borderWidth: 1,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: {
          display: true,
          labels: {
            font: { family: "'Poppins', sans-serif", size: 12, weight: '600' },
            color: '#613729'
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#613729', font: { size: 11, weight: '600' } },
          grid: { color: 'rgba(97, 55, 41, 0.08)' }
        },
        y: {
          ticks: { color: '#613729', font: { size: 11, weight: '600' } },
          grid: { color: 'rgba(97, 55, 41, 0.08)' }
        }
      }
    }
  });
}

/**
 * Aid Distribution by Type (Bar Chart)
 */
function renderAidDistributionChart(aidData) {
  const ctx = document.getElementById('aidDistributionChart').getContext('2d');

  if (charts.aidDistribution) {
    charts.aidDistribution.destroy();
  }

  if (!aidData || aidData.length === 0) {
    document.getElementById('aidDistributionChart').parentElement.innerHTML = '<div class="no-data">No aid distribution data available</div>';
    return;
  }

  const labels = aidData.map(a => a.aid_type);
  const values = aidData.map(a => a.total);

  charts.aidDistribution = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Quantity Distributed',
        data: values,
        backgroundColor: 'rgba(223, 164, 119, 0.7)',
        borderColor: 'rgba(223, 164, 119, 1)',
        borderWidth: 1,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            font: { family: "'Poppins', sans-serif", size: 12, weight: '600' },
            color: '#613729'
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#613729', font: { size: 11, weight: '600' } },
          grid: { color: 'rgba(97, 55, 41, 0.08)' }
        },
        x: {
          ticks: { color: '#613729', font: { size: 11, weight: '600' } },
          grid: { color: 'rgba(97, 55, 41, 0.08)' }
        }
      }
    }
  });
}

/**
 * Monthly Aid Distribution Trend (Line Chart)
 */
function renderMonthlyTrendChart(monthlyData) {
  const ctx = document.getElementById('monthlyTrendChart').getContext('2d');

  if (charts.monthlyTrend) {
    charts.monthlyTrend.destroy();
  }

  const currentMonth = monthlyData.currentMonth || 0;
  const previousMonth = monthlyData.previousMonth || 0;

  charts.monthlyTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Previous Month', 'Current Month'],
      datasets: [{
        label: 'Aids Distributed',
        data: [previousMonth, currentMonth],
        borderColor: 'rgba(164, 98, 77, 1)',
        backgroundColor: 'rgba(164, 98, 77, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointBackgroundColor: 'rgba(164, 98, 77, 1)',
        pointBorderColor: '#FFF4E6',
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            font: { family: "'Poppins', sans-serif", size: 12, weight: '600' },
            color: '#613729'
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#613729', font: { size: 11, weight: '600' } },
          grid: { color: 'rgba(97, 55, 41, 0.08)' }
        },
        x: {
          ticks: { color: '#613729', font: { size: 11, weight: '600' } },
          grid: { color: 'rgba(97, 55, 41, 0.08)' }
        }
      }
    }
  });
}

/**
 * Populate campaigns table
 */
function populateCampaignsTable(campaigns) {
  const tbody = document.getElementById('campaignsTableBody');
  const section = document.getElementById('campaignsSection');

  if (!campaigns || campaigns.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  // Filter for active and pending campaigns only
  const activeCampaigns = campaigns.filter(c => c.status === 'pending' || c.status === 'in_progress');

  if (activeCampaigns.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: rgba(97, 55, 41, 0.6);">No active campaigns</td></tr>';
    return;
  }

  tbody.innerHTML = activeCampaigns.map(campaign => `
    <tr>
      <td>${campaign.title || '—'}</td>
      <td>${campaign.category || '—'}</td>
      <td>${campaign.slum_area || '—'}</td>
      <td>${formatDate(campaign.start_date)}</td>
      <td>${formatDate(campaign.end_date)}</td>
      <td>
        <span class="status-badge status-${campaign.status || 'pending'}">
          ${capitalizeWords(campaign.status || 'pending')}
        </span>
      </td>
    </tr>
  `).join('');
}

/**
 * Utility: Format date
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

/**
 * Utility: Capitalize words
 */
function capitalizeWords(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Display error message
 */
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
      margin-top: 20px;
    ">
      <i class="fas fa-exclamation-triangle" style="font-size: 32px; color: #A4624D; margin-bottom: 12px; display: block;"></i>
      <p>${message}</p>
      <button onclick="window.location.href='./ngo-dashboard.html'" style="
        margin-top: 16px;
        padding: 10px 20px;
        background: #A4624D;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        font-family: 'Poppins', sans-serif;
      ">Back to Dashboard</button>
    </div>
  `;
}
