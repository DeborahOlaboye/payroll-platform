import { circleClient, w3sConfig } from '../config/circle';
import { CircleRecipient, CirclePayout, SupportedChain } from '@usdc-payroll/shared';
import { logger } from '../config/logger';
import axios from 'axios';

export class CircleService {
  /**
   * Create a recipient for payouts
   */
  async createRecipient(email: string, metadata?: Record<string, any>): Promise<CircleRecipient> {
    try {
      logger.info('Creating Circle recipient', { email });
      
      const response = await circleClient.recipients.createRecipient({
        idempotencyKey: crypto.randomUUID(),
        email,
        metadata
      });

      if (!response.data) {
        throw new Error('Failed to create recipient');
      }

      logger.info('Circle recipient created', { recipientId: response.data.id, email });
      return response.data as CircleRecipient;
    } catch (error) {
      logger.error('Failed to create Circle recipient', { email, error });
      throw error;
    }
  }

  /**
   * Get recipient by ID
   */
  async getRecipient(recipientId: string): Promise<CircleRecipient> {
    try {
      const response = await circleClient.recipients.getRecipient(recipientId);
      
      if (!response.data) {
        throw new Error('Recipient not found');
      }

      return response.data as CircleRecipient;
    } catch (error) {
      logger.error('Failed to get Circle recipient', { recipientId, error });
      throw error;
    }
  }

  /**
   * Create a crypto payout
   */
  async createPayout(
    recipientId: string,
    amount: string,
    chain: SupportedChain,
    destinationAddress: string,
    trackingRef?: string
  ): Promise<CirclePayout> {
    try {
      logger.info('Creating Circle payout', { recipientId, amount, chain, destinationAddress });

      const response = await circleClient.payouts.createPayout({
        idempotencyKey: crypto.randomUUID(),
        destination: {
          type: 'blockchain',
          address: destinationAddress,
          chain: this.mapChainToCircleChain(chain)
        },
        amount: {
          amount,
          currency: 'USD'
        },
        recipientId,
        ...(trackingRef && { trackingRef })
      });

      if (!response.data) {
        throw new Error('Failed to create payout');
      }

      logger.info('Circle payout created', { payoutId: response.data.id, recipientId });
      return response.data as CirclePayout;
    } catch (error) {
      logger.error('Failed to create Circle payout', { recipientId, amount, chain, error });
      throw error;
    }
  }

  /**
   * Get payout by ID
   */
  async getPayout(payoutId: string): Promise<CirclePayout> {
    try {
      const response = await circleClient.payouts.getPayout(payoutId);
      
      if (!response.data) {
        throw new Error('Payout not found');
      }

      return response.data as CirclePayout;
    } catch (error) {
      logger.error('Failed to get Circle payout', { payoutId, error });
      throw error;
    }
  }

  /**
   * Create a programmable wallet for a worker
   */
  async createWallet(userId: string, blockchains: SupportedChain[]): Promise<any> {
    try {
      logger.info('Creating programmable wallet', { userId, blockchains });

      const response = await axios.post(
        `${w3sConfig.baseUrl}/wallets`,
        {
          idempotencyKey: crypto.randomUUID(),
          accountType: 'SCA', // Smart Contract Account for Gas Station compatibility
          blockchains: blockchains.map(chain => this.mapChainToW3SChain(chain)),
          metadata: {
            userId,
            createdBy: 'payroll-platform'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${w3sConfig.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Programmable wallet created', { walletId: response.data.data.walletId, userId });
      return response.data.data;
    } catch (error) {
      logger.error('Failed to create programmable wallet', { userId, error });
      throw error;
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(walletId: string, chain: SupportedChain): Promise<any> {
    try {
      const response = await axios.get(
        `${w3sConfig.baseUrl}/wallets/${walletId}/balances`,
        {
          headers: {
            'Authorization': `Bearer ${w3sConfig.apiKey}`
          },
          params: {
            blockchain: this.mapChainToW3SChain(chain)
          }
        }
      );

      return response.data.data;
    } catch (error) {
      logger.error('Failed to get wallet balance', { walletId, chain, error });
      throw error;
    }
  }

  /**
   * Execute wallet transaction
   */
  async executeWalletTransaction(
    walletId: string,
    chain: SupportedChain,
    contractAddress: string,
    callData: string,
    gasLimit?: number
  ): Promise<any> {
    try {
      logger.info('Executing wallet transaction', { walletId, chain, contractAddress });

      const response = await axios.post(
        `${w3sConfig.baseUrl}/wallets/${walletId}/transactions`,
        {
          idempotencyKey: crypto.randomUUID(),
          blockchain: this.mapChainToW3SChain(chain),
          contractAddress,
          callData,
          gasLimit: gasLimit?.toString()
        },
        {
          headers: {
            'Authorization': `Bearer ${w3sConfig.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Wallet transaction executed', { transactionId: response.data.data.id, walletId });
      return response.data.data;
    } catch (error) {
      logger.error('Failed to execute wallet transaction', { walletId, chain, error });
      throw error;
    }
  }

  /**
   * Map SupportedChain to Circle chain format
   */
  private mapChainToCircleChain(chain: SupportedChain): string {
    const chainMap = {
      [SupportedChain.ETHEREUM]: 'ETH',
      [SupportedChain.ARBITRUM]: 'ARB',
      [SupportedChain.BASE]: 'BASE',
      [SupportedChain.AVALANCHE]: 'AVAX',
      [SupportedChain.POLYGON]: 'MATIC'
    };
    return chainMap[chain];
  }

  /**
   * Map SupportedChain to W3S chain format
   */
  private mapChainToW3SChain(chain: SupportedChain): string {
    const chainMap = {
      [SupportedChain.ETHEREUM]: 'ETH-SEPOLIA',
      [SupportedChain.ARBITRUM]: 'ARB-SEPOLIA',
      [SupportedChain.BASE]: 'BASE-SEPOLIA',
      [SupportedChain.AVALANCHE]: 'AVAX-FUJI',
      [SupportedChain.POLYGON]: 'MATIC-AMOY'
    };
    return chainMap[chain];
  }
}

export const circleService = new CircleService();
