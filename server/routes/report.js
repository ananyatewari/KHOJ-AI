import express from "express";
import authMiddleware from "../middleware/auth.js";
import { emitLog } from "../utils/logger.js";
import { generateReportPDF } from "../utils/pdfGenerator.js";

const router = express.Router();

/**
 * Export Intelligence Report (PDF)
 */
router.post("/export", authMiddleware, async (req, res) => {
  try {
    const { summary } = req.body;

    if (!summary) {
      return res.status(400).json({ error: "Summary missing" });
    }

    // Generate PDF
    const pdfBuffer = await generateReportPDF(summary);

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=intelligence-report.pdf"
    );
    res.setHeader("Content-Type", "application/pdf");

    res.send(pdfBuffer);

    await emitLog("log", {
      level: "INFO",
      message: `Intelligence report exported by ${req.user.username}`,
      user: req.user.username,
      agency: req.user.agency,
    });

  } catch (err) {
    console.error("Report export error:", err);
    res.status(500).json({ error: "Report export failed" });
  }
});

import { getOperationalReport, exportOperationalPDF } from "../controller/reportController.js";

router.post("/operational", authMiddleware, getOperationalReport);
router.post("/export/pdf", authMiddleware, exportOperationalPDF);

export default router;
