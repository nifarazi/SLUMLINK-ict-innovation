// backend/routes/dashboard.routes.js
import express from "express";
import { getDashboardSummary, getRecentDistributions } from "../controllers/dashboard.controller.js";

const router = express.Router();

router.get("/dashboard/summary", getDashboardSummary);
router.get("/dashboard/recent-distributions", getRecentDistributions);

export default router;