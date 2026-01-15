// client/src/pages/BillingCyclesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/api';
import { toast } from 'react-toastify';
import { exportToExcel, exportToPDF } from '../utils/exportHelper';

// --- HELPER FUNCTIONS ---
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
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
);

const PdfIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
);

const ExcelIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-9 0V18.75" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

function BillingCyclesPage() {
  const [billingCycles, setBillingCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Row Expansion State
  const [expandedCycleId, setExpandedCycleId] = useState(null);
  
  // NEW: Export Loading State
  const [isGenerating, setIsGenerating] = useState(false);

  // New Cycle Form State
  const [showStartForm, setShowStartForm] = useState(false);
  const [newStartDate, setNewStartDate] = useState(todayFormattedForInput());
  const [newNotes, setNewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete State
  const [cycleToDelete, setCycleToDelete] = useState(null);

  const hasActiveCycle = billingCycles.some(cycle => cycle.status === 'active');

  const fetchBillingCycles = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const response = await apiClient.get('/billing-cycles');
      setBillingCycles(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch billing cycles.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingCycles();
  }, [fetchBillingCycles]);

  const toggleRow = (id) => {
      setExpandedCycleId(expandedCycleId === id ? null : id);
  };

  // --- Handlers ---
  const handleStartNewCycle = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/billing-cycles/start', {
        startDate: new Date(newStartDate).toISOString(),
        notes: newNotes,
      });
      toast.success("New billing cycle started successfully!");
      setShowStartForm(false);
      setNewStartDate(todayFormattedForInput());
      setNewNotes('');
      fetchBillingCycles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start new cycle.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const openDeleteConfirm = (e, cycle) => {
    e.stopPropagation(); 
    setCycleToDelete(cycle);
  };
  
  const closeDeleteConfirm = () => {
    setCycleToDelete(null);
  };
  
  const handleConfirmDelete = async () => {
    if (!cycleToDelete) return;
    setIsSubmitting(true);
    try {
      const response = await apiClient.delete(`/billing-cycles/${cycleToDelete._id}`);
      toast.success(response.data.message || "Billing cycle deleted successfully.");
      closeDeleteConfirm();
      fetchBillingCycles();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete billing cycle.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-6 text-center"><p className="text-lg text-gray-600">Loading Billing Cycles...</p></div>;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Billing Cycles</h1>
        {!hasActiveCycle && (
          <button onClick={() => setShowStartForm(true)} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded shadow transition-colors">
            + Start New Billing Cycle
          </button>
        )}
      </div>

      {error && <div className="p-3 mb-4 text-red-700 bg-red-100 rounded-md">Error: {error}</div>}

      {/* Start Modal */}
      {showStartForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Start New Billing Cycle</h3>
            <form onSubmit={handleStartNewCycle} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date <span className="text-red-500">*</span></label>
                <input type="date" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} className="mt-1 block w-full py-2 px-3 border rounded-md" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea rows="3" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} className="mt-1 block w-full py-2 px-3 border rounded-md"></textarea>
              </div>
              <div className="flex justify-end space-x-3 pt-3">
                <button type="button" onClick={() => setShowStartForm(false)} disabled={isSubmitting} className="px-4 py-2 border rounded-md">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-green-600 text-white rounded-md">{isSubmitting ? 'Starting...' : 'Start Cycle'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Modal */}
      {cycleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 mb-4">Delete cycle starting <strong>{formatDate(cycleToDelete.startDate)}</strong>?</p>
            <div className="flex justify-end space-x-3">
              <button onClick={closeDeleteConfirm} disabled={isSubmitting} className="px-4 py-2 border rounded-md">Cancel</button>
              <button onClick={handleConfirmDelete} disabled={isSubmitting} className="px-4 py-2 bg-red-600 text-white rounded-md">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Main Table Section --- */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Billing Period</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Consumption</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Bill</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(billingCycles) && billingCycles.length > 0 ? (
                billingCycles.map((cycle) => (
                    <React.Fragment key={cycle._id}>
                        {/* Parent Row */}
                        <tr onClick={() => toggleRow(cycle._id)} className={`cursor-pointer transition-colors ${expandedCycleId === cycle._id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-gray-900">
                                    {formatDate(cycle.startDate)} <span className="text-gray-400 mx-1">➔</span> {formatDate(cycle.endDate)}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${cycle.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {cycle.status.toUpperCase()}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                {cycle.totalUnits} units
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                                {formatCurrency(cycle.totalCost)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button className="text-indigo-600 hover:text-indigo-900 focus:outline-none p-1">
                                    <ChevronIcon isOpen={expandedCycleId === cycle._id} />
                                </button>
                            </td>
                        </tr>

                        {/* Child Row (Expanded Details) */}
                        {expandedCycleId === cycle._id && (
                            <tr className="bg-indigo-50/30 shadow-inner">
                                <td colSpan="5" className="px-4 sm:px-6 py-4">
                                    <div className="bg-white rounded-lg border border-indigo-100 p-5 shadow-sm">
                                        
                                        {/* Actions Bar */}
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                                            <h4 className="text-sm font-bold text-gray-800 border-b-2 border-indigo-500 pb-1">Detailed Breakdown</h4>
                                            
                                            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                                                {/* PDF Button */}
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); exportToPDF(cycle._id, setIsGenerating); }} 
                                                    disabled={isGenerating}
                                                    className={`flex items-center px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded shadow hover:bg-indigo-700 transition-all active:scale-95 ${isGenerating ? 'opacity-50 cursor-wait' : ''}`}
                                                >
                                                    <PdfIcon /> {isGenerating ? 'Generating...' : 'Download Statement'}
                                                </button>
                                                
                                                {/* Excel Button */}
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); exportToExcel(cycle._id, setIsGenerating); }} 
                                                    disabled={isGenerating}
                                                    className={`flex items-center px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded shadow hover:bg-emerald-700 transition-all active:scale-95 ${isGenerating ? 'opacity-50 cursor-wait' : ''}`}
                                                >
                                                    <ExcelIcon /> {isGenerating ? 'Generating...' : 'Export Worksheet'}
                                                </button>
                                                
                                                {cycle.status !== 'active' && (
                                                    <button 
                                                        onClick={(e) => openDeleteConfirm(e, cycle)} 
                                                        className="flex items-center px-4 py-2 bg-white border border-red-200 text-red-600 text-xs font-semibold rounded shadow-sm hover:bg-red-50 transition-all ml-auto sm:ml-2"
                                                    >
                                                        <TrashIcon /> Delete Cycle
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Nested Table */}
                                        <div className="overflow-hidden rounded-md border border-gray-200">
                                            <table className="min-w-full text-sm text-left text-gray-500">
                                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-2 font-semibold">Meter Name</th>
                                                        <th className="px-4 py-2 font-semibold">Type</th>
                                                        <th className="px-4 py-2 font-semibold">Consumption</th>
                                                        <th className="px-4 py-2 font-semibold text-right">Cost</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {cycle.meterDetails && cycle.meterDetails.length > 0 ? (
                                                        cycle.meterDetails.map((m, idx) => (
                                                            <tr key={idx} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                                                                <td className="px-4 py-2 font-medium text-gray-900">{m.meterName}</td>
                                                                <td className="px-4 py-2">{m.meterType}</td>
                                                                <td className="px-4 py-2">{m.units} units</td>
                                                                <td className="px-4 py-2 text-right">{formatCurrency(m.cost)}</td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr><td colSpan="4" className="px-4 py-3 text-center italic">No meter details available.</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                        
                                        {cycle.notes && (
                                            <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600 border border-gray-100 flex gap-2">
                                                <span className="font-semibold text-gray-800">Notes:</span> 
                                                <span>{cycle.notes}</span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )}
                    </React.Fragment>
                ))
                ) : (
                <tr>
                    <td colSpan="5" className="text-center py-12 text-gray-500">No billing cycles found.</td>
                </tr>
                )}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}

export default BillingCyclesPage;