'use client';

import { useState, useEffect } from 'react';
import { sorobanHelper, UserPosition, SorobanHelper } from '@/lib/soroban';
import WalletConnect from '@/components/WalletConnect';
import PositionCard from '@/components/PositionCard';
import HealthFactorGauge from '@/components/HealthFactorGauge';
import EventFeed from '@/components/EventFeed';
import { useTransactionToast } from '@/components/TransactionToast';

export default function Dashboard() {
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [userPosition, setUserPosition] = useState<UserPosition | undefined>();
  const [healthFactor, setHealthFactor] = useState<number | undefined>();
  const [totalDeposited, setTotalDeposited] = useState<number>(0);
  const [totalBorrowed, setTotalBorrowed] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast, ToastComponent } = useTransactionToast();

  // Contract addresses - in production, these would come from environment variables
  const contractAddresses = [
    process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS || '',
    process.env.NEXT_PUBLIC_LXLM_TOKEN_ADDRESS || '',
    process.env.NEXT_PUBLIC_LIQUIDATION_ADDRESS || '',
  ].filter(Boolean);

  useEffect(() => {
    if (isConnected && userAddress) {
      fetchUserData();
    }
  }, [isConnected, userAddress]);

  const fetchUserData = async () => {
    setIsLoading(true);
    try {
      // Fetch user position
      const positionResult = await sorobanHelper.getUserPosition();
      if (positionResult.success && positionResult.data) {
        setUserPosition(positionResult.data);
      }

      // Fetch health factor
      const healthResult = await sorobanHelper.getHealthFactor();
      if (healthResult.success && healthResult.data !== undefined) {
        setHealthFactor(healthResult.data);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch protocol-wide data
    const fetchProtocolData = async () => {
      try {
        const depositedResult = await sorobanHelper.getTotalDeposited();
        if (depositedResult.success && depositedResult.data !== undefined) {
          setTotalDeposited(depositedResult.data);
        }

        const borrowedResult = await sorobanHelper.getTotalBorrowed();
        if (borrowedResult.success && borrowedResult.data !== undefined) {
          setTotalBorrowed(borrowedResult.data);
        }
      } catch (error) {
        console.error('Error fetching protocol data:', error);
      }
    };

    fetchProtocolData();
  }, []);

  const handleConnect = (address: string) => {
    setUserAddress(address);
    setIsConnected(true);
  };

  const handleDisconnect = () => {
    setUserAddress('');
    setIsConnected(false);
    setUserPosition(undefined);
    setHealthFactor(undefined);
  };

  const formatXLM = (amount: number) => {
    return SorobanHelper.formatXLM(amount);
  };

  const deposited = Number(userPosition?.deposited || 0);
  const borrowed = Number(userPosition?.borrowed || 0);
  const netValue = deposited - borrowed;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Container */}
      <ToastComponent />

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Stellar Lend</h1>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              <a href="/" className="text-blue-600 font-medium">Dashboard</a>
              <a href="/deposit" className="text-gray-600 hover:text-gray-900">Deposit</a>
              <a href="/borrow" className="text-gray-600 hover:text-gray-900">Borrow</a>
              <a href="/repay" className="text-gray-600 hover:text-gray-900">Repay</a>
              <a href="/positions" className="text-gray-600 hover:text-gray-900">Positions</a>
            </nav>

            {/* Wallet Connect */}
            <WalletConnect onConnect={handleConnect} onDisconnect={handleDisconnect} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome State */}
        {!isConnected ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Stellar Lend</h2>
            <p className="text-gray-600 mb-6">Connect your wallet to start lending and borrowing on Stellar</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Protocol Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total TVL</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatXLM(totalDeposited)} XLM
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Borrowed</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatXLM(totalBorrowed)} XLM
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">APY</p>
                    <p className="text-2xl font-bold text-gray-900">5.0%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* User Position and Events */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Position Card */}
              <div className="lg:col-span-2">
                <PositionCard
                  position={userPosition}
                  healthFactor={healthFactor}
                  isLoading={isLoading}
                />
              </div>

              {/* Event Feed */}
              <div>
                <EventFeed 
                  contractAddresses={contractAddresses}
                  maxEvents={10}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <a
                href="/deposit"
                className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow"
              >
                <div className="w-8 h-8 bg-green-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8l-8-8-8 8" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900">Deposit</p>
              </a>

              <a
                href="/borrow"
                className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8l-8 8-8-8" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900">Borrow</p>
              </a>

              <a
                href="/repay"
                className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow"
              >
                <div className="w-8 h-8 bg-purple-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900">Repay</p>
              </a>

              <a
                href="/positions"
                className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow"
              >
                <div className="w-8 h-8 bg-orange-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900">Positions</p>
              </a>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="grid grid-cols-5 gap-1">
          <a href="/" className="flex flex-col items-center py-2 text-blue-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">Home</span>
          </a>
          <a href="/deposit" className="flex flex-col items-center py-2 text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8l-8-8-8 8" />
            </svg>
            <span className="text-xs mt-1">Deposit</span>
          </a>
          <a href="/borrow" className="flex flex-col items-center py-2 text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8l-8 8-8-8" />
            </svg>
            <span className="text-xs mt-1">Borrow</span>
          </a>
          <a href="/repay" className="flex flex-col items-center py-2 text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-xs mt-1">Repay</span>
          </a>
          <a href="/positions" className="flex flex-col items-center py-2 text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-xs mt-1">Positions</span>
          </a>
        </div>
      </nav>
    </div>
  );
}
