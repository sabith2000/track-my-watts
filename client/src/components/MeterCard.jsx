// client/src/components/MeterCard.jsx
import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

// Helper: Format Currency
const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return 'N/A';
  return `₹${amount.toFixed(2)}`;
};

// Helper: Plus Icon
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

// --- CENTRALIZED PROGRESS LOGIC ---
const calculateProgressStats = (current, target, dailyAvg) => {
  const safeTarget = target || 500; // Fallback
  const rawPercentage = (current / safeTarget) * 100;
  const visualPercentage = Math.min(rawPercentage, 100).toFixed(0); // Cap at 100% for CSS
  const remainingUnits = Math.max(0, safeTarget - current).toFixed(2);
  const overLimitUnits = Math.max(0, current - safeTarget).toFixed(2);
  const isOverLimit = rawPercentage > 100;

  // 1. Determine Color Zones
  let colorClass = 'bg-gradient-to-r from-blue-500 to-sky-400'; // Default (0-60%)
  
  if (isOverLimit) {
    colorClass = 'bg-red-600'; // Over Limit
  } else if (rawPercentage > 85) {
    colorClass = 'bg-orange-500'; // Danger (85-100%)
  } else if (rawPercentage > 60) {
    colorClass = 'bg-yellow-500'; // Warning (60-85%)
  }

  // 2. Pace Indicator Logic (THE FIX)
  let paceText = '';
  let paceColorClass = 'text-slate-500'; // Default text color

  if (isOverLimit) {
    paceText = 'Limit exceeded';
    paceColorClass = 'text-red-600 font-semibold';
  } else if (dailyAvg > 0) {
    const daysLeft = Math.floor(remainingUnits / dailyAvg);
    
    // Logic: If it takes longer than 60 days (standard bi-monthly cycle) to hit limit, you are safe.
    if (daysLeft > 60) {
        paceText = 'Pace: Safe';
        paceColorClass = 'text-green-600 font-medium';
    } else {
        paceText = `~${daysLeft} days to limit`;
        // Make it orange if getting tight (less than 10 days)
        if (daysLeft < 10) paceColorClass = 'text-orange-600 font-medium';
    }
  } else {
    paceText = '-';
  }

  return {
    rawPercentage,
    visualPercentage,
    remainingUnits,
    overLimitUnits,
    isOverLimit,
    colorClass,
    paceText,
    paceColorClass,
    safeTarget
  };
};

const MeterCard = ({ meter, onQuickAdd }) => {
  // Use the helper to get all stats
  const stats = calculateProgressStats(
    meter.currentCycleConsumption, 
    meter.consumptionTarget, 
    meter.averageDailyConsumption
  );

  return (
    <div className={`bg-white shadow-lg rounded-lg p-6 border-l-8 transition-all duration-300 hover:shadow-xl relative ${meter.isCurrentlyActiveGeneral ? 'border-green-500' : 'border-slate-300'}`}>
      
      {/* Quick Add Button */}
      <button 
        onClick={() => onQuickAdd(meter)}
        className="absolute top-4 right-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 p-2 rounded-full shadow-sm transition-colors"
        title="Quick Add Reading"
      >
        <PlusIcon />
      </button>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-4 pr-12">
        <div>
          <h3 className="text-xl font-bold text-indigo-700">{meter.meterName}</h3>
          <p className="text-sm text-gray-500">{meter.meterType}</p>
          {meter.isGeneralPurpose && (
            <span className={`mt-1 text-xs font-semibold py-1 px-3 rounded-full ${meter.isCurrentlyActiveGeneral ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
              {meter.isCurrentlyActiveGeneral ? 'ACTIVE' : 'INACTIVE'}
            </span>
          )}
        </div>
        <div className="text-left sm:text-right w-full sm:w-auto mt-2 sm:mt-0">
          <p className="text-sm text-slate-500">Current Consumption</p>
          <p className="text-2xl font-bold text-slate-800">{meter.currentCycleConsumption} <span className="text-lg text-slate-400">units</span></p>
          
          {/* Tier Badge & Cost */}
          <div className="flex items-center sm:justify-end gap-2 mt-1">
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
              {meter.currentTier?.rate ? `₹${meter.currentTier.rate}/unit` : 'Base'}
            </span>
            <p className="text-lg font-semibold text-green-600">{formatCurrency(meter.currentCycleCost)}</p>
          </div>
        </div>
      </div>

      {/* --- SMART PROGRESS BAR --- */}
      <div className="my-4">
        <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
          <span>Progress to {stats.safeTarget} Unit Limit</span>
          <span className={`${stats.isOverLimit ? 'text-red-600 font-bold' : ''}`}>
            {stats.rawPercentage.toFixed(0)}%
          </span>
        </div>
        
        {/* The Bar Track */}
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          {/* The Bar Fill (Dynamic Color & Width) */}
          <div 
            className={`h-4 rounded-full flex items-center justify-center text-white text-xs font-mono transition-all duration-500 ${stats.colorClass}`} 
            style={{ width: `${stats.visualPercentage}%` }}
          >
            {/* Show units inside bar only if enough space */}
            {!stats.isOverLimit && stats.visualPercentage > 15 ? `${meter.currentCycleConsumption}` : ''}
          </div>
        </div>

        {/* Status / Pace Indicator below bar */}
        <div className="mt-1 flex justify-between items-start text-xs">
           <div>
             {stats.isOverLimit ? (
                <span className="text-red-600 font-bold flex items-center">
                  ⚠ {stats.overLimitUnits} units over your limit
                </span>
             ) : (
                <span className="text-slate-400">
                  {stats.remainingUnits} units remaining
                </span>
             )}
           </div>
           {/* Dynamic Pace Text Color */}
           <div className={`${stats.paceColorClass} italic`}>
              {stats.paceText}
           </div>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t mt-4 items-center">
        <div>
          <p className="text-xs text-slate-500">Average Daily Use</p>
          <p className="text-md font-semibold text-slate-700">{meter.averageDailyConsumption} units</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Previous Cycle</p>
          <p className="text-md font-semibold text-slate-700">{meter.previousCycleConsumption} units</p>
        </div>
        
        {/* Sparkline Chart */}
        <div className="col-span-2 h-16 w-full">
          <p className="text-xs text-slate-500 mb-1">7-Day Trend</p>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={meter.sparklineData}>
              <defs>
                <linearGradient id={`gradient-${meter.meterId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={stats.isOverLimit ? "#ef4444" : "#818cf8"} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={stats.isOverLimit ? "#ef4444" : "#818cf8"} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={stats.isOverLimit ? "#dc2626" : "#6366f1"} 
                strokeWidth={2} 
                fillOpacity={1} 
                fill={`url(#gradient-${meter.meterId})`} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default MeterCard;