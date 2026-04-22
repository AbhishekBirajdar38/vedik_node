import express from "express";

import {
  getAllClassSchedules,
  deleteClassSchedule,
  saveClassSchedule,
  getClassSlotsByDate,
  generateAttendanceForDate,
  markAttendanceOnJoin,
  updateClassTopicByDate,
  getStudentClasses,
  getStudentClassesFromToken,
  updateClassLinkBySlotId,
  getMyAttendanceFromToken,
  getAttendanceByBatch,
  getStandards,
  updateClassSchedule,
  editClassSchedule,
  deleteClassSlot,
  updateTopic,
  deleteTopic,
  getScheduleForAdmin,
  deleteClassScheduleWithSlots
} from "../controllers/classScheduleController.js";

import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/saveClassSchedule", authenticate, saveClassSchedule);
router.post("/getAllClassSchedules", authenticate, getAllClassSchedules);
router.post("/deleteClassSchedule", authenticate, deleteClassSchedule);
router.post("/getClassSlotsByDate", authenticate, getClassSlotsByDate);
router.post("/generateAttendanceForDate", authenticate, generateAttendanceForDate);
router.post("/updateClassTopicByDate", authenticate, updateClassTopicByDate);
router.post("/getStudentClasses/:batch_code", authenticate, getStudentClasses);
router.post("/getStudentClassesFromToken", authenticate, getStudentClassesFromToken);
router.post("/updateClassLinkBySlotId", authenticate, updateClassLinkBySlotId);
router.post("/markAttendanceOnJoin", authenticate, markAttendanceOnJoin);
router.post("/getMyAttendanceFromToken", authenticate, getMyAttendanceFromToken);
router.post("/getAttendanceByBatch", authenticate, getAttendanceByBatch);
router.post("/getStandards", authenticate, getStandards);
router.post("/updateClassSchedule", authenticate, updateClassSchedule);
router.post("/deleteClassSlot", authenticate, deleteClassSlot);
router.post("/updateTopic", authenticate, updateTopic);
router.post("/deleteTopic", authenticate, deleteTopic);
router.post("/editClassSchedule", authenticate, editClassSchedule);
router.post("/getScheduleForAdmin", authenticate, getScheduleForAdmin);
router.post("/deleteClassScheduleWithSlots", authenticate, deleteClassScheduleWithSlots);


export default router;