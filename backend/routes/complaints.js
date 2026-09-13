// backend/routes/complaints.js
import express from "express";
import {
  getComplaintCounts,
  getComplaintsByCategory,
  getComplaintById,
  updateComplaintStatus,
  getComplaintAttachment
} from "../controllers/complaintController.js";

const router = express.Router();

// 1️⃣ Get counts
router.get("/counts", getComplaintCounts);

// 2️⃣ Get complaints by category
router.get("/", getComplaintsByCategory);

// 3️⃣ Get single complaint by ID
router.get("/:id", getComplaintById);

// 3.5️⃣ Get complaint attachment file as binary
router.get("/:id/attachment", getComplaintAttachment);

// 4️⃣ Update complaint status
router.put("/:id/status", updateComplaintStatus);

export default router;
