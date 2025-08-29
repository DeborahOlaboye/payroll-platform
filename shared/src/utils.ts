import { SupportedChain } from './types';
import { USDC_DECIMALS } from './constants';
import { CHAIN_CONFIGS } from './constants';

/**
 * Format USDC amount for display
 */
export function formatUSDC(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  }).format(num);
}

/**
 * Convert USDC amount to wei (6 decimals)
 */
export function usdcToWei(amount: string): string {
  const num = parseFloat(amount);
  return (num * Math.pow(10, USDC_DECIMALS)).toString();
}

/**
 * Convert wei to USDC amount (6 decimals)
 */
export function weiToUSDC(wei: string): string {
  const num = parseFloat(wei);
  return (num / Math.pow(10, USDC_DECIMALS)).toString();
}

/**
 * Validate USDC amount format
 */
export function isValidUSDCAmount(amount: string): boolean {
  const regex = /^\d+(\.\d{1,6})?$/;
  return regex.test(amount) && parseFloat(amount) > 0;
}

/**
 * Get chain configuration
 */
export function getChainConfig(chain: SupportedChain) {
  return CHAIN_CONFIGS[chain];
}

/**
 * Get chain name for display
 */
export function getChainDisplayName(chain: SupportedChain): string {
  return CHAIN_CONFIGS[chain].name;
}

/**
 * Get block explorer URL for transaction
 */
export function getTransactionUrl(chain: SupportedChain, txHash: string): string {
  const config = CHAIN_CONFIGS[chain];
  return `${config.blockExplorer}/tx/${txHash}`;
}

/**
 * Get block explorer URL for address
 */
export function getAddressUrl(chain: SupportedChain, address: string): string {
  const config = CHAIN_CONFIGS[chain];
  return `${config.blockExplorer}/address/${address}`;
}

/**
 * Truncate address for display
 */
export function truncateAddress(address: string, chars: number = 4): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    if (typeof setTimeout !== 'undefined') {
      setTimeout(() => resolve(), ms);
    } else {
      resolve();
    }
  });
}

/**
 * Retry utility with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await sleep(delay);
      return retry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Sanitize string for database
 */
export function sanitizeString(str: string): string {
  return str.trim().replace(/[<>]/g, '');
}

/**
 * Calculate total amount from payroll items
 */
export function calculateTotalAmount(amounts: string[]): string {
  const total = amounts.reduce((sum, amount) => {
    return sum + parseFloat(amount);
  }, 0);
  return total.toFixed(6);
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Parse CSV content
 */
export function parseCSV(content: string): Array<Record<string, string>> {
  const lines = content.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV must have header and at least one data row');
  
  const headers = lines[0].split(',').map(h => h.trim());
  const rows: Array<Record<string, string>> = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) {
      throw new Error(`Row ${i + 1} has ${values.length} columns, expected ${headers.length}`);
    }
    
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    rows.push(row);
  }
  
  return rows;
}

/**
 * Validate chain support
 */
export function isSupportedChain(chain: string): chain is SupportedChain {
  return Object.values(SupportedChain).includes(chain as SupportedChain);
}

/**
 * Get environment variable with validation
 */
export function getEnvVar(name: string, defaultValue?: string): string {
  const value = (typeof process !== 'undefined' ? process.env?.[name] : undefined) || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
}

/**
 * Create error response
 */
export function createErrorResponse(message: string, code: string, statusCode: number = 400) {
  return {
    error: {
      message,
      code,
      statusCode
    }
  };
}

/**
 * Create success response
 */
export function createSuccessResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    ...(message && { message })
  };
}
