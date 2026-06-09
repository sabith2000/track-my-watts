// meter-tracker/models/SlabRateConfig.js
const mongoose = require('mongoose');

// Define the structure for individual slabs
const slabSchema = new mongoose.Schema({
  fromUnit: { type: Number, required: true }, // Inclusive start of the unit range
  toUnit: { type: Number, required: true },   // Inclusive end of the unit range (can be Infinity for the last slab)
  rate: { type: Number, required: true }      // Cost per unit for this slab
}, { _id: false }); // _id: false because these are subdocuments

const slabRateConfigSchema = new mongoose.Schema({
  configName: { // e.g., "Rates from July 2024", "Default Rates"
    type: String,
    required: true,
    unique: true
  },
  effectiveDate: { // Date when these rates become effective
    type: Date,
    default: Date.now
  },
  isCurrentlyActive: { // To mark if this configuration is the one to use
    type: Boolean,
    default: false
  },
  // Slabs for consumption <= 500 units
  slabsLessThanOrEqual500: [slabSchema],
  // Slabs for consumption > 500 units
  slabsGreaterThan500: [slabSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Cost calculation logic has been moved to a shared utility:
// See server/utils/costCalculator.js

module.exports = mongoose.model('SlabRateConfig', slabRateConfigSchema);