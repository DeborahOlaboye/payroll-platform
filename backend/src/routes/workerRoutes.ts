import { Router } from 'express';
import { 
  CrossChainTransferRequestSchema,
  SupportedChain,
  createSuccessResponse,
  createErrorResponse 
} from '@usdc-payroll/shared';
import { circleService } from '../services/circleService';
import { cctpService } from '../services/cctpService';
import { gasStationService } from '../services/gasStationService';
import { paymasterService } from '../services/paymasterService';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

const router = Router();

/**
 * GET /api/workers/:id/balance
 * Get worker's wallet balance across chains
 */
router.get('/:id/balance', async (req, res) => {
  try {
    const workerId = req.params.id;
    
    const worker = await prisma.worker.findUnique({
      where: { id: workerId }
    });

    if (!worker || !worker.walletId) {
      return res.status(404).json(createErrorResponse(
        'Worker or wallet not found',
        'WORKER_NOT_FOUND',
        404
      ));
    }

    // Get balances for all supported chains
    const chains = Object.values(SupportedChain);
    const balancePromises = chains.map(async (chain) => {
      try {
        const balance = await circleService.getWalletBalance(worker.walletId!, chain);
        return {
          chain,
          balance: balance.balance || '0',
          symbol: 'USDC'
        };
      } catch (error) {
        logger.warn('Failed to get balance for chain', { workerId, chain, error });
        return {
          chain,
          balance: '0',
          symbol: 'USDC'
        };
      }
    });

    const balances = await Promise.all(balancePromises);

    res.json(createSuccessResponse({
      workerId,
      walletId: worker.walletId,
      balances
    }));

  } catch (error) {
    logger.error('Failed to get worker balance', { workerId: req.params.id, error });
    res.status(500).json(createErrorResponse(
      'Failed to get wallet balance',
      'BALANCE_FETCH_ERROR',
      500
    ));
  }
});

/**
 * POST /api/workers/:id/transfer
 * Initiate cross-chain USDC transfer for worker
 */
router.post('/:id/transfer', async (req, res) => {
  try {
    const workerId = req.params.id;
    
    const validationResult = CrossChainTransferRequestSchema.safeParse({
      ...req.body,
      workerId
    });
    
    if (!validationResult.success) {
      return res.status(400).json(createErrorResponse(
        'Invalid transfer request',
        'INVALID_TRANSFER_REQUEST',
        400
      ));
    }

    const { amount, destinationChain, destinationAddress } = validationResult.data;

    const worker = await prisma.worker.findUnique({
      where: { id: workerId }
    });

    if (!worker || !worker.walletId) {
      return res.status(404).json(createErrorResponse(
        'Worker or wallet not found',
        'WORKER_NOT_FOUND',
        404
      ));
    }

    // For demo purposes, assume source chain is Ethereum
    const sourceChain = SupportedChain.ETHEREUM;

    // Check wallet balance
    const balance = await circleService.getWalletBalance(worker.walletId, sourceChain);
    if (parseFloat(balance.balance) < parseFloat(amount)) {
      return res.status(400).json(createErrorResponse(
        'Insufficient balance',
        'INSUFFICIENT_BALANCE',
        400
      ));
    }

    // Create cross-chain transfer record
    const transfer = await prisma.crossChainTransfer.create({
      data: {
        workerId,
        sourceChain: sourceChain.toUpperCase() as any,
        destinationChain: destinationChain.toUpperCase() as any,
        amount,
        sourceAddress: worker.walletId, // Simplified
        destinationAddress,
        status: 'PENDING'
      }
    });

    // Initiate CCTP transfer
    const cctpTransfer = await cctpService.initiateTransfer(
      sourceChain,
      destinationChain,
      amount,
      destinationAddress,
      worker.walletId
    );

    // Update transfer with message hash
    await prisma.crossChainTransfer.update({
      where: { id: transfer.id },
      data: { messageHash: cctpTransfer.messageHash }
    });

    logger.info('Cross-chain transfer initiated', {
      transferId: transfer.id,
      workerId,
      sourceChain,
      destinationChain,
      amount
    });

    res.json(createSuccessResponse({
      transferId: transfer.id,
      messageHash: cctpTransfer.messageHash,
      status: 'pending'
    }, 'Cross-chain transfer initiated'));

  } catch (error) {
    logger.error('Failed to initiate cross-chain transfer', { 
      workerId: req.params.id, 
      error 
    });
    res.status(500).json(createErrorResponse(
      error instanceof Error ? error.message : 'Failed to initiate transfer',
      'TRANSFER_ERROR',
      500
    ));
  }
});

/**
 * GET /api/workers/:id/transfers
 * Get worker's transfer history
 */
