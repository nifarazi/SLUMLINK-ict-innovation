import express from "express";
import {
  uploadDocument,
  getPendingDocumentsForResident,
  getAllDocumentsForResident,
  getAllPendingDocuments,
  getDocumentById,
  approveDocument,
  rejectDocument,
  getDocumentCount
} from "../controllers/document.controller.js";

const router = express.Router();

// POST /api/documents/upload - Upload new document
router.post("/upload", uploadDocument);

// GET /api/documents/:slum_id/pending - Get pending documents for resident
router.get("/:slum_id/pending", getPendingDocumentsForResident);

// GET /api/documents/:slum_id/all - Get all documents for resident
router.get("/:slum_id/all", getAllDocumentsForResident);

// GET /api/documents/all/pending - Get all pending documents (admin)
router.get("/all/pending", getAllPendingDocuments);

// GET /api/documents/:document_id - Get document with file content
router.get("/view/:document_id", getDocumentById);

// GET /api/documents/:slum_id/count - Get pending document count
router.get("/:slum_id/count", getDocumentCount);

// PATCH /api/documents/:document_id/approve - Approve document
router.patch("/:document_id/approve", approveDocument);

// PATCH /api/documents/:document_id/reject - Reject document
router.patch("/:document_id/reject", rejectDocument);

export default router;
