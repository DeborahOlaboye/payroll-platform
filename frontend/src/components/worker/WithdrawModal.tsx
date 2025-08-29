import React, { useState } from 'react';
import { XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatUSDC, getChainDisplayName, SUPPORTED_CHAINS } from '@usdc-payroll/shared';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceChain: string;
  sourceBalance: string;
  onWithdraw: (targetChain: string, amount: string, useGasless: boolean) => Promise<void>;
}

export function WithdrawModal({ 
  isOpen, 
  onClose, 
  sourceChain, 
  sourceBalance, 
  onWithdraw 
}: WithdrawModalProps) {
  const [targetChain, setTargetChain] = useState('');
  const [amount, setAmount] = useState('');
  const [useGasless, setUseGasless] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxAmount = parseFloat(sourceBalance);
  const availableChains = SUPPORTED_CHAINS.filter(chain => chain.id !== sourceChain);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetChain || !amount || parseFloat(amount) <= 0) return;

    setIsSubmitting(true);
    try {
      await onWithdraw(targetChain, amount, useGasless);
      onClose();
      resetForm();
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTargetChain('');
    setAmount('');
    setUseGasless(true);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      resetForm();
    }
  };

  const setMaxAmount = () => {
    setAmount(sourceBalance);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <Card padding="none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Withdraw USDC</h3>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardBody>
              <div className="space-y-6">
                {/* Source Chain Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">From</h4>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="info">{getChainDisplayName(sourceChain as any)}</Badge>
                      <span className="text-sm text-gray-600">USDC</span>
                    </div>
                    <span className="font-mono font-medium">{formatUSDC(sourceBalance)}</span>
                  </div>
                </div>

                {/* Target Chain Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To Chain
                  </label>
                  <select
                    value={targetChain}
                    onChange={(e) => setTargetChain(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-circle-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select destination chain</option>
                    {availableChains.map((chain) => (
                      <option key={chain.id} value={chain.id}>
                        {chain.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (USDC)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      max={maxAmount}
                      step="0.01"
                      className="w-full px-3 py-2 pr-16 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-circle-500 focus:border-transparent font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={setMaxAmount}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-circle-600 hover:text-circle-700 font-medium"
                    >
                      MAX
                    </button>
                  </div>
                  {parseFloat(amount) > maxAmount && (
                    <p className="text-xs text-error-600 mt-1">
                      Amount exceeds available balance
                    </p>
                  )}
                </div>

                {/* Gas Options */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Gas Payment</h4>
                  
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      checked={useGasless}
                      onChange={() => setUseGasless(true)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">Gasless Transfer</span>
                        <Badge variant="success" size="sm">Recommended</Badge>
                      </div>
                      <p className="text-xs text-gray-600">
                        Gas fees sponsored by Circle Gas Station
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      checked={!useGasless}
                      onChange={() => setUseGasless(false)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">Pay Gas in USDC</span>
                        <Badge variant="info" size="sm">Paymaster</Badge>
                      </div>
                      <p className="text-xs text-gray-600">
                        Gas fees deducted from your USDC balance
                      </p>
                    </div>
                  </label>
                </div>

                {/* Transfer Preview */}
                {targetChain && amount && (
                  <div className="bg-circle-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-circle-800 mb-2">Transfer Summary</h4>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <Badge variant="info" size="sm">{getChainDisplayName(sourceChain as any)}</Badge>
                        <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                        <Badge variant="info" size="sm">{getChainDisplayName(targetChain as any)}</Badge>
                      </div>
                      <span className="font-mono font-medium">{formatUSDC(amount)}</span>
                    </div>
                    <p className="text-xs text-circle-600 mt-2">
                      {useGasless ? 'Gas fees: FREE (sponsored)' : 'Gas fees: Paid in USDC'}
                    </p>
                  </div>
                )}
              </div>
            </CardBody>

            <CardFooter>
              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!targetChain || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > maxAmount || isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Processing...
                    </>
                  ) : (
                    'Withdraw'
                  )}
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
