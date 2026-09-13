import express from "express";
import upload from "../middleware/upload.js";
import { 
  registerSlumDweller,
  signinSlumDweller,
  getPendingSlumDwellers,
  getActiveSlumDwellers,
  getSlumDwellerById,
  approveSlumDweller,
  rejectSlumDweller,
  getCurrentUserProfile,
  checkNidDuplicate,
  checkBirthCertificateDuplicate,
  updatePersonalInfo,
  updateSpouseInfo,
  updateChildInfo,
  updateSpouseStatus,
  updateChildStatus,
  reviewSpouseUpdate,
  reviewChildUpdate,
  getSpouseDocument,
  getChildDocument,
  getMemberDocuments,
  initPhoneChange,
  verifyCurrentPhone,
  sendNewPhoneOTP,
  verifyNewPhoneAndUpdate,
  initSpousePhoneChange,
  verifySpouseCurrentPhone,
  sendSpouseNewPhoneOTP,
  verifySpouseNewPhoneAndUpdate,
  changePassword,
  addSpouse,
  prepareSpouseAdd,
  addChild,
  sendSpouseAddOTP,
  verifySpouseAddOTP
} from "../controllers/slumDweller.controller.js";

const router = express.Router();

// POST /api/slum-dweller/register
router.post("/register", registerSlumDweller);

// POST /api/slum-dweller/signin
router.post("/signin", signinSlumDweller);

// POST /api/slum-dweller/check-nid - Check NID duplicate
router.post("/check-nid", checkNidDuplicate);

// POST /api/slum-dweller/check-birth-certificate - Check birth certificate duplicate
router.post("/check-birth-certificate", checkBirthCertificateDuplicate);

// GET /api/slum-dweller/pending
router.get("/pending", getPendingSlumDwellers);

// GET /api/slum-dweller/active
router.get("/active", getActiveSlumDwellers);

// GET /api/slum-dweller/profile/:id (for dashboard - lightweight)
router.get("/profile/:id", getCurrentUserProfile);

// GET /api/slum-dweller/:id (full details with spouse and children)
router.get("/:id", getSlumDwellerById);

// PATCH /api/slum-dweller/:id/approve
router.patch("/:id/approve", approveSlumDweller);

// PUT /api/slum-dweller/:slumId/personal - Update personal information
router.put("/:slumId/personal", updatePersonalInfo);

// PUT /api/slum-dweller/:slumId/spouse/:spouseId - Update spouse information
router.put("/:slumId/spouse/:spouseId", updateSpouseInfo);

// PATCH /api/slum-dweller/:slumId/spouse/:spouseId/status - Update spouse status
router.patch("/:slumId/spouse/:spouseId/status", upload.single('divorce_certificate'), updateSpouseStatus);

// PUT /api/slum-dweller/:slumId/child/:childId - Update child information  
router.put("/:slumId/child/:childId", updateChildInfo);

// PATCH /api/slum-dweller/:slumId/child/:childId/status - Update child status
router.patch("/:slumId/child/:childId/status", upload.single('death_certificate'), updateChildStatus);

// GET /api/slum-dweller/:slumId/spouse/:spouseId/document/:docType
router.get("/:slumId/spouse/:spouseId/document/:docType", getSpouseDocument);

// GET /api/slum-dweller/:slumId/child/:childId/document/:docType
router.get("/:slumId/child/:childId/document/:docType", getChildDocument);

// GET /api/slum-dweller/:slumId/member-documents
router.get("/:slumId/member-documents", getMemberDocuments);

// POST /api/slum-dweller/:slumId/spouse/:spouseId/review - Approve/reject spouse updates
router.post("/:slumId/spouse/:spouseId/review", reviewSpouseUpdate);

// POST /api/slum-dweller/:slumId/child/:childId/review - Approve/reject child updates
router.post("/:slumId/child/:childId/review", reviewChildUpdate);

// POST /api/slum-dweller/:slumCode/change-password - Change password
router.post("/:slumCode/change-password", changePassword);

// Phone number change endpoints
// POST /api/slum-dweller/phone-change/init - Initialize phone change process
router.post("/phone-change/init", initPhoneChange);

// POST /api/slum-dweller/phone-change/verify-current - Verify current phone OTP
router.post("/phone-change/verify-current", verifyCurrentPhone);

// POST /api/slum-dweller/phone-change/new-phone - Send OTP to new phone
router.post("/phone-change/new-phone", sendNewPhoneOTP);

// POST /api/slum-dweller/phone-change/verify-new - Verify new phone and update
router.post("/phone-change/verify-new", verifyNewPhoneAndUpdate);

// Spouse phone number change endpoints
// POST /api/slum-dweller/spouse-phone-change/init - Initialize spouse phone change process
router.post("/spouse-phone-change/init", initSpousePhoneChange);

// POST /api/slum-dweller/spouse-phone-change/verify-current - Verify spouse current phone OTP
router.post("/spouse-phone-change/verify-current", verifySpouseCurrentPhone);

// POST /api/slum-dweller/spouse-phone-change/new-phone - Send OTP to new spouse phone
router.post("/spouse-phone-change/new-phone", sendSpouseNewPhoneOTP);

// POST /api/slum-dweller/spouse-phone-change/verify-new - Verify new spouse phone and update
router.post("/spouse-phone-change/verify-new", verifySpouseNewPhoneAndUpdate);

// POST /api/slum-dweller/:slumCode/prepare-spouse-add - Prepare spouse addition with validation and OTP
router.post("/:slumCode/prepare-spouse-add", upload.single('marriage_certificate'), prepareSpouseAdd);

// POST /api/slum-dweller/:slumCode/add-spouse - Add spouse with pending_add status  
router.post("/:slumCode/add-spouse", upload.single('marriage_certificate'), addSpouse);

// POST /api/slum-dweller/:slumCode/add-child - Add child with pending_add status
router.post("/:slumCode/add-child", upload.single('birth_certificate'), addChild);

// POST /api/slum-dweller/spouse-add-otp/send - Send OTP for spouse verification
router.post("/spouse-add-otp/send", sendSpouseAddOTP);

// POST /api/slum-dweller/spouse-add-otp/verify - Verify spouse add OTP
router.post("/spouse-add-otp/verify", verifySpouseAddOTP);

// DELETE /api/slum-dweller/:id
router.delete("/:id", rejectSlumDweller);

export default router;
