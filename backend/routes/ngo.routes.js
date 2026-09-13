import express from "express";
import upload from "../middleware/upload.js";
import {
  registerOrganization,
  getPendingNGOs,
  getActiveNGOs,
  getLocalAuthorities,
  getNGODetails,
  getNGOLicense,
  getNgoAnalytics,
  approveNGO,
  rejectNGO,
  deleteNGO,
  signinNGO,
} from "../controllers/ngo.controller.js";

const router = express.Router();

// POST /api/ngo/register
router.post("/register", upload.single("license"), registerOrganization);

// POST /api/ngo/signin
router.post("/signin", signinNGO);

// GET /api/ngo/pending - Get all pending NGOs
router.get("/pending", getPendingNGOs);

// GET /api/ngo/active - Get all active NGOs
router.get("/active", getActiveNGOs);

// GET /api/ngo/analytics - Get NGO analytics
router.get("/analytics", getNgoAnalytics);

// GET /api/ngo/local-authorities - Get all local authorities
router.get("/local-authorities", getLocalAuthorities);

// PUT /api/ngo/:orgId/approve - Approve NGO (specific before generic)
router.put("/:orgId/approve", approveNGO);

// PUT /api/ngo/:orgId/reject - Reject NGO (specific before generic)
router.put("/:orgId/reject", rejectNGO);

// GET /api/ngo/:orgId/license - Get NGO license file (specific before generic)
router.get("/:orgId/license", getNGOLicense);

// DELETE /api/ngo/:orgId - Delete NGO (specific before generic GET)
router.delete("/:orgId", deleteNGO);

// GET /api/ngo/:orgId - Get NGO details (generic, must be last)
router.get("/:orgId", getNGODetails);

export default router;
