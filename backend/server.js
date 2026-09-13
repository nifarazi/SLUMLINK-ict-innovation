// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import ngoRoutes from "./routes/ngo.routes.js";
import slumDwellerRoutes from "./routes/slumDweller.routes.js";
import documentRoutes from "./routes/document.routes.js";
import complaintRoutes from "./routes/complaint.routes.js";
import campaignRoutes from "./routes/campaign.routes.js";

// ✅ NEW
import distributionRoutes from "./routes/distribution.routes.js";
import aidTypeRoutes from "./routes/aidType.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PREFERRED_PORT = Number(process.env.SERVER_PORT) || 5001;

app.use(cors());

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const rootDir = path.resolve(__dirname, "..");

app.use((req, res, next) => {
  if (req.path.startsWith("/backend") || req.path.startsWith("/node_modules")) {
    return res.status(404).send("Not Found");
  }
  next();
});

// Backward-compatible redirects
app.get("/src/localauthority/create-campaign.html", (req, res) => {
  res.redirect(302, "/src/shared/create-campaign.html?role=localauthority");
});
app.get("/src/ngo/ngocreate-campaign.html", (req, res) => {
  res.redirect(302, "/src/shared/create-campaign.html?role=ngo");
});

app.use(express.static(rootDir));

// API Routes
app.use("/api/ngo", ngoRoutes);
app.use("/api/slum-dweller", slumDwellerRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/campaigns", campaignRoutes);

// ✅ NEW API Routes
app.use("/api", distributionRoutes); // contains /distribution-sessions + /distribution/families/:code/snapshot
app.use("/api", aidTypeRoutes);      // contains /aid-types

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(rootDir, "index.html"));
});

function listenOnce(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => resolve({ server, port }));
    server.on("error", reject);
  });
}

async function startServerWithFallback(preferredPort, maxAttempts = 20) {
  let port = preferredPort;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const { port: actualPort } = await listenOnce(port);
      console.log(`✅ Server running: http://localhost:${actualPort}`);
      if (actualPort !== preferredPort) {
        console.warn(`ℹ️ Preferred port ${preferredPort} was busy; using ${actualPort} instead.`);
      }
      return;
    } catch (err) {
      if (err && err.code === "EADDRINUSE") {
        port += 1;
        continue;
      }
      throw err;
    }
  }

  console.error(
    `❌ Could not find a free port starting at ${preferredPort} (tried ${maxAttempts} ports). Set SERVER_PORT to a different value.`
  );
  process.exit(1);
}

startServerWithFallback(PREFERRED_PORT);