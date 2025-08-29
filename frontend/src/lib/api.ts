import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  CreatePayrollRunRequest, 
  ExecutePayrollRunRequest,
  CrossChainTransferRequest,
  createErrorResponse 
} from '@usdc-payroll/shared';

// API client configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add admin ID header for demo purposes
        config.headers['x-admin-id'] = 'admin-1';
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.data?.error) {
          throw new Error(error.response.data.error.message);
        }
        throw new Error(error.message || 'An unexpected error occurred');
      }
    );
  }

  // Health check
  async healthCheck(): Promise<any> {
    const response = await this.client.get('/health');
    return response.data;
  }

  // Payroll endpoints
  async uploadCSV(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('csv', file);
    
    const response = await this.client.post('/api/payroll/upload-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async createPayrollRun(request: CreatePayrollRunRequest): Promise<any> {
    const response = await this.client.post('/api/payroll/runs', request);
    return response.data;
  }

  async executePayrollRun(payrollRunId: string): Promise<any> {
    const response = await this.client.post(`/api/payroll/runs/${payrollRunId}/execute`);
    return response.data;
  }

  async getPayrollRun(payrollRunId: string): Promise<any> {
    const response = await this.client.get(`/api/payroll/runs/${payrollRunId}`);
    return response.data;
  }

  async getPayrollRuns(page: number = 1, limit: number = 10): Promise<any> {
    const response = await this.client.get('/api/payroll/runs', {
      params: { page, limit }
    });
    return response.data;
  }

  async downloadCSVTemplate(): Promise<Blob> {
    const response = await this.client.get('/api/payroll/template', {
      responseType: 'blob'
    });
    return response.data;
  }

  // Worker endpoints
  async getWorkerBalance(workerId: string): Promise<any> {
    const response = await this.client.get(`/api/workers/${workerId}/balance`);
    return response.data;
  }

  async initiateTransfer(workerId: string, request: Omit<CrossChainTransferRequest, 'workerId'>): Promise<any> {
    const response = await this.client.post(`/api/workers/${workerId}/transfer`, request);
    return response.data;
  }

  async getWorkerTransfers(workerId: string, page: number = 1, limit: number = 10): Promise<any> {
    const response = await this.client.get(`/api/workers/${workerId}/transfers`, {
      params: { page, limit }
    });
    return response.data;
  }

  async getWorkerTransactions(workerId: string, page: number = 1, limit: number = 10): Promise<any> {
    const response = await this.client.get(`/api/workers/${workerId}/transactions`, {
      params: { page, limit }
    });
    return response.data;
  }

  async executeGaslessTransaction(
    workerId: string, 
    transaction: {
      chain: string;
      to: string;
      data: string;
      value?: string;
    }
  ): Promise<any> {
    const response = await this.client.post(`/api/workers/${workerId}/gasless-transaction`, transaction);
    return response.data;
  }

  async executeUSDCGasTransaction(
    workerId: string,
    transaction: {
      chain: string;
      to: string;
      data: string;
      value?: string;
      maxGasFeeUSDC?: string;
    }
  ): Promise<any> {
    const response = await this.client.post(`/api/workers/${workerId}/usdc-gas-transaction`, transaction);
    return response.data;
  }

  async getWorker(workerId: string): Promise<any> {
    const response = await this.client.get(`/api/workers/${workerId}`);
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export individual API functions for easier use
export const api = {
  // Health
  healthCheck: () => apiClient.healthCheck(),

  // Payroll
  uploadCSV: (file: File) => apiClient.uploadCSV(file),
  createPayrollRun: (request: CreatePayrollRunRequest) => apiClient.createPayrollRun(request),
  executePayrollRun: (payrollRunId: string) => apiClient.executePayrollRun(payrollRunId),
  getPayrollRun: (payrollRunId: string) => apiClient.getPayrollRun(payrollRunId),
  getPayrollRuns: (page?: number, limit?: number) => apiClient.getPayrollRuns(page, limit),
  downloadCSVTemplate: () => apiClient.downloadCSVTemplate(),

  // Workers
  getWorkerBalance: (workerId: string) => apiClient.getWorkerBalance(workerId),
  initiateTransfer: (workerId: string, request: Omit<CrossChainTransferRequest, 'workerId'>) => 
    apiClient.initiateTransfer(workerId, request),
  getWorkerTransfers: (workerId: string, page?: number, limit?: number) => 
    apiClient.getWorkerTransfers(workerId, page, limit),
  getWorkerTransactions: (workerId: string, page?: number, limit?: number) => 
    apiClient.getWorkerTransactions(workerId, page, limit),
  executeGaslessTransaction: (workerId: string, transaction: any) => 
    apiClient.executeGaslessTransaction(workerId, transaction),
  executeUSDCGasTransaction: (workerId: string, transaction: any) => 
    apiClient.executeUSDCGasTransaction(workerId, transaction),
  getWorker: (workerId: string) => apiClient.getWorker(workerId),
};

export default api;
