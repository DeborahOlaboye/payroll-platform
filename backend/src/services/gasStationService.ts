import axios from 'axios';
import { w3sConfig, gasStationConfig } from '../config/circle';
import { SupportedChain, GasStationPolicy } from '@usdc-payroll/shared';
import { logger } from '../config/logger';

export class GasStationService {
  /**
   * Create a gas sponsorship policy
   */
  async createPolicy(
    name: string,
    description: string,
    rules: {
      maxGasLimit?: number;
      allowedContracts?: string[];
      dailyLimit?: string;
      chains?: SupportedChain[];
    }
  ): Promise<GasStationPolicy> {
    try {
      logger.info('Creating Gas Station policy', { name, rules });

      const response = await axios.post(
        `${w3sConfig.baseUrl}/gasStation/policies`,
        {
          name,
          description,
          rules: {
            maxGasLimit: rules.maxGasLimit || gasStationConfig.maxGasLimit,
            allowedContracts: rules.allowedContracts || gasStationConfig.allowedContracts,
            dailyLimit: rules.dailyLimit || gasStationConfig.dailyLimit,
            chains: rules.chains?.map(chain => this.mapChainToW3SChain(chain)) || []
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${w3sConfig.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Gas Station policy created', { policyId: response.data.data.id, name });
      return response.data.data;
    } catch (error) {
      logger.error('Failed to create Gas Station policy', { name, error });
      throw error;
    }
  }

  /**
   * Sponsor a transaction using Gas Station
   */
  async sponsorTransaction(
    walletId: string,
    chain: SupportedChain,
    transaction: {
      to: string;
      data: string;
      value?: string;
      gasLimit?: number;
    },
    policyId?: string
  ): Promise<any> {
    try {
      logger.info('Sponsoring transaction with Gas Station', {
        walletId,
        chain,
        to: transaction.to,
        policyId
      });

      const response = await axios.post(
        `${w3sConfig.baseUrl}/wallets/${walletId}/transactions`,
        {
          idempotencyKey: crypto.randomUUID(),
          blockchain: this.mapChainToW3SChain(chain),
          contractAddress: transaction.to,
          callData: transaction.data,
          value: transaction.value || '0',
          gasLimit: transaction.gasLimit?.toString(),
          gasSponsorship: {
            enabled: true,
            policyId: policyId || 'default'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${w3sConfig.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Transaction sponsored successfully', {
        transactionId: response.data.data.id,
        walletId,
        chain
      });

      return response.data.data;
    } catch (error) {
      logger.error('Failed to sponsor transaction', { walletId, chain, error });
      throw error;
    }
  }

  /**
   * Get gas sponsorship status
   */
  async getSponsorshipStatus(transactionId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${w3sConfig.baseUrl}/transactions/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${w3sConfig.apiKey}`
          }
        }
      );

      return response.data.data;
    } catch (error) {
      logger.error('Failed to get sponsorship status', { transactionId, error });
      throw error;
    }
  }

  /**
   * Get policy usage statistics
   */
  async getPolicyUsage(policyId: string, timeframe: string = '24h'): Promise<any> {
    try {
      const response = await axios.get(
        `${w3sConfig.baseUrl}/gasStation/policies/${policyId}/usage`,
        {
          headers: {
            'Authorization': `Bearer ${w3sConfig.apiKey}`
          },
          params: {
            timeframe
          }
        }
      );

      return response.data.data;
    } catch (error) {
      logger.error('Failed to get policy usage', { policyId, error });
      throw error;
    }
  }

  /**
   * Estimate gas cost for a transaction
   */
  async estimateGasCost(
    chain: SupportedChain,
    transaction: {
      to: string;
      data: string;
      value?: string;
    }
  ): Promise<{
    gasLimit: number;
    gasPrice: string;
    totalCost: string;
  }> {
    try {
      logger.info('Estimating gas cost', { chain, to: transaction.to });

      const response = await axios.post(
        `${w3sConfig.baseUrl}/gasStation/estimate`,
        {
          blockchain: this.mapChainToW3SChain(chain),
          transaction
        },
        {
          headers: {
            'Authorization': `Bearer ${w3sConfig.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.data;
    } catch (error) {
      logger.error('Failed to estimate gas cost', { chain, error });
      throw error;
    }
  }

  /**
   * Create a gasless USDC transfer
   */
  async createGaslessTransfer(
    walletId: string,
    chain: SupportedChain,
    recipient: string,
    amount: string
  ): Promise<any> {
    try {
      logger.info('Creating gasless USDC transfer', {
        walletId,
        chain,
        recipient,
        amount
      });

      // Get USDC contract address for the chain
      const usdcAddress = this.getUSDCAddress(chain);

      // Encode transfer function call
      const transferData = this.encodeTransferFunction(recipient, amount);

      // Sponsor the transaction
      const result = await this.sponsorTransaction(
        walletId,
        chain,
        {
          to: usdcAddress,
          data: transferData,
          gasLimit: 100000 // Standard transfer gas limit
        }
      );

      logger.info('Gasless USDC transfer created', {
        transactionId: result.id,
        walletId,
        chain
      });

      return result;
    } catch (error) {
      logger.error('Failed to create gasless transfer', { walletId, chain, error });
      throw error;
    }
  }

  /**
   * Batch sponsor multiple transactions
   */
  async batchSponsorTransactions(
    transactions: Array<{
      walletId: string;
      chain: SupportedChain;
      transaction: {
        to: string;
        data: string;
        value?: string;
        gasLimit?: number;
      };
    }>,
    policyId?: string
  ): Promise<any[]> {
    try {
      logger.info('Batch sponsoring transactions', { count: transactions.length, policyId });

      const promises = transactions.map(({ walletId, chain, transaction }) =>
        this.sponsorTransaction(walletId, chain, transaction, policyId)
      );

      const results = await Promise.allSettled(promises);

      const successful = results
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value);

      const failed = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map(result => result.reason);

      logger.info('Batch sponsorship completed', {
        successful: successful.length,
        failed: failed.length
      });

      if (failed.length > 0) {
        logger.warn('Some transactions failed to sponsor', { failures: failed });
      }

      return successful;
    } catch (error) {
      logger.error('Failed to batch sponsor transactions', { error });
      throw error;
    }
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

  /**
   * Get USDC contract address for chain
   */
  private getUSDCAddress(chain: SupportedChain): string {
    const addresses = {
      [SupportedChain.ETHEREUM]: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      [SupportedChain.ARBITRUM]: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
      [SupportedChain.BASE]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      [SupportedChain.AVALANCHE]: '0x5425890298aed601595a70AB815c96711a31Bc65',
      [SupportedChain.POLYGON]: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582'
    };
    return addresses[chain];
  }

  /**
   * Encode ERC20 transfer function call
   */
  private encodeTransferFunction(recipient: string, amount: string): string {
    // This would use proper ABI encoding in a real implementation
    // For now, returning placeholder
    return '0xa9059cbb' + // transfer function selector
           recipient.slice(2).padStart(64, '0') +
           parseInt(amount).toString(16).padStart(64, '0');
  }
}

export const gasStationService = new GasStationService();
