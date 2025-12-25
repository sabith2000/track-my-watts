// client/src/components/AddReadingForm.jsx
import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';

const getCurrentLocalDateTimeString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

function AddReadingForm({ onReadingAdded, availableMeters, initialMeterId = '', isModal = false, onCancel }) {
  const [meterId, setMeterId] = useState(initialMeterId);
  const [date, setDate] = useState(getCurrentLocalDateTimeString()); 
  const [readingValue, setReadingValue] = useState('');
  const [notes, setNotes] = useState('');
  const [isEstimated, setIsEstimated] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update meterId if initialMeterId changes (e.g. opening different modals)
  useEffect(() => {
    if (initialMeterId) {
      setMeterId(initialMeterId);
    } else if (!meterId && Array.isArray(availableMeters) && availableMeters.length > 0) {
      setMeterId(availableMeters[0]._id);
    }
  }, [initialMeterId, availableMeters]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage('');

    if (!meterId) {
      setError('Please select a meter.'); setIsSubmitting(false); return;
    }
    if (!readingValue || isNaN(parseFloat(readingValue)) || parseFloat(readingValue) < 0) {
        setError('Please enter a valid reading value.'); setIsSubmitting(false); return;
    }

    try {
      const readingData = {
        meterId,
        date: new Date(date).toISOString(), 
        readingValue: parseFloat(readingValue),
        notes,
        isEstimated,
      };
      await apiClient.post('/readings', readingData);
      setSuccessMessage('Reading added successfully!');
      
      // Reset form (optional, depending on UX preference)
      setReadingValue('');
      setNotes('');
      
      if (onReadingAdded) {
        // Slight delay to let user see success message if needed
        setTimeout(() => onReadingAdded(), 500); 
      }
    } catch (err) {
      console.error("Error adding reading:", err);
      setError(err.response?.data?.message || 'Failed to add reading.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Conditional styles based on isModal
  const containerClasses = isModal 
    ? "bg-white" // Clean look for modal
    : "my-6 p-6 bg-white shadow-lg rounded-lg border border-gray-200"; // Standalone card look

  return (
    <div className={containerClasses}>
      {!isModal && <h2 className="text-2xl font-semibold text-slate-700 mb-4">Add New Reading</h2>}
      
      {successMessage && <div className="mb-4 p-3 text-sm text-green-700 bg-green-100 rounded-md">{successMessage}</div>}
      {error && <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-md">{error}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="meter" className="block text-sm font-medium text-gray-700 mb-1">Meter</label>
          <select id="meter" value={meterId} onChange={(e) => setMeterId(e.target.value)}
            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm sm:text-sm focus:ring-indigo-500 focus:border-indigo-500"
            required disabled={!!initialMeterId} // Disable selection if pre-selected via Quick Add
          >
            <option value="" disabled>Select a meter</option>
            {Array.isArray(availableMeters) && availableMeters.map((meter) => (
              <option key={meter._id} value={meter._id}>{meter.name} ({meter.meterType})</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                <input type="datetime-local" id="date" value={date} onChange={(e) => setDate(e.target.value)}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm sm:text-sm focus:ring-indigo-500 focus:border-indigo-500" required />
            </div>
            <div>
                <label htmlFor="readingValue" className="block text-sm font-medium text-gray-700 mb-1">Reading (units)</label>
                <input type="number" id="readingValue" value={readingValue} onChange={(e) => setReadingValue(e.target.value)} placeholder="e.g., 12345.6" step="any"
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm sm:text-sm focus:ring-indigo-500 focus:border-indigo-500" required autoFocus={isModal} />
            </div>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
          <textarea id="notes" rows="2" value={notes} onChange={(e) => setNotes(e.target.value)}
            className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm sm:text-sm focus:ring-indigo-500 focus:border-indigo-500"
          ></textarea>
        </div>

        <div className="flex items-center">
          <input id="isEstimated" type="checkbox" checked={isEstimated} onChange={(e) => setIsEstimated(e.target.checked)}
            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
          <label htmlFor="isEstimated" className="ml-2 block text-sm text-gray-900">This reading is an estimate</label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
            {onCancel && (
                <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    Cancel
                </button>
            )}
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                {isSubmitting ? 'Adding...' : 'Add Reading'}
            </button>
        </div>
      </form>
    </div>
  );
}

export default AddReadingForm;