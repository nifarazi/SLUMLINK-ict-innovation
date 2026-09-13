/**
 * eligible-families-table.js
 * Reusable component for displaying eligible families for a campaign
 *
 * Usage:
 *   const table = new EligibleFamiliesTable('containerId');
 *   await table.load(campaignId);
 *   await table.loadCampaignDetails(campaignId);
 *   table.render();
 */

class EligibleFamiliesTable {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.data = null;
    this.campaign = null;
  }

  async load(campaignId, orgId = null) {
    try {
      const url = `/api/campaigns/${encodeURIComponent(
        campaignId
      )}/eligible-families`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load families: ${res.statusText}`);
      }
      const json = await res.json();
      this.data = json.data;
      return this.data;
    } catch (error) {
      console.error("Error loading eligible families:", error);
      throw error;
    }
  }

  async loadCampaignDetails(campaignId) {
    try {
      const res = await fetch(
        `/api/campaigns/${encodeURIComponent(campaignId)}`
      );
      if (!res.ok) throw new Error("Failed to load campaign");
      const json = await res.json();
      this.campaign = json.data;
      return this.campaign;
    } catch (error) {
      console.error("Error loading campaign details:", error);
      throw error;
    }
  }

  render() {
    if (!this.container) {
      console.error(`Container #${this.containerId} not found`);
      return;
    }

    if (!this.data || !this.data.families) {
      this.container.innerHTML = `
        <div class="families-section"><p>No eligible families found.</p></div>
      `;
      return;
    }

    const families = this.data.families;
    const summary = this.data.summary || {};

    let html = `
      <div class="families-section">
        <h3>Eligible Families & Members</h3>

        <div class="families-summary">
          <div class="summary-item">
            <span class="summary-label">Total Families</span>
            <span class="summary-value">${summary.total_families || 0}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Total Eligible Individuals</span>
            <span class="summary-value">${
              summary.total_eligible_individuals || 0
            }</span>
          </div>
        </div>

        <div class="families-table-wrapper">
          <table class="families-table">
            <thead>
              <tr>
                <th>Slum Code</th>
                <th>Family Head</th>
                <th>Eligible Members</th>
                <th>Eligible Count</th>
              </tr>
            </thead>
            <tbody>
    `;

    families.forEach((family) => {
      const eligibleCount = family.eligible_members_count || 0;
      const eligibleNames =
        family.eligible_member_names || family.family_head_name || "—";

      html += `
        <tr>
          <td class="slum-code"><strong>${this.escapeHtml(
            family.slum_code || "—"
          )}</strong></td>
          <td>${this.escapeHtml(family.family_head_name || "—")}</td>
          <td class="eligible-names">
            <small>${this.escapeHtml(eligibleNames)}</small>
          </td>
          <td class="eligible-count">${eligibleCount}</td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>

        <div class="families-footer">
          <div class="footer-totals">
            <span><strong>Total Families:</strong> ${summary.total_families || 0}</span>
            <span><strong>Total Eligible Individuals:</strong> ${
              summary.total_eligible_individuals || 0
            }</span>
          </div>

          <div style="display:flex;gap:0.5rem;">
            <button class="download-btn" onclick="window['downloadFamiliesReportCSV_${this.containerId}']()">
              <i class="fas fa-download"></i> CSV
            </button>
            <button class="download-btn" onclick="window['downloadFamiliesReportPDF_${this.containerId}']()">
              <i class="fas fa-file-pdf"></i> PDF
            </button>
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;

    // Attach download handlers
    window[`downloadFamiliesReportCSV_${this.containerId}`] = () =>
      this.downloadReportCSV();
    window[`downloadFamiliesReportPDF_${this.containerId}`] = () =>
      this.downloadReportPDF();
  }

  escapeHtml(text) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return String(text).replace(/[&<>"']/g, (m) => map[m]);
  }

  downloadReportCSV() {
    if (!this.data || !this.data.families) {
      alert("No data to download");
      return;
    }

    const families = this.data.families;
    const summary = this.data.summary || {};
    const campaign = this.campaign || {};

    // Create CSV content
    let csv = `SlumLink Campaign Eligible Families Report\n`;
    csv += `Campaign: ${campaign.title || "Unknown"}\n`;
    csv += `Status: ${campaign.status || "Unknown"}\n`;
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;

    csv += `Total Families,${summary.total_families || 0}\n`;
    csv += `Total Eligible Individuals,${summary.total_eligible_individuals || 0}\n\n`;

    csv += `Slum Code,Family Head,Eligible Members,Eligible Count\n`;

    families.forEach((family) => {
      const eligibleCount = family.eligible_members_count || 0;
      const eligibleNames =
        family.eligible_member_names || family.family_head_name || "";

      csv += `"${family.slum_code || ""}","${family.family_head_name || ""}","${eligibleNames}",${eligibleCount}\n`;
    });

    // Create and download file
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    const fileName = `eligible-families-${campaign.campaign_id || "report"}-${new Date().getTime()}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  downloadReportPDF() {
    if (!this.data || !this.data.families) {
      alert("No data to download");
      return;
    }

    const generatePDF = () => {
      const jsPDF = window.jsPDF || (window.jspdf && window.jspdf.jsPDF);

      if (!jsPDF) {
        alert("PDF library is still loading. Please try again in a moment.");
        return;
      }

      try {
        const families = this.data.families;
        const summary = this.data.summary || {};
        const campaign = this.campaign || {};

        const doc = new jsPDF({ unit: "mm", format: "a4" });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const margin = 14;
        let y = 16;

        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(97, 55, 41);
        doc.text("Eligible Families", margin, y);

        // Campaign name
        y += 8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        doc.text(`Campaign: ${campaign.title || "Unknown"}`, margin, y);

        // Divider
        y += 6;
        doc.setDrawColor(210);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageWidth - margin, y);

        // Table
        y += 6;

        const columns = ["Slum Code", "Eligible Members"];
        const rows = families.map((f) => {
          const names = (f.eligible_member_names || f.family_head_name || "—")
            .toString()
            .replace(/\s*,\s*/g, ", ");
          return [f.slum_code || "—", names];
        });

        if (typeof doc.autoTable === "function") {
          doc.autoTable({
            head: [columns],
            body: rows,
            startY: y,
            margin: { left: margin, right: margin },
            tableWidth: pageWidth - margin * 2,

            styles: {
              font: "helvetica",
              fontSize: 10,
              textColor: [40, 40, 40],
              cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
              valign: "top",
              halign: "left",
              overflow: "linebreak",
              lineColor: [210, 210, 210],
              lineWidth: 0.3,
            },

            headStyles: {
              fontStyle: "bold",
              fontSize: 11,
              textColor: [97, 55, 41],
              fillColor: [255, 255, 255],
              halign: "left",
              valign: "middle",
              lineWidth: 0.4,
            },

            columnStyles: {
              0: { cellWidth: 32, fontStyle: "bold" },
              1: { cellWidth: pageWidth - margin * 2 - 32 },
            },

            alternateRowStyles: {
              fillColor: [248, 244, 238],
            },

            didDrawPage: (data) => {
              doc.setFontSize(9);
              doc.setTextColor(150, 150, 150);
              doc.text(
                `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`,
                pageWidth / 2,
                pageHeight - 10,
                { align: "center" }
              );
            },
          });
        } else {
          alert("autoTable not available. Please reload the page or use CSV.");
          return;
        }

        // Summary (after table)
        let sy = (doc.lastAutoTable?.finalY || y) + 10;

        if (sy > pageHeight - 35) {
          doc.addPage();
          sy = 20;
        }

        doc.setDrawColor(210);
        doc.setLineWidth(0.3);
        doc.line(margin, sy, pageWidth - margin, sy);
        sy += 8;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(97, 55, 41);
        doc.text("Summary", margin, sy);

        sy += 7;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        doc.text(`Total Families: ${summary.total_families || 0}`, margin, sy);

        sy += 6;
        doc.text(`Total People: ${summary.total_eligible_individuals || 0}`, margin, sy);

        doc.save(`eligible-families-${campaign.campaign_id || "report"}-${Date.now()}.pdf`);
      } catch (e) {
        console.error("PDF generation error:", e);
        alert("Error generating PDF: " + e.message + "\n\nUse CSV download as an alternative.");
      }
    };

    if (typeof window.jsPDF === "function" || (window.jspdf && window.jspdf.jsPDF)) {
      generatePDF();
    } else {
      console.log("jsPDF not ready, waiting for library to load...");
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        if (typeof window.jsPDF === "function" || (window.jspdf && window.jspdf.jsPDF)) {
          clearInterval(checkInterval);
          generatePDF();
        } else if (attempts > 30) {
          clearInterval(checkInterval);
          alert("PDF library failed to load. Please use CSV download instead.");
        }
      }, 200);
    }
  }
}

// Export for use
if (typeof module !== "undefined" && module.exports) {
  module.exports = EligibleFamiliesTable;
}