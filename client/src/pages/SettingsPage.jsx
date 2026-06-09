// client/src/pages/SettingsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/api';
import { toast } from 'react-toastify';
import SlabRateManager from '../components/SlabRateManager';
import Loader from '../components/Loader';

// --- ICONS ---
const CogIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);

// --- UPDATED: Rupee Icon ---
const RupeeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 8.25H9m6 3H9m3 6l-3-3h1.5a3 3 0 100-6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);

const PencilIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>);
const CheckBadgeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.491 4.491 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>);
const RefreshIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>);

const COLOR_OPTIONS = [
  { value: 'emerald', label: 'Emerald', bgClass: 'bg-emerald-500' },
  { value: 'blue', label: 'Blue', bgClass: 'bg-blue-500' },
  { value: 'orange', label: 'Orange', bgClass: 'bg-orange-500' },
  { value: 'purple', label: 'Purple', bgClass: 'bg-purple-500' },
  { value: 'rose', label: 'Rose', bgClass: 'bg-rose-500' }
];

function SettingsPage() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'tariffs'

  const [meters, setMeters] = useState([]);
  const [generalPurposeMeters, setGeneralPurposeMeters] = useState([]);
  const [selectedActiveMeterId, setSelectedActiveMeterId] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingMeter, setIsUpdatingMeter] = useState(false);

  // Meter Editing Modal State
  const [showEditMeterModal, setShowEditMeterModal] = useState(false);
  const [editingMeterId, setEditingMeterId] = useState(null);
  const [editingMeterName, setEditingMeterName] = useState('');
  const [editingMeterDescription, setEditingMeterDescription] = useState('');
  const [editingMeterColorTheme, setEditingMeterColorTheme] = useState('emerald');

  // Meter Add Modal State
  const [showAddMeterModal, setShowAddMeterModal] = useState(false);
  const [newMeterName, setNewMeterName] = useState('');
  const [newMeterDescription, setNewMeterDescription] = useState('');
  const [newMeterType, setNewMeterType] = useState('1-phase');
  const [newMeterIsGeneralPurpose, setNewMeterIsGeneralPurpose] = useState(false);
  const [newMeterColorTheme, setNewMeterColorTheme] = useState('emerald');
  const [isAddingMeter, setIsAddingMeter] = useState(false);

  // Settings State
  const [consumptionTarget, setConsumptionTarget] = useState(500);
  const [consumptionTargetInput, setConsumptionTargetInput] = useState('500');
  
  // Confirmation Modal State
  const [showTargetConfirm, setShowTargetConfirm] = useState(false);

  // Slab Configs State
  const [slabConfigs, setSlabConfigs] = useState([]);
  const [selectedActiveSlabConfigId, setSelectedActiveSlabConfigId] = useState('');
  const [isUpdatingSlab, setIsUpdatingSlab] = useState(false);

  // --- DATA FETCHING ---
  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch Meters
      const metersRes = await apiClient.get('/meters');
      const allMeters = metersRes.data || [];
      setMeters(allMeters);
      const gpMeters = Array.isArray(allMeters) ? allMeters.filter(meter => meter.isGeneralPurpose) : [];
      setGeneralPurposeMeters(gpMeters);
      const currentActive = gpMeters.find(meter => meter.isCurrentlyActiveGeneral);
      if (currentActive) setSelectedActiveMeterId(currentActive._id);

      // Fetch Slabs
      const slabsRes = await apiClient.get('/slabs');
      const allSlabs = slabsRes.data || [];
      setSlabConfigs(Array.isArray(allSlabs) ? allSlabs : []);
      const currentActiveSlab = allSlabs.find(sc => sc.isCurrentlyActive);
      if (currentActiveSlab) setSelectedActiveSlabConfigId(currentActiveSlab._id);

      // Fetch Settings
      try {
        const settingsRes = await apiClient.get('/settings');
        if (settingsRes.data && settingsRes.data.consumptionTarget) {
          setConsumptionTarget(settingsRes.data.consumptionTarget);
          setConsumptionTargetInput(String(settingsRes.data.consumptionTarget));
        }
      } catch (e) { console.log("Settings endpoint silent fail"); }

    } catch (err) {
      toast.error('Failed to load settings data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // --- HANDLERS: METERS ---
  const openEditMeterModal = (meter) => {
    setEditingMeterId(meter._id);
    setEditingMeterName(meter.name);
    setEditingMeterDescription(meter.description || '');
    setEditingMeterColorTheme(meter.colorTheme || 'emerald');
    setShowEditMeterModal(true);
  };

  const closeEditMeterModal = () => {
    setShowEditMeterModal(false);
    setEditingMeterId(null);
    setEditingMeterName('');
    setEditingMeterDescription('');
    setEditingMeterColorTheme('emerald');
  };

  const closeAddMeterModal = () => {
    setShowAddMeterModal(false);
    setNewMeterName('');
    setNewMeterDescription('');
    setNewMeterType('1-phase');
    setNewMeterIsGeneralPurpose(false);
    setNewMeterColorTheme('emerald');
  };

  const handleAddMeter = async (e) => {
    e.preventDefault();
    if (!newMeterName.trim()) { toast.warn("Name cannot be empty."); return; }
    
    setIsAddingMeter(true);
    try {
      await apiClient.post('/meters', {
          name: newMeterName,
          description: newMeterDescription,
          meterType: newMeterType,
          colorTheme: newMeterColorTheme,
          isGeneralPurpose: newMeterIsGeneralPurpose,
          isCurrentlyActiveGeneral: newMeterIsGeneralPurpose ? (generalPurposeMeters.length === 0) : false
      });
      toast.success("Meter added successfully!");
      closeAddMeterModal();
      loadAllData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add meter.');
    } finally {
      setIsAddingMeter(false);
    }
  };

  const handleSaveMeter = async (e) => {
    e.preventDefault();
    if (!editingMeterName.trim()) { toast.warn("Name cannot be empty."); return; }
    
    setIsUpdating(true);
    try {
      await apiClient.put(`/meters/${editingMeterId}`, { name: editingMeterName, description: editingMeterDescription, colorTheme: editingMeterColorTheme });
      toast.success("Meter updated successfully!");
      closeEditMeterModal();
      // Partial refresh
      const response = await apiClient.get('/meters');
      const allMeters = response.data || [];
      setMeters(allMeters);
      setGeneralPurposeMeters(allMeters.filter(m => m.isGeneralPurpose));
    } catch (err) { 
        toast.error('Update failed.'); 
    } finally { 
        setIsUpdating(false); 
    }
  };

  // Unified Handler: Sets the state AND calls the API for immediate effect
  const handleSetActiveMeter = async (meterId) => {
    if (!meterId) return;
    setIsUpdatingMeter(true);
    try {
      setSelectedActiveMeterId(meterId); // Optimistic UI update
      await apiClient.put(`/meters/${meterId}/set-active-general`);
      toast.success('Active meter updated!');
      
      // Refresh meters to update UI tags from backend source of truth
      const response = await apiClient.get('/meters');
      const allMeters = response.data || [];
      setMeters(allMeters);
      setGeneralPurposeMeters(allMeters.filter(m => m.isGeneralPurpose));
    } catch (err) { 
        toast.error('Failed to update active meter.'); 
        loadAllData(); // Revert on error
    } finally { 
        setIsUpdatingMeter(false); 
    }
  };

  // --- HANDLERS: SETTINGS (TARGET) ---
  const handleSaveSettingsClick = () => {
    const newTarget = parseInt(consumptionTargetInput, 10);
    if (newTarget === consumptionTarget) return; 

    if (isNaN(newTarget) || newTarget <= 0) { 
        toast.warn("Please enter a valid, positive number."); 
        return; 
    }
    setShowTargetConfirm(true);
  };

  const confirmSaveSettings = async () => {
    const newTarget = parseInt(consumptionTargetInput, 10);
    setIsUpdating(true);
    try {
      await apiClient.put('/settings', { consumptionTarget: newTarget });
      toast.success("Consumption target updated successfully!");
      setConsumptionTarget(newTarget);
      setShowTargetConfirm(false); 
    } catch (err) { 
        toast.error("Failed to save settings."); 
    } finally { 
        setIsUpdating(false); 
    }
  };

  const cancelSaveSettings = () => {
      setShowTargetConfirm(false);
      setConsumptionTargetInput(String(consumptionTarget));
  };
  
  const handleResetToDefault = () => {
      setConsumptionTargetInput('500');
  };

  // --- HANDLERS: SLABS ---
  const handleSaveActiveSlabConfig = async () => {
    if (!selectedActiveSlabConfigId) { toast.warn("Please select a config."); return; }
    setIsUpdatingSlab(true);
    try {
      await apiClient.put(`/slabs/${selectedActiveSlabConfigId}/activate`);
      toast.success('Slab configuration activated!');
      const response = await apiClient.get('/slabs');
      setSlabConfigs(response.data || []);
    } catch (err) { toast.error('Activation failed.'); }
    finally { setIsUpdatingSlab(false); }
  };

  const isTargetChanged = parseInt(consumptionTargetInput, 10) !== consumptionTarget;

  // Helper: Meter Badge Color
  const getMeterBadgeColor = (colorTheme) => {
    switch(colorTheme) {
      case 'blue': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'orange': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'purple': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'rose': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
  };

  if (loading) return <Loader text="Loading Settings..." />;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      
      {/* --- HEADER --- */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure your meters, targets, and tariff plans</p>
      </div>

      {/* --- TABS --- */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('general')}
            className={`
              flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
              ${activeTab === 'general' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            <CogIcon />
            General & Meters
          </button>
          <button
            onClick={() => setActiveTab('tariffs')}
            className={`
              flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
              ${activeTab === 'tariffs' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            {/* UPDATED: Rupee Icon */}
            <RupeeIcon />
            Tariff Configurations
          </button>
        </nav>
      </div>

      {/* ================= TAB 1: GENERAL & METERS ================= */}
      {activeTab === 'general' && (
        <div className="space-y-8 animate-[fadeIn_0.2s_ease-out]">
            
            {/* --- UPDATED: APP SETTINGS (Modern Hero Card) --- */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-indigo-50 p-1.5 rounded-lg text-indigo-600">
                            <CogIcon />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">Monthly Consumption Goal</h2>
                    </div>
                    <p className="text-sm text-gray-500 max-w-lg leading-relaxed">
                        Set a budget limit (in units) for your electricity usage. This target powers the visual progress bars on your dashboard to help you stay on track.
                    </p>
                </div>

                <div className="w-full md:w-auto flex flex-col items-end gap-3">
                    <div className="flex w-full md:w-auto shadow-sm rounded-lg overflow-hidden border border-gray-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                        <input 
                            type="number" 
                            value={consumptionTargetInput} 
                            onChange={(e) => setConsumptionTargetInput(e.target.value)}
                            className="block w-full md:w-32 py-2.5 pl-4 pr-2 border-none focus:ring-0 text-gray-900 font-bold text-lg text-right bg-gray-50/50" 
                            placeholder="500"
                        />
                        <span className="flex items-center bg-gray-50 text-gray-500 text-sm font-medium px-3 border-l border-gray-200">
                            units
                        </span>
                        <button 
                            onClick={handleSaveSettingsClick} 
                            disabled={isUpdating || !isTargetChanged || !consumptionTargetInput} 
                            className="bg-indigo-600 text-white px-5 py-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm transition-colors border-l border-indigo-700"
                        >
                            {isUpdating ? 'Saving...' : 'Update'}
                        </button>
                    </div>

                    {consumptionTargetInput !== '500' && (
                        <button 
                            onClick={handleResetToDefault} 
                            disabled={isUpdating} 
                            className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-indigo-600 transition-colors pr-1"
                        >
                            <RefreshIcon /> Reset to default (500)
                        </button>
                    )}
                </div>
            </div>

            {/* 2. METER MANAGEMENT (Card Grid) */}
            <div>
                <div className="flex justify-between items-center mb-4 px-1">
                    <h2 className="text-lg font-bold text-gray-800">Manage Meters</h2>
                    <button 
                        onClick={() => setShowAddMeterModal(true)}
                        className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md font-semibold transition-all shadow-sm flex items-center gap-1"
                    >
                        + Add Meter
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {meters.map((meter) => {
                        const isActive = meter.isCurrentlyActiveGeneral;
                        return (
                            <div 
                                key={meter._id} 
                                className={`
                                    relative p-5 bg-white border rounded-xl shadow-sm transition-all duration-300 hover:shadow-md group
                                    ${isActive ? 'border-green-500 ring-1 ring-green-500' : 'border-gray-200'}
                                `}
                            >
                                {/* Header */}
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getMeterBadgeColor(meter.colorTheme)}`}>
                                        {meter.name}
                                    </span>
                                    {isActive && (
                                        <div className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full border border-green-200">
                                            <CheckBadgeIcon /> Active
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="mb-4">
                                    <p className="text-sm text-gray-500 italic min-h-[1.25rem] line-clamp-2">
                                        {meter.description || 'No description provided'}
                                    </p>
                                    <p className="text-xs font-mono text-gray-400 mt-3 uppercase tracking-wide">
                                        {meter.isGeneralPurpose ? "Switchable Meter" : "Dedicated Meter"}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-auto">
                                    <button 
                                        onClick={() => openEditMeterModal(meter)} 
                                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 font-medium transition-colors p-1 -ml-1 rounded hover:bg-gray-50"
                                    >
                                        <PencilIcon /> Edit
                                    </button>

                                    {/* Show "Set Active" only for General Purpose meters that are NOT active */}
                                    {meter.isGeneralPurpose && !isActive && (
                                        <button 
                                            onClick={() => handleSetActiveMeter(meter._id)}
                                            disabled={isUpdatingMeter}
                                            className="text-xs bg-slate-100 hover:bg-green-600 hover:text-white text-slate-700 px-3 py-1.5 rounded-md font-semibold transition-all shadow-sm"
                                        >
                                            Set Active
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      )}

      {/* ================= TAB 2: TARIFF CONFIGURATIONS ================= */}
      {activeTab === 'tariffs' && (
        <div className="animate-[fadeIn_0.2s_ease-out]">
            {/* We wrap the existing manager so functionality remains 100% same */}
            <SlabRateManager 
                slabConfigs={slabConfigs} 
                selectedConfigId={selectedActiveSlabConfigId}
                onSelectConfig={setSelectedActiveSlabConfigId}
                onSaveActive={handleSaveActiveSlabConfig}
                onRefresh={loadAllData} 
                isUpdating={isUpdatingSlab}
            />
        </div>
      )}

      {/* --- MODAL: EDIT METER --- */}
      {showEditMeterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">Edit Meter Details</h3>
                    <button onClick={closeEditMeterModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                </div>
                <form onSubmit={handleSaveMeter} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Meter Name</label>
                        <input 
                            type="text" 
                            value={editingMeterName} 
                            onChange={(e) => setEditingMeterName(e.target.value)} 
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Description (Optional)</label>
                        <input 
                            type="text" 
                            value={editingMeterDescription} 
                            onChange={(e) => setEditingMeterDescription(e.target.value)} 
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Color Theme</label>
                        <div className="flex gap-3">
                            {COLOR_OPTIONS.map(color => (
                                <button 
                                    key={color.value}
                                    type="button"
                                    onClick={() => setEditingMeterColorTheme(color.value)}
                                    className={`w-8 h-8 rounded-full ${color.bgClass} focus:outline-none transition-transform ${editingMeterColorTheme === color.value ? 'ring-2 ring-offset-2 ring-gray-800 scale-110' : 'opacity-70 hover:opacity-100'}`}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={closeEditMeterModal} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                        <button type="submit" disabled={isUpdating} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-md disabled:opacity-50">
                            {isUpdating ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* --- MODAL: ADD METER --- */}
      {showAddMeterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">Add New Meter</h3>
                    <button onClick={closeAddMeterModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                </div>
                <form onSubmit={handleAddMeter} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Meter Name</label>
                        <input 
                            type="text" 
                            value={newMeterName} 
                            onChange={(e) => setNewMeterName(e.target.value)} 
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g., Main 3-Phase"
                            required
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Meter Type</label>
                        <select
                            value={newMeterType}
                            onChange={(e) => setNewMeterType(e.target.value)}
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="1-phase">1-phase</option>
                            <option value="3-phase">3-phase</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox"
                                id="isGeneralPurpose"
                                checked={newMeterIsGeneralPurpose}
                                onChange={(e) => setNewMeterIsGeneralPurpose(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="isGeneralPurpose" className="text-sm font-bold text-gray-700 cursor-pointer">Switchable Meter</label>
                        </div>
                        <p className="text-xs text-gray-500 ml-6">Check this if the meter can be selected as the primary tracking meter. Do not check for dedicated appliances like AC.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Color Theme</label>
                        <div className="flex gap-3">
                            {COLOR_OPTIONS.map(color => (
                                <button 
                                    key={color.value}
                                    type="button"
                                    onClick={() => setNewMeterColorTheme(color.value)}
                                    className={`w-8 h-8 rounded-full ${color.bgClass} focus:outline-none transition-transform ${newMeterColorTheme === color.value ? 'ring-2 ring-offset-2 ring-gray-800 scale-110' : 'opacity-70 hover:opacity-100'}`}
                                />
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Description (Optional)</label>
                        <input 
                            type="text" 
                            value={newMeterDescription} 
                            onChange={(e) => setNewMeterDescription(e.target.value)} 
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={closeAddMeterModal} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                        <button type="submit" disabled={isAddingMeter} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-md disabled:opacity-50">
                            {isAddingMeter ? 'Adding...' : 'Add Meter'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* --- MODAL: CONFIRM TARGET UPDATE --- */}
      {showTargetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Update Target?</h3>
            <p className="text-gray-600 mb-4 text-sm">
              Change consumption target to <span className="font-bold text-indigo-600">{consumptionTargetInput} units</span>? 
              <br/><br/>
              This will immediately update the progress bars on your dashboard.
            </p>
            <div className="flex justify-end space-x-3">
              <button onClick={cancelSaveSettings} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={confirmSaveSettings} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm">Yes, Update</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default SettingsPage;