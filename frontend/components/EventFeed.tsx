'use client';

import { useContractEvents, ContractEvent } from '@/lib/useContractEvents';
import { useState } from 'react';

interface EventFeedProps {
  contractAddresses: string[];
  maxEvents?: number;
  className?: string;
}

export default function EventFeed({ 
  contractAddresses, 
  maxEvents = 20,
  className = ''
}: EventFeedProps) {
  const { events, isConnected, error, reconnect } = useContractEvents(contractAddresses);
  const [filter, setFilter] = useState<'all' | ContractEvent['type']>('all');

  const filteredEvents = events
    .filter(event => filter === 'all' || event.type === filter)
    .slice(0, maxEvents);

  const getEventIcon = (type: ContractEvent['type']) => {
    switch (type) {
      case 'deposit':
        return '🟢';
      case 'borrow':
        return '🟡';
      case 'repay':
        return '🔵';
      case 'withdraw':
        return '⚪';
      case 'liquidation':
        return '🔴';
      default:
        return '⚫';
    }
  };

  const getEventColor = (type: ContractEvent['type']) => {
    switch (type) {
      case 'deposit':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'borrow':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'repay':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'withdraw':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'liquidation':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatAmount = (amount?: string) => {
    if (!amount) return '';
    const num = Number(amount);
    return (num / 10_000_000).toFixed(4);
  };

  const getEventDescription = (event: ContractEvent) => {
    const user = formatAddress(event.user);
    const amount = event.amount ? formatAmount(event.amount) : '';

    switch (event.type) {
      case 'deposit':
        return `${user} deposited ${amount} XLM`;
      case 'borrow':
        return `${user} borrowed ${amount} XLM`;
      case 'repay':
        return `${user} repaid ${amount} XLM`;
      case 'withdraw':
        return `${user} withdrew ${amount} XLM`;
      case 'liquidation':
        const liquidator = event.liquidator ? formatAddress(event.liquidator) : 'Unknown';
        return `${liquidator} liquidated ${user}'s position${amount ? ` (${amount} XLM)` : ''}`;
      default:
        return `${user} performed ${event.type}`;
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) { // Less than 1 minute
      return 'just now';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const eventTypes: (ContractEvent['type'] | 'all')[] = ['all', 'deposit', 'borrow', 'repay', 'withdraw', 'liquidation'];

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Live Events</h3>
          
          <div className="flex items-center space-x-2">
            {/* Connection indicator */}
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`}></div>
              <span className="text-xs text-gray-500">
                {isConnected ? 'Connected' : 'Reconnecting...'}
              </span>
            </div>
            
            {/* Reconnect button */}
            {!isConnected && (
              <button
                onClick={reconnect}
                className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors"
              >
                Reconnect
              </button>
            )}
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-1">
          {eventTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                filter === type
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Events list */}
      <div className="max-h-96 overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-2">
              {isConnected ? (
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              ) : (
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {isConnected 
                ? 'No events yet. Transactions will appear here as they happen.'
                : 'Connecting to event stream...'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredEvents.map((event) => (
              <div key={event.id} className="p-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-3">
                  {/* Event icon */}
                  <div className="text-lg mt-0.5">
                    {getEventIcon(event.type)}
                  </div>

                  {/* Event content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      {getEventDescription(event)}
                    </p>
                    
                    <div className="flex items-center space-x-3 mt-1">
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(event.timestamp)}
                      </span>
                      
                      {event.transactionHash && (
                        <a
                          href={`https://stellar.expert/explorer/testnet/tx/${event.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          View
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Event type badge */}
                  <div className={`px-2 py-1 text-xs font-medium rounded-full border ${getEventColor(event.type)}`}>
                    {event.type}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {filteredEvents.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Showing {filteredEvents.length} of {events.length} events</span>
            {events.length > filteredEvents.length && (
              <button
                onClick={() => setFilter('all')}
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                View all
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
