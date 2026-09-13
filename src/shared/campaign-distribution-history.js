/**
 * campaign-distribution-history.js
 * Component for displaying distribution history in completed campaigns
 * 
 * Usage:
 *   const history = new CampaignDistributionHistory('containerId');
 *   await history.load(campaignId);
 *   history.render();
 */

class CampaignDistributionHistory {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.data = null;
  }

  async load(campaignId) {
    try {
      const url = `/api/campaigns/${encodeURIComponent(campaignId)}/distribution-history`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load distribution history: ${res.statusText}`);
      }
      const json = await res.json();
      this.data = json.data;
      return this.data;
    } catch (error) {
      console.error("Error loading distribution history:", error);
      throw error;
    }
  }

  render() {
    if (!this.container) {
      console.error(`Container #${this.containerId} not found`);
      return;
    }

    if (!this.data || !this.data.history || this.data.history.length === 0) {
      this.container.innerHTML = `
        <div class="history-section">
          <h3>Distribution History</h3>
          <p class="no-data">No distributions recorded for this campaign yet.</p>
        </div>
      `;
      return;
    }

    const history = this.data.history;
    let totalFamiliesCount = 0;
    let totalPeopleCount = 0;
    history.forEach(day => {
      totalFamiliesCount += day.families_count || 0;
      totalPeopleCount += day.people_count || 0;
    });

    let html = `
      <div class="history-section">
        <h3>Distribution History</h3>
        
        <div class="history-summary">
          <div class="summary-item">
            <span class="summary-label">Total Days Distributed</span>
            <span class="summary-value">${history.length || 0}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Total Families Helped</span>
            <span class="summary-value">${totalFamiliesCount || 0}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Total People Helped</span>
            <span class="summary-value">${totalPeopleCount || 0}</span>
          </div>
        </div>

        <div class="history-timeline">
    `;

    history.forEach(day => {
      const date = day.date;
      const familiesCount = day.families_count || 0;
      const peopleCount = day.people_count || 0;
      const distributionCount = day.distributions ? day.distributions.length : 0;

      html += `
        <div class="day-record">
          <div class="day-header">
            <div class="day-date">
              ${this.formatDate(date)}
            </div>
            <div class="day-stats">
              <span class="stat"><strong>${familiesCount}</strong> families</span>
              <span class="stat"><strong>${peopleCount}</strong> people</span>
            </div>
          </div>

          <div class="day-distributions">
            <table class="distributions-table">
              <thead>
                <tr>
                  <th>Slum Code</th>
                  <th>Family Head</th>
                  <th>Aid Type</th>
                  <th>Quantity</th>
                  <th>Organization</th>
                </tr>
              </thead>
              <tbody>
      `;

      (day.distributions || []).forEach(dist => {
        html += `
          <tr>
            <td class="code">${this.escapeHtml(dist.family_code || "—")}</td>
            <td>${this.escapeHtml(dist.family_head || "—")}</td>
            <td>${this.escapeHtml(dist.aid_type || "—")}</td>
            <td class="quantity">${dist.quantity || "—"}</td>
            <td class="org">${this.escapeHtml(dist.org_name || "—")}</td>
          </tr>
        `;
      });

      html += `
              </tbody>
            </table>
          </div>
        </div>
      `;
    });

    html += `
        </div>

        <div class="history-footer">
          <div class="footer-totals">
            <span><strong>Total Days:</strong> ${history.length}</span>
            <span><strong>Total Families:</strong> ${totalFamiliesCount}</span>
            <span><strong>Total People:</strong> ${totalPeopleCount}</span>
          </div>
          <div style="display:flex;gap:0.5rem;">
            <button class="download-btn" onclick="window['downloadHistoryCSV_' + '${this.containerId}']()">
              <i class="fas fa-download"></i> CSV
            </button>
            <button class="download-btn" onclick="window['downloadHistoryPDF_' + '${this.containerId}']()">
              <i class="fas fa-file-pdf"></i> PDF
            </button>
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;

    // Attach download handlers
    window[`downloadHistoryCSV_${this.containerId}`] = () => this.downloadReportCSV();
    window[`downloadHistoryPDF_${this.containerId}`] = () => this.downloadReportPDF();
  }

  formatDate(dateStr) {
    if (!dateStr) return "—";

    // if backend sends Date object or something non-string
    if (typeof dateStr !== "string") {
      const d0 = new Date(dateStr);
      if (!isNaN(d0.getTime())) return d0.toLocaleDateString("en-US", {
        weekday: "short", year: "numeric", month: "short", day: "numeric"
      });
      return String(dateStr);
    }

    const s = dateStr.trim();

    // If already "YYYY-MM-DD" -> safe
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const d = new Date(s + "T00:00:00");
      if (!isNaN(d.getTime())) return d.toLocaleDateString("en-US", {
        weekday: "short", year: "numeric", month: "short", day: "numeric"
      });
      return s;
    }

    // If ISO like "2026-02-12T00:00:00.000Z" -> parse directly (DON'T append)
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        weekday: "short", year: "numeric", month: "short", day: "numeric"
      });
    }

    // last fallback: show raw
    return s;
  }

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }

  downloadReportCSV() {
    if (!this.data || !this.data.history) {
      alert("No data to download");
      return;
    }

    const history = this.data.history;
    let totalFamiliesCount = 0;
    let totalPeopleCount = 0;
    history.forEach(day => {
      totalFamiliesCount += day.families_count || 0;
      totalPeopleCount += day.people_count || 0;
    });

    // Create CSV content
    let csv = `SlumLink Campaign Distribution History Report\n`;
    csv += `Campaign: ${this.data.campaign_title || "Unknown"}\n`;
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;

    csv += `Summary\n`;
    csv += `Total Days Distributed,${history.length}\n`;
    csv += `Total Families Helped,${totalFamiliesCount}\n`;
    csv += `Total People Helped,${totalPeopleCount}\n\n`;

    history.forEach(day => {
      csv += `Date,${day.date}\n`;
      csv += `Families on Date,${day.families_count}\n`;
      csv += `People on Date,${day.people_count}\n`;
      csv += `Slum Code,Family Head,Aid Type,Quantity,Organization\n`;
      
      (day.distributions || []).forEach(dist => {
        csv += `"${dist.family_code}","${dist.family_head}","${dist.aid_type}","${dist.quantity || ""}","${dist.org_name}"\n`;
      });
      csv += `\n`;
    });

    // Create and download file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    const fileName = `campaign-distribution-history-${this.data.campaign_id || 'report'}-${new Date().getTime()}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  downloadReportPDF() {
    if (!this.data || !this.data.history) {
      alert("No data to download");
      return;
    }

    // Check if jsPDF is available immediately or wait for it
    const generatePDF = () => {
      // Try multiple ways to detect jsPDF
      const jsPDF = window.jsPDF || (window.jspdf && window.jspdf.jsPDF);
      
      if (!jsPDF) {
        alert("PDF library is still loading. Please try again in a moment.");
        return;
      }

      try {
        const history = this.data.history;
        let totalFamiliesCount = 0;
        let totalPeopleCount = 0;
        
        history.forEach(day => {
          totalFamiliesCount += day.families_count || 0;
          totalPeopleCount += day.people_count || 0;
        });

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPosition = 15;
        const margin = 15;

        // Title
        doc.setFontSize(16);
        doc.setTextColor(107, 61, 39);
        doc.text('Campaign Distribution History Report', margin, yPosition);
        
        // Campaign info
        yPosition += 10;
        doc.setFontSize(11);
        doc.setTextColor(50, 50, 50);
        doc.text(`Campaign: ${this.data.campaign_title || 'Unknown'}`, margin, yPosition);
        yPosition += 6;
        doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);

        // Summary
        yPosition += 10;
        doc.setFontSize(12);
        doc.setTextColor(107, 61, 39);
        doc.text('Summary', margin, yPosition);
        yPosition += 8;
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        doc.text(`Total Days: ${history.length}`, margin + 5, yPosition);
        yPosition += 6;
        doc.text(`Total Families: ${totalFamiliesCount}`, margin + 5, yPosition);
        yPosition += 6;
        doc.text(`Total People: ${totalPeopleCount}`, margin + 5, yPosition);

        // Distribution details
        yPosition += 10;
        const pageHeightLimit = pageHeight - 20;

        history.forEach((day, idx) => {
          if (yPosition > pageHeightLimit) {
            doc.addPage();
            yPosition = 15;
          }

          doc.setFontSize(11);
          doc.setTextColor(107, 61, 39);
          doc.text(`${this.formatDate(day.date)} - ${day.families_count} families, ${day.people_count} people`, margin, yPosition);
          yPosition += 7;

          const columns = ['Slum Code', 'Family Head', 'Aid Type', 'Qty', 'Organization'];
          const rows = (day.distributions || []).map(dist => [
            dist.family_code || '—',
            dist.family_head || '—',
            dist.aid_type || '—',
            String(dist.quantity || '—'),
            dist.org_name || '—'
          ]);

          if (rows.length > 0) {
            if (typeof doc.autoTable === 'function') {
              try {
                doc.autoTable({
                  head: [columns],
                  body: rows,
                  startY: yPosition,
                  margin: { top: 1, left: margin, right: margin, bottom: 1 },
                  bodyStyles: { fontSize: 7, cellPadding: 1 },
                  headStyles: { fillColor: [160, 98, 77], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
                  columnStyles: {
                    0: { cellWidth: 22 },  // Slum Code
                    1: { cellWidth: 28 },  // Family Head
                    2: { cellWidth: 25 },  // Aid Type
                    3: { cellWidth: 12 },  // Qty
                    4: { cellWidth: 28 }   // Organization
                  }
                });
                yPosition = doc.lastAutoTable.finalY + 4;
              } catch (tableError) {
                console.warn('AutoTable error for day', idx, tableError);
                yPosition += 30;
              }
            } else {
              yPosition += 25;
            }
          }

          yPosition += 3;
        });

        doc.save(`distribution-history-${this.data.campaign_id || 'report'}-${Date.now()}.pdf`);
        console.log('Distribution history PDF saved successfully');
      } catch (e) {
        console.error('PDF generation error:', e);
        alert('Error generating PDF: ' + e.message + '\n\nUse CSV download as an alternative.');
      }
    };

    // If library available, generate now
    if (window.jsPDF || (window.jspdf && window.jspdf.jsPDF)) {
      generatePDF();
    } else {
      // Wait for library to load
      let attempts = 0;
      const check = setInterval(() => {
        attempts++;
        if (window.jsPDF || (window.jspdf && window.jspdf.jsPDF)) {
          clearInterval(check);
          generatePDF();
        } else if (attempts > 30) {
          clearInterval(check);
          alert('PDF library could not be loaded. Using CSV download instead.');
        }
      }, 200);
    }
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CampaignDistributionHistory;
}
