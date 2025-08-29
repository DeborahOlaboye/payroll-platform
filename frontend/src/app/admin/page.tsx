'use client';

import React, { useState } from 'react';
import { 
  PlusIcon, 
  DocumentTextIcon,
  UsersIcon,
  CurrencyDollarIcon 
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingSpinner';
import { CSVUpload } from '@/components/admin/CSVUpload';
import { PayrollRunCard } from '@/components/admin/PayrollRunCard';
import { usePayrollRuns } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { formatUSDC } from '@usdc-payroll/shared';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [showUpload, setShowUpload] = useState(false);
  const [page, setPage] = useState(1);
  const { data: payrollData, error, isLoading, mutate } = usePayrollRuns(page, 10);

  const handleUploadSuccess = async (uploadData: any) => {
    try {
      const response = await api.createPayrollRun({
        workers: uploadData.workers
      });
      
      toast.success('Payroll run created successfully!');
      setShowUpload(false);
      mutate(); // Refresh the list
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create payroll run');
    }
  };

  const handleExecutePayroll = async (payrollRunId: string) => {
    try {
      await api.executePayrollRun(payrollRunId);
      toast.success('Payroll execution started!');
      mutate(); // Refresh the list
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to execute payroll');
    }
  };

  const handleViewPayroll = (payrollRunId: string) => {
    window.open(`/admin/payroll/${payrollRunId}`, '_blank');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardBody className="text-center">
            <p className="text-error-600 mb-4">Failed to load dashboard</p>
            <Button onClick={() => mutate()}>Retry</Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  const stats = payrollData ? {
    totalRuns: payrollData.pagination.total,
    totalWorkers: payrollData.payrollRuns.reduce((sum: number, run: any) => sum + run.totalWorkers, 0),
    totalAmount: payrollData.payrollRuns.reduce((sum: number, run: any) => sum + parseFloat(run.totalAmount), 0),
    completedRuns: payrollData.payrollRuns.filter((run: any) => run.status === 'COMPLETED').length
  } : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Manage global USDC payroll runs</p>
            </div>
            <Button
              variant="primary"
              onClick={() => setShowUpload(true)}
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              New Payroll Run
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardBody className="text-center">
                <DocumentTextIcon className="w-8 h-8 text-circle-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stats.totalRuns}</p>
                <p className="text-sm text-gray-600">Total Runs</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center">
                <UsersIcon className="w-8 h-8 text-success-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stats.totalWorkers}</p>
                <p className="text-sm text-gray-600">Workers Paid</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center">
                <CurrencyDollarIcon className="w-8 h-8 text-warning-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{formatUSDC(stats.totalAmount)}</p>
                <p className="text-sm text-gray-600">Total Paid</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <div className="w-4 h-4 bg-purple-600 rounded-full"></div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.completedRuns}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Upload Modal */}
        {showUpload && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Create New Payroll Run</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUpload(false)}
                  >
                    ✕
                  </Button>
                </div>
                <CSVUpload onUploadSuccess={handleUploadSuccess} />
              </div>
            </div>
          </div>
        )}

        {/* Payroll Runs List */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Recent Payroll Runs</h2>
            {payrollData?.pagination && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>
                  Page {payrollData.pagination.page} of {payrollData.pagination.pages}
                </span>
                <div className="flex space-x-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= payrollData.pagination.pages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>

          {isLoading ? (
            <LoadingState>Loading payroll runs...</LoadingState>
          ) : payrollData?.payrollRuns?.length > 0 ? (
            <div className="space-y-4">
              {payrollData.payrollRuns.map((run: any) => (
                <PayrollRunCard
                  key={run.id}
                  payrollRun={run}
                  onExecute={handleExecutePayroll}
                  onView={handleViewPayroll}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardBody className="text-center py-12">
                <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No payroll runs yet</h3>
                <p className="text-gray-600 mb-4">
                  Create your first payroll run by uploading a CSV file with worker details.
                </p>
                <Button
                  variant="primary"
                  onClick={() => setShowUpload(true)}
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Create Payroll Run
                </Button>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
