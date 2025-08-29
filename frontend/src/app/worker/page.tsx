'use client';

import React, { useState } from 'react';
import { 
  UserIcon, 
  WalletIcon, 
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingSpinner';
import { BalanceCard } from '@/components/worker/BalanceCard';
import { TransactionHistory } from '@/components/worker/TransactionHistory';
import { WithdrawModal } from '@/components/worker/WithdrawModal';
import { useWorkerBalance, useWorkerTransactions } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { formatUSDC } from '@usdc-payroll/shared';
import toast from 'react-hot-toast';

// Mock worker ID - in a real app, this would come from authentication
const WORKER_ID = 'demo-worker-123';

export default function WorkerDashboard() {
  const [withdrawModal, setWithdrawModal] = useState<{
    isOpen: boolean;
    chain: string;
    balance: string;
  }>({ isOpen: false, chain: '', balance: '' });

  const { data: balanceData, error: balanceError, isLoading: balanceLoading, mutate: mutateBalance } = useWorkerBalance(WORKER_ID);
  const { data: transactionData, error: transactionError, isLoading: transactionLoading, mutate: mutateTransactions } = useWorkerTransactions(WORKER_ID);

  const handleWithdraw = (chain: string, balance: string) => {
    setWithdrawModal({ isOpen: true, chain, balance });
  };

  const handleWithdrawSubmit = async (targetChain: string, amount: string, useGasless: boolean) => {
    try {
      if (useGasless) {
        await api.createGaslessTransfer(WORKER_ID, {
          fromChain: withdrawModal.chain,
          toChain: targetChain,
          amount
        });
        toast.success('Gasless transfer initiated! Transaction will be processed shortly.');
      } else {
        await api.createUSDCGasTransfer(WORKER_ID, {
          fromChain: withdrawModal.chain,
          toChain: targetChain,
          amount
        });
        toast.success('USDC gas transfer initiated! Transaction will be processed shortly.');
      }
      
      // Refresh data
      mutateBalance();
      mutateTransactions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to initiate transfer');
      throw err; // Re-throw to keep modal open
    }
  };

  const refreshData = () => {
    mutateBalance();
    mutateTransactions();
    toast.success('Data refreshed!');
  };

  if (balanceError || transactionError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardBody className="text-center">
            <p className="text-error-600 mb-4">Failed to load dashboard</p>
            <Button onClick={refreshData}>Retry</Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  const balances = balanceData?.balances || [];
  const transactions = transactionData?.transactions || [];
  const totalBalance = balances.reduce((sum: number, balance: any) => sum + parseFloat(balance.balance), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-circle-100 rounded-full flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-circle-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Worker Dashboard</h1>
                <p className="text-gray-600">Manage your USDC earnings and transfers</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{formatUSDC(totalBalance)}</p>
                <p className="text-sm text-gray-600">Total Balance</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={refreshData}
              >
                <ArrowPathIcon className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardBody className="text-center">
              <WalletIcon className="w-8 h-8 text-circle-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{balances.length}</p>
              <p className="text-sm text-gray-600">Active Chains</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <ClockIcon className="w-8 h-8 text-success-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {transactions.filter((tx: any) => tx.type === 'payout').length}
              </p>
              <p className="text-sm text-gray-600">Payments Received</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <ArrowPathIcon className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {transactions.filter((tx: any) => tx.type === 'transfer').length}
              </p>
              <p className="text-sm text-gray-600">Transfers Made</p>
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Balance Card */}
          <div>
            <BalanceCard
              balances={balances}
              isLoading={balanceLoading}
              onWithdraw={handleWithdraw}
            />
          </div>

          {/* Transaction History */}
          <div>
            <TransactionHistory
              transactions={transactions}
              isLoading={transactionLoading}
            />
          </div>
        </div>

        {/* Features Info */}
        <div className="mt-12">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-medium text-gray-900">Platform Features</h3>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <WalletIcon className="w-6 h-6 text-success-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">Multichain USDC</h4>
                  <p className="text-sm text-gray-600">
                    Receive payments on Ethereum, Arbitrum, Base, Avalanche, and Polygon
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-circle-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ArrowPathIcon className="w-6 h-6 text-circle-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">Gasless Transfers</h4>
                  <p className="text-sm text-gray-600">
                    Move USDC between chains with zero gas fees using Circle Gas Station
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ClockIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">USDC Gas Payments</h4>
                  <p className="text-sm text-gray-600">
                    Pay transaction fees directly with USDC using Circle Paymaster
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Withdraw Modal */}
      <WithdrawModal
        isOpen={withdrawModal.isOpen}
        onClose={() => setWithdrawModal({ isOpen: false, chain: '', balance: '' })}
        sourceChain={withdrawModal.chain}
        sourceBalance={withdrawModal.balance}
        onWithdraw={handleWithdrawSubmit}
      />
    </div>
  );
}
