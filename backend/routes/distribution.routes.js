// backend/routes/distribution.routes.js
import express from "express";
import {
  createDistributionSession,
  addDistributionEntry,
  finishDistributionSession,
  getFamilySnapshotAllHistory,
  getCampaignDistributionHistory,  // ✅ NEW
  getCampaignImpact                 // ✅ ADD THIS
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

// ✅ NEW: GET /api/campaigns/:campaignId/distribution-history
router.get("/campaigns/:campaignId/distribution-history", getCampaignDistributionHistory);

// ✅ NEW: GET /api/campaigns/:campaignId/impact
router.get("/campaigns/:campaignId/impact", getCampaignImpact);

export default router;