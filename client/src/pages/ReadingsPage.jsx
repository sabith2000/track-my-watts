// client/src/pages/ReadingsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/api';
import AddReadingForm from '../components/AddReadingForm';
import { toast } from 'react-toastify';
import Loader from '../components/Loader';

// --- ICONS ---
const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>);
const FilterIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" /></svg>);
const TrashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>);
const ChevronLeft = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>);
const ChevronRight = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>);
const DoubleChevronLeft = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" /></svg>);
const DoubleChevronRight = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" /></svg>);

function ReadingsPage() {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); 
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReadings, setTotalReadings] = useState(0);
  const readingsPerPage = 10;

  const [showAddFormModal, setShowAddFormModal] = useState(false);
  const [availableMeters, setAvailableMeters] = useState([]);

  const [filterMeterId, setFilterMeterId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [readingToDelete, setReadingToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deleteAllConfirmationText, setDeleteAllConfirmationText] = useState('');
  const DELETE_ALL_CONFIRM_PHRASE = "DELETE ALL MY READINGS";

  const fetchReadings = useCallback(async (page, appliedFilters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: page,
        limit: readingsPerPage,
        sort: '-date',
        ...(appliedFilters.meterId && { meterId: appliedFilters.meterId }),
        ...(appliedFilters.startDate && { startDate: appliedFilters.startDate }),
        ...(appliedFilters.endDate && { endDate: appliedFilters.endDate }),
      };

      const response = await apiClient.get('/readings', { params });
      
      setReadings(Array.isArray(response.data.readings) ? response.data.readings : []);
      
      setTotalPages(response.data.totalPages || 1);
      setTotalReadings(response.data.totalReadings || 0);
      setCurrentPage(response.data.currentPage || page);
    } catch (err) {
      console.error("Error fetching readings:", err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch readings.';
      setError(errorMessage);
      toast.error(errorMessage);
      setReadings([]); 
    } finally {
      setLoading(false);
    }
  }, [readingsPerPage]);

  const fetchMeters = useCallback(async () => {
    try {
      const response = await apiClient.get('/meters');
      setAvailableMeters(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Error fetching meters:", err);
      toast.error("Failed to fetch meters list.");
      setAvailableMeters([]);
    }
  }, []);

  useEffect(() => {
    const currentFilters = {
      meterId: filterMeterId,
      startDate: filterStartDate,
      endDate: filterEndDate
    };
    fetchReadings(currentPage, currentFilters);

    if (availableMeters.length === 0) {
      fetchMeters();
    }
  }, [fetchReadings, currentPage, filterMeterId, filterStartDate, filterEndDate, fetchMeters, availableMeters.length]);

  const handleReadingAdded = () => {
    setShowAddFormModal(false);
    setCurrentPage(1);
    fetchReadings(1, { meterId: filterMeterId, startDate: filterStartDate, endDate: filterEndDate });
  };

  const handleClearFilters = () => {
    setFilterMeterId('');
    setFilterStartDate('');
    setFilterEndDate('');
    setCurrentPage(1);
  };

  const openDeleteConfirm = (reading) => {
    setReadingToDelete(reading);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setReadingToDelete(null);
    setShowDeleteConfirm(false);
  };

  const handleDeleteReading = async () => {
    if (!readingToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/readings/${readingToDelete._id}`);
      toast.success('Reading deleted successfully.');
      closeDeleteConfirm();
      const currentFilters = {
        meterId: filterMeterId,
        startDate: filterStartDate,
        endDate: filterEndDate
      };
      if (readings.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      } else {
        fetchReadings(currentPage, currentFilters);
      }
    } catch (err) {
      console.error("Error deleting reading:", err);
      toast.error(err.response?.data?.message || "Failed to delete reading.");
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteAllConfirmModal = () => {
    setShowDeleteAllConfirm(true);
    setDeleteAllConfirmationText('');
  };

  const closeDeleteAllConfirmModal = () => {
    setShowDeleteAllConfirm(false);
    setDeleteAllConfirmationText('');
  };

  const handleConfirmDeleteAllReadings = async () => {
    if (deleteAllConfirmationText !== DELETE_ALL_CONFIRM_PHRASE) {
      toast.warn(`Incorrect phrase. Please type "${DELETE_ALL_CONFIRM_PHRASE}" to confirm.`);
      return;
    }
    setIsDeletingAll(true);
    try {
      const response = await apiClient.delete('/readings/action/delete-all-globally');
      toast.success(response.data.message || `${response.data.deletedCount} readings deleted successfully.`);
      closeDeleteAllConfirmModal();
      setCurrentPage(1);
      fetchReadings(1, {});
    } catch (err) {
      console.error("Error deleting all readings:", err);
      toast.error(err.response?.data?.message || "Failed to delete all readings.");
    } finally {
      setIsDeletingAll(false);
    }
  };

  // --- Pagination Handlers ---
  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prevPage => prevPage + 1);
  };
  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(prevPage => prevPage - 1);
  };
  const handleFirstPage = () => {
    if (currentPage > 1) setCurrentPage(1);
  };
  const handleLastPage = () => {
    if (currentPage < totalPages) setCurrentPage(totalPages);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  };

  // --- UPDATED: Meter Badge Color Logic ---
  const getMeterBadgeColor = (name) => {
    if (!name) return 'bg-gray-100 text-gray-800 border-gray-200';
    const lowerName = name.toLowerCase();
    
    // Main Meter = Blue
    if (lowerName.includes('main')) {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    } 
    // AC Meter = Orange (New color for distinction)
    else if (lowerName.includes('AC')) {
      return 'bg-orange-100 text-orange-700 border-orange-200';
    }
    // Sub/Backup Meter = Purple
    else if (lowerName.includes('sub') || lowerName.includes('backup')) {
      return 'bg-purple-100 text-purple-700 border-purple-200';
    }
    // Default = Emerald
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Meter Readings</h1>
           <p className="text-sm text-gray-500 mt-1">View and manage history</p>
        </div>
        <button
          className="flex items-center justify-center gap-2 w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all active:scale-95"
          onClick={() => setShowAddFormModal(true)}
        >
          <PlusIcon />
          <span>Add New Reading</span>
        </button>
      </div>

      {/* --- ADD READING MODAL --- */}
      {showAddFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">Add New Reading</h3>
                    <button onClick={() => setShowAddFormModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none">&times;</button>
                </div>
                <div className="p-4">
                    <AddReadingForm 
                        onReadingAdded={handleReadingAdded}
                        availableMeters={availableMeters}
                        isModal={true}
                        onCancel={() => setShowAddFormModal(false)}
                    />
                </div>
            </div>
        </div>
      )}

      {/* --- FILTER BAR --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3 text-slate-700 font-semibold border-b border-gray-100 pb-2">
            <FilterIcon />
            <span>Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="w-full">
            <label htmlFor="filterMeter" className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Meter</label>
            <select id="filterMeter" value={filterMeterId} onChange={(e) => { setFilterMeterId(e.target.value); setCurrentPage(1); }}
              className="block w-full py-2 px-3 border border-gray-200 bg-gray-50 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
            >
              <option value="">All Meters</option>
              {Array.isArray(availableMeters) && availableMeters.map(meter => (<option key={meter._id} value={meter._id}>{meter.name}</option>))}
            </select>
          </div>
          <div className="w-full">
            <label htmlFor="filterStartDate" className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Start Date</label>
            <input type="date" id="filterStartDate" value={filterStartDate} onChange={(e) => { setFilterStartDate(e.target.value); setCurrentPage(1); }}
              className="block w-full py-2 px-3 border border-gray-200 bg-gray-50 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
            />
          </div>
          <div className="w-full">
            <label htmlFor="filterEndDate" className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">End Date</label>
            <input type="date" id="filterEndDate" value={filterEndDate} onChange={(e) => { setFilterEndDate(e.target.value); setCurrentPage(1); }}
              className="block w-full py-2 px-3 border border-gray-200 bg-gray-50 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
            />
          </div>
          <div className="w-full flex items-end">
            <button onClick={handleClearFilters}
              className="w-full px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-gray-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      {loading ? ( 
        <Loader text="Fetching records..." />
      ) : error ? ( <div className="p-8 text-center bg-red-50 rounded-lg"><p className="text-red-600 font-medium">Error: {error}</p></div>
      ) : (
        <>
          {Array.isArray(readings) && readings.length > 0 ? (
            <>
              {/* --- DESKTOP TABLE --- */}
              <div className="hidden sm:block bg-white shadow-sm border border-gray-200 rounded-xl overflow-x-auto">
                <table className="min-w-[900px] w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Meter</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Reading</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Consumed</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Notes</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {readings.map((reading) => (
                      <tr key={reading._id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{formatDate(reading.date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getMeterBadgeColor(reading.meter?.name)}`}>
                                {reading.meter?.name || 'Unknown'}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-bold">{reading.readingValue}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 font-bold">
                            {reading.unitsConsumedSincePrevious > 0 ? `+${reading.unitsConsumedSincePrevious}` : reading.unitsConsumedSincePrevious}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400 italic max-w-xs truncate">{reading.notes || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button onClick={() => openDeleteConfirm(reading)} className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50">
                             <TrashIcon />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* --- MOBILE CARDS --- */}
              <div className="sm:hidden space-y-4">
                  {readings.map((reading) => (
                      <div key={reading._id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                              <div>
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getMeterBadgeColor(reading.meter?.name)}`}>
                                      {reading.meter?.name || 'Unknown'}
                                  </span>
                                  <p className="text-sm text-gray-500 mt-1 font-medium">{formatDate(reading.date)}</p>
                              </div>
                              <button onClick={() => openDeleteConfirm(reading)} className="text-slate-400 hover:text-red-600 p-2">
                                  <TrashIcon />
                              </button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-3">
                              <div>
                                  <p className="text-xs text-gray-400 uppercase font-bold">Reading</p>
                                  <p className="text-lg font-bold text-slate-700">{reading.readingValue}</p>
                              </div>
                              <div>
                                  <p className="text-xs text-gray-400 uppercase font-bold">Consumed</p>
                                  <p className="text-lg font-bold text-emerald-600">
                                      {reading.unitsConsumedSincePrevious > 0 ? `+${reading.unitsConsumedSincePrevious}` : reading.unitsConsumedSincePrevious}
                                  </p>
                              </div>
                          </div>
                          {reading.notes && (
                              <p className="text-xs text-gray-400 italic bg-gray-50 p-2 rounded">"{reading.notes}"</p>
                          )}
                      </div>
                  ))}
              </div>

              {/* --- PAGINATION --- */}
              {totalPages > 1 && ( 
                <div className="mt-6 flex justify-center items-center gap-2 sm:gap-4">
                  
                  {/* First Page */}
                  <button onClick={handleFirstPage} disabled={currentPage === 1 || loading}
                    className="p-2 text-gray-500 bg-white border border-gray-300 rounded-full hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                    title="First Page"
                  >
                    <DoubleChevronLeft />
                  </button>

                  <button onClick={handlePreviousPage} disabled={currentPage === 1 || loading}
                    className="flex items-center gap-1 px-3 sm:px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-full hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                  >
                    <ChevronLeft /> <span className="hidden sm:inline">Prev</span>
                  </button>
                  
                  <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <button onClick={handleNextPage} disabled={currentPage === totalPages || loading}
                    className="flex items-center gap-1 px-3 sm:px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-full hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                  >
                    <span className="hidden sm:inline">Next</span> <ChevronRight />
                  </button>

                  {/* Last Page */}
                  <button onClick={handleLastPage} disabled={currentPage === totalPages || loading}
                    className="p-2 text-gray-500 bg-white border border-gray-300 rounded-full hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                    title="Last Page"
                  >
                    <DoubleChevronRight />
                  </button>
                </div>
              )}
            </>
          ) : ( 
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
                <p className="text-gray-400 mb-2">No readings found.</p>
                <button onClick={() => setShowAddFormModal(true)} className="text-indigo-600 hover:text-indigo-800 font-medium text-sm">Add your first reading</button>
            </div>
          )}
        </>
      )}

      {/* --- DELETE CONFIRM MODAL (Single Reading) --- */}
      {showDeleteConfirm && readingToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full animate-[fadeIn_0.1s_ease-out]">
            <div className="flex items-center gap-3 text-red-600 mb-4">
                <div className="bg-red-100 p-2 rounded-full"><TrashIcon /></div>
                <h3 className="text-lg font-bold">Delete Reading?</h3>
            </div>
            
            <p className="text-gray-600 mb-2 text-sm">
                Are you sure you want to delete the reading for <strong className="text-gray-800">{readingToDelete.meter?.name}</strong>?
            </p>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4 text-sm">
                <div className="flex justify-between mb-1">
                    <span className="text-gray-500">Date:</span>
                    <span className="font-medium text-gray-800">{formatDate(readingToDelete.date)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Value:</span>
                    <span className="font-medium text-gray-800">{readingToDelete.readingValue} units</span>
                </div>
            </div>

            <p className="text-xs text-red-500 mb-6 font-medium bg-red-50 p-2 rounded">
                Warning: This might affect consumption calculations for subsequent readings.
            </p>

            <div className="flex justify-end gap-3">
              <button onClick={closeDeleteConfirm} disabled={isDeleting} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleDeleteReading} disabled={isDeleting} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg shadow-md transition-colors disabled:opacity-50">
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DANGER ZONE (Updated Alignment) --- */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <div className="bg-red-50 border border-red-100 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-center gap-4">
           <div className="text-center sm:text-left">
               <h3 className="text-lg font-semibold text-red-700">Danger Zone</h3>
               <p className="text-sm text-red-600">Permanently delete all meter readings from the database.</p>
           </div>
           <button 
             onClick={openDeleteAllConfirmModal} 
             disabled={totalReadings === 0}
             className="whitespace-nowrap px-4 py-2 bg-red-600 hover:bg-red-800 text-white font-semibold rounded shadow transition-all disabled:opacity-50"
           >
              Delete ALL Readings
           </button>
        </div>
      </div>

      {/* --- DELETE ALL CONFIRM MODAL (Exact Text Restored) --- */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-lg w-full border-t-4 border-red-600">
            <h3 className="text-xl font-bold text-red-700 mb-4">EXTREME CAUTION: Delete All Readings!</h3>
            
            <p className="text-gray-700 mb-2">
                This action will permanently delete <strong className="font-bold">ALL ({totalReadings})</strong> meter readings from the database.
            </p>
            <p className="text-gray-700 mb-6">
                All consumption history and related calculations will be lost.
            </p>
            
            <label className="block text-gray-800 mb-2">
                To confirm, please type the exact phrase: <strong className="text-red-600 select-all">{DELETE_ALL_CONFIRM_PHRASE}</strong>
            </label>
            <input type="text" value={deleteAllConfirmationText} onChange={(e) => setDeleteAllConfirmationText(e.target.value)}
              placeholder="Type confirmation phrase here"
              className="w-full p-2.5 border border-gray-300 rounded-lg mb-6 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
            />

            <div className="flex justify-end gap-3">
              <button onClick={closeDeleteAllConfirmModal} disabled={isDeletingAll} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleConfirmDeleteAllReadings} disabled={isDeletingAll || deleteAllConfirmationText !== DELETE_ALL_CONFIRM_PHRASE}
                className="px-4 py-2 bg-red-400 text-white text-sm font-bold rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-500"
                style={{ backgroundColor: deleteAllConfirmationText === DELETE_ALL_CONFIRM_PHRASE ? '#dc2626' : '' }}
              >
                {isDeletingAll ? 'Deleting All...' : 'Confirm & Delete All Readings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReadingsPage;