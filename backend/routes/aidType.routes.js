// backend/routes/aidType.routes.js
import express from "express";
import { getAidTypes } from "../controllers/aidType.controller.js";

const router = express.Router();

// GET /api/aid-types
router.get("/aid-types", getAidTypes);

export default router;