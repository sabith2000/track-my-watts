// client/src/pages/AnalyticsPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, ComposedChart, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import apiClient from '../services/api';
import { toast } from 'react-toastify';
import Loader from '../components/Loader'; // --- NEW IMPORT ---

// ... (Keep COLORS and CustomBreakdownTooltip) ...
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const CustomBreakdownTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-md text-sm">
        <p className="font-bold text-slate-700 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
            <span className="text-slate-600">{entry.name}:</span>
            <span className="font-semibold">
              {entry.value.toFixed(0)} units 
              <span className="text-slate-400 ml-1 text-xs">
                ({(entry.value / payload.reduce((acc, p) => acc + p.value, 0) * 100).toFixed(0)}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function AnalyticsPage() {
  const [cycleSummaryData, setCycleSummaryData] = useState([]);
  const [meterBreakdownData, setMeterBreakdownData] = useState([]);
  const [meterNames, setMeterNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [summaryRes, breakdownRes] = await Promise.all([
        apiClient.get('/analytics/cycle-summary'),
        apiClient.get('/analytics/meter-breakdown')
      ]);

      setCycleSummaryData(Array.isArray(summaryRes.data) ? summaryRes.data : []);
      
      const breakdownData = Array.isArray(breakdownRes.data) ? breakdownRes.data : [];
      setMeterBreakdownData(breakdownData);

      if (breakdownData.length > 0) {
        const allKeys = breakdownData.reduce((keys, item) => {
          Object.keys(item).forEach(key => {
            if (key !== 'name') keys.add(key);
          });
          return keys;
        }, new Set());
        setMeterNames(Array.from(allKeys));
      }

    } catch (err) {
      console.error("Analytics Error:", err);
      if (err.response?.status !== 404) {
          setError('Failed to fetch analytics data.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // --- Calculate Summary Statistics ---
  const summaryStats = useMemo(() => {
    if (!cycleSummaryData.length) return null;

    const totalConsumption = cycleSummaryData.reduce((acc, curr) => acc + curr.totalConsumption, 0);
    const totalCost = cycleSummaryData.reduce((acc, curr) => acc + curr.totalCost, 0);
    const avgCost = totalCost / cycleSummaryData.length;

    // Find most active meter
    let highestMeter = { name: 'N/A', total: 0 };
    if (meterBreakdownData.length > 0 && meterNames.length > 0) {
        const meterTotals = {};
        meterBreakdownData.forEach(cycle => {
            meterNames.forEach(name => {
                meterTotals[name] = (meterTotals[name] || 0) + (cycle[name] || 0);
            });
        });
        const sortedMeters = Object.entries(meterTotals).sort((a, b) => b[1] - a[1]);
        if (sortedMeters.length > 0) {
            highestMeter = { name: sortedMeters[0][0], total: sortedMeters[0][1] };
        }
    }

    return { totalConsumption, avgCost, highestMeter };
  }, [cycleSummaryData, meterBreakdownData, meterNames]);


  const toPercent = (decimal, fixed = 0) => `${(decimal * 100).toFixed(fixed)}%`;
  const formatCurrencyAxis = (value) => `₹${value}`;

  if (loading) {
    // --- UPDATED LOADING ---
    return <Loader text="Crunching the numbers..." />;
  }

  if (error) {
    return <div className="p-6 text-center"><p className="text-lg text-red-600">Error: {error}</p></div>;
  }
  
  return (
    <div className="p-4 sm:p-6 space-y-8 bg-slate-50 min-h-screen">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Analytics Dashboard</h1>

      {/* --- Summary Cards --- */}
      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Consumption (All Time)</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">
                    {summaryStats.totalConsumption.toLocaleString()} <span className="text-lg text-slate-400 font-normal">Units</span>
                </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Average Cycle Cost</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">
                    ₹{summaryStats.avgCost.toFixed(0).toLocaleString()}
                </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Most Active Meter</p>
                <p className="text-2xl font-bold text-indigo-600 mt-2 truncate">
                    {summaryStats.highestMeter.name}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                    {summaryStats.highestMeter.total.toFixed(0)} units total
                </p>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* --- Chart 1: Meter Breakdown (100% Stacked) --- */}
        <div className="bg-white shadow-md rounded-xl p-6 border border-slate-100 flex flex-col">
            <h2 className="text-lg font-semibold text-slate-700 mb-6">Meter Consumption Breakdown</h2>
            <div className="flex-grow">
            {meterBreakdownData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
                <BarChart
                data={meterBreakdownData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                stackOffset="expand" // This makes it a 100% stacked chart
                >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 12}} interval={0} angle={-45} textAnchor="end" height={70} />
                <YAxis tickFormatter={toPercent} tick={{fontSize: 12}} />
                <Tooltip content={<CustomBreakdownTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                
                {meterNames.map((meterName, index) => (
                    <Bar 
                    key={meterName} 
                    dataKey={meterName} 
                    stackId="a" 
                    fill={COLORS[index % COLORS.length]} 
                    />
                ))}
                </BarChart>
            </ResponsiveContainer>
            ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">No meter data available</div>
            )}
            </div>
        </div>

        {/* --- Chart 2: Consumption vs Cost (Composed Chart) --- */}
        <div className="bg-white shadow-md rounded-xl p-6 border border-slate-100 flex flex-col">
            <h2 className="text-lg font-semibold text-slate-700 mb-6">Total Consumption & Cost</h2>
            <div className="flex-grow">
            {cycleSummaryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
                <ComposedChart
                data={cycleSummaryData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 12}} interval={0} angle={-45} textAnchor="end" height={70} />
                
                {/* Left Y-Axis: Units */}
                <YAxis yAxisId="left" label={{ value: 'Units', angle: -90, position: 'insideLeft' }} />
                
                {/* Right Y-Axis: Cost */}
                <YAxis yAxisId="right" orientation="right" tickFormatter={formatCurrencyAxis} />
                
                <Tooltip />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                
                <Bar yAxisId="left" dataKey="totalConsumption" name="Consumption (Units)" fill="#3B82F6" barSize={40} radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="totalCost" name="Cost (₹)" stroke="#10B981" strokeWidth={3} dot={{r: 4}} />
                </ComposedChart>
            </ResponsiveContainer>
            ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">No summary data available</div>
            )}
            </div>
        </div>

      </div>
    </div>
  );
}

export default AnalyticsPage;