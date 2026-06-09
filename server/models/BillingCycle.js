// server/models/BillingCycle.js
const mongoose = require('mongoose');

const billingCycleSchema = new mongoose.Schema({
  startDate: {
    type: Date,
    required: [true, 'Start date of the billing cycle is required.'],
    default: Date.now // Default to now, but will usually be set explicitly
  },
  endDate: { // Set when the government officer collects readings
    type: Date,
    default: null // Null until the cycle is officially closed
  },
  governmentCollectionDate: { // The actual date officer collected readings
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active'
  },
  notes: { // Optional notes for the cycle
    type: String,
    trim: true
  },
  // === SNAPSHOT FIELDS (populated on cycle closure) ===
  finalTotalUnits: {
    type: Number,
    default: 0
  },
  finalTotalCost: {
    type: Number,
    default: 0
  },
  finalMeterDetails: [{
    meterName: { type: String, required: true },
    meterType: { type: String, required: true },
    units: { type: Number, required: true },
    cost: { type: Number, required: true }
  }],
  appliedSlabRateSnapshot: {
    configName: { type: String },
    effectiveDate: { type: Date },
    slabsLessThanOrEqual500: [{
      fromUnit: { type: Number },
      toUnit: { type: Number },
      rate: { type: Number }
    }],
    slabsGreaterThan500: [{
      fromUnit: { type: Number },
      toUnit: { type: Number },
      rate: { type: Number }
    }]
  }
}, { timestamps: true }); // timestamps will add createdAt and updatedAt

// Middleware to ensure only one 'active' billing cycle exists
billingCycleSchema.pre('save', async function(next) {
  if (this.isNew && this.status === 'active') {
    // If a new cycle is being created as 'active',
    // ensure all other cycles are 'closed'.
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, status: 'active' },
      { $set: { status: 'closed' } }
    );
  }
  next();
});

module.exports = mongoose.model('BillingCycle', billingCycleSchema);