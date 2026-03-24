'use client';

import { useState, useEffect } from 'react';
import { TransactionStatus } from '@/lib/soroban';

interface TransactionToastProps {
  status: TransactionStatus;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

export default function TransactionToast({ 
  status, 
  onClose, 
  autoClose = true,
  duration = 5000 
}: TransactionToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (autoClose && status.status === 'success') {
      const interval = 50; // Update progress every 50ms
      const step = (interval / duration) * 100;
      
      const timer = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev - step;
          if (newProgress <= 0) {
            clearInterval(timer);
            handleClose();
            return 0;
          }
          return newProgress;
        });
      }, interval);

      return () => clearInterval(timer);
    }
  }, [status.status, autoClose, duration]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const getStatusIcon = () => {
    switch (status.status) {
      case 'pending':
        return (
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        );
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'pending':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'failed':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getStatusTitle = () => {
    switch (status.status) {
      case 'pending':
        return 'Transaction Pending';
      case 'success':
        return 'Transaction Successful';
      case 'failed':
        return 'Transaction Failed';
      default:
        return 'Transaction';
    }
  };

  const getStatusMessage = () => {
    switch (status.status) {
      case 'pending':
        return 'Your transaction is being processed on the Stellar network...';
      case 'success':
        return 'Your transaction has been confirmed and completed successfully.';
      case 'failed':
        return status.error || 'Your transaction failed to complete. Please try again.';
      default:
        return '';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full animate-slide-in">
      <div className={`border rounded-lg shadow-lg p-4 ${getStatusColor()}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <h4 className="font-semibold">{getStatusTitle()}</h4>
              {status.hash && (
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs opacity-75">Transaction:</span>
                  <code className="text-xs bg-white bg-opacity-20 px-1 py-0.5 rounded">
                    {status.hash.slice(0, 8)}...{status.hash.slice(-8)}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(status.hash!)}
                    className="text-xs hover:underline"
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <button
            onClick={handleClose}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Message */}
        <p className="text-sm opacity-90 mb-3">
          {getStatusMessage()}
        </p>

        {/* Progress bar (only for success) */}
        {status.status === 'success' && autoClose && (
          <div className="w-full bg-white bg-opacity-30 rounded-full h-1">
            <div 
              className="bg-white bg-opacity-60 h-1 rounded-full transition-all duration-50"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2 mt-3">
          {status.hash && status.status === 'success' && (
            <button
              onClick={() => window.open(`https://stellar.expert/explorer/testnet/tx/${status.hash}`, '_blank')}
              className="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 px-2 py-1 rounded transition-colors"
            >
              View on Explorer
            </button>
          )}
          
          {status.status === 'failed' && (
            <button
              onClick={handleClose}
              className="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 px-2 py-1 rounded transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

// Toast container for managing multiple toasts
interface ToastContainerProps {
  children: React.ReactNode;
}

export function ToastContainer({ children }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {children}
    </div>
  );
}

// Hook for managing toasts
export function useTransactionToast() {
  const [toasts, setToasts] = useState<Map<string, TransactionStatus>>(new Map());

  const showToast = (id: string, status: TransactionStatus) => {
    setToasts((prev) => new Map(prev).set(id, status));
  };

  const removeToast = (id: string) => {
    setToasts((prev) => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  };

  const ToastComponent = () => (
    <ToastContainer>
      {Array.from(toasts.entries()).map(([id, status]) => (
        <TransactionToast
          key={id}
          status={status}
          onClose={() => removeToast(id)}
        />
      ))}
    </ToastContainer>
  );

  return { showToast, removeToast, ToastComponent };
}
