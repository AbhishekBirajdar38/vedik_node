import express from 'express';
import {login ,getAllAdmins, registerAdmin} from '../controllers/authcontroller.js';
import { authenticate } from '../middlewares/authMiddleware.js'; 

const router = express.Router();


router.post('/login', login);
router.post('/getall', authenticate, getAllAdmins);

router.post('/registerAdmin', registerAdmin);

export default router;
