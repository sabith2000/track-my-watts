// client/src/components/SlabRateManager.jsx
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../services/api';
import SlabRuleInputs from './SlabRuleInputs';

const getCurrentDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

let slabRuleIdCounter = 0;
const generateSlabRuleId = () => {
  slabRuleIdCounter += 1;
  return `slabRule-${Date.now()}-${slabRuleIdCounter}`;
};

const SlabRateManager = ({ 
  slabConfigs, 
  selectedConfigId, 
  onSelectConfig, 
  onSaveActive, 
  onRefresh, 
  isUpdating 
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState(null);
  
  const [newConfigName, setNewConfigName] = useState('');
  const [newEffectiveDate, setNewEffectiveDate] = useState(getCurrentDateString());
  const [newLte500Slabs, setNewLte500Slabs] = useState([{ id: generateSlabRuleId(), fromUnit: '', toUnit: '', rate: '' }]);
  const [newGt500Slabs, setNewGt500Slabs] = useState([{ id: generateSlabRuleId(), fromUnit: '', toUnit: '', rate: '' }]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Modal State for Delete
  const [deleteConfig, setDeleteConfig] = useState(null);
  const [expandedConfigIds, setExpandedConfigIds] = useState([]);

  const toggleExpand = (id) => {
    setExpandedConfigIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Helper logic
  const handleSlabRuleChange = (index, field, value, slabCategory) => {
    const setter = slabCategory === 'lte500' ? setNewLte500Slabs : setNewGt500Slabs;
    setter(prev => prev.map((slab, i) => i === index ? { ...slab, [field]: value } : slab));
  };

  const addSlabRule = (slabCategory) => {
    const setter = slabCategory === 'lte500' ? setNewLte500Slabs : setNewGt500Slabs;
    setter(prev => [...prev, { id: generateSlabRuleId(), fromUnit: '', toUnit: '', rate: '' }]);
  };

  const removeSlabRule = (index, slabCategory) => {
    const setter = slabCategory === 'lte500' ? setNewLte500Slabs : setNewGt500Slabs;
    setter(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  };

  const openAddForm = () => {
    setEditingConfigId(null);
    setNewConfigName('');
    setNewEffectiveDate(getCurrentDateString());
    setNewLte500Slabs([{ id: generateSlabRuleId(), fromUnit: '', toUnit: '', rate: '' }]);
    setNewGt500Slabs([{ id: generateSlabRuleId(), fromUnit: '', toUnit: '', rate: '' }]);
    setShowForm(true);
  };

  const openEditForm = (config) => {
    setEditingConfigId(config._id);
    setNewConfigName(config.configName);
    setNewEffectiveDate(config.effectiveDate ? new Date(config.effectiveDate).toISOString().split('T')[0] : getCurrentDateString());
    
    // Add IDs for React keys
    setNewLte500Slabs(config.slabsLessThanOrEqual500.map(s => ({ ...s, id: generateSlabRuleId() })));
    setNewGt500Slabs(config.slabsGreaterThan500.map(s => ({ ...s, id: generateSlabRuleId() })));
    
    setShowForm(true);
    // Scroll to top where form is
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveSlabConfig = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const validate = (arr) => arr.every(s => s.fromUnit !== '' && s.toUnit !== '' && s.rate !== '' && parseFloat(s.fromUnit) >= 0);
    if (!newConfigName.trim() || !validate(newLte500Slabs) || !validate(newGt500Slabs)) {
      toast.error("Please fill all fields correctly.");
      setIsSaving(false);
      return;
    }

    const parseSlabs = (slabs) => slabs.map(s => ({ fromUnit: parseFloat(s.fromUnit), toUnit: parseFloat(s.toUnit), rate: parseFloat(s.rate) }));
    const payload = {
      configName: newConfigName.trim(), 
      effectiveDate: new Date(newEffectiveDate).toISOString(),
      slabsLessThanOrEqual500: parseSlabs(newLte500Slabs), 
      slabsGreaterThan500: parseSlabs(newGt500Slabs),
    };

    try {
      if (editingConfigId) {
        await apiClient.put(`/slabs/${editingConfigId}`, payload);
        toast.success("Slab configuration updated!");
      } else {
        payload.isCurrentlyActive = false;
        await apiClient.post('/slabs', payload);
        toast.success("Slab configuration added!");
      }
      setShowForm(false);
      setEditingConfigId(null);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${editingConfigId ? 'update' : 'add'} configuration.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfig) return;
    try {
      await apiClient.delete(`/slabs/${deleteConfig._id}`);
      toast.success("Configuration deleted.");
      setDeleteConfig(null);
      onRefresh();
    } catch (err) {
      toast.error("Failed to delete.");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-700 mb-1">Slab Rate Configurations</h2>
            <p className="text-sm text-gray-500">Manage electricity tariff structures.</p>
        </div>
        <button 
            onClick={() => showForm ? setShowForm(false) : openAddForm()}
            className={`w-full sm:w-auto flex-shrink-0 px-4 py-2 text-sm font-medium rounded-md shadow whitespace-nowrap transition-colors ${showForm ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
        >
            {showForm ? 'Cancel' : '+ Add New Slab Configuration'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSaveSlabConfig} className="my-6 p-4 border border-dashed border-gray-300 rounded-lg space-y-6 bg-slate-50">
           <h3 className="text-lg sm:text-xl font-semibold text-slate-600 border-b pb-2">
             {editingConfigId ? 'Edit Slab Configuration Details' : 'New Slab Configuration Details'}
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                  <input type="text" value={newConfigName} onChange={(e) => setNewConfigName(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md text-sm" required />
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date <span className="text-red-500">*</span></label>
                  <input type="date" value={newEffectiveDate} onChange={(e) => setNewEffectiveDate(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md text-sm" required />
              </div>
           </div>
           <div>
             <h4 className="text-base sm:text-md font-semibold text-slate-600 mb-2">Slabs for Consumption &le; 500 Units</h4>
             {newLte500Slabs.map((slab, i) => <SlabRuleInputs key={slab.id} slab={slab} index={i} onChange={handleSlabRuleChange} onRemove={removeSlabRule} category="lte500" />)}
             <button type="button" onClick={() => addSlabRule('lte500')} className="mt-1 text-sm text-blue-600 hover:text-blue-800">+ Add Rule for &le; 500</button>
           </div>
           <div>
             <h4 className="text-base sm:text-md font-semibold text-slate-600 mb-2">Slabs for Consumption &gt; 500 Units</h4>
             {newGt500Slabs.map((slab, i) => <SlabRuleInputs key={slab.id} slab={slab} index={i} onChange={handleSlabRuleChange} onRemove={removeSlabRule} category="gt500" />)}
             <button type="button" onClick={() => addSlabRule('gt500')} className="mt-1 text-sm text-blue-600 hover:text-blue-800">+ Add Rule for &gt; 500</button>
           </div>
           <div className="pt-4 flex justify-end">
             <button type="submit" disabled={isSaving} className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow disabled:opacity-50">
                {isSaving ? 'Saving...' : (editingConfigId ? 'Update Configuration' : 'Save New Configuration')}
             </button>
           </div>
        </form>
      )}

      {/* List of Existing Slabs */}
      {slabConfigs.length > 0 && !showForm ? (
        <div className="space-y-3 mt-6 border-t pt-6">
            <h3 className="text-base sm:text-lg font-semibold text-slate-600 mb-2">Activate Existing Configuration</h3>
            <div className="bg-amber-50 border-l-4 border-amber-400 p-3 mb-4 rounded-r-md">
                <p className="text-sm text-amber-800">
                    <span className="font-bold">⚠️ Note:</span> Changing the active rate will instantly update the estimated bill for the current active billing cycle. Locked historical bills from closed cycles will remain permanently unaffected.
                </p>
            </div>
            {slabConfigs.map(config => {
                const isExpanded = expandedConfigIds.includes(config._id);
                return (
                <div key={config._id} className={`p-3 border rounded-md transition-all duration-200 hover:shadow-md ${selectedConfigId === config._id ? 'bg-indigo-50 border-indigo-300' : 'hover:bg-gray-50'}`}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <label className="flex items-center cursor-pointer flex-grow mr-2">
                            <input 
                                type="radio" 
                                name="activeSlabConfig" 
                                value={config._id} 
                                checked={selectedConfigId === config._id} 
                                onChange={() => onSelectConfig(config._id)} 
                                className="h-5 w-5 text-indigo-600 border-gray-300 focus:ring-indigo-500 flex-shrink-0"
                            />
                            <div className="ml-3">
                                <span className="text-sm sm:text-base text-gray-800 font-medium">{config.configName}</span>
                                <span className="block text-xs sm:text-sm text-gray-500">Effective Date: {formatDate(config.effectiveDate)}</span>
                            </div>
                        </label>
                        <div className="flex items-center self-end sm:self-center w-full sm:w-auto mt-2 sm:mt-0 gap-2">
                            <button onClick={() => toggleExpand(config._id)} className="px-3 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors whitespace-nowrap">
                                {isExpanded ? 'Hide Details' : 'View Details'}
                            </button>
                            <button 
                                onClick={() => openEditForm(config)} 
                                className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 rounded-md transition-colors whitespace-nowrap"
                            >
                                Edit
                            </button>
                            {config.isCurrentlyActive && (
                                <span className="text-xs font-semibold py-0.5 px-2 bg-green-200 text-green-800 rounded-full whitespace-nowrap ml-auto">Currently Active</span>
                            )}
                            {!config.isCurrentlyActive && (
                                <button 
                                    onClick={() => setDeleteConfig(config)} 
                                    className="px-3 py-1 text-xs font-medium text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 rounded-md transition-colors whitespace-nowrap ml-auto"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    </div>
                    {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Slabs for ≤ 500 Units</h4>
                                <table className="min-w-full text-xs sm:text-sm text-left bg-white border rounded">
                                    <thead className="bg-gray-50 text-gray-600">
                                        <tr><th className="px-2 py-1">From</th><th className="px-2 py-1">To</th><th className="px-2 py-1">Rate (₹)</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {config.slabsLessThanOrEqual500.map((s, i) => (
                                            <tr key={i}><td className="px-2 py-1">{s.fromUnit}</td><td className="px-2 py-1">{s.toUnit === 999999 ? '∞' : s.toUnit}</td><td className="px-2 py-1 font-medium">{s.rate}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Slabs for &gt; 500 Units</h4>
                                <table className="min-w-full text-xs sm:text-sm text-left bg-white border rounded">
                                    <thead className="bg-gray-50 text-gray-600">
                                        <tr><th className="px-2 py-1">From</th><th className="px-2 py-1">To</th><th className="px-2 py-1">Rate (₹)</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {config.slabsGreaterThan500.map((s, i) => (
                                            <tr key={i}><td className="px-2 py-1">{s.fromUnit}</td><td className="px-2 py-1">{s.toUnit === 999999 ? '∞' : s.toUnit}</td><td className="px-2 py-1 font-medium">{s.rate}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
                );
            })}
            <div className="mt-6">
                <button 
                    onClick={onSaveActive} 
                    disabled={isUpdating || !selectedConfigId || (slabConfigs.find(sc => sc._id === selectedConfigId)?.isCurrentlyActive)} 
                    className="w-full sm:w-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isUpdating ? 'Activating...' : 'Set Selected Slabs as Active'}
                </button>
            </div>
        </div>
      ) : !showForm && (
        <p className="text-gray-600 mt-4 text-center">No slab rate configurations found.</p>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete <span className="font-bold">{deleteConfig.configName}</span>?</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setDeleteConfig(null)} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SlabRateManager;