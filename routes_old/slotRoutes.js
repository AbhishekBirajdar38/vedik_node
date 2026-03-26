import express from 'express';
import {
  saveSchedule,
  getSlotsByDate,
  getSlotsBySpecificDate,
  getSlotInterval,
  getTodayEmptySlots,
  deactivateSlotsByDate,
  updateSlotStatus,
  getDeactivatedSlotsByDate
} from '../controllers/slotController.js';

import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Save or Update Working Schedule
router.post('/saveSchedule', authenticate, saveSchedule);

// Get All Schedules

// Get Available Slots for a Given Date
router.post('/getbydate', authenticate, getSlotsByDate);

// Delete Schedule by ID

router.post('/getSlotsBySpecificDate',  getSlotsBySpecificDate);

router.get('/getSlotInterval', authenticate, getSlotInterval);

router.get('/getTodayEmptySlots', authenticate, getTodayEmptySlots);


router.post('/deactivateSlotsByDate', authenticate, deactivateSlotsByDate);

router.post('/updateSlotStatus', authenticate, updateSlotStatus);

router.post('/getDeactivatedSlotsByDate', authenticate, getDeactivatedSlotsByDate);





export default router;
