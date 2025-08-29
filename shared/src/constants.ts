import { SupportedChain } from './types';

// Chain configurations
export const CHAIN_CONFIGS = {
  [SupportedChain.ETHEREUM]: {
    chainId: 11155111, // Sepolia testnet
    name: 'Ethereum Sepolia',
    rpcUrl: 'https://sepolia.infura.io/v3/',
    blockExplorer: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    domain: 0 
  },
  [SupportedChain.ARBITRUM]: {
    chainId: 421614, 
    name: 'Arbitrum Sepolia',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    blockExplorer: 'https://sepolia.arbiscan.io',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    domain: 3 
  },
  [SupportedChain.BASE]: {
    chainId: 84532, 
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    domain: 6 
  },
  [SupportedChain.AVALANCHE]: {
    chainId: 43113, 
    name: 'Avalanche Fuji',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    blockExplorer: 'https://testnet.snowtrace.io',
    nativeCurrency: {
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18
    },
    domain: 1 
  },
  [SupportedChain.POLYGON]: {
    chainId: 80002, 
    name: 'Polygon Amoy',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    blockExplorer: 'https://amoy.polygonscan.com',
    nativeCurrency: {
      name: 'Polygon',
      symbol: 'MATIC',
      decimals: 18
    },
    domain: 7 
  }
} as const;

// USDC contract addresses (testnet)
export const USDC_ADDRESSES = {
  [SupportedChain.ETHEREUM]: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  [SupportedChain.ARBITRUM]: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  [SupportedChain.BASE]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  [SupportedChain.AVALANCHE]: '0x5425890298aed601595a70AB815c96711a31Bc65',
  [SupportedChain.POLYGON]: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582'
} as const;

// CCTP contract addresses (testnet)
export const TOKEN_MESSENGER_ADDRESSES = {
  [SupportedChain.ETHEREUM]: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
  [SupportedChain.ARBITRUM]: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
  [SupportedChain.BASE]: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
  [SupportedChain.AVALANCHE]: '0xa9fB1b3009DCb79E2fe346c16a604B8Fa8aE0a79',
  [SupportedChain.POLYGON]: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5'
} as const;

export const MESSAGE_TRANSMITTER_ADDRESSES = {
  [SupportedChain.ETHEREUM]: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
  [SupportedChain.ARBITRUM]: '0xaCF1ceeF35caAc005e15888dDb8A3515C41B4872',
  [SupportedChain.BASE]: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
  [SupportedChain.AVALANCHE]: '0xa9fB1b3009DCb79E2fe346c16a604B8Fa8aE0a79',
  [SupportedChain.POLYGON]: '0xe09A679F56207EF33F5b9d8fb4499Ec00792eA73'
} as const;

// Circle API endpoints
export const CIRCLE_API_ENDPOINTS = {
  SANDBOX: 'https://api-sandbox.circle.com',
  PRODUCTION: 'https://api.circle.com'
} as const;

// CCTP API endpoints
export const CCTP_API_ENDPOINTS = {
  SANDBOX: 'https://iris-api-sandbox.circle.com',
  PRODUCTION: 'https://iris-api.circle.com'
} as const;

// Gas Station contract addresses (testnet)
export const GAS_STATION_ADDRESSES = {
  [SupportedChain.ETHEREUM]: '0x...', 
  [SupportedChain.ARBITRUM]: '0x...',
  [SupportedChain.BASE]: '0x...',
  [SupportedChain.AVALANCHE]: '0x...',
  [SupportedChain.POLYGON]: '0x...'
} as const;

// Paymaster contract addresses (testnet)
export const PAYMASTER_ADDRESSES = {
  [SupportedChain.ETHEREUM]: '0x...', 
  [SupportedChain.ARBITRUM]: '0x...',
  [SupportedChain.BASE]: '0x...',
  [SupportedChain.AVALANCHE]: '0x...',
  [SupportedChain.POLYGON]: '0x...'
} as const;

// Default gas limits
export const DEFAULT_GAS_LIMITS = {
  TRANSFER: 100000,
  APPROVE: 50000,
  BURN: 150000,
  MINT: 150000
} as const;

// USDC decimals
export const USDC_DECIMALS = 6;

// Rate limits
export const RATE_LIMITS = {
  CIRCLE_API: 35, // requests per second
  CCTP_API: 35    // requests per second
} as const;

// Webhook event types
export const WEBHOOK_EVENTS = {
  PAYOUT_COMPLETED: 'payouts.completed',
  PAYOUT_FAILED: 'payouts.failed',
  TRANSFER_COMPLETED: 'transfers.completed',
  TRANSFER_FAILED: 'transfers.failed'
} as const;

// Error codes
export const ERROR_CODES = {
  INVALID_CHAIN: 'INVALID_CHAIN',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  WORKER_NOT_FOUND: 'WORKER_NOT_FOUND',
  PAYROLL_RUN_NOT_FOUND: 'PAYROLL_RUN_NOT_FOUND',
  CIRCLE_API_ERROR: 'CIRCLE_API_ERROR',
  CCTP_ERROR: 'CCTP_ERROR',
  WALLET_ERROR: 'WALLET_ERROR',
  GAS_STATION_ERROR: 'GAS_STATION_ERROR',
  PAYMASTER_ERROR: 'PAYMASTER_ERROR'
} as const;
