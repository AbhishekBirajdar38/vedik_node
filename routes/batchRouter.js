import express from "express";

import {
  createBatch,
  updateBatch,
  getEligibleBatchStudents,
  assignStudentsToBatch,
  getAllBatches,
  getStudentsByBatch,
  upgradeStudentBatch,
  getAssignedBatches,
  getStudentDashboardClasses,
  getBatchesByStandard,
  deleteBatch
} from "../controllers/batchController.js";

import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/createBatch", authenticate, createBatch);
router.post("/updateBatch", authenticate, updateBatch);
router.post("/getEligibleBatchStudents", authenticate, getEligibleBatchStudents);
router.post("/assignStudentsToBatch", authenticate, assignStudentsToBatch);
router.post("/getAllBatches", authenticate, getAllBatches);
router.post("/students", authenticate, getStudentsByBatch);
router.post("/upgradeStudentBatch", authenticate, upgradeStudentBatch);
router.get("/getAssignedBatches", authenticate, getAssignedBatches);
router.get("/getStudentDashboardClasses", authenticate, getStudentDashboardClasses);
router.post("/getBatchesByStandard", authenticate, getBatchesByStandard);
router.post("/deleteBatch", authenticate, deleteBatch);

export default router;