router.get('/:id/transfers', async (req, res) => {
  try {
    const workerId = req.params.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [transfers, total] = await Promise.all([
      prisma.crossChainTransfer.findMany({
        where: { workerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.crossChainTransfer.count({
        where: { workerId }
      })
    ]);

    res.json(createSuccessResponse({
      transfers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }));

  } catch (error) {
    logger.error('Failed to get worker transfers', { workerId: req.params.id, error });
    res.status(500).json(createErrorResponse(
      'Failed to get transfer history',
      'TRANSFER_HISTORY_ERROR',
      500
    ));
  }
});

/**
 * GET /api/workers/:id/transactions
 * Get worker's transaction history (payouts + transfers)
 */
router.get('/:id/transactions', async (req, res) => {
  try {
    const workerId = req.params.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get payroll items (payouts)
    const [payouts, transfers] = await Promise.all([
      prisma.payrollItem.findMany({
        where: { workerId },
        include: {
          payrollRun: {
            select: { createdAt: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.crossChainTransfer.findMany({
        where: { workerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    // Combine and format transactions
    const transactions = [
      ...payouts.map(payout => ({
        id: payout.id,
        type: 'payout' as const,
        amount: payout.amount,
        chain: payout.chain.toLowerCase(),
        status: payout.status.toLowerCase(),
        transactionHash: payout.transactionHash,
        createdAt: payout.createdAt,
        completedAt: payout.completedAt
      })),
      ...transfers.map(transfer => ({
        id: transfer.id,
        type: 'transfer' as const,
        amount: transfer.amount,
        chain: transfer.destinationChain.toLowerCase(),
        status: transfer.status.toLowerCase(),
        transactionHash: transfer.transactionHash,
        createdAt: transfer.createdAt,
        completedAt: transfer.completedAt
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(createSuccessResponse({
      transactions: transactions.slice(0, limit),
      pagination: {
        page,
        limit,
        total: transactions.length,
        pages: Math.ceil(transactions.length / limit)
      }
    }));

  } catch (error) {
    logger.error('Failed to get worker transactions', { workerId: req.params.id, error });
    res.status(500).json(createErrorResponse(
      'Failed to get transaction history',
      'TRANSACTION_HISTORY_ERROR',
      500
    ));
  }
});

/**
 * POST /api/workers/:id/gasless-transaction
 * Execute a gasless transaction for worker
 */
router.post('/:id/gasless-transaction', async (req, res) => {
  try {
    const workerId = req.params.id;
    const { chain, to, data, value } = req.body;

    if (!chain || !to || !data) {
      return res.status(400).json(createErrorResponse(
        'Missing required fields: chain, to, data',
        'MISSING_FIELDS',
        400
      ));
    }

    const worker = await prisma.worker.findUnique({
      where: { id: workerId }
    });

    if (!worker || !worker.walletId) {
      return res.status(404).json(createErrorResponse(
        'Worker or wallet not found',
        'WORKER_NOT_FOUND',
        404
      ));
    }

    // Execute gasless transaction
    const transaction = await gasStationService.sponsorTransaction(
      worker.walletId,
      chain as SupportedChain,
      { to, data, value }
    );

    // Record gas station transaction
    await prisma.gasStationTransaction.create({
      data: {
        workerId,
        chain: chain.toUpperCase(),
        userOpHash: transaction.id,
        status: 'pending'
      }
    });

    logger.info('Gasless transaction executed', {
      workerId,
      walletId: worker.walletId,
      transactionId: transaction.id,
      chain
    });

    res.json(createSuccessResponse({
      transactionId: transaction.id,
      status: 'pending'
    }, 'Gasless transaction executed'));

  } catch (error) {
    logger.error('Failed to execute gasless transaction', { 
      workerId: req.params.id, 
      error 
    });
    res.status(500).json(createErrorResponse(
      error instanceof Error ? error.message : 'Failed to execute gasless transaction',
      'GASLESS_TRANSACTION_ERROR',
      500
    ));
  }
});

/**
 * POST /api/workers/:id/usdc-gas-transaction
 * Execute a transaction with USDC gas payment
 */
router.post('/:id/usdc-gas-transaction', async (req, res) => {
  try {
    const workerId = req.params.id;
    const { chain, to, data, value, maxGasFeeUSDC } = req.body;

    if (!chain || !to || !data) {
      return res.status(400).json(createErrorResponse(
        'Missing required fields: chain, to, data',
        'MISSING_FIELDS',
        400
      ));
    }

    const worker = await prisma.worker.findUnique({
      where: { id: workerId }
    });

    if (!worker || !worker.walletId) {
      return res.status(404).json(createErrorResponse(
        'Worker or wallet not found',
        'WORKER_NOT_FOUND',
        404
      ));
    }

    // Create user operation with USDC gas payment
    const userOpData = await paymasterService.createUserOperationWithUSDCGas(
      worker.walletId,
      chain as SupportedChain,
      { to, data, value },
      maxGasFeeUSDC
    );

    // Submit user operation
    const operation = await paymasterService.submitUserOperation(
      userOpData.userOperation,
      chain as SupportedChain
    );

    // Record paymaster operation
    await prisma.paymasterOperation.create({
      data: {
        workerId,
        chain: chain.toUpperCase(),
        userOpHash: operation.userOpHash,
        status: 'pending',
        gasFeeInUSDC: userOpData.usdcGasFee
      }
    });

    logger.info('USDC gas transaction executed', {
      workerId,
      walletId: worker.walletId,
      userOpHash: operation.userOpHash,
      gasFeeInUSDC: userOpData.usdcGasFee,
      chain
    });

    res.json(createSuccessResponse({
      userOpHash: operation.userOpHash,
      gasFeeInUSDC: userOpData.usdcGasFee,
      status: 'pending'
    }, 'Transaction with USDC gas payment executed'));

  } catch (error) {
    logger.error('Failed to execute USDC gas transaction', { 
      workerId: req.params.id, 
      error 
    });
    res.status(500).json(createErrorResponse(
      error instanceof Error ? error.message : 'Failed to execute USDC gas transaction',
      'USDC_GAS_TRANSACTION_ERROR',
      500
    ));
  }
});

/**
 * GET /api/workers/:id
 * Get worker details
 */
router.get('/:id', async (req, res) => {
  try {
    const workerId = req.params.id;
    
    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
      select: {
        id: true,
        name: true,
        email: true,
        walletId: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!worker) {
      return res.status(404).json(createErrorResponse(
        'Worker not found',
        'WORKER_NOT_FOUND',
        404
      ));
    }

    res.json(createSuccessResponse(worker));

  } catch (error) {
    logger.error('Failed to get worker details', { workerId: req.params.id, error });
    res.status(500).json(createErrorResponse(
      'Failed to get worker details',
      'WORKER_FETCH_ERROR',
      500
    ));
  }
});

export default router;
