import useSWR from 'swr';
import { api } from '@/lib/api';

// Generic SWR hook with error handling
export function useApiData<T>(
  key: string | null,
  fetcher: () => Promise<{ data: T }>,
  options?: {
    refreshInterval?: number;
    revalidateOnFocus?: boolean;
    revalidateOnReconnect?: boolean;
  }
) {
  const { data, error, mutate, isLoading } = useSWR(
    key,
    async () => {
      const response = await fetcher();
      return response.data;
    },
    {
      refreshInterval: options?.refreshInterval,
      revalidateOnFocus: options?.revalidateOnFocus ?? false,
      revalidateOnReconnect: options?.revalidateOnReconnect ?? true,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}

// Payroll hooks
export function usePayrollRuns(page: number = 1, limit: number = 10) {
  return useApiData(
    `payroll-runs-${page}-${limit}`,
    () => api.getPayrollRuns(page, limit),
    { refreshInterval: 30000 } // Refresh every 30 seconds
  );
}

export function usePayrollRun(payrollRunId: string | null) {
  return useApiData(
    payrollRunId ? `payroll-run-${payrollRunId}` : null,
    () => api.getPayrollRun(payrollRunId!),
    { refreshInterval: 10000 } // Refresh every 10 seconds for active runs
  );
}

// Worker hooks
export function useWorkerBalance(workerId: string | null) {
  return useApiData(
    workerId ? `worker-balance-${workerId}` : null,
    () => api.getWorkerBalance(workerId!),
    { refreshInterval: 15000 } // Refresh every 15 seconds
  );
}

export function useWorkerTransactions(workerId: string | null, page: number = 1, limit: number = 10) {
  return useApiData(
    workerId ? `worker-transactions-${workerId}-${page}-${limit}` : null,
    () => api.getWorkerTransactions(workerId!, page, limit),
    { refreshInterval: 20000 } // Refresh every 20 seconds
  );
}

export function useWorkerTransfers(workerId: string | null, page: number = 1, limit: number = 10) {
  return useApiData(
    workerId ? `worker-transfers-${workerId}-${page}-${limit}` : null,
    () => api.getWorkerTransfers(workerId!, page, limit),
    { refreshInterval: 15000 } // Refresh every 15 seconds
  );
}

export function useWorker(workerId: string | null) {
  return useApiData(
    workerId ? `worker-${workerId}` : null,
    () => api.getWorker(workerId!),
    { revalidateOnFocus: false }
  );
}

// Health check hook
export function useHealthCheck() {
  return useApiData(
    'health',
    () => api.healthCheck(),
    { 
      refreshInterval: 60000, // Check every minute
      revalidateOnFocus: true 
    }
  );
}
