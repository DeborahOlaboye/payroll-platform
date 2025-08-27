import axios from 'axios';
import { createPublicClient, http, parseUnits, encodeFunctionData } from 'viem';
import { sepolia, arbitrumSepolia, baseSepolia, avalancheFuji, polygonAmoy } from 'viem/chains';
import { SupportedChain, PaymasterOperation } from '@usdc-payroll/shared';
import { paymasterConfig } from '../config/circle';
import { logger } from '../config/logger';

export class PaymasterService {
  private clients: Map<SupportedChain, any> = new Map();
  private paymasterAddresses: Map<SupportedChain, string> = new Map();

  constructor() {
    this.initializeClients();
    this.initializePaymasterAddresses();
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
   * Initialize Circle Paymaster contract addresses
   */
  private initializePaymasterAddresses() {
    // These would be the actual Circle Paymaster addresses on testnet
    this.paymasterAddresses.set(SupportedChain.ETHEREUM, '0x...');
    this.paymasterAddresses.set(SupportedChain.ARBITRUM, '0x...');
    this.paymasterAddresses.set(SupportedChain.BASE, '0x...');
    this.paymasterAddresses.set(SupportedChain.AVALANCHE, '0x...');
    this.paymasterAddresses.set(SupportedChain.POLYGON, '0x...');
  }

  /**
   * Create a user operation with USDC gas payment
   */
  async createUserOperationWithUSDCGas(
    walletAddress: string,
    chain: SupportedChain,
    transaction: {
      to: string;
      data: string;
      value?: string;
    },
    maxGasFeeUSDC: string = paymasterConfig.maxGasFeeUSDC
  ): Promise<any> {
    try {
      logger.info('Creating user operation with USDC gas payment', {
        walletAddress,
        chain,
        to: transaction.to,
        maxGasFeeUSDC
      });

      // Get gas estimates
      const gasEstimate = await this.estimateGas(chain, transaction);
      
      // Calculate USDC amount needed for gas
      const usdcGasFee = await this.calculateUSDCGasFee(chain, gasEstimate);

      if (parseFloat(usdcGasFee) > parseFloat(maxGasFeeUSDC)) {
        throw new Error(`Gas fee ${usdcGasFee} USDC exceeds maximum ${maxGasFeeUSDC} USDC`);
      }

      // Create USDC permit for gas payment
      const permit = await this.createUSDCPermit(
        walletAddress,
        chain,
        usdcGasFee
      );

      // Build user operation
      const userOp = {
        sender: walletAddress,
        nonce: await this.getNonce(walletAddress, chain),
        initCode: '0x',
        callData: transaction.data,
        callGasLimit: gasEstimate.gasLimit.toString(),
        verificationGasLimit: '150000',
        preVerificationGas: '21000',
        maxFeePerGas: gasEstimate.maxFeePerGas.toString(),
        maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas.toString(),
        paymasterAndData: this.encodePaymasterData(chain, permit),
        signature: '0x' // Will be signed by wallet
      };

      logger.info('User operation created with USDC gas payment', {
        userOpHash: this.getUserOpHash(userOp),
        usdcGasFee,
        walletAddress
      });

      return {
        userOperation: userOp,
        usdcGasFee,
        permit
      };
    } catch (error) {
      logger.error('Failed to create user operation with USDC gas', {
        walletAddress,
        chain,
        error
      });
      throw error;
    }
  }

  /**
   * Submit user operation to bundler
   */
  async submitUserOperation(
    userOp: any,
    chain: SupportedChain
  ): Promise<PaymasterOperation> {
    try {
      logger.info('Submitting user operation', {
        userOpHash: this.getUserOpHash(userOp),
        chain
      });

      // This would submit to an actual ERC-4337 bundler
      const bundlerUrl = this.getBundlerUrl(chain);
      
      const response = await axios.post(bundlerUrl, {
        jsonrpc: '2.0',
        method: 'eth_sendUserOperation',
        params: [userOp, this.getEntryPointAddress(chain)],
        id: 1
      });

      const userOpHash = response.data.result;

      logger.info('User operation submitted', { userOpHash, chain });

      return {
        userOpHash,
        status: 'pending',
        gasUsed: undefined,
        gasFeeInUSDC: undefined
      };
    } catch (error) {
      logger.error('Failed to submit user operation', { chain, error });
      throw error;
    }
  }

  /**
   * Get user operation receipt
   */
  async getUserOperationReceipt(
    userOpHash: string,
    chain: SupportedChain
  ): Promise<any> {
    try {
      const bundlerUrl = this.getBundlerUrl(chain);
      
      const response = await axios.post(bundlerUrl, {
        jsonrpc: '2.0',
        method: 'eth_getUserOperationReceipt',
        params: [userOpHash],
        id: 1
      });

      return response.data.result;
    } catch (error) {
      logger.error('Failed to get user operation receipt', { userOpHash, chain, error });
      throw error;
    }
  }

  /**
   * Monitor user operation status
   */
  async monitorUserOperation(
    userOpHash: string,
    chain: SupportedChain,
    maxAttempts: number = 30
  ): Promise<PaymasterOperation> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const receipt = await this.getUserOperationReceipt(userOpHash, chain);
        
        if (receipt) {
          const gasUsed = receipt.actualGasUsed;
          const gasFeeInUSDC = await this.calculateUSDCGasFee(chain, {
            gasLimit: parseInt(gasUsed),
            maxFeePerGas: receipt.actualGasPrice,
            maxPriorityFeePerGas: '0'
          });

          return {
            userOpHash,
            status: receipt.success ? 'completed' : 'failed',
            gasUsed,
            gasFeeInUSDC
          };
        }

        // Wait 10 seconds before next attempt
        await new Promise(resolve => setTimeout(resolve, 10000));
        attempts++;
      } catch (error) {
        logger.error('Error monitoring user operation', { userOpHash, attempts, error });
        attempts++;
      }
    }

    return {
      userOpHash,
      status: 'failed',
      gasUsed: undefined,
      gasFeeInUSDC: undefined
    };
  }

  /**
   * Create USDC permit for gas payment
   */
  private async createUSDCPermit(
    owner: string,
    chain: SupportedChain,
    amount: string
  ): Promise<any> {
    try {
      const usdcAddress = this.getUSDCAddress(chain);
      const paymasterAddress = this.paymasterAddresses.get(chain);
      const nonce = await this.getUSDCNonce(owner, chain);
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour

      // Create permit signature (this would be signed by the wallet)
      const permit = {
        owner,
        spender: paymasterAddress,
        value: parseUnits(amount, 6).toString(),
        nonce: nonce.toString(),
        deadline: deadline.toString()
      };

      return permit;
    } catch (error) {
      logger.error('Failed to create USDC permit', { owner, chain, error });
      throw error;
    }
  }

  /**
   * Estimate gas for transaction
   */
  private async estimateGas(
    chain: SupportedChain,
    transaction: { to: string; data: string; value?: string }
  ): Promise<{
    gasLimit: bigint;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  }> {
    const client = this.clients.get(chain);
    
    const gasLimit = await client.estimateGas({
      to: transaction.to,
      data: transaction.data,
      value: transaction.value ? parseUnits(transaction.value, 18) : 0n
    });

    const feeData = await client.estimateFeesPerGas();

    return {
      gasLimit,
      maxFeePerGas: feeData.maxFeePerGas || 0n,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || 0n
    };
  }

  /**
   * Calculate USDC amount needed for gas fee
   */
  private async calculateUSDCGasFee(
    chain: SupportedChain,
    gasEstimate: {
      gasLimit: number | bigint;
      maxFeePerGas: number | bigint | string;
      maxPriorityFeePerGas: number | bigint | string;
    }
  ): Promise<string> {
    try {
      // Convert gas cost to native token amount
      const gasLimit = typeof gasEstimate.gasLimit === 'bigint' 
        ? gasEstimate.gasLimit 
        : BigInt(gasEstimate.gasLimit);
      
      const maxFeePerGas = typeof gasEstimate.maxFeePerGas === 'bigint'
        ? gasEstimate.maxFeePerGas
        : BigInt(gasEstimate.maxFeePerGas.toString());

      const totalGasCost = gasLimit * maxFeePerGas;

      // Get native token to USD price (simplified - would use real price feed)
      const nativeTokenPriceUSD = await this.getNativeTokenPrice(chain);
      
      // Convert to USDC amount (adding slippage tolerance)
      const gasCostUSD = (Number(totalGasCost) / 1e18) * nativeTokenPriceUSD;
      const gasCostUSDC = gasCostUSD * (1 + paymasterConfig.slippageTolerance);

      return gasCostUSDC.toFixed(6);
    } catch (error) {
      logger.error('Failed to calculate USDC gas fee', { chain, error });
      throw error;
    }
  }

  /**
   * Get native token price in USD
   */
  private async getNativeTokenPrice(chain: SupportedChain): Promise<number> {
    // Simplified price feed - in production would use Chainlink or similar
    const prices = {
      [SupportedChain.ETHEREUM]: 2500, // ETH price
      [SupportedChain.ARBITRUM]: 2500, // ETH price
      [SupportedChain.BASE]: 2500, // ETH price
      [SupportedChain.AVALANCHE]: 25, // AVAX price
      [SupportedChain.POLYGON]: 0.8 // MATIC price
    };
    
    return prices[chain];
  }

  /**
   * Encode paymaster data
   */
  private encodePaymasterData(chain: SupportedChain, permit: any): string {
    const paymasterAddress = this.paymasterAddresses.get(chain);
    
    // Encode paymaster address + permit data
    return paymasterAddress + 
           permit.owner.slice(2) +
           permit.spender.slice(2) +
           BigInt(permit.value).toString(16).padStart(64, '0') +
           BigInt(permit.nonce).toString(16).padStart(64, '0') +
           BigInt(permit.deadline).toString(16).padStart(64, '0');
  }

  /**
   * Get user operation hash
   */
  private getUserOpHash(userOp: any): string {
    // Simplified hash calculation
    return '0x' + Buffer.from(JSON.stringify(userOp)).toString('hex').slice(0, 64);
  }

  /**
   * Get nonce for smart account
   */
  private async getNonce(address: string, chain: SupportedChain): Promise<string> {
    const client = this.clients.get(chain);
    const nonce = await client.getTransactionCount({ address });
    return nonce.toString();
  }

  /**
   * Get USDC nonce for permit
   */
  private async getUSDCNonce(owner: string, chain: SupportedChain): Promise<bigint> {
    const client = this.clients.get(chain);
    const usdcAddress = this.getUSDCAddress(chain);

    const nonce = await client.readContract({
      address: usdcAddress,
      abi: [{
        name: 'nonces',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'owner', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }]
      }],
      functionName: 'nonces',
      args: [owner]
    });

    return nonce as bigint;
  }

  /**
   * Get bundler URL for chain
   */
  private getBundlerUrl(chain: SupportedChain): string {
    const urls = {
      [SupportedChain.ETHEREUM]: 'https://api.pimlico.io/v1/sepolia/rpc',
      [SupportedChain.ARBITRUM]: 'https://api.pimlico.io/v1/arbitrum-sepolia/rpc',
      [SupportedChain.BASE]: 'https://api.pimlico.io/v1/base-sepolia/rpc',
      [SupportedChain.AVALANCHE]: 'https://api.pimlico.io/v1/avalanche-fuji/rpc',
      [SupportedChain.POLYGON]: 'https://api.pimlico.io/v1/polygon-amoy/rpc'
    };
    return urls[chain];
  }

  /**
   * Get EntryPoint contract address
   */
  private getEntryPointAddress(chain: SupportedChain): string {
    // ERC-4337 EntryPoint v0.6.0
    return '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';
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
}

export const paymasterService = new PaymasterService();
