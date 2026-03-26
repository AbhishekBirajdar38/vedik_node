import express from "express";
import {
  createBatch,
  getEligibleBatchStudents,
  assignStudentsToBatch,
  getAllBatches,
  getStudentsByBatch,
  upgradeStudentBatch,
  getAssignedBatches,
  getStudentDashboardClasses,
  getBatchesByStandard,
  deleteBatch,
  updateBatch,
} from "../controllers/batchController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/createBatch", authenticate, createBatch);
router.post("/getEligibleBatchStudents", authenticate, getEligibleBatchStudents);
router.post("/assignStudentsToBatch", authenticate, assignStudentsToBatch);
router.post("/getAllBatches", authenticate, getAllBatches);
router.post("/students", authenticate, getStudentsByBatch);
router.post("/upgradeStudentBatch", authenticate, upgradeStudentBatch);
router.post("/getAssignedBatches", authenticate, getAssignedBatches);
router.post("/getStudentDashboardClasses", authenticate, getStudentDashboardClasses);
router.post("/getBatchesByStandard", authenticate, getBatchesByStandard);
router.post("/deleteBatch", authenticate, deleteBatch);
router.post("/updateBatch", authenticate, updateBatch);

export default router;
