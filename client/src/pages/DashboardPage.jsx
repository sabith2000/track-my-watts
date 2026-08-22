// client/src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/api';
import notify from '../utils/toast';
import AddReadingForm from '../components/AddReadingForm'; 
import MeterCard from '../components/MeterCard';
import Loader from '../components/Loader';

// --- HELPER FUNCTIONS ---
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

// --- IMPROVED ICONS ---
const RupeeBillIcon = () => (
  // A clearer "Invoice/Bill" shape with lines and a Rupee symbol
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 13.5h.75m-3.75 0h.008v.008H6V13.5zm3.75 0h.008v.008H9.75V13.5zm-3.75 3h.008v.008H6V16.5zm3.75 0h.008v.008H9.75V16.5zm3.75 0h.008v.008H13.5V16.5zm0-3h.008v.008H13.5V13.5z" />
    {/* Rupee Symbol Overlay */}
    <circle cx="17" cy="7" r="5" className="fill-emerald-100/50" /> 
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 5h4M15 7h4M15.5 5c0 1.5 1.5 2.5 3 2.5a2.5 2.5 0 01-2.5 2.5l3 3" />
  </svg>
);

const PowerMeterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>
);

const TimeProgressIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

import { useNavigate } from 'react-router-dom';

function DashboardPage() {
  const navigate = useNavigate();
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
      notify.error(errorMessage);
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

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
      notify.warn("Government Collection Date is required.");
      setIsClosingCycle(false);
      return;
    }
    const collectionDateObj = new Date(governmentCollectionDate);
    const currentDateObj = new Date(todayFormattedForInput());

    if (collectionDateObj > currentDateObj) {
      notify.warn("Government Collection Date cannot be in the future.");
      setIsClosingCycle(false);
      return;
    }
    if (dashboardData?.currentBillingCycle?.startDate && collectionDateObj < new Date(dashboardData.currentBillingCycle.startDate)) {
      notify.warn("Collection Date cannot be before the current cycle's start date.");
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
      notify.success(response.data.message || 'Billing cycle closed and new one started successfully!');
      setShowCloseCycleForm(false);
      setGovernmentCollectionDate(todayFormattedForInput());
      setNotesForClosedCycle('');
      setNotesForNewCycle('');
      fetchDashboardData();
    } catch (err) {
      console.error("Error closing billing cycle:", err);
      notify.error(err, 'Failed to close billing cycle.');
    } finally {
      setIsClosingCycle(false);
    }
  };

  if (loading && !dashboardData) {
    return <Loader text="Loading Dashboard..." />;
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

      {/* --- UPDATED: Modern Summary Cards (Stronger Tints) --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Estimated Bill (Emerald/Money Theme) */}
        {/* Increased color weight to 100/200 for better visibility */}
        <div className="bg-emerald-50 border border-emerald-200 shadow-sm rounded-xl p-6 flex items-center gap-5 transition-all duration-300 hover:shadow-md hover:shadow-emerald-100/50 hover:-translate-y-1 group">
            <div className="bg-white border border-emerald-200 text-emerald-600 p-3 rounded-full flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                <RupeeBillIcon />
            </div>
            <div>
                <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-wide opacity-80">Estimated Bill</h3>
                <p className="text-3xl font-extrabold text-emerald-900 mt-1">{formatCurrency(dashboardData?.currentCycleTotalBill)}</p>
            </div>
        </div>

        {/* Card 2: Total Consumption (Amber/Energy Theme) */}
        <div className="bg-amber-50 border border-amber-200 shadow-sm rounded-xl p-6 flex items-center gap-5 transition-all duration-300 hover:shadow-md hover:shadow-amber-100/50 hover:-translate-y-1 group">
            <div className="bg-white border border-amber-200 text-amber-500 p-3 rounded-full flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                <PowerMeterIcon />
            </div>
            <div>
                <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wide opacity-80">Total Consumption</h3>
                <p className="text-3xl font-extrabold text-amber-900 mt-1">
                    {totalCurrentConsumption.toFixed(2)} 
                    <span className="text-lg font-semibold text-amber-700 ml-1">units</span>
                </p>
            </div>
        </div>

        {/* Card 3: Days in Cycle (Blue/Time Theme) */}
        <div className="bg-blue-50 border border-blue-200 shadow-sm rounded-xl p-6 flex items-center gap-5 transition-all duration-300 hover:shadow-md hover:shadow-blue-100/50 hover:-translate-y-1 group">
            <div className="bg-white border border-blue-200 text-blue-500 p-3 rounded-full flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                <TimeProgressIcon />
            </div>
            <div>
                <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide opacity-80">Days in Cycle</h3>
                <p className="text-3xl font-extrabold text-blue-900 mt-1">
                    {dashboardData?.currentBillingCycle?.daysInCycle || '0'} 
                    <span className="text-lg font-semibold text-blue-700 ml-1">days</span>
                </p>
            </div>
        </div>
      </div>

      {dashboardData && (
        <>
          {/* Meter Details Section */}
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
          
          {/* Cycle Details Section (Reverted to subtle/clean style) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-200">
            <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-700 mb-3 border-b pb-2">Current Billing Cycle Details</h3>
              <div className="space-y-3 text-sm">
                  <p className="text-gray-700">Start Date: <span className="font-medium text-slate-900">{formatDate(dashboardData.currentBillingCycle.startDate)}</span></p>
                  <p className="text-gray-700">Status: <span className="font-medium capitalize text-slate-900">{dashboardData.currentBillingCycle.status}</span></p>
                  
                  {dashboardData.currentBillingCycle.notes && (
                    <p className="text-gray-500 italic mt-1">Notes: {dashboardData.currentBillingCycle.notes}</p>
                  )}
                  
                  <div className="pt-3 mt-2 border-t border-slate-100">
                      <p className="text-xs uppercase text-slate-400 font-bold mb-1">Active Tariff Plan</p>
                      <p className="text-slate-700 font-medium">
                        {dashboardData.activeSlabConfiguration.configName}
                      </p>
                  </div>
              </div>
            </div>

            {dashboardData.previousBillingCycle && (
              <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6 opacity-80 hover:opacity-100 transition-opacity">
                <h3 className="text-lg font-semibold text-slate-600 mb-3 border-b pb-2">Previous Billing Cycle Details</h3>
                <div className="space-y-3 text-sm">
                    <p className="text-gray-700">Period: <span className="font-medium text-slate-900">{formatDate(dashboardData.previousBillingCycle.startDate)} — {formatDate(dashboardData.previousBillingCycle.endDate)}</span></p>
                    {dashboardData.previousBillingCycle.notes && (
                        <p className="text-gray-500 italic mt-1">Notes: {dashboardData.previousBillingCycle.notes}</p>
                    )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default DashboardPage;