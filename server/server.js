import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
// Default chatbot model when not provided in environment
if (!process.env.CHATBOT_MODEL) {
  process.env.CHATBOT_MODEL = "claude-haiku-4.5";
  console.log("CHATBOT_MODEL not set — defaulting to claude-haiku-4.5");
}
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import path from "path";
import { fileURLToPath } from "url";
import documentRoutes from "./routes/document.js";
import ocrRoutes from "./routes/ocr.js";
import ingestPdf from "./routes/ingest.js";
import searchRoutes from "./routes/search.js";
import dashboardRoutes from "./routes/dashboard.js";
import authRoutes from "./routes/auth.js";
import reportRoutes from "./routes/report.js";
import chatbotRoutes from "./routes/chatbot.js";
import transcriptionRoutes from "./routes/transcription.js";
import historyRoutes from "./routes/history.js";

const app = express();
const server = http.createServer(app);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const io = new Server(server, {
  cors: { origin: "*" }
});

app.set("io", io);

app.use(express.json());
app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Mongo connected"));

app.use("/api/ingest", ingestPdf);
app.use("/api/search", searchRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/document", documentRoutes);
app.use("/api/ocr", ocrRoutes);
app.use("/api/transcription", transcriptionRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/history", historyRoutes);
server.listen(3000, () => {
  console.log("Server running on 3000");
});
