import React from 'react';
import { WalletIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatUSDC, getChainDisplayName } from '@usdc-payroll/shared';

interface Balance {
  chain: string;
  balance: string;
  address: string;
}

interface BalanceCardProps {
  balances: Balance[];
  isLoading: boolean;
  onWithdraw: (chain: string, balance: string) => void;
}

export function BalanceCard({ balances, isLoading, onWithdraw }: BalanceCardProps) {
  const totalBalance = balances.reduce((sum, balance) => sum + parseFloat(balance.balance), 0);

  if (isLoading) {
    return (
      <Card>
        <CardBody>
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <WalletIcon className="w-6 h-6 text-circle-600" />
            <h3 className="text-lg font-medium text-gray-900">USDC Balances</h3>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">{formatUSDC(totalBalance)}</p>
            <p className="text-sm text-gray-600">Total Balance</p>
          </div>
        </div>
      </CardHeader>
      <CardBody>
        {balances.length === 0 ? (
          <div className="text-center py-8">
            <WalletIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No balances found</h4>
            <p className="text-gray-600">
              You don't have any USDC balances yet. Complete some work to receive payments!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {balances.map((balance) => (
              <div
                key={balance.chain}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-circle-100 rounded-full flex items-center justify-center">
                    <div className="w-5 h-5 bg-circle-600 rounded-full"></div>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">
                        {getChainDisplayName(balance.chain as any)}
                      </h4>
                      <Badge variant="info" size="sm">USDC</Badge>
                    </div>
                    <p className="text-sm text-gray-600 font-mono">
                      {balance.address.slice(0, 6)}...{balance.address.slice(-4)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="font-bold text-gray-900 font-mono">
                      {formatUSDC(balance.balance)}
                    </p>
                  </div>
                  
                  {parseFloat(balance.balance) > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onWithdraw(balance.chain, balance.balance)}
                    >
                      <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                      Withdraw
                    </Button>
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
