import { PrismaClient, PayrollRunStatus, PayoutStatus } from '@prisma/client';
import { 
  CreatePayrollRunRequest, 
  ExecutePayrollRunRequest,
  SupportedChain,
  PayrollError,
  ERROR_CODES
} from '@usdc-payroll/shared';
import { circleService } from './circleService';
import { cctpService } from './cctpService';
import { gasStationService } from './gasStationService';
import { logger } from '../config/logger';
import { prisma } from '../config/database';

export class PayrollService {
  /**
   * Create a new payroll run
   */
  async createPayrollRun(
    adminId: string,
    request: CreatePayrollRunRequest
  ): Promise<any> {
    try {
      logger.info('Creating payroll run', { adminId, workerCount: request.workers.length });

      // Calculate total amount
      const totalAmount = request.workers
        .reduce((sum, worker) => sum + parseFloat(worker.amount), 0)
        .toFixed(6);

      // Start database transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create payroll run
        const payrollRun = await tx.payrollRun.create({
          data: {
            adminId,
            status: PayrollRunStatus.DRAFT,
            totalAmount,
            totalWorkers: request.workers.length
          }
        });

        // Process each worker
        const payrollItems = [];
        for (const workerData of request.workers) {
          // Find or create worker
          let worker = await tx.worker.findUnique({
            where: { email: workerData.email }
          });

          if (!worker) {
            // Create new worker
            worker = await tx.worker.create({
              data: {
                name: workerData.name,
                email: workerData.email
              }
            });

            // Create Circle recipient
            try {
              const recipient = await circleService.createRecipient(
                workerData.email,
                { workerId: worker.id, name: workerData.name }
              );
              
              // Update worker with recipient ID
              worker = await tx.worker.update({
                where: { id: worker.id },
                data: { recipientId: recipient.id }
              });
            } catch (error) {
              logger.warn('Failed to create Circle recipient', { 
                workerId: worker.id, 
                email: workerData.email,
                error 
              });
            }

            // Create programmable wallet
            try {
              const wallet = await circleService.createWallet(
                worker.id,
                [workerData.chain]
              );
              
              // Update worker with wallet ID
              worker = await tx.worker.update({
                where: { id: worker.id },
                data: { walletId: wallet.walletId }
              });
            } catch (error) {
              logger.warn('Failed to create programmable wallet', {
                workerId: worker.id,
                error
              });
            }
          }

          // Create payroll item
          const payrollItem = await tx.payrollItem.create({
            data: {
              payrollRunId: payrollRun.id,
              workerId: worker.id,
              amount: workerData.amount,
              chain: workerData.chain.toUpperCase() as any,
              status: PayoutStatus.PENDING
            }
          });

          payrollItems.push(payrollItem);

          // Create audit log
          await tx.auditLog.create({
            data: {
              eventType: 'PAYROLL_ITEM_CREATED',
              entityType: 'PayrollItem',
              entityId: payrollItem.id,
              workerId: worker.id,
              payrollRunId: payrollRun.id,
              payload: {
                amount: workerData.amount,
                chain: workerData.chain,
                workerEmail: workerData.email
              }
            }
          });
        }

        // Update payroll run status
        const updatedPayrollRun = await tx.payrollRun.update({
          where: { id: payrollRun.id },
          data: { status: PayrollRunStatus.PENDING }
        });

        // Create audit log for payroll run
        await tx.auditLog.create({
          data: {
            eventType: 'PAYROLL_RUN_CREATED',
            entityType: 'PayrollRun',
            entityId: payrollRun.id,
            payrollRunId: payrollRun.id,
            payload: {
              totalAmount,
              totalWorkers: request.workers.length,
              adminId
            }
          }
        });

        return {
          payrollRun: updatedPayrollRun,
          payrollItems
        };
      });

      logger.info('Payroll run created successfully', {
        payrollRunId: result.payrollRun.id,
        totalAmount,
        totalWorkers: request.workers.length
      });

