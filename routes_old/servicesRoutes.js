import express from "express";
import {
  addServiceBooking,
  updateServiceBookingStatus,
  getServiceBookingsByService
} from "../controllers/servicesController.js";

import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/addServiceBooking", authenticate, addServiceBooking);
router.post("/getServiceBookingsByService", authenticate, getServiceBookingsByService);
router.post("/services/update-status", authenticate, updateServiceBookingStatus);

export default router;
