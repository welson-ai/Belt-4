'use client';

interface HealthFactorGaugeProps {
  healthFactor: number;
  size?: number;
  showLabel?: boolean;
  className?: string;
}

export default function HealthFactorGauge({ 
  healthFactor, 
  size = 120, 
  showLabel = true,
  className = '' 
}: HealthFactorGaugeProps) {
  // Normalize health factor to 0-200 scale
  const normalizedValue = Math.min(Math.max(healthFactor, 0), 200);
  
  // Calculate colors based on health factor
  const getColor = (hf: number) => {
    if (hf < 120) return '#ef4444'; // red
    if (hf < 150) return '#f59e0b'; // yellow
    return '#10b981'; // green
  };

  // Calculate the angle for the arc
  const calculateAngle = (value: number) => {
    // Map value (0-200) to angle (-90 to 90 degrees)
    return (value / 200) * 180 - 90;
  };

  const angle = calculateAngle(normalizedValue);
  const color = getColor(healthFactor);
  
  // Create arc path
  const createArcPath = (startAngle: number, endAngle: number, radius: number, centerX: number, centerY: number) => {
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;
    
    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);
    
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
  };

  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const centerX = size / 2;
  const centerY = size / 2;

  // Background arc (full semicircle)
  const backgroundPath = createArcPath(-90, 90, radius, centerX, centerY);
  
  // Value arc
  const valuePath = createArcPath(-90, angle, radius, centerX, centerY);

  const getStatusText = (hf: number) => {
    if (hf < 120) return 'At Risk';
    if (hf < 150) return 'Warning';
    return 'Safe';
  };

  const getStatusColor = (hf: number) => {
    if (hf < 120) return 'text-red-600';
    if (hf < 150) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background arc */}
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          <path
            d={backgroundPath}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </svg>

        {/* Value arc */}
        <svg
          width={size}
          height={size}
          className="absolute top-0 transform -rotate-90"
        >
          <path
            d={valuePath}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-2xl font-bold ${getStatusColor(healthFactor)}`}>
            {healthFactor.toFixed(0)}
          </div>
          {showLabel && (
            <div className="text-xs text-gray-500 mt-1">
              {getStatusText(healthFactor)}
            </div>
          )}
        </div>

        {/* Scale markers */}
        <svg
          width={size}
          height={size}
          className="absolute top-0"
        >
          {/* 0% marker */}
          <line
            x1={centerX - radius}
            y1={centerY}
            x2={centerX - radius + 8}
            y2={centerY}
            stroke="#6b7280"
            strokeWidth="2"
          />
          <text
              x={centerX - radius - 10}
              y={centerY + 4}
              fill="#6b7280"
              fontSize="10"
              textAnchor="end"
            >
              0
            </text>

          {/* 100% marker */}
          <line
            x1={centerX}
            y1={centerY - radius}
            x2={centerX}
            y2={centerY - radius + 8}
            stroke="#6b7280"
            strokeWidth="2"
          />
          <text
            x={centerX}
            y={centerY - radius - 4}
            fill="#6b7280"
            fontSize="10"
            textAnchor="middle"
          >
            100
          </text>

          {/* 200% marker */}
          <line
            x1={centerX + radius}
            y1={centerY}
            x2={centerX + radius - 8}
            y2={centerY}
            stroke="#6b7280"
            strokeWidth="2"
          />
          <text
              x={centerX + radius + 10}
              y={centerY + 4}
              fill="#6b7280"
              fontSize="10"
              textAnchor="start"
            >
              200
            </text>
        </svg>
      </div>

      {showLabel && (
        <div className="mt-2 text-center">
          <div className="text-sm font-medium text-gray-900">Health Factor</div>
          <div className="text-xs text-gray-500">
            {healthFactor < 120 && 'Position at risk of liquidation'}
            {healthFactor >= 120 && healthFactor < 150 && 'Monitor your position closely'}
            {healthFactor >= 150 && 'Position is healthy'}
          </div>
        </div>
      )}
    </div>
  );
}
