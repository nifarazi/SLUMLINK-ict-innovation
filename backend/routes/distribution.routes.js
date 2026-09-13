// backend/routes/distribution.routes.js
import express from "express";
import {
  createDistributionSession,
  addDistributionEntry,
  finishDistributionSession,
  getFamilySnapshotAllHistory
} from "../controllers/distribution.controller.js";

const router = express.Router();

// POST /api/distribution-sessions
router.post("/distribution-sessions", createDistributionSession);

// POST /api/distribution-sessions/:sessionId/entries
router.post("/distribution-sessions/:sessionId/entries", addDistributionEntry);

// POST /api/distribution-sessions/:sessionId/finish
router.post("/distribution-sessions/:sessionId/finish", finishDistributionSession);

// GET /api/distribution/families/:slum_code/snapshot
router.get("/distribution/families/:slum_code/snapshot", getFamilySnapshotAllHistory);

export default router;