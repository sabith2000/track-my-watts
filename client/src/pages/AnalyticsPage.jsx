// client/src/pages/AnalyticsPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, ComposedChart, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { exportLifetimeAnalyticsToExcel } from '../utils/exportHelper';
import apiClient from '../services/api';
import notify from '../utils/toast';
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

    let peakCycle = cycleSummaryData[0];
    cycleSummaryData.forEach(cycle => {
        if (cycle.totalCost > peakCycle.totalCost) {
            peakCycle = cycle;
        }
    });

    let highestMeter = { name: 'N/A', total: 0 };
    let meterPieData = [];
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
        meterPieData = sortedMeters.map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));
    }

    return { totalConsumption, totalCost, avgCost, highestMeter, peakCycle, meterPieData };
  }, [cycleSummaryData, meterBreakdownData, meterNames]);


  const toPercent = (decimal) => `${(decimal * 100).toFixed(0)}%`;
  const formatCurrencyAxis = (value) => `₹${value}`;

  const handleExport = async () => {
    setLoading(true);
    try {
        await exportLifetimeAnalyticsToExcel(cycleSummaryData, meterBreakdownData, summaryStats);
        notify.success('Lifetime analytics report generated successfully.');
    } catch (err) {
        notify.error(err, 'Failed to export analytics.');
    } finally {
        setLoading(false);
    }
  };

  if (loading) {
    return <Loader text="Crunching the numbers..." />;
  }

  if (error) {
    return <div className="p-6 text-center"><p className="text-lg text-red-600">Error: {error}</p></div>;
  }
  
  return (
    <div className="p-4 sm:p-6 space-y-8 bg-slate-50 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Lifetime Analytics</h1>
        <button 
          onClick={handleExport}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-indigo-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          Export Full Report
        </button>
      </div>

      {/* --- Summary Cards --- */}
      {summaryStats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-center">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Consumed</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-800 mt-1">
                    {summaryStats.totalConsumption.toLocaleString(undefined, {maximumFractionDigits: 0})} <span className="text-sm text-slate-400 font-normal">units</span>
                </p>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-center">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Cost</p>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1">
                    ₹{summaryStats.totalCost.toLocaleString(undefined, {maximumFractionDigits: 0})}
                </p>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-center">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Avg Cycle Cost</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-800 mt-1">
                    ₹{summaryStats.avgCost.toLocaleString(undefined, {maximumFractionDigits: 0})}
                </p>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-center">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Most Active Meter</p>
                <p className="text-xl sm:text-2xl font-bold text-indigo-600 mt-1 truncate">
                    {summaryStats.highestMeter.name}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                    {summaryStats.highestMeter.total.toLocaleString(undefined, {maximumFractionDigits: 0})} units
                </p>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-center col-span-2 sm:col-span-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Peak Cycle</p>
                <p className="text-lg font-bold text-rose-500 mt-1 truncate">
                    {summaryStats.peakCycle.name}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                    ₹{summaryStats.peakCycle.totalCost.toLocaleString(undefined, {maximumFractionDigits: 0})}
                </p>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* --- Chart 1: Meter Consumption Pie --- */}
        <div className="bg-white shadow-md rounded-xl p-6 border border-slate-100 flex flex-col lg:col-span-1">
            <h2 className="text-lg font-semibold text-slate-700 mb-2">Overall Meter Share</h2>
            <div className="flex-grow flex items-center justify-center">
                {summaryStats && summaryStats.meterPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={summaryStats.meterPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={90}
                            paddingAngle={summaryStats.meterPieData.length > 1 ? 5 : 0}
                            dataKey="value"
                        >
                            {summaryStats.meterPieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value.toLocaleString()} units`} />
                        <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                </ResponsiveContainer>
                ) : (
                <div className="h-64 flex items-center justify-center text-slate-400">No data available</div>
                )}
            </div>
        </div>

        {/* --- Chart 2: Consumption vs Cost (Composed Chart) --- */}
        <div className="bg-white shadow-md rounded-xl p-6 border border-slate-100 flex flex-col lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-700 mb-6">Total Consumption & Cost Timeline</h2>
            <div className="flex-grow">
            {cycleSummaryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
                <ComposedChart
                data={cycleSummaryData}
                margin={{ top: 30, right: 20, left: 0, bottom: 20 }}
                >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748B'}} tickMargin={15} interval={0} angle={-35} textAnchor="end" height={60} />
                
                <YAxis yAxisId="left" tick={{fontSize: 12, fill: '#64748B'}} tickMargin={10} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={formatCurrencyAxis} tick={{fontSize: 12, fill: '#64748B'}} tickMargin={10} axisLine={false} tickLine={false} />
                
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                
                <Bar yAxisId="left" dataKey="totalConsumption" name="Consumption (Units)" fill="#3B82F6" fillOpacity={0.8} maxBarSize={40} radius={[6, 6, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="totalCost" name="Cost (₹)" stroke="#10B981" strokeWidth={3} dot={{ r: 5, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                </ComposedChart>
            </ResponsiveContainer>
            ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">No summary data available</div>
            )}
            </div>
        </div>

        {/* --- Chart 3: Meter Breakdown (100% Stacked) --- */}
        <div className="bg-white shadow-md rounded-xl p-6 border border-slate-100 flex flex-col lg:col-span-3">
            <h2 className="text-lg font-semibold text-slate-700 mb-6">Meter Consumption Breakdown</h2>
            <div className="flex-grow">
            {meterBreakdownData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
                <BarChart
                data={meterBreakdownData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                stackOffset="expand" 
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
                    maxBarSize={60}
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

      </div>
    </div>
  );
}

export default AnalyticsPage;