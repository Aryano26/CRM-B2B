import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routers
import authRouter from './routes/auth';
import casesRouter from './routes/cases';
import escalationsRouter from './routes/escalations';
import dashboardRouter from './routes/dashboard';
import adminRouter from './routes/admin';
import exportRouter from './routes/export';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*', // Allow all origins for local dev environment
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Express request JSON body parser with increased limit to support base64 document uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Log middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Bind routers to API prefix paths
app.use('/api/auth', authRouter);
app.use('/api/cases', casesRouter);
app.use('/api/escalations', escalationsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/admin', adminRouter);
app.use('/api/export', exportRouter);

// Global 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected internal server error occurred',
  });
});

// Start the express server
app.listen(PORT, () => {
  console.log(`🚀 Partner CRM Server running on http://localhost:${PORT}`);
});
