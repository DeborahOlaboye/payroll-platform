'use client';

import Link from 'next/link';
import { 
  CurrencyDollarIcon, 
  GlobeAltIcon, 
  BoltIcon,
  ArrowRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  const challenges = [
    {
      id: 1,
      title: 'Multichain USDC Payment System',
      description: 'Send USDC across Ethereum, Arbitrum, Base, Avalanche using CCTP v2',
      icon: GlobeAltIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      id: 2,
      title: 'Pay Gas Using USDC',
      description: 'Workers pay transaction fees directly with USDC via Circle Paymaster',
      icon: CurrencyDollarIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      id: 3,
      title: 'Gasless Experience',
      description: 'Fully sponsored transactions using Circle Gas Station',
      icon: BoltIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  const features = [
    'CSV payroll upload with validation',
    'Batch USDC payouts to multiple workers',
    'Cross-chain transfers with CCTP v2',
    'Embedded Circle Programmable Wallets',
    'Real-time payout status tracking',
    'Gasless worker transactions'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-circle-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img 
                  src="/logo.png" 
                  alt="Payflow Logo" 
                  className="w-24 h-24 object-contain"
                />
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-bold text-gray-900">
                  Payflow
                </h1>
                <p className="text-sm text-gray-500">USDC Payroll Platform</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={() => window.location.href = '/admin'}
              >
                Admin Dashboard
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => window.location.href = '/worker'}
              >
                Worker Portal
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            <span className="text-circle-600">Payflow:</span> Global Payroll with
            <span className="text-circle-600 block">USDC & Circle APIs</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Instantly pay gig workers worldwide with multichain USDC transfers, 
            gasless transactions, and USDC gas payments. Built for the Circle Developer Bounty.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/admin"
              className="btn-primary btn-lg inline-flex items-center"
            >
              Start Paying Workers
              <ArrowRightIcon className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href="/demo"
              className="btn-secondary btn-lg"
            >
              View Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Challenges Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Circle Developer Bounty Challenges
            </h2>
            <p className="text-lg text-gray-600">
              This platform addresses all 3 bounty challenges in one cohesive solution
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {challenges.map((challenge) => (
              <div key={challenge.id} className="card text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${challenge.bgColor} mb-6`}>
                  <challenge.icon className={`w-8 h-8 ${challenge.color}`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Challenge {challenge.id}: {challenge.title}
                </h3>
                <p className="text-gray-600">
                  {challenge.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Complete Payroll Solution
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                From CSV upload to cross-chain withdrawals, our platform handles 
                every aspect of global USDC payroll with Circle's cutting-edge APIs.
              </p>
              <ul className="space-y-4">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <CheckCircleIcon className="w-5 h-5 text-success-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Circle APIs Integration
              </h3>
              <div className="space-y-4">
                <div className="flex items-center p-4 bg-blue-50 rounded-lg">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                  <span className="font-medium">CCTP v2</span>
                  <span className="ml-auto text-sm text-gray-600">Cross-chain transfers</span>
                </div>
                <div className="flex items-center p-4 bg-green-50 rounded-lg">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="font-medium">Paymaster</span>
                  <span className="ml-auto text-sm text-gray-600">USDC gas payments</span>
                </div>
                <div className="flex items-center p-4 bg-purple-50 rounded-lg">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                  <span className="font-medium">Gas Station</span>
                  <span className="ml-auto text-sm text-gray-600">Sponsored transactions</span>
                </div>
                <div className="flex items-center p-4 bg-orange-50 rounded-lg">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                  <span className="font-medium">Programmable Wallets</span>
                  <span className="ml-auto text-sm text-gray-600">Embedded wallets</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-circle-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Global Payroll?
          </h2>
          <p className="text-xl text-circle-100 mb-8 max-w-2xl mx-auto">
            Experience the future of cross-border payments with USDC, 
            powered by Circle's developer APIs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/admin"
              className="bg-white text-circle-600 hover:bg-gray-50 btn btn-lg font-semibold"
            >
              Try Admin Dashboard
            </Link>
            <Link
              href="/worker"
              className="border-2 border-white text-white hover:bg-white hover:text-circle-600 btn btn-lg font-semibold"
            >
              Worker Experience
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <img 
                  src="/logo.png" 
                  alt="Payflow Logo" 
                  className="w-24 h-24 object-contain"
                />
                <span className="ml-3 text-lg font-semibold">Payflow</span>
              </div>
              <p className="text-gray-400">
                Built for Circle Developer Bounty Hackathon. 
                Demonstrating multichain USDC payments with gasless UX.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Features</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Multichain USDC Transfers</li>
                <li>Gasless Transactions</li>
                <li>USDC Gas Payments</li>
                <li>Embedded Wallets</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Circle APIs</h3>
              <ul className="space-y-2 text-gray-400">
                <li>CCTP v2</li>
                <li>Circle Paymaster</li>
                <li>Gas Station</li>
                <li>Programmable Wallets</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Circle Developer Bounty Hackathon. Built with Circle APIs.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
