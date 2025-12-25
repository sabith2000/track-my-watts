// client/src/pages/BillingCyclesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/api';
import { toast } from 'react-toastify';

const todayFormattedForInput = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Formatting helper for display (e.g., "25 Oct 2023")
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

function BillingCyclesPage() {
  const [billingCycles, setBillingCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showStartForm, setShowStartForm] = useState(false);
  const [newStartDate, setNewStartDate] = useState(todayFormattedForInput());
  const [newNotes, setNewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  
  const openDeleteConfirm = (cycle) => {
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


  if (loading) {
    return <div className="p-6 text-center"><p className="text-lg text-gray-600">Loading Billing Cycles...</p></div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Billing Cycles</h1>
        {!hasActiveCycle && (
          <button
            onClick={() => setShowStartForm(true)}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded shadow transition-colors"
          >
            + Start New Billing Cycle
          </button>
        )}
      </div>

      {error && <div className="p-3 mb-4 text-red-700 bg-red-100 rounded-md">Error: {error}</div>}

      {/* Start New Cycle Modal */}
      {showStartForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Start New Billing Cycle</h3>
            <form onSubmit={handleStartNewCycle} className="space-y-4">
              <div>
                <label htmlFor="newStartDate" className="block text-sm font-medium text-gray-700 mb-1">Start Date <span className="text-red-500">*</span></label>
                <input type="date" id="newStartDate" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 sm:text-sm" required
                />
              </div>
              <div>
                <label htmlFor="newNotes" className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea id="newNotes" rows="3" value={newNotes} onChange={(e) => setNewNotes(e.target.value)}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 sm:text-sm"
                ></textarea>
              </div>
              <div className="flex justify-end space-x-3 pt-3">
                <button type="button" onClick={() => setShowStartForm(false)} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md shadow-sm disabled:opacity-50">
                  {isSubmitting ? 'Starting...' : 'Start Cycle'}
                </button>
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
            <p className="text-gray-600 mb-1">Delete cycle starting <strong className="text-gray-900">{formatDate(cycleToDelete.startDate)}</strong>?</p>
            <p className="text-sm text-red-500 my-4">Action cannot be undone. Only empty cycles can be deleted.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={closeDeleteConfirm} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              <button onClick={handleConfirmDelete} disabled={isSubmitting} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md shadow-sm disabled:opacity-50">
                {isSubmitting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50">
                <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Billing Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Consumption</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(billingCycles) && billingCycles.length > 0 ? (
                billingCycles.map((cycle) => (
                    <tr key={cycle._id} className={`transition-colors ${cycle.status === 'active' ? 'bg-indigo-50 hover:bg-indigo-100' : 'hover:bg-slate-50'}`}>
                    {/* --- UPDATED: Merged Date Column --- */}
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                            {formatDate(cycle.startDate)} 
                            <span className="text-gray-400 mx-2">➔</span> 
                            {formatDate(cycle.endDate)}
                        </div>
                        {cycle.status === 'active' && (
                            <div className="text-xs text-indigo-600 font-medium mt-1">Currently Active</div>
                        )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${cycle.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {cycle.status}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {cycle.totalUnits !== undefined ? `${cycle.totalUnits} units` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {formatCurrency(cycle.totalCost)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate" title={cycle.notes}>
                        {cycle.notes || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button 
                            onClick={() => openDeleteConfirm(cycle)} 
                            className="text-red-600 hover:text-red-900 disabled:text-gray-300 disabled:cursor-not-allowed" 
                            disabled={cycle.status === 'active'} 
                            title={cycle.status === 'active' ? "Active cycles cannot be deleted" : "Delete this cycle"}
                        >
                            Delete
                        </button>
                    </td>
                    </tr>
                ))
                ) : (
                <tr>
                    <td colSpan="6" className="text-center py-12 text-gray-500">
                    <p className="text-lg mb-2">No billing cycles found.</p>
                    <p className="text-sm">Click the button above to start your first cycle.</p>
                    </td>
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