'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface ContractEvent {
  id: string;
  type: 'deposit' | 'borrow' | 'repay' | 'withdraw' | 'liquidation';
  user: string;
  amount?: string;
  timestamp: Date;
  transactionHash: string;
  contractAddress: string;
  healthFactor?: number;
  liquidator?: string;
}

interface UseContractEventsReturn {
  events: ContractEvent[];
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
}

export function useContractEvents(contractAddresses: string[]): UseContractEventsReturn {
  const [events, setEvents] = useState<ContractEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setError(null);
      
      // Mock events for now - in production, you'd fetch from Horizon
      const mockEvents: ContractEvent[] = [
        {
          id: 'mock-1',
          type: 'deposit',
          user: 'GABC...XYZ',
          amount: '100000000',
          timestamp: new Date(),
          transactionHash: 'mock-tx-1',
          contractAddress: contractAddresses[0] || '',
        },
        {
          id: 'mock-2',
          type: 'borrow',
          user: 'GDEF...XYZ',
          amount: '50000000',
          timestamp: new Date(Date.now() - 60000),
          transactionHash: 'mock-tx-2',
          contractAddress: contractAddresses[0] || '',
        },
      ];

      setEvents((prev) => {
        const combined = [...mockEvents, ...prev];
        return combined.slice(0, 50);
      });

      setIsConnected(true);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch events');
      setIsConnected(false);
    }
  }, [contractAddresses]);

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(fetchTransactions, 3000);
  }, [fetchTransactions]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const reconnect = useCallback(() => {
    setError(null);
    fetchTransactions();
    startPolling();
  }, [fetchTransactions, startPolling]);

  useEffect(() => {
    if (contractAddresses.length > 0) {
      fetchTransactions();
      startPolling();

      return () => {
        stopPolling();
      };
    }
  }, [contractAddresses, fetchTransactions, startPolling, stopPolling]);

  useEffect(() => {
    if (error && !retryTimeoutRef.current) {
      retryTimeoutRef.current = setTimeout(() => {
        console.log('Attempting to reconnect...');
        reconnect();
      }, 5000);
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [error, reconnect]);

  return {
    events,
    isConnected,
    error,
    reconnect,
  };
}
