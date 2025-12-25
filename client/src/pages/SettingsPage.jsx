// client/src/pages/SettingsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/api';
import { toast } from 'react-toastify';
import SlabRateManager from '../components/SlabRateManager';

function SettingsPage() {
  const [meters, setMeters] = useState([]);
  const [generalPurposeMeters, setGeneralPurposeMeters] = useState([]);
  const [selectedActiveMeterId, setSelectedActiveMeterId] = useState('');
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingMeter, setIsUpdatingMeter] = useState(false);

  // Meter Editing State
  const [editingMeterId, setEditingMeterId] = useState(null);
  const [editingMeterName, setEditingMeterName] = useState('');
  const [editingMeterDescription, setEditingMeterDescription] = useState('');

  // Settings State
  const [consumptionTarget, setConsumptionTarget] = useState(500);
  const [consumptionTargetInput, setConsumptionTargetInput] = useState('500');

  // Slab Configs State
  const [slabConfigs, setSlabConfigs] = useState([]);
  const [selectedActiveSlabConfigId, setSelectedActiveSlabConfigId] = useState('');
  const [isUpdatingSlab, setIsUpdatingSlab] = useState(false);

  // --- Data Fetching ---
  const fetchMeters = useCallback(async () => {
    try {
      const response = await apiClient.get('/meters');
      const allMeters = response.data || [];
      setMeters(allMeters);
      const gpMeters = Array.isArray(allMeters) ? allMeters.filter(meter => meter.isGeneralPurpose) : [];
      setGeneralPurposeMeters(gpMeters);
      const currentActive = gpMeters.find(meter => meter.isCurrentlyActiveGeneral);
      if (currentActive) setSelectedActiveMeterId(currentActive._id);
    } catch (err) { toast.error('Failed to fetch meters.'); }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await apiClient.get('/settings');
      if (response.data && response.data.consumptionTarget) {
        setConsumptionTarget(response.data.consumptionTarget);
        setConsumptionTargetInput(String(response.data.consumptionTarget));
      }
    } catch (err) { console.log("Settings endpoint not reachable yet"); }
  }, []);

  const fetchSlabConfigs = useCallback(async () => {
    try {
      const response = await apiClient.get('/slabs');
      const allSlabs = response.data || [];
      setSlabConfigs(Array.isArray(allSlabs) ? allSlabs : []);
      const currentActive = allSlabs.find(sc => sc.isCurrentlyActive);
      if (currentActive) setSelectedActiveSlabConfigId(currentActive._id);
    } catch (err) { toast.error('Failed to fetch slab configs.'); }
  }, []);

  useEffect(() => { fetchMeters(); fetchSlabConfigs(); fetchSettings(); }, [fetchMeters, fetchSlabConfigs, fetchSettings]);

  // --- Handlers: Meters ---
  const handleEditClick = (meter) => {
    setEditingMeterId(meter._id);
    setEditingMeterName(meter.name);
    setEditingMeterDescription(meter.description || '');
  };

  const handleCancelEdit = () => {
    setEditingMeterId(null);
    setEditingMeterName('');
    setEditingMeterDescription('');
  };

  const handleSaveMeter = async (meterId) => {
    if (!editingMeterName.trim()) { toast.warn("Name cannot be empty."); return; }
    setIsUpdating(true);
    try {
      await apiClient.put(`/meters/${meterId}`, { name: editingMeterName, description: editingMeterDescription });
      toast.success("Meter updated!");
      setEditingMeterId(null);
      fetchMeters();
    } catch (err) { toast.error('Update failed.'); } 
    finally { setIsUpdating(false); }
  };

  const handleSaveActiveMeter = async () => {
    if (!selectedActiveMeterId) return;
    setIsUpdatingMeter(true);
    try {
      await apiClient.put(`/meters/${selectedActiveMeterId}/set-active-general`);
      toast.success('Active meter updated!');
      fetchMeters();
    } catch (err) { toast.error('Failed to update active meter.'); } 
    finally { setIsUpdatingMeter(false); }
  };

  // --- Handlers: Settings ---
  const handleSaveSettings = async () => {
    const newTarget = parseInt(consumptionTargetInput, 10);
    if (isNaN(newTarget) || newTarget <= 0) { toast.warn("Invalid target."); return; }
    setIsUpdating(true);
    try {
      await apiClient.put('/settings', { consumptionTarget: newTarget });
      toast.success("Target updated!");
      setConsumptionTarget(newTarget);
    } catch (err) { toast.error("Failed to save settings."); } 
    finally { setIsUpdating(false); }
  };

  // --- Handlers: Slabs ---
  const handleSaveActiveSlabConfig = async () => {
    if (!selectedActiveSlabConfigId) { toast.warn("Please select a config."); return; }
    setIsUpdatingSlab(true);
    try {
      await apiClient.put(`/slabs/${selectedActiveSlabConfigId}/activate`);
      toast.success('Slab configuration activated!');
      fetchSlabConfigs();
    } catch (err) { toast.error('Activation failed.'); }
    finally { setIsUpdatingSlab(false); }
  };

  return (
    <div className="p-4 sm:p-6 space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Settings</h1>
      
      {/* 1. Target Settings */}
      <div className="bg-white shadow-md rounded-lg p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-700 mb-4">Application Settings</h2>
        <div className="max-w-md space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Custom Consumption Target (units)</label>
            <input type="number" value={consumptionTargetInput} onChange={(e) => setConsumptionTargetInput(e.target.value)}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm" />
          </div>
          <button onClick={handleSaveSettings} disabled={isUpdating} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {isUpdating ? 'Saving...' : 'Save Target'}
          </button>
        </div>
      </div>
      
      {/* 2. Manage Meters */}
      <div className="bg-white shadow-md rounded-lg p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-700 mb-4">Manage Meters</h2>
        <div className="space-y-3">
          {meters.map((meter) => (
            <div key={meter._id} className="p-4 border border-gray-200 rounded-lg transition-all duration-300 hover:shadow-md">
              {editingMeterId === meter._id ? (
                <div className="space-y-3">
                  <input type="text" value={editingMeterName} onChange={(e) => setEditingMeterName(e.target.value)} className="block w-full p-2 border rounded" autoFocus />
                  <input type="text" value={editingMeterDescription} onChange={(e) => setEditingMeterDescription(e.target.value)} className="block w-full p-2 border rounded" />
                  <div className="flex justify-end gap-2">
                    <button onClick={handleCancelEdit} className="px-3 py-1 bg-gray-200 rounded">Cancel</button>
                    <button onClick={() => handleSaveMeter(meter._id)} className="px-3 py-1 bg-green-600 text-white rounded">Save</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-lg">{meter.name}</p>
                    <p className="text-sm text-gray-500">{meter.description}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 mt-2 sm:mt-0">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">{meter.isGeneralPurpose ? "General" : "Dedicated"}</span>
                    <button onClick={() => handleEditClick(meter)} className="text-indigo-600 font-medium">Edit</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Active Meter Selector - RESTORED OLD UI */}
      <div className="bg-white shadow-md rounded-lg p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-700 mb-1">Active General Purpose Meter</h2>
        <p className="text-sm text-gray-500 mb-4">Select which general purpose meter is currently in use.</p>
        <div className="space-y-3">
            {generalPurposeMeters.map((meter) => (
              <label key={meter._id} className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors duration-200 has-[:checked]:bg-indigo-50 has-[:checked]:border-indigo-400">
                <input type="radio" name="activeGeneralMeter" value={meter._id} checked={selectedActiveMeterId === meter._id} onChange={() => setSelectedActiveMeterId(meter._id)} className="h-5 w-5 text-indigo-600 border-gray-300 focus:ring-indigo-500"/>
                <span className="ml-3 font-medium text-gray-800">{meter.name}</span>
                <span className="ml-2 text-sm text-gray-500">({meter.meterType})</span>
                {meter.isCurrentlyActiveGeneral && <span className="ml-auto text-xs font-semibold py-0.5 px-2 bg-green-200 text-green-800 rounded-full">Currently Active</span>}
              </label>
            ))}
            <button onClick={handleSaveActiveMeter} disabled={isUpdatingMeter || !selectedActiveMeterId || (generalPurposeMeters.find(m => m._id === selectedActiveMeterId)?.isCurrentlyActiveGeneral)} className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {isUpdatingMeter ? 'Saving...' : 'Set Selected Meter as Active'}
            </button>
        </div>
      </div>

      {/* 4. Slab Manager (Refactored Component) */}
      <SlabRateManager 
        slabConfigs={slabConfigs} 
        selectedConfigId={selectedActiveSlabConfigId}
        onSelectConfig={setSelectedActiveSlabConfigId}
        onSaveActive={handleSaveActiveSlabConfig}
        onRefresh={fetchSlabConfigs}
        isUpdating={isUpdatingSlab}
      />
    </div>
  );
}

export default SettingsPage;