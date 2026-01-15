// client/src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/api';
import { toast } from 'react-toastify';
import AddReadingForm from '../components/AddReadingForm'; 
import MeterCard from '../components/MeterCard'; // --- NEW IMPORT ---

// Helper functions
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
};

const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return 'N/A';
  return `₹${amount.toFixed(2)}`;
};

const todayFormattedForInput = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Icons
const BillIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.75A.75.75 0 013 4.5h.75m0 0h.75A.75.75 0 015.25 6v.75m0 0v-.75A.75.75 0 015.25 4.5h-.75m-1.5 0v.75A.75.75 0 013 6h-.75m0 0h.75A.75.75 0 013.75 6v.75m0 0v-.75A.75.75 0 013.75 4.5h.75m9 13.5h3.375c.621 0 1.125-.504 1.125-1.125V9.11c0-.621-.504-1.125-1.125-1.125H9.75M12 15.75V9.113m0 0a3.001 3.001 0 00-3 0m3 0a3.001 3.001 0 01-3 0m0 0A3.001 3.001 0 009 9.113m0 0a3.001 3.001 0 013 0m0 0V3m6.12 3.03l.001.001M12 18.75M12 6.75h.008v.008H12V6.75z" /></svg>);
const ZapIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>);
const CalendarIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18M-4.5 12h22.5" /></svg>);

