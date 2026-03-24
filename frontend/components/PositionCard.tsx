'use client';

import { SorobanHelper } from '@/lib/soroban';

import { sorobanHelper } from '@/lib/soroban';
import HealthFactorGauge from './HealthFactorGauge';
import { UserPosition } from '@/lib/soroban';

interface PositionCardProps {
  position?: UserPosition;
  healthFactor?: number;
  isLoading?: boolean;
  className?: string;
  compact?: boolean;
}

export default function PositionCard({ 
  position, 
  healthFactor,
  isLoading = false,
  className = '',
  compact = false
}: PositionCardProps) {
  const deposited = Number(position?.deposited || 0);
  const borrowed = Number(position?.borrowed || 0);
  const netValue = deposited - borrowed;
  
  const formatXLM = (amount: number) => {
    return SorobanHelper.formatXLM(amount);
  };

  const getHealthStatusColor = (hf: number | undefined) => {
    if (!hf) return 'text-gray-500';
    if (hf < 120) return 'text-red-600';
    if (hf < 150) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getHealthStatusBg = (hf: number | undefined) => {
    if (!hf) return 'bg-gray-50';
    if (hf < 120) return 'bg-red-50';
    if (hf < 150) return 'bg-yellow-50';
    return 'bg-green-50';
  };

  const getHealthStatusBorder = (hf: number | undefined) => {
    if (!hf) return 'border-gray-200';
    if (hf < 120) return 'border-red-200';
    if (hf < 150) return 'border-yellow-200';
    return 'border-green-200';
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 shadow-sm ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`bg-white rounded-lg border ${getHealthStatusBorder(healthFactor)} p-4 shadow-sm ${className}`}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-sm text-gray-500">Your Position</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatXLM(netValue)} XLM
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-xs text-gray-500">Health Factor</div>
              <div className={`text-sm font-medium ${getHealthStatusColor(healthFactor)}`}>
                {healthFactor?.toFixed(0) || '--'}
              </div>
            </div>
            
            <HealthFactorGauge 
              healthFactor={healthFactor || 0} 
              size={60} 
              showLabel={false}
            />
          </div>
        </div>
        
        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Deposited:</span>
            <span className="ml-1 font-medium text-gray-900">{formatXLM(deposited)} XLM</span>
          </div>
          <div>
            <span className="text-gray-500">Borrowed:</span>
            <span className="ml-1 font-medium text-gray-900">{formatXLM(borrowed)} XLM</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border ${getHealthStatusBorder(healthFactor)} p-6 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Your Position</h3>
        {healthFactor && (
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${getHealthStatusBg(healthFactor)} ${getHealthStatusColor(healthFactor)}`}>
            {healthFactor < 120 ? 'At Risk' : healthFactor < 150 ? 'Warning' : 'Safe'}
          </div>
        )}
      </div>

      {/* Health Factor Gauge */}
      <div className="flex justify-center mb-6">
        <HealthFactorGauge 
          healthFactor={healthFactor || 0} 
          size={120}
        />
      </div>

      {/* Position Details */}
      <div className="space-y-4">
        {/* Net Value */}
        <div className={`p-4 rounded-lg ${getHealthStatusBg(healthFactor)}`}>
          <div className="text-sm text-gray-500 mb-1">Net Value</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatXLM(netValue)} XLM
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {netValue >= 0 ? 'Available to withdraw' : 'Insufficient collateral'}
          </div>
        </div>

        {/* Deposited and Borrowed */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-500">Deposited</span>
            </div>
            <div className="text-lg font-semibold text-gray-900">
              {formatXLM(deposited)}
            </div>
            <div className="text-xs text-gray-500">XLM</div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-500">Borrowed</span>
            </div>
            <div className="text-lg font-semibold text-gray-900">
              {formatXLM(borrowed)}
            </div>
            <div className="text-xs text-gray-500">XLM</div>
          </div>
        </div>

        {/* Collateral Ratio */}
        {deposited > 0 && (
          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Collateral Ratio</span>
              <span className={`text-sm font-medium ${getHealthStatusColor(healthFactor)}`}>
                {healthFactor ? `${healthFactor.toFixed(1)}%` : '--'}
              </span>
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    healthFactor && healthFactor < 120 ? 'bg-red-500' :
                    healthFactor && healthFactor < 150 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min((healthFactor || 0) / 2, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>150% (Min)</span>
                <span>200%</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t">
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 text-sm">
            Deposit
          </button>
          <button 
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
            disabled={borrowed === 0}
          >
            Repay
          </button>
        </div>
      </div>
    </div>
  );
}
