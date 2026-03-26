import express from 'express';
import {
  bookAppointment,
  getAllAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
  getTodayAppointments,
  getFutureAppointments,
  updateConductStatus,
  getAppointmentsByConductStatus,
  getPendingAppointments,
  rescheduleAppointment,
  cancelAppointment

} from '../controllers/appointmentController.js';

import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/add',  bookAppointment);
router.get('/getall', authenticate, getAllAppointments);
router.post('/getsingle', authenticate, getAppointmentById);
router.post('/update', authenticate, updateAppointment);
router.post('/delete', authenticate, deleteAppointment);
router.get('/getTodayAppointments', authenticate, getTodayAppointments);
router.post('/getFutureAppointments', authenticate, getFutureAppointments);
router.post('/updateConductStatus', authenticate, updateConductStatus);
router.post('/getByConductStatus', authenticate, getAppointmentsByConductStatus);
router.post('/getPendingAppointments', authenticate, getPendingAppointments);
router.post('/reschedule', authenticate, rescheduleAppointment);
router.post('/cancel', authenticate, cancelAppointment);




export default router;
