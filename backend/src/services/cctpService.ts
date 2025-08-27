import axios from 'axios';
import { createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { sepolia, arbitrumSepolia, baseSepolia, avalancheFuji, polygonAmoy } from 'viem/chains';
import { 
  SupportedChain, 
  CCTPTransfer, 
  CHAIN_CONFIGS, 
  TOKEN_MESSENGER_ADDRESSES, 
  MESSAGE_TRANSMITTER_ADDRESSES,
  USDC_ADDRESSES 
} from '@usdc-payroll/shared';
import { cctpConfig } from '../config/circle';
import { logger } from '../config/logger';

export class CCTPService {
  private clients: Map<SupportedChain, any> = new Map();

  constructor() {
    this.initializeClients();
  }

  /**
   * Initialize viem clients for each supported chain
   */
  private initializeClients() {
    const chainMap = {
      [SupportedChain.ETHEREUM]: sepolia,
      [SupportedChain.ARBITRUM]: arbitrumSepolia,
      [SupportedChain.BASE]: baseSepolia,
      [SupportedChain.AVALANCHE]: avalancheFuji,
      [SupportedChain.POLYGON]: polygonAmoy
    };

    Object.entries(chainMap).forEach(([chain, viemChain]) => {
      const client = createPublicClient({
        chain: viemChain,
        transport: http()
      });
      this.clients.set(chain as SupportedChain, client);
    });
  }

  /**
   * Initiate a cross-chain USDC transfer using CCTP
   */
  async initiateTransfer(
    sourceChain: SupportedChain,
    destinationChain: SupportedChain,
    amount: string,
    recipient: string,
    senderAddress: string
  ): Promise<CCTPTransfer> {
    try {
      logger.info('Initiating CCTP transfer', {
        sourceChain,
        destinationChain,
        amount,
        recipient,
        senderAddress
      });

      // Get domain IDs
      const sourceDomain = CHAIN_CONFIGS[sourceChain].domain;
      const destinationDomain = CHAIN_CONFIGS[destinationChain].domain;

      // Convert amount to wei (USDC has 6 decimals)
      const amountWei = parseUnits(amount, 6);

      // Get contract addresses
      const tokenMessengerAddress = TOKEN_MESSENGER_ADDRESSES[sourceChain];
      const usdcAddress = USDC_ADDRESSES[sourceChain];

      // Create the burn transaction data
      const burnTxData = {
        to: tokenMessengerAddress,
        data: this.encodeBurnFunction(
          amountWei.toString(),
          destinationDomain,
          recipient,
          usdcAddress
        )
      };

      logger.info('CCTP burn transaction prepared', {
        tokenMessengerAddress,
        sourceDomain,
        destinationDomain,
        amountWei: amountWei.toString()
      });

      // Return transfer object (actual transaction would be executed by wallet)
      return {
        messageHash: '', // Will be populated after transaction
        sourceChain,
        destinationChain,
        amount,
        recipient,
        status: 'pending'
      };
    } catch (error) {
      logger.error('Failed to initiate CCTP transfer', { sourceChain, destinationChain, error });
      throw error;
    }
  }

  /**
   * Get attestation for a message hash
   */
  async getAttestation(messageHash: string): Promise<string | null> {
    try {
      logger.info('Fetching CCTP attestation', { messageHash });

      const response = await axios.get(
        `${cctpConfig.baseUrl}/v2/messages/${messageHash}`,
        {
          timeout: 10000
        }
      );

      if (response.data && response.data.attestation) {
        logger.info('CCTP attestation retrieved', { messageHash });
        return response.data.attestation;
      }

      return null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Message not yet available
        return null;
      }
      logger.error('Failed to get CCTP attestation', { messageHash, error });
      throw error;
    }
  }

  /**
   * Complete cross-chain transfer by minting on destination chain
   */
  async completeTransfer(
    destinationChain: SupportedChain,
    messageHash: string,
    attestation: string,
    recipient: string
  ): Promise<any> {
    try {
      logger.info('Completing CCTP transfer', {
        destinationChain,
        messageHash,
        recipient
      });

      const messageTransmitterAddress = MESSAGE_TRANSMITTER_ADDRESSES[destinationChain];

      // Create the mint transaction data
      const mintTxData = {
        to: messageTransmitterAddress,
        data: this.encodeMintFunction(messageHash, attestation)
      };

      logger.info('CCTP mint transaction prepared', {
        messageTransmitterAddress,
        messageHash
      });

      return mintTxData;
    } catch (error) {
      logger.error('Failed to complete CCTP transfer', { destinationChain, messageHash, error });
      throw error;
    }
  }

  /**
   * Check if a message has been used (already minted)
   */
  async isMessageUsed(chain: SupportedChain, messageHash: string): Promise<boolean> {
    try {
      const client = this.clients.get(chain);
      const messageTransmitterAddress = MESSAGE_TRANSMITTER_ADDRESSES[chain];

      // Call usedNonces mapping to check if message was used
      const result = await client.readContract({
        address: messageTransmitterAddress,
        abi: [{
          name: 'usedNonces',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'nonce', type: 'bytes32' }],
          outputs: [{ name: '', type: 'bool' }]
        }],
        functionName: 'usedNonces',
        args: [messageHash]
      });

      return result as boolean;
    } catch (error) {
      logger.error('Failed to check if message is used', { chain, messageHash, error });
      return false;
    }
  }

  /**
   * Get USDC balance for an address on a specific chain
   */
  async getUSDCBalance(chain: SupportedChain, address: string): Promise<string> {
    try {
      const client = this.clients.get(chain);
      const usdcAddress = USDC_ADDRESSES[chain];

      const balance = await client.readContract({
        address: usdcAddress,
        abi: [{
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }]
        }],
        functionName: 'balanceOf',
        args: [address]
      });

      // Convert from wei to USDC (6 decimals)
      return formatUnits(balance as bigint, 6);
    } catch (error) {
      logger.error('Failed to get USDC balance', { chain, address, error });
      throw error;
    }
  }

  /**
   * Get fast transfer allowance
   */
  async getFastTransferAllowance(): Promise<any> {
    try {
      const response = await axios.get(
        `${cctpConfig.baseUrl}/v2/fastBurn/USDC/allowance`,
        { timeout: 10000 }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to get fast transfer allowance', { error });
      throw error;
    }
  }

  /**
   * Get transfer fees
   */
  async getTransferFees(): Promise<any> {
    try {
      const response = await axios.get(
        `${cctpConfig.baseUrl}/v2/burn/USDC/fees`,
        { timeout: 10000 }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to get transfer fees', { error });
      throw error;
    }
  }

  /**
   * Monitor transfer status
   */
  async monitorTransfer(messageHash: string, maxAttempts: number = 60): Promise<CCTPTransfer> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const attestation = await this.getAttestation(messageHash);
        
        if (attestation) {
          return {
            messageHash,
            attestation,
            sourceChain: SupportedChain.ETHEREUM, // This would be tracked separately
            destinationChain: SupportedChain.ARBITRUM, // This would be tracked separately
            amount: '0', // This would be tracked separately
            recipient: '', // This would be tracked separately
            status: 'attested'
          };
        }

        // Wait 30 seconds before next attempt
        await new Promise(resolve => setTimeout(resolve, 30000));
        attempts++;
      } catch (error) {
        logger.error('Error monitoring transfer', { messageHash, attempts, error });
        attempts++;
      }
    }

    throw new Error('Transfer monitoring timeout');
  }

  /**
   * Encode burn function call data
   */
  private encodeBurnFunction(
    amount: string,
    destinationDomain: number,
    recipient: string,
    burnToken: string
  ): string {
    // This would use proper ABI encoding in a real implementation
    // For now, returning placeholder
    return '0x6fd3504e' + // depositForBurn function selector
           amount.padStart(64, '0') +
           destinationDomain.toString(16).padStart(64, '0') +
           recipient.slice(2).padStart(64, '0') +
           burnToken.slice(2).padStart(64, '0');
  }

  /**
   * Encode mint function call data
   */
  private encodeMintFunction(messageHash: string, attestation: string): string {
    // This would use proper ABI encoding in a real implementation
    // For now, returning placeholder
    return '0x57ecfd28' + // receiveMessage function selector
           messageHash.slice(2) +
           attestation.slice(2);
  }
}

export const cctpService = new CCTPService();
