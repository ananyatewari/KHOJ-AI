import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

/* ---------- SIGNUP ---------- */
router.post("/signup", async (req, res) => {
  const { username, password, agency } = req.body;

  if (!username || !password || !agency) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const exists = await User.findOne({ username });
  if (exists) {
    return res.status(400).json({ error: "User already exists" });
  }

  const hashed = await bcrypt.hash(password, 10);

  await User.create({
    username,
    password: hashed,
    agency,
  });

  res.json({ success: true });
});

/* ---------- LOGIN ---------- */
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { username: user.username, agency: user.agency },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({
    token,
    user: {
      username: user.username,
      agency: user.agency,
    },
  });
});

export default router;
