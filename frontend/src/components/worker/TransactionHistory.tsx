import React from 'react';
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingSpinner';
import { formatUSDC, formatDate, getChainDisplayName } from '@usdc-payroll/shared';

interface Transaction {
  id: string;
  type: 'payout' | 'transfer' | 'withdrawal';
  status: string;
  amount: string;
  chain: string;
  txHash?: string;
  createdAt: string;
  completedAt?: string;
  fromChain?: string;
  toChain?: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  isLoading: boolean;
}

export function TransactionHistory({ transactions, isLoading }: TransactionHistoryProps) {
  const getTransactionIcon = (type: string, status: string) => {
    if (status === 'pending' || status === 'processing') {
      return <ClockIcon className="w-5 h-5 text-warning-500" />;
    }
    if (status === 'failed') {
      return <XCircleIcon className="w-5 h-5 text-error-500" />;
    }
    
    switch (type) {
      case 'payout':
        return <ArrowDownIcon className="w-5 h-5 text-success-500" />;
      case 'withdrawal':
        return <ArrowUpIcon className="w-5 h-5 text-circle-500" />;
      case 'transfer':
        return <ArrowUpIcon className="w-5 h-5 text-purple-500" />;
      default:
        return <CheckCircleIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return <Badge variant="success" size="sm">Completed</Badge>;
      case 'pending':
      case 'processing':
        return <Badge variant="warning" size="sm">Processing</Badge>;
      case 'failed':
        return <Badge variant="error" size="sm">Failed</Badge>;
      default:
        return <Badge variant="gray" size="sm">{status}</Badge>;
    }
  };

  const getTransactionTitle = (tx: Transaction) => {
    switch (tx.type) {
      case 'payout':
        return 'Received Payment';
      case 'withdrawal':
        return 'Withdrawal';
      case 'transfer':
        return `Transfer ${tx.fromChain ? `from ${getChainDisplayName(tx.fromChain as any)}` : ''} ${tx.toChain ? `to ${getChainDisplayName(tx.toChain as any)}` : ''}`;
      default:
        return 'Transaction';
    }
  };

  const openTxHash = (txHash: string, chain: string) => {
    // This would open the transaction in the appropriate block explorer
    // For now, just copy to clipboard
    navigator.clipboard.writeText(txHash);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium text-gray-900">Transaction History</h3>
        </CardHeader>
        <CardBody>
          <LoadingState>Loading transactions...</LoadingState>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-medium text-gray-900">Transaction History</h3>
        <p className="text-sm text-gray-600">Your recent USDC transactions and transfers</p>
      </CardHeader>
      <CardBody>
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h4>
            <p className="text-gray-600">
              Your transaction history will appear here once you receive payments or make transfers.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {getTransactionIcon(tx.type, tx.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        {getTransactionTitle(tx)}
                      </h4>
                      {getStatusBadge(tx.status)}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-600">
                      <span>{formatDate(new Date(tx.createdAt))}</span>
                      <Badge variant="info" size="sm">
                        {getChainDisplayName(tx.chain as any)}
                      </Badge>
                      {tx.txHash && (
                        <button
                          onClick={() => openTxHash(tx.txHash!, tx.chain)}
                          className="text-circle-600 hover:text-circle-700 font-mono"
                        >
                          {tx.txHash.slice(0, 8)}...
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className={`font-bold font-mono ${
                    tx.type === 'payout' ? 'text-success-600' : 'text-gray-900'
                  }`}>
                    {tx.type === 'payout' ? '+' : '-'}{formatUSDC(tx.amount)}
                  </p>
                  {tx.completedAt && (
                    <p className="text-xs text-gray-500">
                      {formatDate(new Date(tx.completedAt))}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
