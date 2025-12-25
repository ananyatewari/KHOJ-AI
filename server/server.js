import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import ingestPdf from "./routes/ingest.js";
import searchRoutes from "./routes/search.js";
import dashboardRoutes from "./routes/dashboard.js";
import authRoutes from "./routes/auth.js";
import cors from "cors";
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors())
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Mongo connected"));

app.use("/api/ingest", ingestPdf);
app.use("/api/search", searchRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/auth", authRoutes);


app.listen(3000, () => {
  console.log("Server running on 3000");
});
