'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { StellarSdk, xdr } from '@stellar/stellar-sdk';

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
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const parseContractEvents = useCallback((transaction: any): ContractEvent[] => {
    const parsedEvents: ContractEvent[] = [];

    try {
      // Check if transaction has operations with invoke_host_function
      if (transaction.operations) {
        for (const operation of transaction.operations) {
          if (operation.type === 'invoke_host_function' && operation.result?.events) {
            const events = operation.result.events;
            
            for (const event of events) {
              try {
                // Parse the XDR event
                const eventXdr = xdr.DiagnosticEvent.fromXDR(event.event, 'base64');
                const eventBody = eventXdr.event.body;
                
                if (eventBody.switch() === xdr.ContractEventBodyKind.contractEvents) {
                  const contractEvents = eventBody.contractEvents();
                  
                  for (const contractEvent of contractEvents) {
                    const contractId = contractEvent.contract().toString();
                    
                    // Check if this is one of our contracts
                    if (contractAddresses.includes(contractId)) {
                      const eventTopics = contractEvent.topic();
                      const eventData = contractEvent.data();
                      
                      // Parse event based on topics
                      const eventType = parseEventType(eventTopics);
                      const parsedEvent = parseEventData(eventType, eventTopics, eventData, transaction);
                      
                      if (parsedEvent) {
                        parsedEvents.push(parsedEvent);
                      }
                    }
                  }
                }
              } catch (parseError) {
                console.error('Error parsing individual event:', parseError);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error parsing transaction events:', error);
    }

    return parsedEvents;
  }, [contractAddresses]);

  const parseEventType = (topics: xdr.ScVal[]): string => {
    // Extract event type from topics (first topic is usually the event name)
    if (topics.length > 0) {
      const topic = topics[0];
      if (topic.switch() === xdr.ScValType.scvSymbol) {
        return topic.symbol().toString();
      }
    }
    return 'unknown';
  };

  const parseEventData = (
    eventType: string,
    topics: xdr.ScVal[],
    data: xdr.ScVal,
    transaction: any
  ): ContractEvent | null => {
    try {
      const timestamp = new Date(transaction.created_at);
      const transactionHash = transaction.hash;
      
      // Extract user address from topics or data
      let user = '';
      let amount = '';
      let liquidator = '';
      let healthFactor = undefined;

      // Parse based on event type
      switch (eventType) {
        case 'deposit':
        case 'borrow':
        case 'repay':
        case 'withdraw':
          // User is usually the first topic after event name
          if (topics.length > 1) {
            const userTopic = topics[1];
            if (userTopic.switch() === xdr.ScValType.scvAddress) {
              user = userTopic.address().toString();
            }
          }
          
          // Amount is usually in the data
          if (data.switch() === xdr.ScValType.scvI64) {
            amount = data.i64().toString();
          }
          break;

        case 'liquidation':
          // For liquidation, we might have both liquidator and borrower
          if (topics.length > 1) {
            const liquidatorTopic = topics[1];
            if (liquidatorTopic.switch() === xdr.ScValType.scvAddress) {
              liquidator = liquidatorTopic.address().toString();
            }
          }
          if (topics.length > 2) {
            const borrowerTopic = topics[2];
            if (borrowerTopic.switch() === xdr.ScValType.scvAddress) {
              user = borrowerTopic.address().toString();
            }
          }
          break;

        default:
          return null;
      }

      return {
        id: `${transactionHash}-${eventType}`,
        type: eventType as ContractEvent['type'],
        user,
        amount: amount || undefined,
        timestamp,
        transactionHash,
        contractAddress: '', // Will be filled by the caller
        healthFactor,
        liquidator: liquidator || undefined,
      };
    } catch (error) {
      console.error('Error parsing event data:', error);
      return null;
    }
  };

  const fetchTransactions = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch transactions for all contract addresses
      const allTransactions: any[] = [];
      
      for (const contractAddress of contractAddresses) {
        const response = await fetch(
          `https://horizon-testnet.stellar.org/accounts/${contractAddress}/transactions?limit=10&order=desc`
        );
        
        if (response.ok) {
          const data = await response.json();
          allTransactions.push(...data._embedded.records);
        }
      }

      // Parse events from transactions
      const newEvents: ContractEvent[] = [];
      
      for (const transaction of allTransactions) {
        const parsedEvents = parseContractEvents(transaction);
        newEvents.push(...parsedEvents);
      }

      // Sort by timestamp and update state
      newEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setEvents((prev) => {
        const combined = [...newEvents, ...prev];
        // Remove duplicates and keep only latest 50 events
        const unique = combined.filter((event, index, self) => 
          index === self.findIndex((e) => e.id === event.id)
        );
        return unique.slice(0, 50);
      });

      setIsConnected(true);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch events');
      setIsConnected(false);
    }
  }, [contractAddresses, parseContractEvents]);

  const startPolling = useCallback(() => {
    // Clear existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Start polling every 3 seconds
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
      // Initial fetch
      fetchTransactions();
      
      // Start polling
      startPolling();

      return () => {
        stopPolling();
      };
    }
  }, [contractAddresses, fetchTransactions, startPolling, stopPolling]);

  // Auto-reconnect on error
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
