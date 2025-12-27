import Document from "../models/Document.js";
import OcrDocument from "../models/OcrDocument.js";
import Transcription from "../models/Transcription.js";
import { emitLog } from "../utils/logger.js";
import { generateAISummary } from "../services/aiSummary.js";
import PDFDocument from "pdfkit";

const RECENT_DOC_LIMIT = 10;

const timelineFacetStages = [
  {
    $group: {
      _id: {
        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
      },
      count: { $sum: 1 }
    }
  },
  {
    $project: {
      _id: 0,
      date: "$_id",
      count: 1
    }
  },
  {
    $sort: { date: 1 }
  }
];

const buildFacet = (recentLimit, typeLabel) => ({
  count: [{ $count: "total" }],
  timeline: timelineFacetStages,
  recent: [
    { $sort: { createdAt: -1 } },
    { $limit: recentLimit },
    {
      $project: {
        _id: 0,
        documentId: "$_id",
        filename: "$filename",
        uploadedBy: "$uploadedBy",
        createdAt: "$createdAt",
        type: { $literal: typeLabel }
      }
    }
  ],
  uploaders: [
    {
      $group: {
        _id: "$uploadedBy",
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 5 },
    {
      $project: {
        _id: 0,
        uploadedBy: { $ifNull: ["$_id", "Unknown"] },
        count: 1,
        type: { $literal: typeLabel }
      }
    }
  ]
});

const formatTimelineLabel = (isoDate) => {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}`;
};

const mergeTimelines = (...timelines) => {
  const map = new Map();
  timelines.forEach((entries = []) => {
    entries.forEach(({ date, count }) => {
      if (!date) return;
      map.set(date, (map.get(date) || 0) + (count || 0));
    });
  });

  return Array.from(map.entries())
    .map(([date, count]) => ({
      date,
      label: formatTimelineLabel(date),
      count
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};

async function buildOperationalDataset({
  agency,
  from,
  to,
  recentLimit = RECENT_DOC_LIMIT
}) {
  const start = new Date(from);
  const end = new Date(to);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid date range");
  }

  const docMatch = {
    createdAt: { $gte: start, $lte: end },
    visibility: { $in: [agency] }
  };

  const ocrMatch = {
    createdAt: { $gte: start, $lte: end },
    agency
  };

  const audioMatch = {
    createdAt: { $gte: start, $lte: end },
    agency
  };

  const [pdfAgg = { count: [], timeline: [], recent: [] }] =
    await Document.aggregate([
      { $match: docMatch },
      { $facet: buildFacet(recentLimit, "PDF") }
    ]);

  const [ocrAgg = { count: [], timeline: [], recent: [] }] =
    await OcrDocument.aggregate([
      { $match: ocrMatch },
      { $facet: buildFacet(recentLimit, "Image/OCR") }
    ]);

  const [audioAgg = { count: [], timeline: [], recent: [] }] =
    await Transcription.aggregate([
      { $match: audioMatch },
      { $facet: buildFacet(recentLimit, "Audio") }
    ]);

  const pdfCount = pdfAgg.count?.[0]?.total || 0;
  const imageCount = ocrAgg.count?.[0]?.total || 0;
  const audioCount = audioAgg.count?.[0]?.total || 0;

  const summary = {
    totalUploaded: pdfCount + imageCount + audioCount,
    pdfCount,
    imageCount,
    audioCount
  };

  const timeline = mergeTimelines(pdfAgg.timeline, ocrAgg.timeline, audioAgg.timeline);

  const recentDocuments = [...(pdfAgg.recent || []), ...(ocrAgg.recent || []), ...(audioAgg.recent || [])]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, recentLimit);

  const uploaderMap = new Map();
  [...(pdfAgg.uploaders || []), ...(ocrAgg.uploaders || []), ...(audioAgg.uploaders || [])].forEach(
    ({ uploadedBy, count }) => {
      if (!uploadedBy) return;
      uploaderMap.set(uploadedBy, (uploaderMap.get(uploadedBy) || 0) + count);
    }
  );

  const topUploaders = Array.from(uploaderMap.entries())
    .map(([uploadedBy, count]) => ({ uploadedBy, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    range: { from, to },
    summary,
    timeline,
    recentDocuments,
    topUploaders
  };
}

async function hydrateDocumentDetails(recentDocuments = []) {
  if (!recentDocuments.length) return [];

  const pdfIds = recentDocuments
    .filter((doc) => doc.type === "PDF")
    .map((doc) => doc.documentId);
  const imageIds = recentDocuments
    .filter((doc) => doc.type !== "PDF")
    .map((doc) => doc.documentId);

  const audioIds = recentDocuments
    .filter((doc) => doc.type === "Audio")
    .map((doc) => doc.documentId);

  const [pdfDocs, ocrDocs, audioDocs] = await Promise.all([
    pdfIds.length
      ? Document.find({ _id: { $in: pdfIds } })
          .select("filename uploadedBy createdAt text entities")
          .lean()
      : [],
    imageIds.length
      ? OcrDocument.find({ _id: { $in: imageIds } })
          .select("filename uploadedBy createdAt text entities")
          .lean()
      : [],
    audioIds.length
      ? Transcription.find({ _id: { $in: audioIds } })
          .select("filename uploadedBy createdAt transcript entities")
          .lean()
      : []
  ]);

  const pdfMap = new Map(pdfDocs.map((doc) => [doc._id.toString(), doc]));
  const ocrMap = new Map(ocrDocs.map((doc) => [doc._id.toString(), doc]));
  const audioMap = new Map(audioDocs.map((doc) => [doc._id.toString(), doc]));

  return recentDocuments
    .map((entry) => {
      const entryId = entry.documentId ? entry.documentId.toString() : null;
      let source;
      if (entry.type === "PDF") {
        source = pdfMap.get(entryId);
      } else if (entry.type === "Audio") {
        source = audioMap.get(entryId);
      } else {
        source = ocrMap.get(entryId);
      }
      if (!source) return null;

      const textContent = source.text || source.transcript || "";
      const cleanText = textContent.replace(/\s+/g, " ").trim();

      return {
        ...entry,
        text: textContent,
        snippet: cleanText.slice(0, 400),
        entities: source.entities || {},
        uploadedBy: source.uploadedBy || entry.uploadedBy,
        filename: source.filename || entry.filename,
        createdAt: source.createdAt || entry.createdAt
      };
    })
    .filter(Boolean);
}

export const getOperationalReport = async (req, res) => {
  try {
    await emitLog(req.app.get("io"), {
      level: "INFO",
      message: `Operational report requested by ${req.user.username}`,
      user: req.user.username,
      agency: req.user.agency
    });
    const { from, to } = req.body;

    const dataset = await buildOperationalDataset({
      agency: req.user.agency,
      from,
      to
    });

    await emitLog(req.app.get("io"), {
      level: "SUCCESS",
      message: `Operational report generated by ${req.user.username}`,
      user: req.user.username,
      agency: req.user.agency,
      period: { from, to }
    });

    res.json(dataset);
  } catch (err) {
    console.error("Operational Report Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate report" });
  }
};

/**
 * Export Operational Intelligence Report (PDF)
 */
export const exportOperationalPDF = async (req, res) => {
  try {
    const { from, to } = req.body;
    if (!from || !to) {
      return res.status(400).json({ error: "from and to are required" });
    }

    await emitLog(req.app.get("io"), {
      level: "INFO",
      message: `Operational report PDF export requested by ${req.user.username}`,
      user: req.user.username,
      agency: req.user.agency
    });

    const dataset = await buildOperationalDataset({
      agency: req.user.agency,
      from,
      to,
      recentLimit: RECENT_DOC_LIMIT
    });

    const { summary, timeline, recentDocuments, topUploaders } = dataset;
    const enrichedDocuments = await hydrateDocumentDetails(recentDocuments);

    let aiSummary = null;
    if (enrichedDocuments.length) {
      try {
        aiSummary = await generateAISummary({
          documents: enrichedDocuments.map((doc) => ({
            text: doc.text,
            entities: doc.entities
          }))
        });
      } catch (aiErr) {
        console.warn("AI summary generation failed:", aiErr.message);
      }
    }

    const perDocumentInsightsEntries = await Promise.all(
      enrichedDocuments.map(async (docEntry) => {
        try {
          const insights = await generateAISummary({
            documents: [
              {
                text: docEntry.text,
                entities: docEntry.entities
              }
            ]
          });
          return { documentId: docEntry.documentId.toString(), insights };
        } catch (err) {
          console.warn(
            `AI summary generation failed for document ${docEntry.documentId}:`,
            err.message
          );
          return null;
        }
      })
    );

    const perDocumentInsights = new Map(
      perDocumentInsightsEntries
        .filter(Boolean)
        .map((entry) => [entry.documentId, entry.insights])
    );

    const doc = new PDFDocument({ margin: 50 });
    const filename = `khoj-operational-report-${Date.now()}.pdf`;

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${filename}`
    );
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    /* ===============================
       HEADER
    ================================ */

    doc
      .font("Helvetica-Bold")
      .fontSize(22)
      .text("KHOJ AI", { align: "center" })
      .moveDown(0.2);

    doc
      .font("Helvetica")
      .fontSize(13)
      .fillColor("#555555")
      .text("Operational Intelligence Report", { align: "center" })
      .moveDown();

    doc
      .fontSize(10)
      .fillColor("black")
      .text(`Agency: ${req.user.agency.toUpperCase()}`)
      .text(`Generated By: ${req.user.username}`)
      .text(
        `Period: ${new Date(from).toLocaleString()} → ${new Date(
          to
        ).toLocaleString()}`
      )
      .moveDown(0.4);

    doc
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .lineWidth(1)
      .stroke("#cccccc");
    doc.moveDown();

    /* ===============================
       EXECUTIVE SUMMARY (AI READY)
    ================================ */

    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor("#222222")
      .text("Executive Summary")
      .moveDown(0.3);

    const { totalUploaded, pdfCount, imageCount, audioCount } = summary;
    const busiestDay = timeline.reduce(
      (max, point) => (!max || point.count > max.count ? point : max),
      null
    );

    const autoSummary = aiSummary?.executiveSummary
      ? aiSummary.executiveSummary
      : `During the selected period, the system handled ${totalUploaded} documents
(${pdfCount} PDF, ${imageCount} Image/OCR, and ${audioCount} Audio uploads).
Activity was recorded on ${timeline.length} distinct days${
          busiestDay
            ? `, peaking on ${busiestDay.label} (${busiestDay.count} uploads)`
            : ""
        }.
`;

    doc.font("Helvetica").fontSize(11).fillColor("black").text(autoSummary.trim()).moveDown();

    /* ===============================
       KEY METRICS
    ================================ */

    doc.font("Helvetica-Bold").fontSize(14).text("Key Metrics").moveDown(0.3);

    const metrics = [
      ["Total Documents", totalUploaded],
      ["PDF Documents", pdfCount],
      ["Image / OCR Documents", imageCount],
      ["Audio Documents", audioCount],
      ["Active Uploaders", topUploaders.length],
      [
        "Average Docs / Uploader",
        topUploaders.length
          ? (totalUploaded / topUploaders.length).toFixed(1)
          : "N/A"
      ]
    ];

    metrics.forEach(([label, value]) => {
      doc.font("Helvetica").fontSize(11).text(`• ${label}: ${value}`);
    });

    doc.moveDown();

    /* ===============================
       UPLOAD TIMELINE
    ================================ */

    doc.font("Helvetica-Bold").fontSize(14).text("Upload Activity Timeline").moveDown(0.3);

    if (!timeline.length) {
      doc.font("Helvetica").fontSize(11).text("No uploads during the selected period.").moveDown();
    } else {
      timeline.forEach((t) => {
        doc.font("Helvetica").fontSize(11).text(`• ${t.label}: ${t.count} uploads`);
      });
      doc.moveDown();
    }

    /* ===============================
       RECENT DOCUMENTS
    ================================ */

    doc.font("Helvetica-Bold").fontSize(14).text("Recent Documents").moveDown(0.3);

    if (!enrichedDocuments.length) {
      doc.font("Helvetica").fontSize(11).text("No documents were ingested in this range.").moveDown();
    } else {
      enrichedDocuments.forEach((entry, index) => {
        if (index > 0) {
          doc
            .moveDown(0.3)
            .moveTo(55, doc.y)
            .lineTo(545, doc.y)
            .lineWidth(0.5)
            .stroke("#e0e0e0")
            .moveDown(0.3);
        }

        doc
          .font("Helvetica-Bold")
          .fontSize(12)
          .text(
            `${entry.filename} (${entry.type})`,
            { continued: false }
          )
          .moveDown(0.1);

        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor("#555555")
          .text(
            `Uploaded by ${entry.uploadedBy || "Unknown"} on ${new Date(
              entry.createdAt
            ).toLocaleString()}`
          )
          .moveDown(0.2);

        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor("black")
          .text(`Snippet: ${entry.snippet || "N/A"}`)
          .moveDown(0.2);

        const entitySummary = [];
        if (entry.entities?.persons?.length) {
          entitySummary.push(
            `Persons: ${entry.entities.persons.slice(0, 3).join(", ")}`
          );
        }
        if (entry.entities?.places?.length) {
          entitySummary.push(
            `Places: ${entry.entities.places.slice(0, 3).join(", ")}`
          );
        }
        if (entry.entities?.organizations?.length) {
          entitySummary.push(
            `Organizations: ${entry.entities.organizations.slice(0, 3).join(", ")}`
          );
        }

        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor("#333333")
          .text(
            entitySummary.length ? entitySummary.join(" | ") : "Entities: N/A"
          )
          .moveDown(0.3);

        doc.fillColor("black");
      });
    }

    /* ===============================
       KEY FINDINGS & ENTITY INSIGHTS (AI)
    ================================ */

    if (aiSummary) {
      doc.font("Helvetica-Bold").fontSize(14).text("Key Findings").moveDown(0.3);
      (aiSummary.keyFindings || []).forEach((finding) => {
        doc.font("Helvetica").fontSize(11).text(`• ${finding}`).moveDown(0.2);
      });
      if (!aiSummary.keyFindings?.length) {
        doc.font("Helvetica").fontSize(11).text("No key findings available.").moveDown();
      } else {
        doc.moveDown();
      }

      doc.font("Helvetica-Bold").fontSize(14).text("Entity Insights").moveDown(0.3);
      const { persons = [], places = [], organizations = [] } =
        aiSummary.entityInsights || {};
      doc
        .font("Helvetica")
        .fontSize(11)
        .text(`Persons: ${persons.slice(0, 5).join(", ") || "N/A"}`);
      doc
        .font("Helvetica")
        .fontSize(11)
        .text(`Places: ${places.slice(0, 5).join(", ") || "N/A"}`);
      doc
        .font("Helvetica")
        .fontSize(11)
        .text(`Organizations: ${organizations.slice(0, 5).join(", ") || "N/A"}`)
        .moveDown();

      doc.font("Helvetica-Bold").fontSize(14).text("Analyst Takeaways").moveDown(0.3);
      (aiSummary.analystTakeaways || []).forEach((takeaway) => {
        doc.font("Helvetica").fontSize(11).text(`• ${takeaway}`).moveDown(0.2);
      });
      if (!aiSummary.analystTakeaways?.length) {
        doc.font("Helvetica").fontSize(11).text("No takeaways available.").moveDown();
      } else {
        doc.moveDown();
      }
    }

    if (enrichedDocuments.length) {
      doc
        .moveDown()
        .font("Helvetica-Bold")
        .fontSize(14)
        .text("Per-Document Intelligence Summaries")
        .moveDown(0.3);

      enrichedDocuments.forEach((entry, index) => {
        const documentHeading = `${entry.filename} (${entry.type})`;
        const docInsights = perDocumentInsights.get(entry.documentId.toString());

        doc
          .font("Helvetica-Bold")
          .fontSize(12)
          .text(`${index + 1}. ${documentHeading}`)
          .moveDown(0.2);

        if (!docInsights) {
          doc
            .font("Helvetica")
            .fontSize(10)
            .text("AI insights unavailable for this document.")
            .moveDown();
          return;
        }

        doc.font("Helvetica-Bold").fontSize(11).text("Key Findings").moveDown(0.2);
        (docInsights.keyFindings || []).forEach((finding) => {
          doc.font("Helvetica").fontSize(10).text(`• ${finding}`).moveDown(0.1);
        });
        if (!docInsights.keyFindings?.length) {
          doc.font("Helvetica").fontSize(10).text("No key findings reported.").moveDown(0.1);
        }
        doc.moveDown(0.2);

        doc.font("Helvetica-Bold").fontSize(11).text("Entity Insights").moveDown(0.2);
        const { persons = [], places = [], organizations = [] } =
          docInsights.entityInsights || {};
        doc
          .font("Helvetica")
          .fontSize(10)
          .text(`Persons: ${persons.slice(0, 5).join(", ") || "N/A"}`);
        doc
          .font("Helvetica")
          .fontSize(10)
          .text(`Places: ${places.slice(0, 5).join(", ") || "N/A"}`);
        doc
          .font("Helvetica")
          .fontSize(10)
          .text(`Organizations: ${organizations.slice(0, 5).join(", ") || "N/A"}`)
          .moveDown(0.2);

        doc.font("Helvetica-Bold").fontSize(11).text("Analyst Takeaways").moveDown(0.2);
        (docInsights.analystTakeaways || []).forEach((takeaway) => {
          doc.font("Helvetica").fontSize(10).text(`• ${takeaway}`).moveDown(0.1);
        });
        if (!docInsights.analystTakeaways?.length) {
          doc.font("Helvetica").fontSize(10).text("No takeaways reported.").moveDown(0.1);
        }

        doc.moveDown(0.4);
      });
    }

    /* ===============================
       FOOTER
    ================================ */

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#888888")
      .text(
        "This report was automatically generated by KHOJ AI. All data reflects ingestion state at the time of generation.",
        { align: "center" }
      );

    doc.end();

    /* ===============================
       AUDIT LOG
    ================================ */

    await emitLog(req.app.get("io"), {
      level: "SUCCESS",
      message: "Operational report PDF exported",
      user: req.user.username,
      agency: req.user.agency,
      period: { from, to }
    });

  } catch (err) {
    console.error("PDF Export Error:", err);
    res.status(500).json({ error: "PDF export failed" });
  }
};
