import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import UserSQL from "../models/sql/User.js";
import User from "../models/User.js";

const router = express.Router();

const USE_POSTGRES = process.env.USE_POSTGRES === 'true';

/* ---------- SIGNUP ---------- */
router.post("/signup", async (req, res) => {
  const { username, password, agency } = req.body;

  if (!username || !password || !agency) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    if (USE_POSTGRES) {
      const exists = await UserSQL.findOne({ where: { username } });
      if (exists) {
        return res.status(400).json({ error: "User already exists" });
      }

      const hashed = await bcrypt.hash(password, 10);

      await UserSQL.create({
        username,
        password: hashed,
        agency,
      });

      console.log(`[PostgreSQL] User registered: ${username}`);
    } else {
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

      console.log(`[MongoDB] User registered: ${username}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

/* ---------- LOGIN ---------- */
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    let user;

    if (USE_POSTGRES) {
      user = await UserSQL.findOne({ where: { username } });
      
      if (!user) {
        console.log(`[PostgreSQL] User not found, checking MongoDB fallback: ${username}`);
        user = await User.findOne({ username });
        if (user) {
          console.log(`[Fallback] Found user in MongoDB: ${username}`);
        }
      } else {
        console.log(`[PostgreSQL] User found: ${username}`);
      }
    } else {
      user = await User.findOne({ username });
      console.log(`[MongoDB] User lookup: ${username}`);
    }

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
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;
