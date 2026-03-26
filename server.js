import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import studentRouter from './routes/studentRouter.js';  
import authRoutes from './routes/authRoutes.js';  
import mediaRoutes from './routes/mediaRoutes.js'; 
import appointmentRoutes from "./routes/appointmentRoutes.js";
import slotRoutes from './routes/slotRoutes.js';
import servicesRoutes from './routes/servicesRoutes.js';
import classScheduleRoutes from "./routes/classScheduleRoutes.js";
import batchRoutes from './routes/batchRouter.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Setup __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/student', studentRouter);
app.use('/api/auth', authRoutes);
app.use('/api/media', mediaRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/services', servicesRoutes);
app.use("/api", classScheduleRoutes);
app.use('/api/batches', batchRoutes);


app.get('/', (req, res) => {
    res.send('Welcome to the API');
});

// Start the server
// app.listen(PORT, () => {
//     console.log(Server is running on http://localhost:${PORT});
// });
app.listen(PORT, '0.0.0.0', () => {
  const networkInterfaces = os.networkInterfaces();
  const wifi = Object.values(networkInterfaces)
    .flat()
    .find(i => i.family === 'IPv4' && !i.internal);

  console.log('Server running on:');
  console.log(`→ http://${wifi.address}:${PORT}`);
});