// backend/routes/complaints.js
import express from "express";
import {
  getComplaintCounts,
  getComplaintsByCategory,
  getComplaintById,
  updateComplaintStatus
} from "../controllers/complaintController.js";

const router = express.Router();

// 1️⃣ Get counts
router.get("/counts", getComplaintCounts);

// 2️⃣ Get complaints by category
router.get("/", getComplaintsByCategory);

// 3️⃣ Get single complaint by ID
router.get("/:id", getComplaintById);

// 4️⃣ Update complaint status
router.put("/:id/status", updateComplaintStatus);

export default router;
