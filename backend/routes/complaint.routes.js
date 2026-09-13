import express from "express";
import {
  createComplaint,
  getComplaintsBySlumId,
  getComplaintById,
  getAllComplaints,
  updateComplaintStatus
} from "../controllers/complaint.controller.js";

const router = express.Router();

// POST /api/complaints - Create a new complaint
router.post("/", createComplaint);

// GET /api/complaints/slum/:slum_id - Get all complaints for a slum dweller
router.get("/slum/:slum_id", getComplaintsBySlumId);

// GET /api/complaints/:complaint_id - Get a single complaint with attachment
router.get("/:complaint_id", getComplaintById);

// GET /api/complaints - Get all complaints (for admin/authority)
router.get("/", getAllComplaints);

// PATCH /api/complaints/:complaint_id/status - Update complaint status
router.patch("/:complaint_id/status", updateComplaintStatus);

export default router;