      return result;
    } catch (error) {
      logger.error('Failed to create payroll run', { adminId, error });
      throw new PayrollError(
        'Failed to create payroll run',
        ERROR_CODES.PAYROLL_RUN_NOT_FOUND,
        500
      );
    }
  }

  /**
   * Execute a payroll run
   */
  async executePayrollRun(request: ExecutePayrollRunRequest): Promise<any> {
    try {
      logger.info('Executing payroll run', { payrollRunId: request.payrollRunId });

      // Get payroll run with items
      const payrollRun = await prisma.payrollRun.findUnique({
        where: { id: request.payrollRunId },
        include: {
          payrollItems: {
            include: {
              worker: true
            }
          }
        }
      });

      if (!payrollRun) {
        throw new PayrollError(
          'Payroll run not found',
          ERROR_CODES.PAYROLL_RUN_NOT_FOUND,
          404
        );
      }

      if (payrollRun.status !== PayrollRunStatus.PENDING) {
        throw new PayrollError(
          'Payroll run is not in pending status',
          ERROR_CODES.PAYROLL_RUN_NOT_FOUND,
          400
        );
      }

      // Update payroll run status to processing
      await prisma.payrollRun.update({
        where: { id: request.payrollRunId },
        data: { status: PayrollRunStatus.PROCESSING }
      });

      // Process each payroll item
      const results = [];
      for (const item of payrollRun.payrollItems) {
        try {
          // Update item status to processing
          await prisma.payrollItem.update({
            where: { id: item.id },
            data: { status: PayoutStatus.PROCESSING }
          });

          let payout;
          if (item.worker.walletId) {
            // Use programmable wallet with gasless transaction
            payout = await this.executeGaslessPayment(item);
          } else if (item.worker.recipientId) {
            // Use Circle payout
            payout = await this.executeCirclePayout(item);
          } else {
            throw new Error('Worker has no wallet or recipient configured');
          }

          // Update item with payout details
          await prisma.payrollItem.update({
            where: { id: item.id },
            data: {
              status: PayoutStatus.COMPLETED,
              payoutId: payout.id,
              transactionHash: payout.transactionHash,
              completedAt: new Date()
            }
          });

          results.push({
            payrollItemId: item.id,
            workerId: item.workerId,
            status: 'completed',
            payoutId: payout.id
          });

          logger.info('Payroll item completed', {
            payrollItemId: item.id,
            workerId: item.workerId,
            payoutId: payout.id
          });
        } catch (error) {
          logger.error('Failed to process payroll item', {
            payrollItemId: item.id,
            workerId: item.workerId,
            error
          });

          // Update item with error
          await prisma.payrollItem.update({
            where: { id: item.id },
            data: {
              status: PayoutStatus.FAILED,
              errorMessage: error instanceof Error ? error.message : 'Unknown error'
            }
          });

          results.push({
            payrollItemId: item.id,
            workerId: item.workerId,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Update payroll run status based on results
      const completedCount = results.filter(r => r.status === 'completed').length;
      const failedCount = results.filter(r => r.status === 'failed').length;

      let finalStatus: PayrollRunStatus;
      if (failedCount === 0) {
        finalStatus = PayrollRunStatus.COMPLETED;
      } else if (completedCount === 0) {
        finalStatus = PayrollRunStatus.FAILED;
      } else {
        finalStatus = PayrollRunStatus.COMPLETED; // Partial success
      }

      await prisma.payrollRun.update({
        where: { id: request.payrollRunId },
        data: {
          status: finalStatus,
          completedAt: new Date()
        }
      });

      logger.info('Payroll run execution completed', {
        payrollRunId: request.payrollRunId,
        completed: completedCount,
        failed: failedCount,
        finalStatus
      });

      return {
        payrollRunId: request.payrollRunId,
        status: finalStatus,
        results,
        summary: {
          total: results.length,
          completed: completedCount,
          failed: failedCount
        }
      };
    } catch (error) {
      logger.error('Failed to execute payroll run', { payrollRunId: request.payrollRunId, error });
      
      // Update payroll run status to failed
      await prisma.payrollRun.update({
        where: { id: request.payrollRunId },
        data: { status: PayrollRunStatus.FAILED }
      }).catch(() => {}); // Ignore errors in error handling

      throw error;
    }
  }

  /**
   * Execute gasless payment using Gas Station
   */
  private async executeGaslessPayment(payrollItem: any): Promise<any> {
    const { worker, amount, chain } = payrollItem;

    logger.info('Executing gasless payment', {
      workerId: worker.id,
      walletId: worker.walletId,
      amount,
      chain
    });

    // Create gasless USDC transfer
    const transaction = await gasStationService.createGaslessTransfer(
      worker.walletId,
      chain.toLowerCase() as SupportedChain,
      worker.walletId, // Send to worker's own wallet
      amount
    );

    return {
      id: transaction.id,
      transactionHash: transaction.transactionHash,
      type: 'gasless'
    };
  }

  /**
   * Execute Circle payout
   */
  private async executeCirclePayout(payrollItem: any): Promise<any> {
    const { worker, amount, chain } = payrollItem;

    logger.info('Executing Circle payout', {
      workerId: worker.id,
      recipientId: worker.recipientId,
      amount,
      chain
    });

    // For now, we'll use a placeholder destination address
    // In a real implementation, this would come from the worker's wallet
    const destinationAddress = '0x742d35Cc6634C0532925a3b8D0C9C5e3F6C4C3C3';

    const payout = await circleService.createPayout(
      worker.recipientId,
      amount,
      chain.toLowerCase() as SupportedChain,
      destinationAddress,
      `payroll-${payrollItem.id}`
    );

    return {
      id: payout.id,
      transactionHash: undefined, // Will be updated via webhook
      type: 'circle_payout'
    };
  }

  /**
   * Get payroll run details
   */
  async getPayrollRun(payrollRunId: string): Promise<any> {
    try {
      const payrollRun = await prisma.payrollRun.findUnique({
        where: { id: payrollRunId },
        include: {
          payrollItems: {
            include: {
              worker: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });

      if (!payrollRun) {
        throw new PayrollError(
          'Payroll run not found',
          ERROR_CODES.PAYROLL_RUN_NOT_FOUND,
          404
        );
      }

      return payrollRun;
    } catch (error) {
      logger.error('Failed to get payroll run', { payrollRunId, error });
      throw error;
    }
  }

  /**
   * Get payroll runs for admin
   */
  async getPayrollRuns(
    adminId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<any> {
    try {
      const skip = (page - 1) * limit;

      const [payrollRuns, total] = await Promise.all([
        prisma.payrollRun.findMany({
          where: { adminId },
          include: {
            _count: {
              select: {
                payrollItems: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.payrollRun.count({
          where: { adminId }
        })
      ]);

      return {
        payrollRuns,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to get payroll runs', { adminId, error });
      throw error;
    }
  }

  /**
   * Update payout status via webhook
   */
  async updatePayoutStatus(
    payoutId: string,
    status: string,
    transactionHash?: string
  ): Promise<void> {
    try {
      logger.info('Updating payout status', { payoutId, status, transactionHash });

      const payrollItem = await prisma.payrollItem.findFirst({
        where: { payoutId }
      });

      if (!payrollItem) {
        logger.warn('Payroll item not found for payout', { payoutId });
        return;
      }

      let newStatus: PayoutStatus;
      switch (status.toLowerCase()) {
        case 'complete':
        case 'completed':
          newStatus = PayoutStatus.COMPLETED;
          break;
        case 'failed':
        case 'error':
          newStatus = PayoutStatus.FAILED;
          break;
        default:
          newStatus = PayoutStatus.PROCESSING;
      }

      await prisma.payrollItem.update({
        where: { id: payrollItem.id },
        data: {
          status: newStatus,
          transactionHash,
          ...(newStatus === PayoutStatus.COMPLETED && { completedAt: new Date() })
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          eventType: 'PAYOUT_STATUS_UPDATED',
          entityType: 'PayrollItem',
          entityId: payrollItem.id,
          workerId: payrollItem.workerId,
          payrollRunId: payrollItem.payrollRunId,
          payload: {
            payoutId,
            oldStatus: payrollItem.status,
            newStatus,
            transactionHash
          }
        }
      });

      logger.info('Payout status updated', {
        payrollItemId: payrollItem.id,
        payoutId,
        status: newStatus
      });
    } catch (error) {
      logger.error('Failed to update payout status', { payoutId, status, error });
      throw error;
    }
  }
}

export const payrollService = new PayrollService();
