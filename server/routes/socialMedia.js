import express from "express";
import SocialMediaPost from "../models/SocialMediaPost.js";
import SocialMediaEvent from "../models/SocialMediaEvent.js";
import socialMediaService from "../services/socialMediaService.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Get all social media posts with filtering
router.get("/posts", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      platform,
      severity,
      isCrimeRelated,
      startDate,
      endDate,
      search
    } = req.query;

    const query = {};
    
    // Build filters
    if (platform) query.platform = platform;
    if (severity) query["analysis.severity"] = severity;
    if (isCrimeRelated !== undefined) query["analysis.isCrimeRelated"] = isCrimeRelated === "true";
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    if (search) {
      query.$or = [
        { "content.text": { $regex: search, $options: "i" } },
        { "author.username": { $regex: search, $options: "i" } },
        { "analysis.keywords": { $in: [new RegExp(search, "i")] } }
      ];
    }

    const posts = await SocialMediaPost.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("relatedEvent");

    const total = await SocialMediaPost.countDocuments(query);

    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// Get crime-related posts only
router.get("/posts/crime", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      severity,
      crimeType,
      startDate,
      endDate
    } = req.query;

    const query = { "analysis.isCrimeRelated": true };
    
    if (severity) query["analysis.severity"] = severity;
    if (crimeType) query["analysis.crimeType"] = crimeType;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const posts = await SocialMediaPost.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("relatedEvent");

    const total = await SocialMediaPost.countDocuments(query);

    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching crime posts:", error);
    res.status(500).json({ error: "Failed to fetch crime posts" });
  }
});

// Get social media events
router.get("/events", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      severity,
      status,
      eventType,
      startDate,
      endDate
    } = req.query;

    const query = {};
    
    if (severity) query.severity = severity;
    if (status) query.status = status;
    if (eventType) query.eventType = eventType;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const events = await SocialMediaEvent.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("posts")
      .populate("alerts");

    const total = await SocialMediaEvent.countDocuments(query);

    res.json({
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// Get single event with posts
router.get("/events/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const event = await SocialMediaEvent.findOne({ eventId })
      .populate("posts")
      .populate("alerts");
    
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json(event);
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

// Get single post
router.get("/posts/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    
    const post = await SocialMediaPost.findOne({ postId })
      .populate("relatedEvent");
    
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ error: "Failed to fetch post" });
  }
});

// Get statistics and analytics
router.get("/stats", async (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalPosts,
      crimePosts24h,
      crimePosts7d,
      activeEvents,
      highSeverityEvents,
      platformStats,
      crimeTypeStats
    ] = await Promise.all([
      SocialMediaPost.countDocuments(),
      SocialMediaPost.countDocuments({ 
        "analysis.isCrimeRelated": true,
        createdAt: { $gte: last24h }
      }),
      SocialMediaPost.countDocuments({ 
        "analysis.isCrimeRelated": true,
        createdAt: { $gte: last7d }
      }),
      SocialMediaEvent.countDocuments({ status: "active" }),
      SocialMediaEvent.countDocuments({ 
        severity: { $in: ["high", "critical"] },
        status: "active"
      }),
      SocialMediaPost.aggregate([
        { $match: { createdAt: { $gte: last7d } } },
        { $group: { _id: "$platform", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      SocialMediaPost.aggregate([
        { $match: { "analysis.isCrimeRelated": true, createdAt: { $gte: last7d } } },
        { $group: { _id: "$analysis.crimeType", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    res.json({
      overview: {
        totalPosts,
        crimePosts24h,
        crimePosts7d,
        activeEvents,
        highSeverityEvents
      },
      platformStats,
      crimeTypeStats,
      lastUpdated: now
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// Update event status (protected route)
router.put("/events/:eventId/status", authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status } = req.body;
    
    if (!["active", "monitoring", "resolved", "false_positive"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const event = await SocialMediaEvent.findOneAndUpdate(
      { eventId },
      { 
        status,
        lastUpdated: new Date()
      },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json(event);
  } catch (error) {
    console.error("Error updating event status:", error);
    res.status(500).json({ error: "Failed to update event status" });
  }
});

// Update post status (protected route)
router.put("/posts/:postId/status", authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const { status } = req.body;
    
    if (!["pending", "processed", "flagged", "dismissed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const post = await SocialMediaPost.findOneAndUpdate(
      { postId },
      { 
        status,
        processedAt: status === "processed" ? new Date() : undefined
      },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    console.error("Error updating post status:", error);
    res.status(500).json({ error: "Failed to update post status" });
  }
});

// Manual fetch trigger (protected route)
router.post("/fetch", authMiddleware, async (req, res) => {
  try {
    await socialMediaService.manualFetch();
    res.json({ message: "Manual fetch triggered successfully" });
  } catch (error) {
    console.error("Error triggering manual fetch:", error);
    res.status(500).json({ error: "Failed to trigger manual fetch" });
  }
});

// Service control endpoints (protected)
router.post("/service/start", authMiddleware, async (req, res) => {
  try {
    await socialMediaService.start();
    res.json({ message: "Social media service started" });
  } catch (error) {
    console.error("Error starting service:", error);
    res.status(500).json({ error: "Failed to start service" });
  }
});

router.post("/service/stop", authMiddleware, async (req, res) => {
  try {
    await socialMediaService.stop();
    res.json({ message: "Social media service stopped" });
  } catch (error) {
    console.error("Error stopping service:", error);
    res.status(500).json({ error: "Failed to stop service" });
  }
});

router.get("/service/status", async (req, res) => {
  try {
    res.json({
      isRunning: socialMediaService.isRunning,
      fetchInterval: socialMediaService.fetchInterval,
      lastFetch: new Date().toISOString() // You can track actual last fetch time
    });
  } catch (error) {
    console.error("Error getting service status:", error);
    res.status(500).json({ error: "Failed to get service status" });
  }
});

export default router;
