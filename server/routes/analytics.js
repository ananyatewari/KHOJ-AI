import express from "express";
import CriminalRecord from "../models/CriminalRecord.js";
import Alert from "../models/Alert.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.get("/crime-trends", authMiddleware, async (req, res) => {
  try {
    const { period = '12months', groupBy = 'month' } = req.query;
    
    const startDate = new Date();
    if (period === '12months') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    } else if (period === '6months') {
      startDate.setMonth(startDate.getMonth() - 6);
    } else if (period === '3months') {
      startDate.setMonth(startDate.getMonth() - 3);
    }

    const trendsPipeline = [
      {
        $match: {
          createdAt: { $gte: startDate },
          hasRecord: true
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            riskLevel: "$riskLevel"
          },
          count: { $sum: 1 },
          totalConvictions: { $sum: "$convictionCount" },
          activeWarrants: { $sum: { $cond: ["$activeWarrants", 1, 0] } }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ];

    const trends = await CriminalRecord.aggregate(trendsPipeline);

    const hotspots = await CriminalRecord.aggregate([
      { $match: { hasRecord: true, lastKnownLocation: { $ne: null } } },
      {
        $group: {
          _id: "$lastKnownLocation",
          count: { $sum: 1 },
          avgRiskScore: {
            $avg: {
              $switch: {
                branches: [
                  { case: { $eq: ["$riskLevel", "critical"] }, then: 5 },
                  { case: { $eq: ["$riskLevel", "high"] }, then: 4 },
                  { case: { $eq: ["$riskLevel", "medium"] }, then: 3 },
                  { case: { $eq: ["$riskLevel", "low"] }, then: 2 },
                  { case: { $eq: ["$riskLevel", "none"] }, then: 1 }
                ],
                default: 1
              }
            }
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    // Charge patterns
    const chargePatterns = await CriminalRecord.aggregate([
      { $match: { hasRecord: true } },
      { $unwind: "$courtCases" },
      { $unwind: "$courtCases.charges" },
      {
        $group: {
          _id: "$courtCases.charges",
          count: { $sum: 1 },
          severity: { $first: "$courtCases.severity" },
          statuses: { $addToSet: "$courtCases.status" }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 15 }
    ]);

    // Risk distribution
    const riskDistribution = await CriminalRecord.aggregate([
      { $match: { hasRecord: true } },
      {
        $group: {
          _id: "$riskLevel",
          count: { $sum: 1 },
          totalConvictions: { $sum: "$convictionCount" },
          avgCasesPerPerson: { $avg: { $size: { $ifNull: ["$courtCases", []] } } }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      period,
      trends,
      hotspots,
      chargePatterns,
      riskDistribution,
      generatedAt: new Date()
    });

  } catch (error) {
    console.error("Error generating crime trends:", error);
    res.status(500).json({ error: "Failed to generate crime trends" });
  }
});

export default router;