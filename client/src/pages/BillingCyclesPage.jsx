// client/src/pages/BillingCyclesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/api';
import { toast } from 'react-toastify';
import { exportToExcel, exportToPDF } from '../utils/exportHelper';
// --- IMPORT THE GLOBAL LOADER ---
import Loader from '../components/Loader';

// --- HELPERS ---
const todayFormattedForInput = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatDate = (dateString) => {
    if (!dateString) return 'Present';
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
};

const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '-';
    return `₹${amount.toFixed(2)}`;
};

// --- ICONS ---
const ChevronIcon = ({ isOpen }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
);

const PdfIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 mr-1.5">
        <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
    </svg>
);

const ExcelIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 mr-1.5">
        <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm5 5a.75.75 0 00-1.5 0v3.5h-3.5a.75.75 0 000 1.5h3.5v3.5a.75.75 0 001.5 0v-3.5h3.5a.75.75 0 000-1.5h-3.5V7z" clipRule="evenodd" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 mr-1">
        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
    </svg>
);

const LoaderIcon = () => (
    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// --- SUB-COMPONENT: HERO CARD (ACTIVE CYCLE) ---
const ActiveCycleCard = ({ cycle, onExport, loadingToken }) => {
    return (
        <div className="bg-white rounded-xl shadow-lg border border-indigo-100 overflow-hidden mb-8 transition-shadow hover:shadow-xl">
            {/* Header Gradient */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <h2 className="text-white font-bold text-lg tracking-wide">Current Active Cycle</h2>
                    </div>
                    <p className="text-slate-300 text-sm font-medium">Since {formatDate(cycle.startDate)}</p>
                </div>
                
                {/* Export Buttons */}
                <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                    <button 
                        onClick={(e) => onExport(e, cycle._id, 'pdf')} 
                        disabled={loadingToken !== null}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded shadow-sm transition-colors border border-rose-500 ${loadingToken === `${cycle._id}-pdf` ? 'opacity-70 cursor-wait' : ''}`}
                    >
                        {loadingToken === `${cycle._id}-pdf` ? <LoaderIcon /> : <PdfIcon />}
                        <span className="hidden lg:inline">Statement (PDF)</span>
                        <span className="lg:hidden">PDF</span>
                    </button>
                    <button 
                        onClick={(e) => onExport(e, cycle._id, 'excel')} 
                        disabled={loadingToken !== null}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded shadow-sm transition-colors border border-emerald-500 ${loadingToken === `${cycle._id}-excel` ? 'opacity-70 cursor-wait' : ''}`}
                    >
                         {loadingToken === `${cycle._id}-excel` ? <LoaderIcon /> : <ExcelIcon />}
                         <span className="hidden lg:inline">Worksheet (Excel)</span>
                         <span className="lg:hidden">Excel</span>
                    </button>
                </div>
            </div>

            {/* Big Stats */}
            <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-2 gap-8 border-b border-gray-100">
                <div className="flex flex-col">
                    <span className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Estimated Cost</span>
                    <span className="text-4xl font-extrabold text-slate-800">{formatCurrency(cycle.totalCost)}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Total Consumption</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold text-slate-800">{cycle.totalUnits}</span>
                        <span className="text-lg text-gray-500 font-medium">units</span>
                    </div>
                </div>
            </div>

            {/* Meter Breakdown Table (Responsive) */}
            <div className="px-6 py-5 bg-gray-50/80">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Live Meter Breakdown</h3>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 whitespace-nowrap">Meter Name</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Type</th>
                                    <th className="px-4 py-3 whitespace-nowrap text-right">Reading</th>
                                    <th className="px-4 py-3 whitespace-nowrap text-right">Cost</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {cycle.meterDetails && cycle.meterDetails.length > 0 ? (
                                    cycle.meterDetails.map((m, idx) => (
                                        <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{m.meterName}</td>
                                            <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{m.meterType}</td>
                                            <td className="px-4 py-3 text-right font-medium text-slate-700 whitespace-nowrap">{m.units} units</td>
                                            <td className="px-4 py-3 text-right font-bold text-indigo-600 whitespace-nowrap">{formatCurrency(m.cost)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="4" className="px-4 py-4 text-center text-gray-400 text-xs">No readings recorded yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: HISTORY ROW (REFINED GRID LAYOUT) ---
const HistoryRow = ({ cycle, onExport, onDelete, loadingToken }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="border-b border-gray-100 last:border-0">
            {/* Main Row: Desktop Grid / Mobile Stack */}
            <div 
                onClick={() => setExpanded(!expanded)} 
                className={`group grid grid-cols-1 sm:grid-cols-12 gap-4 items-center p-4 cursor-pointer transition-colors duration-200 ${expanded ? 'bg-indigo-50/40' : 'hover:bg-slate-50'}`}
            >
                {/* Column 1: Billing Period (Desktop: Span 4) */}
                <div className="sm:col-span-4">
                    <div className="flex items-center justify-between sm:justify-start gap-2">
                        <span className="text-sm font-bold text-slate-800">
                            {formatDate(cycle.startDate)} <span className="text-gray-400 mx-1">➔</span> {formatDate(cycle.endDate)}
                        </span>
                        {/* Mobile Chevron */}
                        <div className={`text-gray-400 sm:hidden transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
                             <ChevronIcon isOpen={false} /> 
                        </div>
                    </div>
                    
                    {/* MOBILE CLOSED VIEW FIX: Clean Pills */}
                    <div className="sm:hidden flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                           {cycle.totalUnits} units
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                           {formatCurrency(cycle.totalCost)}
                        </span>
                    </div>
                </div>

                {/* Desktop Columns (Hidden on Mobile) */}
                <div className="hidden sm:block sm:col-span-2 text-right text-sm font-medium text-slate-600">
                    {cycle.totalUnits} units
                </div>

                <div className="hidden sm:block sm:col-span-2 text-right text-sm font-bold text-slate-800">
                    {formatCurrency(cycle.totalCost)}
                </div>

                {/* Actions (RESPONSIVE FIX) */}
                <div className="hidden sm:flex sm:col-span-4 justify-end items-center gap-2">
                    {/* PDF Button: Icon only on tablet, Text on Large Screens */}
                    <button 
                        onClick={(e) => onExport(e, cycle._id, 'pdf')}
                        className="flex items-center justify-center h-8 px-2 lg:px-3 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded shadow-sm transition-colors"
                        disabled={loadingToken !== null}
                        title="Download PDF"
                    >
                         {loadingToken === `${cycle._id}-pdf` ? <LoaderIcon /> : <PdfIcon />} 
                         <span className="hidden lg:inline text-xs font-semibold ml-1.5">PDF</span>
                    </button>

                    {/* Excel Button: Icon only on tablet, Text on Large Screens */}
                    <button 
                        onClick={(e) => onExport(e, cycle._id, 'excel')}
                        className="flex items-center justify-center h-8 px-2 lg:px-3 bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50 rounded shadow-sm transition-colors"
                        disabled={loadingToken !== null}
                        title="Export Excel"
                    >
                         {loadingToken === `${cycle._id}-excel` ? <LoaderIcon /> : <ExcelIcon />}
                         <span className="hidden lg:inline text-xs font-semibold ml-1.5">Excel</span>
                    </button>

                    {/* Delete Button: Icon only on tablet, Text on Large Screens */}
                    <button 
                        onClick={(e) => onDelete(e, cycle)}
                        className="flex items-center justify-center h-8 px-2 lg:px-3 bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 rounded shadow-sm transition-all"
                        title="Delete Cycle"
                    >
                        <TrashIcon />
                        <span className="hidden lg:inline text-xs font-semibold ml-1.5">Delete</span>
                    </button>
                    
                    <div className={`ml-1 text-gray-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
                         <ChevronIcon isOpen={false} />
                    </div>
                </div>
            </div>

            {/* EXPANDABLE SECTION */}
            <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                    <div className="p-4 bg-gray-50/50 border-t border-indigo-100/50">
                        {/* Mobile-Only Actions Bar */}
                        <div className="flex sm:hidden gap-2 mb-4">
                            <button onClick={(e) => onExport(e, cycle._id, 'pdf')} className="flex-1 py-2 bg-white border border-rose-200 text-rose-600 text-xs font-bold rounded shadow-sm flex justify-center items-center gap-2">
                                <PdfIcon /> Statement
                            </button>
                            <button onClick={(e) => onExport(e, cycle._id, 'excel')} className="flex-1 py-2 bg-white border border-emerald-200 text-emerald-600 text-xs font-bold rounded shadow-sm flex justify-center items-center gap-2">
                                <ExcelIcon /> Excel
                            </button>
                            <button onClick={(e) => onDelete(e, cycle)} className="py-2 px-3 bg-white border border-red-200 text-red-500 rounded shadow-sm hover:bg-red-50">
                                <TrashIcon />
                            </button>
                        </div>

                        {/* Breakdown Table */}
                        <div className="bg-white rounded border border-gray-200 overflow-hidden">
                            <table className="min-w-full text-xs sm:text-sm">
                                <thead className="bg-slate-100 text-slate-500">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-semibold">Meter</th>
                                        <th className="px-4 py-2 text-left font-semibold">Type</th>
                                        <th className="px-4 py-2 text-right font-semibold">Usage</th>
                                        <th className="px-4 py-2 text-right font-semibold">Cost</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {cycle.meterDetails && cycle.meterDetails.map((m, idx) => (
                                        <tr key={idx}>
                                            <td className="px-4 py-2 font-medium text-slate-800">{m.meterName}</td>
                                            <td className="px-4 py-2 text-slate-500">{m.meterType}</td>
                                            <td className="px-4 py-2 text-right text-slate-600">{m.units} units</td>
                                            <td className="px-4 py-2 text-right font-bold text-indigo-600">{formatCurrency(m.cost)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {cycle.notes && (
                                <div className="p-3 bg-yellow-50 text-yellow-800 text-xs border-t border-yellow-100 italic">
                                    <span className="font-bold">Note:</span> {cycle.notes}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---
function BillingCyclesPage() {
  const [billingCycles, setBillingCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingToken, setLoadingToken] = useState(null);

  // Modal States
  const [showStartForm, setShowStartForm] = useState(false);
  const [newStartDate, setNewStartDate] = useState(todayFormattedForInput());
  const [newNotes, setNewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cycleToDelete, setCycleToDelete] = useState(null);

  const fetchBillingCycles = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const response = await apiClient.get('/billing-cycles');
      setBillingCycles(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError('Failed to load cycles');
      toast.error('Failed to fetch billing cycles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBillingCycles(); }, [fetchBillingCycles]);

  const activeCycle = billingCycles.find(c => c.status === 'active');
  const historyCycles = billingCycles.filter(c => c.status !== 'active');

  const handleExport = async (e, cycleId, type) => {
      e.stopPropagation();
      const token = `${cycleId}-${type}`;
      setLoadingToken(token);
      try {
          if (type === 'pdf') await exportToPDF(cycleId);
          else await exportToExcel(cycleId);
      } catch (err) {
          toast.error("Failed to generate report.");
      } finally {
          setLoadingToken(null);
      }
  };

  const handleStartNewCycle = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/billing-cycles/start', { startDate: new Date(newStartDate).toISOString(), notes: newNotes });
      toast.success("New cycle started!");
      setShowStartForm(false);
      setNewStartDate(todayFormattedForInput());
      setNewNotes('');
      fetchBillingCycles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start.');
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!cycleToDelete) return;
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/billing-cycles/${cycleToDelete._id}`);
      toast.success("Cycle deleted.");
      setCycleToDelete(null);
      fetchBillingCycles();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed.");
    } finally { setIsSubmitting(false); }
  };

  // --- FIX: USE GLOBAL LOADER HERE ---
  if (loading) return <Loader text="Loading Billing Cycles...." />;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-8">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Billing Cycles</h1>
            <p className="text-sm text-gray-500 mt-1">Manage electricity billing history & exports.</p>
        </div>
        
        {!activeCycle && (
            <button 
                onClick={() => setShowStartForm(true)} 
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all active:scale-95"
            >
                + Start New Cycle
            </button>
        )}
      </div>

      {error && <div className="p-3 bg-red-100 text-red-700 rounded-md">Error: {error}</div>}

      {/* 2. Active Cycle Hero */}
      {activeCycle ? (
          <ActiveCycleCard 
            cycle={activeCycle} 
            onExport={handleExport} 
            loadingToken={loadingToken} 
          />
      ) : (
        <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-8 text-center">
            <h3 className="text-lg font-medium text-slate-600">No Active Billing Cycle</h3>
            <p className="text-sm text-slate-500 mt-2 mb-4">Start a new cycle to begin tracking your bills.</p>
            <button onClick={() => setShowStartForm(true)} className="text-indigo-600 font-medium hover:underline">Start Now</button>
        </div>
      )}

      {/* 3. History Table */}
      {historyCycles.length > 0 && (
          <div className="animate-fade-in-up">
              <h3 className="text-lg font-bold text-slate-700 mb-4 pl-2 border-l-4 border-slate-400">Previous Cycles</h3>
              <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
                   {/* Table Header (Desktop Only) */}
                   <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <div className="col-span-4">Billing Period</div>
                        <div className="col-span-2 text-right">Consumption</div>
                        <div className="col-span-2 text-right">Bill Amount</div>
                        <div className="col-span-4 text-right">Actions</div>
                   </div>

                   <div className="divide-y divide-gray-100">
                        {historyCycles.map(cycle => (
                            <HistoryRow 
                                key={cycle._id} 
                                cycle={cycle} 
                                onExport={handleExport} 
                                onDelete={(e, c) => { e.stopPropagation(); setCycleToDelete(c); }}
                                loadingToken={loadingToken}
                            />
                        ))}
                   </div>
              </div>
          </div>
      )}

      {/* --- MODALS --- */}
      {showStartForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full animate-scale-in">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Start New Cycle</h3>
            <form onSubmit={handleStartNewCycle} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input type="date" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea rows="3" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowStartForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 shadow-md transition-all active:scale-95">Start Cycle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cycleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full animate-scale-in">
            <h3 className="text-lg font-bold text-red-600 mb-2">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete the cycle from <strong>{formatDate(cycleToDelete.startDate)}</strong>? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setCycleToDelete(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={isSubmitting} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 shadow-md transition-all active:scale-95">Delete Forever</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BillingCyclesPage;