import express from "express";
import Document from "../models/Document.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.get("/", auth, async (req, res) => {
  const { agency, username } = req.user;

  const myDocs = await Document.find({ uploadedBy: username }).sort({ createdAt: -1 });
  const agencyDocs = await Document.find({ agency }).sort({ createdAt: -1 });

  const last24h = await Document.countDocuments({
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    agency,
  });

  res.json({
    myDocs,
    agencyDocs,
    stats: {
      myUploads: myDocs.length,
      agencyUploads: agencyDocs.length,
      last24h,
    },
  });
});

export default router;
