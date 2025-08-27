import { Router } from 'express';
import crypto from 'crypto';
import { payrollService } from '../services/payrollService';
import { logger } from '../config/logger';
import { getEnvVar, createSuccessResponse, createErrorResponse } from '@usdc-payroll/shared';

const router = Router();

// Webhook secret for signature verification
const WEBHOOK_SECRET = getEnvVar('WEBHOOK_SECRET', 'default-webhook-secret');

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(payload: string, signature: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(`sha256=${expectedSignature}`)
    );
  } catch (error) {
    logger.error('Failed to verify webhook signature', { error });
    return false;
  }
}

/**
 * POST /api/webhooks/circle
 * Handle Circle API webhooks for payout status updates
 */
router.post('/circle', async (req, res) => {
  try {
    const signature = req.headers['x-circle-signature'] as string;
    const payload = JSON.stringify(req.body);

    // Verify webhook signature
    if (!verifyWebhookSignature(payload, signature)) {
      logger.warn('Invalid webhook signature', { signature });
      return res.status(401).json(createErrorResponse(
        'Invalid webhook signature',
        'INVALID_SIGNATURE',
        401
      ));
    }

    const { eventType, data } = req.body;

    logger.info('Circle webhook received', { eventType, payoutId: data?.id });

    switch (eventType) {
      case 'payouts.completed':
        await handlePayoutCompleted(data);
        break;
      
      case 'payouts.failed':
        await handlePayoutFailed(data);
        break;
      
      case 'transfers.completed':
        await handleTransferCompleted(data);
        break;
      
      case 'transfers.failed':
        await handleTransferFailed(data);
        break;
      
      default:
        logger.info('Unhandled webhook event type', { eventType });
    }

    res.json(createSuccessResponse({ received: true }));

  } catch (error) {
    logger.error('Failed to process Circle webhook', { error });
    res.status(500).json(createErrorResponse(
      'Failed to process webhook',
      'WEBHOOK_PROCESSING_ERROR',
      500
    ));
  }
});

/**
 * POST /api/webhooks/cctp
 * Handle CCTP attestation webhooks
 */
router.post('/cctp', async (req, res) => {
  try {
    const { messageHash, attestation, status } = req.body;

    logger.info('CCTP webhook received', { messageHash, status });

    if (status === 'attested' && attestation) {
      // Update cross-chain transfer with attestation
      await prisma.crossChainTransfer.updateMany({
        where: { messageHash },
        data: {
          attestation,
          status: 'ATTESTED',
          updatedAt: new Date()
        }
      });

      logger.info('Cross-chain transfer updated with attestation', { messageHash });
    }

    res.json(createSuccessResponse({ received: true }));

  } catch (error) {
    logger.error('Failed to process CCTP webhook', { error });
    res.status(500).json(createErrorResponse(
      'Failed to process CCTP webhook',
      'CCTP_WEBHOOK_ERROR',
      500
    ));
  }
});

/**
 * POST /api/webhooks/gas-station
 * Handle Gas Station transaction status webhooks
 */
router.post('/gas-station', async (req, res) => {
  try {
    const { transactionId, status, gasUsed, transactionHash } = req.body;

    logger.info('Gas Station webhook received', { transactionId, status });

    // Update gas station transaction
    await prisma.gasStationTransaction.updateMany({
      where: { userOpHash: transactionId },
      data: {
        status,
        gasUsed,
        transactionHash,
        updatedAt: new Date(),
        ...(status === 'completed' && { completedAt: new Date() })
      }
    });

    logger.info('Gas Station transaction updated', { transactionId, status });

    res.json(createSuccessResponse({ received: true }));

  } catch (error) {
    logger.error('Failed to process Gas Station webhook', { error });
    res.status(500).json(createErrorResponse(
      'Failed to process Gas Station webhook',
      'GAS_STATION_WEBHOOK_ERROR',
      500
    ));
  }
});

/**
 * POST /api/webhooks/paymaster
 * Handle Paymaster operation status webhooks
 */
router.post('/paymaster', async (req, res) => {
  try {
    const { userOpHash, status, gasUsed, gasFeeInUSDC, transactionHash } = req.body;

    logger.info('Paymaster webhook received', { userOpHash, status });

    // Update paymaster operation
    await prisma.paymasterOperation.updateMany({
      where: { userOpHash },
      data: {
        status,
        gasUsed,
        gasFeeInUSDC,
        transactionHash,
        updatedAt: new Date(),
        ...(status === 'completed' && { completedAt: new Date() })
      }
    });

    logger.info('Paymaster operation updated', { userOpHash, status });

    res.json(createSuccessResponse({ received: true }));

  } catch (error) {
    logger.error('Failed to process Paymaster webhook', { error });
    res.status(500).json(createErrorResponse(
      'Failed to process Paymaster webhook',
      'PAYMASTER_WEBHOOK_ERROR',
      500
    ));
  }
});

/**
 * Handle payout completed event
 */
async function handlePayoutCompleted(data: any): Promise<void> {
  try {
    const { id: payoutId, transactionHash } = data;
    
    await payrollService.updatePayoutStatus(payoutId, 'completed', transactionHash);
    
    logger.info('Payout completed webhook processed', { payoutId, transactionHash });
  } catch (error) {
    logger.error('Failed to handle payout completed', { payoutId: data?.id, error });
    throw error;
  }
}

/**
 * Handle payout failed event
 */
async function handlePayoutFailed(data: any): Promise<void> {
  try {
    const { id: payoutId, errorMessage } = data;
    
    await payrollService.updatePayoutStatus(payoutId, 'failed');
    
    logger.info('Payout failed webhook processed', { payoutId, errorMessage });
  } catch (error) {
    logger.error('Failed to handle payout failed', { payoutId: data?.id, error });
    throw error;
  }
}

/**
 * Handle transfer completed event
 */
async function handleTransferCompleted(data: any): Promise<void> {
  try {
    const { id: transferId, transactionHash } = data;
    
    // Update any related cross-chain transfers
    await prisma.crossChainTransfer.updateMany({
      where: { 
        OR: [
          { messageHash: transferId },
          { transactionHash: transferId }
        ]
      },
      data: {
        status: 'COMPLETED',
        transactionHash,
        completedAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    logger.info('Transfer completed webhook processed', { transferId, transactionHash });
  } catch (error) {
    logger.error('Failed to handle transfer completed', { transferId: data?.id, error });
    throw error;
  }
}

/**
 * Handle transfer failed event
 */
async function handleTransferFailed(data: any): Promise<void> {
  try {
    const { id: transferId, errorMessage } = data;
    
    // Update any related cross-chain transfers
    await prisma.crossChainTransfer.updateMany({
      where: { 
        OR: [
          { messageHash: transferId },
          { transactionHash: transferId }
        ]
      },
      data: {
        status: 'FAILED',
        errorMessage,
        updatedAt: new Date()
      }
    });
    
    logger.info('Transfer failed webhook processed', { transferId, errorMessage });
  } catch (error) {
    logger.error('Failed to handle transfer failed', { transferId: data?.id, error });
    throw error;
  }
}

export default router;
