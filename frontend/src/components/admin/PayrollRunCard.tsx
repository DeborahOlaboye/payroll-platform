import React from 'react';
import { 
  PlayIcon, 
  EyeIcon, 
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatUSDC, formatDate } from '@usdc-payroll/shared';

interface PayrollRunCardProps {
  payrollRun: {
    id: string;
    status: string;
    totalAmount: string;
    totalWorkers: number;
    createdAt: string;
    completedAt?: string;
    _count?: {
      payrollItems: number;
    };
  };
  onExecute: (id: string) => void;
  onView: (id: string) => void;
}

export function PayrollRunCard({ payrollRun, onExecute, onView }: PayrollRunCardProps) {
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

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-success-500" />;
      case 'processing':
        return <ClockIcon className="w-5 h-5 text-warning-500" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-error-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const canExecute = payrollRun.status.toLowerCase() === 'pending';
  const isProcessing = payrollRun.status.toLowerCase() === 'processing';

  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            {getStatusIcon(payrollRun.status)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  Payroll Run #{payrollRun.id.slice(-8)}
                </h3>
                {getStatusBadge(payrollRun.status)}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Workers:</span>
                  <span className="ml-1">{payrollRun.totalWorkers}</span>
                </div>
                <div>
                  <span className="font-medium">Total:</span>
                  <span className="ml-1 font-mono">{formatUSDC(payrollRun.totalAmount)}</span>
                </div>
                <div>
                  <span className="font-medium">Created:</span>
                  <span className="ml-1">{formatDate(new Date(payrollRun.createdAt))}</span>
                </div>
                {payrollRun.completedAt && (
                  <div>
                    <span className="font-medium">Completed:</span>
                    <span className="ml-1">{formatDate(new Date(payrollRun.completedAt))}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onView(payrollRun.id)}
            >
              <EyeIcon className="w-4 h-4 mr-1" />
              View
            </Button>
            
            {canExecute && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onExecute(payrollRun.id)}
              >
                <PlayIcon className="w-4 h-4 mr-1" />
                Execute
              </Button>
            )}
            
            {isProcessing && (
              <div className="flex items-center text-sm text-warning-600">
                <div className="loading-spinner mr-2" />
                Processing...
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
