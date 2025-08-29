'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { 
  ArrowLeftIcon,
  PlayIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingSpinner';
import { usePayrollRunDetails } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { formatUSDC, formatDate, getChainDisplayName } from '@usdc-payroll/shared';
import toast from 'react-hot-toast';

export default function PayrollRunDetails() {
  const params = useParams();
  const payrollRunId = params.id as string;
  
  const { data: payrollRun, error, isLoading, mutate } = usePayrollRunDetails(payrollRunId);

  const handleExecutePayroll = async () => {
    try {
      await api.executePayrollRun(payrollRunId);
      toast.success('Payroll execution started!');
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to execute payroll');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'processing':
        return <Badge variant="warning">Processing</Badge>;
      case 'failed':
        return <Badge variant="error">Failed</Badge>;
      case 'pending':
        return <Badge variant="info">Pending</Badge>;
      default:
        return <Badge variant="gray">Draft</Badge>;
    }
  };

  const getItemStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return <CheckCircleIcon className="w-4 h-4 text-success-500" />;
      case 'failed':
        return <XCircleIcon className="w-4 h-4 text-error-500" />;
      case 'processing':
      case 'pending':
        return <ClockIcon className="w-4 h-4 text-warning-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardBody className="text-center">
            <p className="text-error-600 mb-4">Failed to load payroll run</p>
            <Button onClick={() => mutate()}>Retry</Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoadingState>Loading payroll run details...</LoadingState>
      </div>
    );
  }

  if (!payrollRun) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardBody className="text-center">
            <p className="text-gray-600 mb-4">Payroll run not found</p>
            <Button onClick={() => window.history.back()}>Go Back</Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  const canExecute = payrollRun.status.toLowerCase() === 'pending';
  const isProcessing = payrollRun.status.toLowerCase() === 'processing';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
              >
                <ArrowLeftIcon className="w-4 h-4 mr-1" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Payroll Run #{payrollRun.id.slice(-8)}
                </h1>
                <div className="flex items-center space-x-2 mt-1">
                  {getStatusBadge(payrollRun.status)}
                  <span className="text-gray-600">•</span>
                  <span className="text-sm text-gray-600">
                    Created {formatDate(new Date(payrollRun.createdAt))}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {canExecute && (
                <Button
                  variant="primary"
                  onClick={handleExecutePayroll}
                >
                  <PlayIcon className="w-4 h-4 mr-1" />
                  Execute Payroll
                </Button>
              )}
              
              {isProcessing && (
                <div className="flex items-center text-warning-600">
                  <div className="loading-spinner mr-2" />
                  Processing...
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardBody className="text-center">
              <p className="text-2xl font-bold text-gray-900">{payrollRun.totalWorkers}</p>
              <p className="text-sm text-gray-600">Workers</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <p className="text-2xl font-bold text-gray-900">{formatUSDC(payrollRun.totalAmount)}</p>
              <p className="text-sm text-gray-600">Total Amount</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {payrollRun.payrollItems?.filter((item: any) => item.status === 'COMPLETED').length || 0}
              </p>
              <p className="text-sm text-gray-600">Completed</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {payrollRun.payrollItems?.filter((item: any) => item.status === 'FAILED').length || 0}
              </p>
              <p className="text-sm text-gray-600">Failed</p>
            </CardBody>
          </Card>
        </div>

        {/* Payroll Items */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Payroll Items</h3>
            <p className="text-sm text-gray-600">Individual worker payments in this run</p>
          </CardHeader>
          <CardBody>
            {!payrollRun.payrollItems || payrollRun.payrollItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No payroll items found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Worker
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Chain
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transaction
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payrollRun.payrollItems.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.worker?.name || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.worker?.email || 'No email'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono font-medium text-gray-900">
                            {formatUSDC(item.amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="info" size="sm">
                            {getChainDisplayName(item.chain as any)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getItemStatusIcon(item.status)}
                            <span className="text-sm text-gray-900">
                              {item.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.txHash ? (
                            <button
                              onClick={() => navigator.clipboard.writeText(item.txHash)}
                              className="font-mono text-circle-600 hover:text-circle-700"
                            >
                              {item.txHash.slice(0, 8)}...
                            </button>
                          ) : (
                            <span className="text-gray-400">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Execution Timeline */}
        {payrollRun.completedAt && (
          <Card className="mt-8">
            <CardHeader>
              <h3 className="text-lg font-medium text-gray-900">Timeline</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-circle-600 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Payroll Created</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(new Date(payrollRun.createdAt))}
                    </p>
                  </div>
                </div>
                
                {payrollRun.completedAt && (
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-success-600 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Payroll Completed</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(new Date(payrollRun.completedAt))}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
