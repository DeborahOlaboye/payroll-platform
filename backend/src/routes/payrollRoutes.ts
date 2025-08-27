import { Router } from 'express';
import multer from 'multer';
import Papa from 'papaparse';
import { 
  CreatePayrollRunRequestSchema, 
  ExecutePayrollRunRequestSchema,
  CSVUploadSchema,
  createSuccessResponse,
  createErrorResponse 
} from '@usdc-payroll/shared';
import { payrollService } from '../services/payrollService';
import { logger } from '../config/logger';

const router = Router();

// Configure multer for CSV upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

/**
 * POST /api/payroll/upload-csv
 * Upload and validate CSV payroll data
 */
router.post('/upload-csv', upload.single('csv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(createErrorResponse(
        'No CSV file provided',
        'MISSING_FILE'
      ));
    }

    const csvContent = req.file.buffer.toString('utf-8');
    
    // Parse CSV
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim()
    });

    if (parseResult.errors.length > 0) {
      return res.status(400).json(createErrorResponse(
        'CSV parsing errors',
        'CSV_PARSE_ERROR',
        400
      ));
    }

    // Validate CSV data
    const validationResult = CSVUploadSchema.safeParse(parseResult.data);
    
    if (!validationResult.success) {
      return res.status(400).json(createErrorResponse(
        'Invalid CSV data format',
        'INVALID_CSV_DATA',
        400
      ));
    }

    logger.info('CSV uploaded and validated', {
      rowCount: validationResult.data.length,
      fileName: req.file.originalname
    });

    res.json(createSuccessResponse({
      workers: validationResult.data,
      summary: {
        totalWorkers: validationResult.data.length,
        totalAmount: validationResult.data.reduce((sum, worker) => 
          sum + parseFloat(worker.amount), 0
        ).toFixed(6),
        chains: [...new Set(validationResult.data.map(w => w.chain))]
      }
    }, 'CSV uploaded and validated successfully'));

  } catch (error) {
    logger.error('CSV upload failed', { error });
    res.status(500).json(createErrorResponse(
      'Failed to process CSV file',
      'CSV_PROCESSING_ERROR',
      500
    ));
  }
});

/**
 * POST /api/payroll/runs
 * Create a new payroll run
 */
router.post('/runs', async (req, res) => {
  try {
    const adminId = req.headers['x-admin-id'] as string || 'admin-1'; // Mock admin ID
    
    const validationResult = CreatePayrollRunRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json(createErrorResponse(
        'Invalid request data',
        'INVALID_REQUEST_DATA',
        400
      ));
    }

    const result = await payrollService.createPayrollRun(adminId, validationResult.data);

    logger.info('Payroll run created via API', {
      payrollRunId: result.payrollRun.id,
      adminId,
      workerCount: validationResult.data.workers.length
    });

    res.status(201).json(createSuccessResponse(result, 'Payroll run created successfully'));

  } catch (error) {
    logger.error('Failed to create payroll run via API', { error });
    res.status(500).json(createErrorResponse(
      error instanceof Error ? error.message : 'Failed to create payroll run',
      'PAYROLL_CREATION_ERROR',
      500
    ));
  }
});

/**
 * POST /api/payroll/runs/:id/execute
 * Execute a payroll run
 */
router.post('/runs/:id/execute', async (req, res) => {
  try {
    const payrollRunId = req.params.id;
    
    const validationResult = ExecutePayrollRunRequestSchema.safeParse({
      payrollRunId
    });
    
    if (!validationResult.success) {
      return res.status(400).json(createErrorResponse(
        'Invalid payroll run ID',
        'INVALID_PAYROLL_RUN_ID',
        400
      ));
    }

    // Execute payroll run asynchronously
    payrollService.executePayrollRun(validationResult.data)
      .then(result => {
        logger.info('Payroll run executed successfully', {
          payrollRunId,
          summary: result.summary
        });
      })
      .catch(error => {
        logger.error('Payroll run execution failed', { payrollRunId, error });
      });

    res.json(createSuccessResponse(
      { payrollRunId, status: 'processing' },
      'Payroll run execution started'
    ));

  } catch (error) {
    logger.error('Failed to execute payroll run via API', { error });
    res.status(500).json(createErrorResponse(
      error instanceof Error ? error.message : 'Failed to execute payroll run',
      'PAYROLL_EXECUTION_ERROR',
      500
    ));
  }
});

/**
 * GET /api/payroll/runs/:id
 * Get payroll run details
 */
router.get('/runs/:id', async (req, res) => {
  try {
    const payrollRunId = req.params.id;
    
    const payrollRun = await payrollService.getPayrollRun(payrollRunId);
    
    res.json(createSuccessResponse(payrollRun));

  } catch (error) {
    logger.error('Failed to get payroll run via API', { 
      payrollRunId: req.params.id, 
      error 
    });
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json(createErrorResponse(
        'Payroll run not found',
        'PAYROLL_RUN_NOT_FOUND',
        404
      ));
    } else {
      res.status(500).json(createErrorResponse(
        'Failed to get payroll run',
        'PAYROLL_FETCH_ERROR',
        500
      ));
    }
  }
});

/**
 * GET /api/payroll/runs
 * Get payroll runs for admin
 */
router.get('/runs', async (req, res) => {
  try {
    const adminId = req.headers['x-admin-id'] as string || 'admin-1'; // Mock admin ID
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const result = await payrollService.getPayrollRuns(adminId, page, limit);
    
    res.json(createSuccessResponse(result));

  } catch (error) {
    logger.error('Failed to get payroll runs via API', { error });
    res.status(500).json(createErrorResponse(
      'Failed to get payroll runs',
      'PAYROLL_FETCH_ERROR',
      500
    ));
  }
});

/**
 * GET /api/payroll/template
 * Download CSV template
 */
router.get('/template', (req, res) => {
  const csvTemplate = `name,email,amount,chain
John Doe,john@example.com,100.50,ethereum
Jane Smith,jane@example.com,75.25,arbitrum
Bob Johnson,bob@example.com,200.00,base`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="payroll-template.csv"');
  res.send(csvTemplate);
});

export default router;
