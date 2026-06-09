import React from 'react';

const SlabRuleInputs = ({ slab, index, onChange, onRemove, category }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 items-center mb-2 p-2 border rounded-md bg-white sm:bg-transparent">
      <div className="sm:col-span-2">
        <label className="text-xs text-gray-600">From Unit</label>
        <input 
            type="number" 
            value={slab.fromUnit} 
            onChange={(e) => onChange(index, 'fromUnit', e.target.value, category)} 
            placeholder="e.g., 1" 
            min="0" 
            step="1" 
            className="mt-1 w-full p-1.5 border border-gray-300 rounded-md text-sm" 
            required 
        />
      </div>
      <div className="sm:col-span-2">
        <label className="text-xs text-gray-600">To Unit</label>
        <input 
            type="number" 
            value={slab.toUnit} 
            onChange={(e) => onChange(index, 'toUnit', e.target.value, category)} 
            placeholder="e.g., 100" 
            min="0" 
            step="1" 
            className="mt-1 w-full p-1.5 border border-gray-300 rounded-md text-sm" 
            required 
        />
      </div>
      <div className="sm:col-span-2">
        <label className="text-xs text-gray-600">Rate (₹)</label>
        <input 
            type="number" 
            value={slab.rate} 
            onChange={(e) => onChange(index, 'rate', e.target.value, category)} 
            placeholder="e.g., 2.35" 
            min="0" 
            step="0.01" 
            className="mt-1 w-full p-1.5 border border-gray-300 rounded-md text-sm" 
            required 
        />
      </div>
      <div className="sm:col-span-1 flex items-end justify-end sm:justify-center pt-2 sm:pt-0">
        <button 
            type="button" 
            onClick={() => onRemove(index, category)} 
            className="text-red-500 hover:text-red-700 text-sm p-1.5"
        >
            Remove
        </button>
      </div>
    </div>
  );
};

export default SlabRuleInputs;
