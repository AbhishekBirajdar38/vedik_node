import express from "express";
import {
  addpdf,
  upload,
  addvideo,
  uploadVideo,
  uplodeimage,
  uploadImages,
  publishMediaToBatch,
  getBatchMediaForStudent,
  getBatchMediaList,
  getStudentStudyMaterialsFromToken,
  addKundaliPracticeSet,
  getAllKundaliPracticeSets,
  viewMedia,
  getTopicList,
  uploadTopicMedia,
  getTopicMedia,
  assignTopicAndMediaToSlot,
  getClassStudyMaterials,
  addTopic,
  uploadStudentCertificate,
  publishStudentCertificate,
  getMyCertificates,
  uploadPaymentReceipt,
  publishPaymentReceipt,
  getMyReceipts,
  uploadTopic
} from "../controllers/mediaController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { uploadKundaliFile } from "../middlewares/kundaliUpload.js";

const router = express.Router();

// Define your routes below
router.post("/addpdf", authenticate, upload.single("pdf"), addpdf);
router.post("/addvideo", authenticate, uploadVideo.single("video"), addvideo);
router.post(
  "/uplodeimage",
  authenticate,
  uploadImages.single("image"),
  uplodeimage,
);
router.post("/publishMediaToBatch", authenticate, publishMediaToBatch);
router.post("/getBatchMediaForStudent", authenticate, getBatchMediaForStudent);
router.post("/getBatchMediaList", authenticate, getBatchMediaList);
router.get(
  "/getAllKundaliPracticeSets",
  authenticate,
  getAllKundaliPracticeSets,
);
router.post("/viewMedia", authenticate, viewMedia);
router.post("/getTopicMedia", authenticate, getTopicMedia);
router.post(
  "/assignTopicAndMediaToSlot",
  authenticate,
  assignTopicAndMediaToSlot,
);
router.post(
  "/getStudentStudyMaterialsFromToken",
  authenticate,
  getStudentStudyMaterialsFromToken,
);
router.post("/addTopic", authenticate, addTopic);
router.post(
  "/uploadStudentCertificate",
  authenticate,
  upload.single("file"),
  uploadStudentCertificate,
);

router.post(
  "/publishStudentCertificate",
  authenticate,
  publishStudentCertificate,
);
router.post("/getMyCertificates", authenticate, getMyCertificates);
router.post(
  "/getClassStudyMaterials/:slot_id",
  authenticate,
  getClassStudyMaterials,
);
router.post(
  "/addKundaliPracticeSet",
  authenticate,
  uploadKundaliFile.single("file"), // ✅ MUST BE HERE
  addKundaliPracticeSet,
);

router.get("/getTopicList", authenticate, getTopicList);
router.post(
  "/uploadTopicMedia",
  authenticate,
  uploadTopic.single("file"), // ✅ FIXED
  uploadTopicMedia,
);

router.post(
  "/uploadPaymentReceipt",
  authenticate,
  upload.single("file"),
  uploadPaymentReceipt,
);
router.post("/publishPaymentReceipt", authenticate, publishPaymentReceipt);
router.get("/getMyReceipts", authenticate, getMyReceipts);

export default router;
