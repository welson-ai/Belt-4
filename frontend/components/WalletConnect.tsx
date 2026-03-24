'use client';

import { useState, useEffect } from 'react';
import { freighterApi } from '@stellar/freighter-api';
import { sorobanHelper } from '@/lib/soroban';

interface WalletConnectProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
}

export default function WalletConnect({ onConnect, onDisconnect }: WalletConnectProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Check connection status on mount
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const { isConnected: connected, address: walletAddress } = await freighterApi.isConnected();
      
      if (connected && walletAddress) {
        setIsConnected(true);
        setAddress(walletAddress);
        onConnect?.(walletAddress);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const connect = async () => {
    setIsLoading(true);
    setError('');

    try {
      const { address: walletAddress } = await freighterApi.getPublicKey();
      
      if (walletAddress) {
        setIsConnected(true);
        setAddress(walletAddress);
        onConnect?.(walletAddress);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      setError(errorMessage);
      console.error('Connection error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = async () => {
    try {
      // Note: Freighter doesn't have a direct disconnect method
      // We'll just clear the local state
      setIsConnected(false);
      setAddress('');
      setError('');
      onDisconnect?.();
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center space-x-2 bg-white rounded-lg border border-gray-200 px-4 py-2 shadow-sm">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-sm font-medium text-gray-900">
          {truncateAddress(address)}
        </span>
        <button
          onClick={copyAddress}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Copy address"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        <button
          onClick={disconnect}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Disconnect"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-2">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      <button
        onClick={connect}
        disabled={isLoading}
        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium px-4 py-2 rounded-lg transition-colors duration-200 shadow-sm"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Connect Wallet</span>
          </>
        )}
      </button>
      
      <p className="text-xs text-gray-500 text-center">
        Connect your Freighter wallet to start using the protocol
      </p>
    </div>
  );
}
