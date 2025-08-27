import { Circle, CircleEnvironments } from '@circle-fin/circle-sdk';
import { getEnvVar } from '@usdc-payroll/shared';
import { logger } from './logger';

// Circle API configuration
const CIRCLE_API_KEY = getEnvVar('CIRCLE_API_KEY');
const CIRCLE_ENVIRONMENT = getEnvVar('CIRCLE_ENVIRONMENT', 'sandbox');

// Circle Web3 Services configuration
const CIRCLE_W3S_API_KEY = getEnvVar('CIRCLE_W3S_API_KEY');
const CIRCLE_W3S_ENTITY_SECRET = getEnvVar('CIRCLE_W3S_ENTITY_SECRET');

// Initialize Circle SDK
export const circleClient = new Circle(
  CIRCLE_API_KEY,
  CIRCLE_ENVIRONMENT === 'production' ? CircleEnvironments.production : CircleEnvironments.sandbox
);

// Circle Web3 Services client configuration
export const w3sConfig = {
  apiKey: CIRCLE_W3S_API_KEY,
  entitySecret: CIRCLE_W3S_ENTITY_SECRET,
  baseUrl: CIRCLE_ENVIRONMENT === 'production' 
    ? 'https://api.circle.com/v1/w3s' 
    : 'https://api-sandbox.circle.com/v1/w3s'
};

// CCTP API configuration
export const cctpConfig = {
  baseUrl: CIRCLE_ENVIRONMENT === 'production'
    ? 'https://iris-api.circle.com'
    : 'https://iris-api-sandbox.circle.com',
  rateLimit: 35 // requests per second
};

// Gas Station configuration
export const gasStationConfig = {
  enabled: true,
  maxGasLimit: 500000,
  dailyLimit: '1000.00', // USDC
  allowedContracts: [] as string[] // Empty means all contracts allowed
};

// Paymaster configuration
export const paymasterConfig = {
  enabled: true,
  maxGasFeeUSDC: '10.00', // Maximum gas fee in USDC per transaction
  slippageTolerance: 0.05 // 5% slippage tolerance
};

logger.info('Circle SDK initialized', {
  environment: CIRCLE_ENVIRONMENT,
  hasApiKey: !!CIRCLE_API_KEY,
  hasW3SKey: !!CIRCLE_W3S_API_KEY
});

export default circleClient;
