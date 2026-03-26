import express from "express";
import {
  addstudent,
  getAllStudents,
  getStudentById,
  updatestudentdetails,
  getStudentFullDetails,
  getStudentClassSchedule,
  getStudentDetails,
  getAllStudentDetails,
  checkStudentRegistration,
  deleteStudentDetails,
} from "../controllers/studentController.js";

import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

/* ========= ADMIN ========= */
router.post("/addstudent", authenticate, addstudent);
router.post("/getAllStudents", authenticate, getAllStudents);
router.post("/getsingle", authenticate, getStudentById);

/* ========= STUDENT ========= */
router.post("/updatestudentdetails", authenticate, updatestudentdetails);
router.post("/getStudentFullDetails", authenticate, getStudentFullDetails);
router.post("/getStudentClassSchedule", authenticate, getStudentClassSchedule);
router.post ( "/getStudentDetails", authenticate, getStudentDetails ) 
router.post("/getAllStudentDetails", authenticate, getAllStudentDetails)
router.post("/checkStudentRegistration", authenticate, checkStudentRegistration);
router.post("/deleteStudentDetails", authenticate, deleteStudentDetails);

export default router;
