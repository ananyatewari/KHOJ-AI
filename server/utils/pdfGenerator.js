import PDFDocument from "pdfkit";

export function generateAnalysisPDF(item, type) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Header with Logo and Branding
      const startY = doc.y;
      
      // Draw shield logo (SVG-like representation)
      const logoX = 275;
      const logoY = startY + 20;
      const shieldPath = `M ${logoX} ${logoY} L ${logoX + 12} ${logoY + 6} L ${logoX + 12} ${logoY + 14} C ${logoX + 12} ${logoY + 22} ${logoX + 6} ${logoY + 28} ${logoX} ${logoY + 32} C ${logoX - 6} ${logoY + 28} ${logoX - 12} ${logoY + 22} ${logoX - 12} ${logoY + 14} L ${logoX - 12} ${logoY + 6} Z`;
      
      doc.path(shieldPath).fillAndStroke("#4F46E5", "#4F46E5");
      
      // Document icon inside shield
      doc.rect(logoX - 5, logoY + 9, 10, 13).stroke("#FFFFFF");
      doc.moveTo(logoX - 3, logoY + 12).lineTo(logoX + 3, logoY + 12).stroke("#FFFFFF");
      doc.moveTo(logoX - 3, logoY + 15).lineTo(logoX + 3, logoY + 15).stroke("#FFFFFF");
      doc.moveTo(logoX - 3, logoY + 18).lineTo(logoX + 1, logoY + 18).stroke("#FFFFFF");
      
      doc.moveDown(3);
      
      // Brand name with gradient effect
      doc.fontSize(28).fillColor("#4F46E5").text("KHOJ AI", { align: "center" });
      doc.moveDown(0.3);
      doc.fontSize(11).fillColor("#6366F1").text("Intelligence Platform", { align: "center" });
      doc.moveDown(0.5);
      
      // Report title
      doc.fontSize(18).fillColor("#1F2937").text("AI Analysis Report", { align: "center" });
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor("#6B7280").text(`Generated on ${new Date().toLocaleString()}`, { align: "center" });
      doc.moveDown(1);

      // Decorative divider with color
      doc.moveTo(50, doc.y).lineTo(550, doc.y).lineWidth(2).stroke("#4F46E5");
      doc.moveDown(0.2);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).lineWidth(0.5).stroke("#E5E7EB");
      doc.moveDown(1);

      // Document Information
      doc.fontSize(14).fillColor("#1F2937").text("Document Information", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor("#374151");
      doc.text(`Document: ${item.filename}`);
      doc.text(`Type: ${type.toUpperCase()}`);
      doc.text(`Uploaded By: ${item.uploadedBy}`);
      doc.text(`Agency: ${item.agency}`);
      doc.text(`Date: ${new Date(item.createdAt).toLocaleString()}`);
      doc.moveDown(1.5);

      // Extracted Text
      if (item.text || item.transcript) {
        doc.fontSize(14).fillColor("#1F2937").text("Extracted Text", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(9).fillColor("#4B5563");
        const text = (item.text || item.transcript).substring(0, 2000);
        doc.text(text + (text.length >= 2000 ? "..." : ""), { align: "justify" });
        doc.moveDown(1.5);
      }

      // Extracted Entities
      if (item.entities) {
        doc.fontSize(14).fillColor("#1F2937").text("Extracted Entities", { underline: true });
        doc.moveDown(0.5);

        const entityTypes = [
          { key: "persons", label: "Persons", color: "#3B82F6" },
          { key: "places", label: "Places", color: "#10B981" },
          { key: "organizations", label: "Organizations", color: "#EC4899" },
          { key: "dates", label: "Dates", color: "#F59E0B" },
          { key: "phoneNumbers", label: "Phone Numbers", color: "#8B5CF6" }
        ];

        entityTypes.forEach(({ key, label, color }) => {
          if (item.entities[key] && item.entities[key].length > 0) {
            doc.fontSize(11).fillColor(color).text(`${label}:`, { continued: false });
            doc.fontSize(9).fillColor("#4B5563");
            item.entities[key].forEach((entity) => {
              const text = typeof entity === "string" ? entity : entity.text;
              doc.text(`  • ${text}`);
            });
            doc.moveDown(0.5);
          }
        });
        doc.moveDown(1);
      }

      // AI Summary & Analysis
      if (item.aiSummary) {
        doc.addPage();
        doc.fontSize(14).fillColor("#1F2937").text("AI Summary & Analysis", { underline: true });
        doc.moveDown(1);

        if (item.aiSummary.executiveSummary) {
          doc.fontSize(12).fillColor("#4F46E5").text("Executive Summary");
          doc.moveDown(0.3);
          doc.fontSize(9).fillColor("#374151").text(item.aiSummary.executiveSummary, { align: "justify" });
          doc.moveDown(1);
        }

        if (item.aiSummary.keyFindings && item.aiSummary.keyFindings.length > 0) {
          doc.fontSize(12).fillColor("#4F46E5").text("Key Findings");
          doc.moveDown(0.3);
          doc.fontSize(9).fillColor("#374151");
          item.aiSummary.keyFindings.forEach((finding, idx) => {
            doc.text(`${idx + 1}. ${finding}`, { indent: 10 });
          });
          doc.moveDown(1);
        }

        if (item.aiSummary.analystTakeaways && item.aiSummary.analystTakeaways.length > 0) {
          doc.fontSize(12).fillColor("#4F46E5").text("Analyst Takeaways");
          doc.moveDown(0.3);
          doc.fontSize(9).fillColor("#374151");
          item.aiSummary.analystTakeaways.forEach((takeaway, idx) => {
            doc.text(`${idx + 1}. ${takeaway}`, { indent: 10 });
          });
          doc.moveDown(1);
        }

        if (item.aiSummary.keyDiscussionPoints && item.aiSummary.keyDiscussionPoints.length > 0) {
          doc.fontSize(12).fillColor("#4F46E5").text("Key Discussion Points");
          doc.moveDown(0.3);
          doc.fontSize(9).fillColor("#374151");
          item.aiSummary.keyDiscussionPoints.forEach((point, idx) => {
            doc.text(`${idx + 1}. ${point}`, { indent: 10 });
          });
          doc.moveDown(1);
        }

        if (item.aiSummary.decisionsMade && item.aiSummary.decisionsMade.length > 0) {
          doc.fontSize(12).fillColor("#4F46E5").text("Decisions Made");
          doc.moveDown(0.3);
          doc.fontSize(9).fillColor("#374151");
          item.aiSummary.decisionsMade.forEach((decision, idx) => {
            doc.text(`${idx + 1}. ${decision}`, { indent: 10 });
          });
          doc.moveDown(1);
        }

        if (item.aiSummary.actionItems && item.aiSummary.actionItems.length > 0) {
          doc.fontSize(12).fillColor("#4F46E5").text("Action Items");
          doc.moveDown(0.3);
          doc.fontSize(9).fillColor("#374151");
          item.aiSummary.actionItems.forEach((action, idx) => {
            doc.text(`${idx + 1}. ${action.item || action}`, { indent: 10 });
            if (action.assignee) doc.text(`   Assignee: ${action.assignee}`, { indent: 20 });
            if (action.dueDate) doc.text(`   Due Date: ${action.dueDate}`, { indent: 20 });
          });
          doc.moveDown(1);
        }

        if (item.aiSummary.nextSteps && item.aiSummary.nextSteps.length > 0) {
          doc.fontSize(12).fillColor("#4F46E5").text("Next Steps");
          doc.moveDown(0.3);
          doc.fontSize(9).fillColor("#374151");
          item.aiSummary.nextSteps.forEach((step, idx) => {
            doc.text(`${idx + 1}. ${step}`, { indent: 10 });
          });
          doc.moveDown(1);
        }

        if (item.aiSummary.entityInsights) {
          doc.fontSize(12).fillColor("#4F46E5").text("Entity Insights");
          doc.moveDown(0.3);
          doc.fontSize(9).fillColor("#374151");
          if (item.aiSummary.entityInsights.persons && item.aiSummary.entityInsights.persons.length > 0) {
            doc.text(`Persons: ${item.aiSummary.entityInsights.persons.join(", ")}`);
          }
          if (item.aiSummary.entityInsights.places && item.aiSummary.entityInsights.places.length > 0) {
            doc.text(`Places: ${item.aiSummary.entityInsights.places.join(", ")}`);
          }
          if (item.aiSummary.entityInsights.organizations && item.aiSummary.entityInsights.organizations.length > 0) {
            doc.text(`Organizations: ${item.aiSummary.entityInsights.organizations.join(", ")}`);
          }
        }
      }

      // Footer with branding
      doc.moveDown(2);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).lineWidth(0.5).stroke("#E5E7EB");
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).lineWidth(2).stroke("#4F46E5");
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor("#4F46E5").text("KHOJ AI", { align: "center" });
      doc.fontSize(8).fillColor("#6B7280").text("Intelligence Platform | Secure Document Analysis", { align: "center" });
      doc.moveDown(0.3);
      doc.fontSize(7).fillColor("#9CA3AF").text("This report is confidential and generated for authorized personnel only.", { align: "center" });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export function generateReportPDF(reportData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Header with Logo and Branding
      const startY = doc.y;
      
      // Draw shield logo
      const logoX = 275;
      const logoY = startY + 20;
      const shieldPath = `M ${logoX} ${logoY} L ${logoX + 12} ${logoY + 6} L ${logoX + 12} ${logoY + 14} C ${logoX + 12} ${logoY + 22} ${logoX + 6} ${logoY + 28} ${logoX} ${logoY + 32} C ${logoX - 6} ${logoY + 28} ${logoX - 12} ${logoY + 22} ${logoX - 12} ${logoY + 14} L ${logoX - 12} ${logoY + 6} Z`;
      
      doc.path(shieldPath).fillAndStroke("#4F46E5", "#4F46E5");
      
      // Document icon inside shield
      doc.rect(logoX - 5, logoY + 9, 10, 13).stroke("#FFFFFF");
      doc.moveTo(logoX - 3, logoY + 12).lineTo(logoX + 3, logoY + 12).stroke("#FFFFFF");
      doc.moveTo(logoX - 3, logoY + 15).lineTo(logoX + 3, logoY + 15).stroke("#FFFFFF");
      doc.moveTo(logoX - 3, logoY + 18).lineTo(logoX + 1, logoY + 18).stroke("#FFFFFF");
      
      doc.moveDown(3);
      
      // Brand name
      doc.fontSize(28).fillColor("#4F46E5").text("KHOJ AI", { align: "center" });
      doc.moveDown(0.3);
      doc.fontSize(11).fillColor("#6366F1").text("Intelligence Platform", { align: "center" });
      doc.moveDown(0.5);
      
      // Report title
      doc.fontSize(18).fillColor("#1F2937").text("Intelligence Report", { align: "center" });
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor("#6B7280").text(`Generated on ${new Date().toLocaleString()}`, { align: "center" });
      doc.moveDown(1);

      // Decorative divider
      doc.moveTo(50, doc.y).lineTo(550, doc.y).lineWidth(2).stroke("#4F46E5");
      doc.moveDown(0.2);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).lineWidth(0.5).stroke("#E5E7EB");
      doc.moveDown(1);

      // Report content
      if (reportData.executiveSummary) {
        doc.fontSize(14).fillColor("#1F2937").text("Executive Summary", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor("#374151").text(reportData.executiveSummary, { align: "justify" });
        doc.moveDown(1.5);
      }

      if (reportData.keyFindings && reportData.keyFindings.length > 0) {
        doc.fontSize(14).fillColor("#1F2937").text("Key Findings", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor("#374151");
        reportData.keyFindings.forEach((finding, idx) => {
          doc.text(`${idx + 1}. ${finding}`, { indent: 10 });
          doc.moveDown(0.3);
        });
        doc.moveDown(1);
      }

      if (reportData.entityInsights) {
        doc.fontSize(14).fillColor("#1F2937").text("Entity Insights", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor("#374151");
        
        if (reportData.entityInsights.persons && reportData.entityInsights.persons.length > 0) {
          doc.fillColor("#3B82F6").text("Key Persons:");
          doc.fillColor("#374151").text(reportData.entityInsights.persons.join(", "), { indent: 10 });
          doc.moveDown(0.5);
        }
        
        if (reportData.entityInsights.places && reportData.entityInsights.places.length > 0) {
          doc.fillColor("#10B981").text("Key Places:");
          doc.fillColor("#374151").text(reportData.entityInsights.places.join(", "), { indent: 10 });
          doc.moveDown(0.5);
        }
        
        if (reportData.entityInsights.organizations && reportData.entityInsights.organizations.length > 0) {
          doc.fillColor("#EC4899").text("Key Organizations:");
          doc.fillColor("#374151").text(reportData.entityInsights.organizations.join(", "), { indent: 10 });
          doc.moveDown(0.5);
        }
        doc.moveDown(1);
      }

      if (reportData.analystTakeaways && reportData.analystTakeaways.length > 0) {
        doc.fontSize(14).fillColor("#1F2937").text("Analyst Takeaways", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor("#374151");
        reportData.analystTakeaways.forEach((takeaway, idx) => {
          doc.text(`${idx + 1}. ${takeaway}`, { indent: 10 });
          doc.moveDown(0.3);
        });
      }

      // Footer with branding
      doc.moveDown(2);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).lineWidth(0.5).stroke("#E5E7EB");
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).lineWidth(2).stroke("#4F46E5");
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor("#4F46E5").text("KHOJ AI", { align: "center" });
      doc.fontSize(8).fillColor("#6B7280").text("Intelligence Platform | Secure Document Analysis", { align: "center" });
      doc.moveDown(0.3);
      doc.fontSize(7).fillColor("#9CA3AF").text("This report is confidential and generated for authorized personnel only.", { align: "center" });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