function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Close Cycle Modal State
  const [showCloseCycleForm, setShowCloseCycleForm] = useState(false);
  const [governmentCollectionDate, setGovernmentCollectionDate] = useState(todayFormattedForInput());
  const [notesForClosedCycle, setNotesForClosedCycle] = useState('');
  const [notesForNewCycle, setNotesForNewCycle] = useState('');
  const [isClosingCycle, setIsClosingCycle] = useState(false);

  // Add Reading Modal State
  const [showAddReadingModal, setShowAddReadingModal] = useState(false);
  const [selectedMeterForQuickAdd, setSelectedMeterForQuickAdd] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/dashboard/summary');
      setDashboardData(response.data);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      const errorMessage = err.response?.data?.message || 'Failed to fetch dashboard summary.';
      setError(errorMessage);
      toast.error(errorMessage);
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle opening Quick Add Modal
  const openQuickAdd = (meter) => {
      setSelectedMeterForQuickAdd(meter);
      setShowAddReadingModal(true);
  };

  // Callback when reading is added successfully
  const handleReadingAdded = () => {
      setShowAddReadingModal(false);
      setSelectedMeterForQuickAdd(null);
      fetchDashboardData(); // Refresh dashboard to show new numbers
  };

  const handleCloseCycleSubmit = async (e) => {
    e.preventDefault();
    setIsClosingCycle(true);

    if (!governmentCollectionDate) {
      toast.warn("Government Collection Date is required.");
      setIsClosingCycle(false);
      return;
    }
    const collectionDateObj = new Date(governmentCollectionDate);
    const currentDateObj = new Date(todayFormattedForInput());

    if (collectionDateObj > currentDateObj) {
      toast.warn("Government Collection Date cannot be in the future.");
      setIsClosingCycle(false);
      return;
    }
    if (dashboardData?.currentBillingCycle?.startDate && collectionDateObj < new Date(dashboardData.currentBillingCycle.startDate)) {
      toast.warn("Collection Date cannot be before the current cycle's start date.");
      setIsClosingCycle(false);
      return;
    }

    try {
      const payload = {
        governmentCollectionDate: new Date(governmentCollectionDate).toISOString(),
        notesForClosedCycle,
        notesForNewCycle
      };
      const response = await apiClient.post('/billing-cycles/close-current', payload);
      toast.success(response.data.message || 'Billing cycle closed and new one started successfully!');
      setShowCloseCycleForm(false);
      setGovernmentCollectionDate(todayFormattedForInput());
      setNotesForClosedCycle('');
      setNotesForNewCycle('');
      fetchDashboardData();
    } catch (err) {
      console.error("Error closing billing cycle:", err);
      toast.error(err.response?.data?.message || 'Failed to close billing cycle.');
    } finally {
      setIsClosingCycle(false);
    }
  };

  if (loading && !dashboardData) {
    return (<div className="p-6 text-center"><p className="text-lg text-gray-600">Loading dashboard data...</p></div>);
  }
  if (error && !dashboardData) {
    return (<div className="p-6 text-center"><p className="text-lg text-red-600">Initial Load Error: {error}</p></div>);
  }
  if (!dashboardData && !loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-lg text-gray-600">No dashboard data available.</p>
        <button onClick={fetchDashboardData} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Try Reloading Data</button>
      </div>
    );
  }

  const totalCurrentConsumption = dashboardData?.meterSummaries ?
    Array.isArray(dashboardData.meterSummaries) ?
    dashboardData.meterSummaries.reduce((acc, meter) => acc + meter.currentCycleConsumption, 0) : 0
    : 0;

  // Prepare list of meters for AddReadingForm (formatted for dropdown if needed)
  const availableMetersForForm = dashboardData.meterSummaries.map(m => ({ _id: m.meterId, name: m.meterName, meterType: m.meterType }));

  return (
    <div className="p-4 sm:p-6 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-sm sm:text-base text-gray-500">
                Current Cycle: {formatDate(dashboardData?.currentBillingCycle?.startDate)} - Present
            </p>
        </div>
        {dashboardData?.currentBillingCycle?.status === 'active' && (
          <button
            onClick={() => { setShowCloseCycleForm(true); }}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded shadow whitespace-nowrap transition-colors duration-200"
          >
            Close Current Billing Cycle
          </button>
        )}
      </div>
      
      {/* Quick Add Reading Modal */}
      {showAddReadingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm px-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-700">Quick Add Reading</h3>
                    <button onClick={() => setShowAddReadingModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
                </div>
                <div className="p-4">
                    <AddReadingForm 
                        onReadingAdded={handleReadingAdded}
                        availableMeters={availableMetersForForm}
                        initialMeterId={selectedMeterForQuickAdd?.meterId}
                        isModal={true}
                        onCancel={() => setShowAddReadingModal(false)}
                    />
                </div>
            </div>
        </div>
      )}

      {/* Close Cycle Modal */}
      {showCloseCycleForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full mx-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-700 mb-4">Close Current Billing Cycle</h2>
            <form onSubmit={handleCloseCycleSubmit} className="space-y-4">
              <div>
                <label htmlFor="governmentCollectionDate" className="block text-sm font-medium text-gray-700 mb-1">Government Collection Date <span className="text-red-500">*</span></label>
                <input type="date" id="governmentCollectionDate" value={governmentCollectionDate} max={todayFormattedForInput()} onChange={(e) => setGovernmentCollectionDate(e.target.value)}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm" required />
              </div>
              <div>
                <label htmlFor="notesForClosedCycle" className="block text-sm font-medium text-gray-700 mb-1">Notes for Closed Cycle (Optional)</label>
                <textarea id="notesForClosedCycle" rows="2" value={notesForClosedCycle} onChange={(e) => setNotesForClosedCycle(e.target.value)}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm" ></textarea>
              </div>
              <div>
                <label htmlFor="notesForNewCycle" className="block text-sm font-medium text-gray-700 mb-1">Notes for New Cycle (Optional)</label>
                <textarea id="notesForNewCycle" rows="2" value={notesForNewCycle} onChange={(e) => setNotesForNewCycle(e.target.value)}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm" ></textarea>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-3">
                <button type="button" onClick={() => setShowCloseCycleForm(false)} className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isClosingCycle} className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"> {isClosingCycle ? 'Processing...' : 'Confirm & Close'} </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white shadow-lg rounded-lg p-6 flex items-center gap-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="bg-sky-100 text-sky-600 p-4 rounded-full flex-shrink-0"><BillIcon /></div>
            <div>
                <h3 className="text-base font-semibold text-slate-500 uppercase tracking-wider">Estimated Bill</h3>
                <p className="text-3xl font-bold text-slate-800 mt-1">{formatCurrency(dashboardData?.currentCycleTotalBill)}</p>
            </div>
        </div>
        <div className="bg-white shadow-lg rounded-lg p-6 flex items-center gap-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="bg-amber-100 text-amber-600 p-4 rounded-full flex-shrink-0"><ZapIcon /></div>
            <div>
                <h3 className="text-base font-semibold text-slate-500 uppercase tracking-wider">Total Consumption</h3>
                <p className="text-3xl font-bold text-slate-800 mt-1">{totalCurrentConsumption.toFixed(2)} <span className="text-xl font-medium text-slate-400">units</span></p>
            </div>
        </div>
        <div className="bg-white shadow-lg rounded-lg p-6 flex items-center gap-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="bg-indigo-100 text-indigo-600 p-4 rounded-full flex-shrink-0"><CalendarIcon /></div>
            <div>
                <h3 className="text-base font-semibold text-slate-500 uppercase tracking-wider">Days in Cycle</h3>
                <p className="text-3xl font-bold text-slate-800 mt-1">{dashboardData?.currentBillingCycle?.daysInCycle || 'N/A'}</p>
            </div>
        </div>
      </div>

      {dashboardData && (
        <>
          {/* Meter Details Section (Cleaned up) */}
          <div className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-700">Meter Details</h2>
            {Array.isArray(dashboardData.meterSummaries) && dashboardData.meterSummaries.length > 0 ? (
              dashboardData.meterSummaries.map((meter) => (
                <MeterCard 
                    key={meter.meterId} 
                    meter={meter} 
                    onQuickAdd={openQuickAdd} 
                />
              ))
            ) : (<p className="text-sm text-gray-600">No meter data available for summary.</p>)}
          </div>
          
          {/* Cycle Details Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
            <div className="bg-white shadow-md rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-700 mb-3">Current Billing Cycle Details</h3>
              <div className="space-y-2 text-sm">
                  <p className="text-gray-700">Start Date: <span className="font-medium">{formatDate(dashboardData.currentBillingCycle.startDate)}</span></p>
                  <p className="text-gray-700">Status: <span className="font-medium capitalize">{dashboardData.currentBillingCycle.status}</span></p>
                  {dashboardData.currentBillingCycle.notes && (<p className="text-xs text-gray-500 mt-2">Notes: {dashboardData.currentBillingCycle.notes}</p>)}
                  <div className="pt-3 mt-3 border-t">
                      <p className="text-xs uppercase text-slate-500">Active Tariff</p>
                      <p className="font-semibold text-slate-700">{dashboardData.activeSlabConfiguration.configName}</p>
                  </div>
              </div>
            </div>

            {dashboardData.previousBillingCycle && (
              <div className="bg-white shadow-md rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Previous Billing Cycle Details</h3>
                <p className="text-sm text-gray-700">Period: <span className="font-medium">{formatDate(dashboardData.previousBillingCycle.startDate)}</span> - <span className="font-medium">{formatDate(dashboardData.previousBillingCycle.endDate)}</span></p>
                 {dashboardData.previousBillingCycle.notes && (<p className="text-xs text-gray-500 mt-1">Notes: {dashboardData.previousBillingCycle.notes}</p>)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default DashboardPage;