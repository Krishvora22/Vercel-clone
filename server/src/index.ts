import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import projectRoutes from "./routes/projectRoutes";
import { proxyController } from "./controllers/proxyController";

const app = express();
const PORT = 4500;

const allowedOrigins = [
  "https://vercel.priyanshuvaliya.dev",
  "http://localhost:3000",
  "https://vercel-v-2.vercel.app",
  "https://mini-vercel.krisvora.me"
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.use("/api", projectRoutes);

app.get("/", (_req, res) => {
  res.send("Server running successfully...");
});

app.get("/:id", proxyController);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
