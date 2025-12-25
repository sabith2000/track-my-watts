// meter-tracker/client/src/pages/ReadingsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/api';
import AddReadingForm from '../components/AddReadingForm';
import { toast } from 'react-toastify'; // Import toast

function ReadingsPage() {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // Keep specific error for initial load failure
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReadings, setTotalReadings] = useState(0);
  const readingsPerPage = 10;

  const [showAddForm, setShowAddForm] = useState(false);
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
      
      // Robust check to prevent crashes
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
    setShowAddForm(false);
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

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prevPage => prevPage + 1);
    }
  };
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prevPage => prevPage - 1);
    }
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

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Meter Readings</h1>
        <button
          className="w-full sm:w-auto flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow transition-colors duration-150"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel Adding' : '+ Add New Reading'}
        </button>
      </div>

      {showAddForm && <AddReadingForm onReadingAdded={handleReadingAdded} availableMeters={availableMeters} />}

      <div className="mb-6 p-4 bg-slate-50 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-slate-700 mb-3">Filter Readings</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="w-full">
            <label htmlFor="filterMeter" className="block text-sm font-medium text-gray-700 mb-1">Meter</label>
            <select id="filterMeter" value={filterMeterId} onChange={(e) => { setFilterMeterId(e.target.value); setCurrentPage(1); }}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">All Meters</option>
              {Array.isArray(availableMeters) && availableMeters.map(meter => (<option key={meter._id} value={meter._id}>{meter.name}</option>))}
            </select>
          </div>
          <div className="w-full">
            <label htmlFor="filterStartDate" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input type="date" id="filterStartDate" value={filterStartDate} onChange={(e) => { setFilterStartDate(e.target.value); setCurrentPage(1); }}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="w-full">
            <label htmlFor="filterEndDate" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input type="date" id="filterEndDate" value={filterEndDate} onChange={(e) => { setFilterEndDate(e.target.value); setCurrentPage(1); }}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="w-full">
            <button onClick={handleClearFilters}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm"
            >Clear Filters</button>
          </div>
        </div>
      </div>

      <div className="my-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-md shadow">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <div>
                <h3 className="text-lg font-semibold text-red-700">Danger Zone</h3>
                <p className="text-sm text-red-600">Permanently delete all meter readings from the database.</p>
            </div>
            <button onClick={openDeleteAllConfirmModal} className="w-full mt-2 sm:mt-0 sm:w-auto flex-shrink-0 bg-red-600 hover:bg-red-800 text-white font-semibold py-2 px-4 rounded shadow" disabled={totalReadings === 0}>
                Delete ALL Readings
            </button>
        </div>
      </div>
      
      {loading ? ( <div className="p-6 text-center"><p className="text-lg text-gray-600">Loading readings...</p></div>
      ) : error ? ( <div className="p-6 text-center"><p className="text-lg text-red-600">Error: {error}</p></div>
      ) : (
        <>
          {Array.isArray(readings) && readings.length > 0 ? (
            <>
              <div className="shadow-md rounded-lg overflow-x-auto bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Meter</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Value</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Consumed</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Notes</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {readings.map((reading) => (
                      <tr key={reading._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{formatDate(reading.date)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">{reading.meter?.name || 'N/A'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{reading.readingValue}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{reading.unitsConsumedSincePrevious}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 max-w-[100px] sm:max-w-xs truncate" title={reading.notes}>{reading.notes || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          <button onClick={() => openDeleteConfirm(reading)} className="text-red-600 hover:text-red-800 transition-colors duration-150" title="Delete this reading">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && ( 
                <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
                  <button onClick={handlePreviousPage} disabled={currentPage === 1 || loading}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >Previous</button>
                  <span className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages} <span className="hidden sm:inline">(Total: {totalReadings} readings)</span>
                  </span>
                  <button onClick={handleNextPage} disabled={currentPage === totalPages || loading}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >Next</button>
                </div>
              )}
            </>
          ) : ( <p className="text-gray-600 text-center py-4">No readings found for the selected criteria.</p> )}
        </>
      )}

      {showDeleteConfirm && readingToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 mb-1">Are you sure you want to delete the reading for <strong className="text-gray-900">{readingToDelete.meter?.name || 'this meter'}</strong></p>
            <p className="text-gray-600 mb-1">taken on <strong className="text-gray-900">{formatDate(readingToDelete.date)}</strong></p>
            <p className="text-gray-600 mb-6">with value <strong className="text-gray-900">{readingToDelete.readingValue} units</strong>?</p>
            <p className="text-sm text-red-500 mb-4">This action cannot be undone. It may affect calculations for subsequent readings.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={closeDeleteConfirm} disabled={isDeleting} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              <button onClick={handleDeleteReading} disabled={isDeleting} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md shadow-sm disabled:opacity-50">
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full mx-4">
            <h3 className="text-xl font-semibold text-red-700 mb-4">EXTREME CAUTION: Delete All Readings!</h3>
            <p className="text-gray-700 mb-2">This action will permanently delete <strong className="font-bold">ALL ({totalReadings})</strong> meter readings from the database.</p>
            <p className="text-gray-700 mb-4">All consumption history and related calculations will be lost.</p>
            <p className="text-gray-700 mb-2 font-medium">To confirm, please type the exact phrase: <strong className="text-red-600 select-none">{DELETE_ALL_CONFIRM_PHRASE}</strong></p>
            <input type="text" value={deleteAllConfirmationText} onChange={(e) => setDeleteAllConfirmationText(e.target.value)}
              placeholder="Type confirmation phrase here"
              className="w-full p-2 border border-gray-300 rounded-md mb-4 focus:ring-red-500 focus:border-red-500"
            />
            <div className="flex justify-end space-x-3">
              <button onClick={closeDeleteAllConfirmModal} disabled={isDeletingAll} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              <button onClick={handleConfirmDeleteAllReadings} disabled={isDeletingAll || deleteAllConfirmationText !== DELETE_ALL_CONFIRM_PHRASE}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-sm font-medium rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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