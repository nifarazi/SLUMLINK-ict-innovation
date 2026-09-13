import express from "express";
import {
  createCampaign,
  getAllCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  getMyActiveCampaignsToday, // ✅ NEW
  getEligibleFamilies // ✅ NEW
} from "../controllers/campaign.controller.js";

const router = express.Router();

// ✅ NEW: GET /api/campaigns/mine-active?org_id=1001
router.get("/mine-active", getMyActiveCampaignsToday);

// POST /api/campaigns/create
router.post("/create", createCampaign);

// GET /api/campaigns?org_id=...
router.get("/", getAllCampaigns);

// ✅ NEW: GET /api/campaigns/:campaignId/eligible-families
router.get("/:campaignId/eligible-families", getEligibleFamilies);

// GET /api/campaigns/:campaignId
router.get("/:campaignId", getCampaignById);

// PUT /api/campaigns/:campaignId
router.put("/:campaignId", updateCampaign);

// DELETE /api/campaigns/:campaignId
router.delete("/:campaignId", deleteCampaign);

export default router;