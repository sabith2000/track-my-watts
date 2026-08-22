// client/src/pages/WelcomeWizardPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import notify from '../utils/toast';
import SlabRuleInputs from '../components/SlabRuleInputs';

const COLOR_OPTIONS = [
  { value: 'emerald', label: 'Emerald', bgClass: 'bg-emerald-500' },
  { value: 'blue', label: 'Blue', bgClass: 'bg-blue-500' },
  { value: 'orange', label: 'Orange', bgClass: 'bg-orange-500' },
  { value: 'purple', label: 'Purple', bgClass: 'bg-purple-500' },
  { value: 'rose', label: 'Rose', bgClass: 'bg-rose-500' }
];

let slabRuleIdCounter = 0;
const generateSlabRuleId = () => {
  slabRuleIdCounter += 1;
  return `wizSlab-${Date.now()}-${slabRuleIdCounter}`;
};

function WelcomeWizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Step 1 State (Tariffs) ---
  const [configName, setConfigName] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  
  // Default slabs to help them get started
  const [slabsLTE500, setSlabsLTE500] = useState([
    { id: generateSlabRuleId(), fromUnit: '', toUnit: '', rate: '' }
  ]);
  const [slabsGT500, setSlabsGT500] = useState([
    { id: generateSlabRuleId(), fromUnit: '', toUnit: '', rate: '' }
  ]);

  const handleSlabRuleChange = (index, field, value, slabCategory) => {
    const setter = slabCategory === 'lte500' ? setSlabsLTE500 : setSlabsGT500;
    setter(prev => prev.map((slab, i) => i === index ? { ...slab, [field]: value } : slab));
  };

  const addSlabRule = (slabCategory) => {
    const setter = slabCategory === 'lte500' ? setSlabsLTE500 : setSlabsGT500;
    setter(prev => [...prev, { id: generateSlabRuleId(), fromUnit: '', toUnit: '', rate: '' }]);
  };

  const removeSlabRule = (index, slabCategory) => {
    const setter = slabCategory === 'lte500' ? setSlabsLTE500 : setSlabsGT500;
    setter(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  };

  // --- Step 2 State (Meters) ---
  const [meters, setMeters] = useState([]);
  const [newMeterName, setNewMeterName] = useState('');
  const [newMeterType, setNewMeterType] = useState('1-phase');
  const [newMeterIsGeneralPurpose, setNewMeterIsGeneralPurpose] = useState(false);
  const [newMeterColorTheme, setNewMeterColorTheme] = useState('emerald');

  // --- Step 3 State (Billing Cycle) ---
  const [cycleStartDate, setCycleStartDate] = useState(new Date().toISOString().split('T')[0]);

  // --- Handlers ---
  const handleNextStep1 = () => {
    const validate = (arr) => arr.every(s => s.fromUnit !== '' && s.toUnit !== '' && s.rate !== '' && parseFloat(s.fromUnit) >= 0);
    if (!configName.trim() || !validate(slabsLTE500) || !validate(slabsGT500)) {
      notify.warn('Please fill all tariff fields correctly.');
      return;
    }
    setStep(2);
  };

  const handleAddMeterLocal = (e) => {
    e.preventDefault();
    if (!newMeterName.trim()) return;
    
    setMeters([...meters, {
      name: newMeterName.trim(),
      meterType: newMeterType,
      isGeneralPurpose: newMeterIsGeneralPurpose,
      colorTheme: newMeterColorTheme,
      isCurrentlyActiveGeneral: newMeterIsGeneralPurpose && (meters.filter(m => m.isGeneralPurpose).length === 0)
    }]);
    
    // Reset form
    setNewMeterName('');
    setNewMeterType('1-phase');
    setNewMeterIsGeneralPurpose(false);
    setNewMeterColorTheme('emerald');
  };

  const handleRemoveMeterLocal = (index) => {
    setMeters(meters.filter((_, i) => i !== index));
  };

  const handleNextStep2 = () => {
    if (meters.length === 0) {
      notify.warn('Please add at least one meter to continue.');
      return;
    }
    setStep(3);
  };

  const handleFinishWizard = async () => {
    if (!cycleStartDate) { notify.warn('Please select a start date.'); return; }
    setIsSubmitting(true);
    
    try {
      // 1. Create the slab rate
      const parseSlabs = (slabs) => slabs.map(s => ({ fromUnit: parseFloat(s.fromUnit), toUnit: parseFloat(s.toUnit), rate: parseFloat(s.rate) }));
      const slabRes = await apiClient.post('/slabs', {
        configName: configName.trim(),
        effectiveDate: new Date(effectiveDate).toISOString(),
        slabsLessThanOrEqual500: parseSlabs(slabsLTE500),
        slabsGreaterThan500: parseSlabs(slabsGT500)
      });
      
      // 2. Automatically set it as active
      await apiClient.put(`/slabs/${slabRes.data._id}/activate`);

      // 3. Create all meters sequentially to ensure predictable saving
      for (const meter of meters) {
        await apiClient.post('/meters', meter);
      }

      // 4. Create first billing cycle
      await apiClient.post('/billing-cycles/start', {
        startDate: cycleStartDate,
        notes: 'Initial Billing Cycle'
      });
      
      notify.success('Setup Complete! Welcome to Track My Watts.');
      window.location.href = '/'; 
    } catch (error) {
      console.error(error);
      notify.error(error, 'Failed to initialize the system. Please check your data and try again.');
      setIsSubmitting(false); // Let them fix it and retry
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 p-4 selection:bg-green-200">
      
      {/* HEADER LOGO */}
      <div className="mb-8 flex flex-col items-center">
        <div className="relative group mb-3">
          <div className="absolute inset-0 bg-green-500 blur-2xl opacity-40 rounded-full animate-pulse"></div>
          <img src="/logo.png" alt="Logo" className="w-20 h-20 relative z-10 drop-shadow-xl" />
        </div>
        <h1 className="font-display text-4xl uppercase tracking-wider text-slate-800">Track My Watts</h1>
        <p className="text-slate-500 text-sm font-medium mt-1">Let's get your environment set up!</p>
      </div>

      {/* WIZARD CONTAINER */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-3xl overflow-hidden transition-all duration-300">
        
        {/* STEPPER HEADER */}
        <div className="bg-slate-900 text-white p-5 px-8 flex justify-between items-center relative">
          <div className="absolute bottom-0 left-0 h-1 bg-green-500 transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }}></div>
          {[1, 2, 3].map(num => (
            <div key={num} className={`flex items-center gap-2 ${step >= num ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step === num ? 'bg-green-500 text-slate-900' : (step > num ? 'bg-white text-slate-900' : 'bg-slate-700')}`}>
                {step > num ? '✓' : num}
              </div>
              <span className="hidden sm:inline font-medium text-sm">
                {num === 1 ? 'Tariffs' : num === 2 ? 'Meters' : 'Start Cycle'}
              </span>
            </div>
          ))}
        </div>

        {/* STEP CONTENT */}
        <div className="p-6 sm:p-8 animate-[fadeIn_0.3s_ease-out]">
          
          {/* ----- STEP 1: TARIFFS ----- */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Set Up Your Initial Tariff</h2>
                <p className="text-sm text-slate-500 mt-1">We've pre-filled standard residential rates. Adjust them if needed!</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Configuration Name</label>
                  <input type="text" value={configName} onChange={e => setConfigName(e.target.value)} placeholder="e.g. Standard Residential Rate" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Effective Date</label>
                  <input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" />
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                 <h4 className="text-base font-bold text-slate-700 mb-3">Slabs for Consumption &le; 500 Units</h4>
                 {slabsLTE500.map((slab, i) => <SlabRuleInputs key={slab.id} slab={slab} index={i} onChange={handleSlabRuleChange} onRemove={removeSlabRule} category="lte500" />)}
                 <button type="button" onClick={() => addSlabRule('lte500')} className="mt-2 text-sm font-bold text-indigo-600 hover:text-indigo-800">+ Add Rule for &le; 500</button>
              </div>
              
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                 <h4 className="text-base font-bold text-slate-700 mb-3">Slabs for Consumption &gt; 500 Units</h4>
                 {slabsGT500.map((slab, i) => <SlabRuleInputs key={slab.id} slab={slab} index={i} onChange={handleSlabRuleChange} onRemove={removeSlabRule} category="gt500" />)}
                 <button type="button" onClick={() => addSlabRule('gt500')} className="mt-2 text-sm font-bold text-indigo-600 hover:text-indigo-800">+ Add Rule for &gt; 500</button>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button onClick={handleNextStep1} className="bg-slate-900 text-white px-6 py-2.5 rounded-lg font-bold shadow-md hover:bg-slate-800 transition-colors">
                  Save Tariffs & Continue →
                </button>
              </div>
            </div>
          )}

          {/* ----- STEP 2: METERS ----- */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Add Your Meters</h2>
                <p className="text-sm text-slate-500 mt-1">Add the physical meters you want to track.</p>
              </div>

              {/* Added Meters List */}
              {meters.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-6">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Meters Configured ({meters.length})</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {meters.map((m, i) => (
                      <div key={i} className="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full bg-${m.colorTheme}-500`}></div>
                            <div>
                            <p className="text-sm font-bold text-slate-800 leading-tight">{m.name}</p>
                            <p className="text-xs text-slate-500">{m.isGeneralPurpose ? 'Switchable' : 'Dedicated'} • {m.meterType}</p>
                            </div>
                        </div>
                        <button onClick={() => handleRemoveMeterLocal(i)} className="text-red-400 hover:text-red-600 font-bold px-2 py-1 bg-red-50 rounded text-xs">Remove</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Meter Form */}
              <form onSubmit={handleAddMeterLocal} className="bg-white border rounded-xl p-5 shadow-sm space-y-4">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded flex justify-center items-center text-sm">+</span> 
                  Configure a New Meter
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Meter Name</label>
                    <input type="text" value={newMeterName} onChange={e => setNewMeterName(e.target.value)} required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. Main Box" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
                    <select value={newMeterType} onChange={e => setNewMeterType(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none">
                      <option value="1-phase">1-phase</option>
                      <option value="3-phase">3-phase</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                    <input type="checkbox" id="wizIsGeneral" checked={newMeterIsGeneralPurpose} onChange={e => setNewMeterIsGeneralPurpose(e.target.checked)} className="w-4 h-4 text-green-600 rounded focus:ring-green-500" />
                    <label htmlFor="wizIsGeneral" className="text-sm font-bold text-slate-700 cursor-pointer">Switchable Meter</label>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Color Theme</label>
                    <div className="flex gap-3">
                        {COLOR_OPTIONS.map(color => (
                            <button key={color.value} type="button" onClick={() => setNewMeterColorTheme(color.value)} className={`w-8 h-8 rounded-full ${color.bgClass} transition-transform ${newMeterColorTheme === color.value ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'opacity-50 hover:opacity-100'}`} />
                        ))}
                    </div>
                </div>

                <div className="pt-2 flex justify-end">
                   <button type="submit" disabled={!newMeterName.trim()} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-bold shadow hover:bg-indigo-700 disabled:opacity-50">
                     + Add to List
                   </button>
                </div>
              </form>

              <div className="flex justify-between items-center pt-4 border-t">
                <button onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-700 font-bold text-sm">
                  ← Back
                </button>
                <button onClick={handleNextStep2} className="bg-slate-900 text-white px-6 py-2.5 rounded-lg font-bold shadow-md hover:bg-slate-800 transition-colors">
                  Save Meters & Continue →
                </button>
              </div>
            </div>
          )}

          {/* ----- STEP 3: START CYCLE ----- */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Final Step: Start Cycle</h2>
                <p className="text-sm text-slate-500 mt-1">When did this current billing period begin?</p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center max-w-sm mx-auto shadow-inner">
                 <label className="block text-sm font-bold text-green-900 mb-3">Cycle Start Date</label>
                 <input type="date" value={cycleStartDate} onChange={e => setCycleStartDate(e.target.value)} className="w-full p-4 bg-white border border-green-300 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 outline-none text-center font-bold text-xl text-slate-800 shadow-sm" />
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center mt-6">
                  <p className="text-sm text-indigo-800 font-medium">Clicking Launch will save your new Tariff configuration, {meters.length} meter(s), and start tracking your first billing cycle!</p>
              </div>

              <div className="flex justify-between items-center pt-8 border-t">
                <button onClick={() => setStep(2)} disabled={isSubmitting} className="text-slate-500 hover:text-slate-700 font-bold text-sm disabled:opacity-50">
                  ← Back
                </button>
                <button onClick={handleFinishWizard} disabled={isSubmitting} className="w-full sm:w-auto bg-green-500 text-slate-900 px-8 py-3 rounded-xl font-black text-lg shadow-lg hover:bg-green-400 hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:hover:scale-100">
                  {isSubmitting ? 'Initializing System...' : 'Launch Dashboard! 🚀'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default WelcomeWizardPage;
