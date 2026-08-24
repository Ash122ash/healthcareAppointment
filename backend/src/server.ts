import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import adminRouter from './routes/admin';
import doctorRouter from './routes/doctor';
import patientRouter from './routes/patient';
import calendarRouter from './routes/calendar';
import { startPeriodicSweepers } from './workers';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS with credentials support for HTTP-only cookies
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:5173',
  'https://healthcare-appointment-frontend-1p8w2iqux.vercel.app',
  'https://healthcare-appointment-frontend-sage.vercel.app',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, etc.) or from allowed list
    if (!origin || allowedOrigins.includes(origin) || (origin && origin.endsWith('.vercel.app'))) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/auth', calendarRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/doctor', doctorRouter);
app.use('/api/v1/patient', patientRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'MediSync Backend' });
});

// Centralized error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred.',
  });
});

// Start background sweepers
startPeriodicSweepers();

app.listen(port, () => {
  console.log(`MediSync Backend running on port ${port}`);
});
