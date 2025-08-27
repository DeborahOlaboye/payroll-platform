import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { getEnvVar } from '@usdc-payroll/shared';
import { logger } from './config/logger';
import { prisma } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter, uploadLimiter, webhookLimiter } from './middleware/rateLimiter';

// Import routes
import payrollRoutes from './routes/payrollRoutes';
import workerRoutes from './routes/workerRoutes';
import webhookRoutes from './routes/webhookRoutes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(getEnvVar('PORT', '3001'));
const FRONTEND_URL = getEnvVar('FRONTEND_URL', 'http://localhost:3000');

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS configuration
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-id', 'x-circle-signature']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting
app.use('/api', apiLimiter);
app.use('/api/payroll/upload-csv', uploadLimiter);
app.use('/api/webhooks', webhookLimiter);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: 'connected',
        circle: 'configured'
      }
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

// API routes
app.use('/api/payroll', payrollRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/webhooks', webhookRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'USDC Gig Payroll Platform API',
    version: '1.0.0',
    description: 'Backend API for Circle Developer Bounty Hackathon',
    challenges: [
      'Multichain USDC Payment System (CCTP v2)',
      'Pay Gas Using USDC (Paymaster)',
      'Gasless Experience (Gas Station)'
    ],
    endpoints: {
      health: '/health',
      payroll: '/api/payroll',
      workers: '/api/workers',
      webhooks: '/api/webhooks'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Endpoint not found',
      code: 'NOT_FOUND',
      statusCode: 404
    }
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 USDC Gig Payroll Platform API started`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    frontendUrl: FRONTEND_URL
  });
  
  logger.info('🎯 Circle Developer Bounty Challenges:', {
    challenge1: 'Multichain USDC Payment System (CCTP v2)',
    challenge2: 'Pay Gas Using USDC (Paymaster)',
    challenge3: 'Gasless Experience (Gas Station)'
  });
});

export default app;
