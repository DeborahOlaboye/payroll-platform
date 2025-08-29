import { z } from 'zod';

// Constants (moved to constants.ts to avoid duplication)

// Chain definitions
export enum SupportedChain {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  BASE = 'base',
  AVALANCHE = 'avalanche',
  POLYGON = 'polygon'
}

export const ChainSchema = z.nativeEnum(SupportedChain);

// Payout status
export enum PayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export const PayoutStatusSchema = z.nativeEnum(PayoutStatus);

// Payroll run status
export enum PayrollRunStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export const PayrollRunStatusSchema = z.nativeEnum(PayrollRunStatus);

// Worker schema
export const WorkerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  walletId: z.string().optional(),
  recipientId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Worker = z.infer<typeof WorkerSchema>;

// Payroll run schema
export const PayrollRunSchema = z.object({
  id: z.string().uuid(),
  adminId: z.string(),
  status: PayrollRunStatusSchema,
  totalAmount: z.string(),
  totalWorkers: z.number().int().positive(),
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().optional()
});

export type PayrollRun = z.infer<typeof PayrollRunSchema>;

// Payroll item schema
export const PayrollItemSchema = z.object({
  id: z.string().uuid(),
  payrollRunId: z.string().uuid(),
  workerId: z.string().uuid(),
  amount: z.string(),
  chain: ChainSchema,
  status: PayoutStatusSchema,
  payoutId: z.string().optional(),
  transactionHash: z.string().optional(),
  errorMessage: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().optional()
});

export type PayrollItem = z.infer<typeof PayrollItemSchema>;

// CSV upload schema
export const CSVRowSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  amount: z.string().regex(/^\d+(\.\d{1,6})?$/, 'Invalid amount format'),
  chain: ChainSchema
});

export type CSVRow = z.infer<typeof CSVRowSchema>;

export const CSVUploadSchema = z.array(CSVRowSchema);

// API request/response schemas
export const CreatePayrollRunRequestSchema = z.object({
  workers: z.array(z.object({
    name: z.string().min(1),
    email: z.string().email(),
    amount: z.string(),
    chain: ChainSchema
  }))
});

export type CreatePayrollRunRequest = z.infer<typeof CreatePayrollRunRequestSchema>;

export const ExecutePayrollRunRequestSchema = z.object({
  payrollRunId: z.string().uuid()
});

export type ExecutePayrollRunRequest = z.infer<typeof ExecutePayrollRunRequestSchema>;

// Cross-chain transfer request
export const CrossChainTransferRequestSchema = z.object({
  workerId: z.string().uuid(),
  amount: z.string(),
  destinationChain: ChainSchema,
  destinationAddress: z.string()
});

export type CrossChainTransferRequest = z.infer<typeof CrossChainTransferRequestSchema>;

// Wallet balance response
export const WalletBalanceSchema = z.object({
  chain: ChainSchema,
  balance: z.string(),
  symbol: z.string()
});

export type WalletBalance = z.infer<typeof WalletBalanceSchema>;

// Transaction history
export const TransactionSchema = z.object({
  id: z.string(),
  type: z.enum(['payout', 'withdrawal', 'transfer']),
  amount: z.string(),
  chain: ChainSchema,
  status: z.enum(['pending', 'completed', 'failed']),
  transactionHash: z.string().optional(),
  createdAt: z.date(),
  completedAt: z.date().optional()
});

export type Transaction = z.infer<typeof TransactionSchema>;

// Circle API types
export interface CircleRecipient {
  id: string;
  email: string;
  status: string;
  metadata?: Record<string, any>;
}

export interface CirclePayout {
  id: string;
  status: string;
  amount: {
    amount: string;
    currency: string;
  };
  fees?: {
    amount: string;
    currency: string;
  };
  trackingRef?: string;
  externalRef?: string;
  recipientId: string;
  destination: {
    type: string;
    addressId?: string;
    address?: string;
    chain?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// CCTP types
export interface CCTPTransfer {
  messageHash: string;
  attestation?: string;
  sourceChain: SupportedChain;
  destinationChain: SupportedChain;
  amount: string;
  recipient: string;
  status: 'pending' | 'attested' | 'completed' | 'failed';
}

// Gas Station types
export interface GasStationPolicy {
  id: string;
  name: string;
  description: string;
  rules: {
    maxGasLimit?: number;
    allowedContracts?: string[];
    dailyLimit?: string;
  };
}

// Paymaster types
export interface PaymasterOperation {
  userOpHash: string;
  status: 'pending' | 'completed' | 'failed';
  gasUsed?: string;
  gasFeeInUSDC?: string;
}

// Error types
export class PayrollError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'PayrollError';
  }
}

export class CircleAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: any
  ) {
    super(message);
    this.name = 'CircleAPIError';
  }
}
