// meter-tracker/models/Meter.js
const mongoose = require('mongoose');

const meterSchema = new mongoose.Schema({
  name: { // User-friendly name, e.g., "Main 3-Phase", "AC Room Meter", "Backup 1-Phase"
    type: String,
    required: [true, 'Meter name is required.'],
    trim: true,
    unique: true // Assuming each meter has a unique name for easier identification
  },
  meterType: { // e.g., "3-phase", "1-phase"
    type: String,
    enum: ['1-phase', '3-phase'],
    required: [true, 'Meter type is required.']
  },
  isGeneralPurpose: {
    // True for meters that power general home connections (M1, M3)
    // False for dedicated meters like AC (M2)
    type: Boolean,
    required: true,
    default: false
  },
  isCurrentlyActiveGeneral: {
    // If isGeneralPurpose is true, this indicates if it's the ONE currently in use
    // for general consumption. Only one general purpose meter should have this true.
    type: Boolean,
    default: false
  },
  description: { // Optional notes about the meter
    type: String,
    trim: true
  },
  colorTheme: { // e.g., 'blue', 'emerald', 'orange', 'purple', 'rose'
    type: String,
    default: 'emerald'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware to ensure only one general purpose meter is active
// This pre-save hook will run before a 'save' operation on a Meter document.
meterSchema.pre('save', async function (next) {
  // 'this' refers to the document being saved
  if (this.isGeneralPurpose && this.isCurrentlyActiveGeneral) {
    // If this meter is being set as the active general meter,
    // then set all other general purpose meters to not active.
    // 'this.constructor' refers to the Meter model.
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, isGeneralPurpose: true }, // $ne means "not equal"
      { $set: { isCurrentlyActiveGeneral: false } }
    );
  } else if (this.isGeneralPurpose && !this.isCurrentlyActiveGeneral) {
    // If a general purpose meter is being saved as inactive,
    // check if any other general purpose meter is active.
    // If not, and this is the only general purpose meter, it could be set active,
    // or we ensure at least one is active if there are multiple.
    // For simplicity now, we'll handle explicit activation via a dedicated endpoint.
    // This just ensures consistency if one is explicitly saved as inactive.
    const activeGeneralMeters = await this.constructor.countDocuments({
        isGeneralPurpose: true,
        isCurrentlyActiveGeneral: true,
        _id: { $ne: this._id } // Exclude the current document if it's being updated
    });
    // If this meter was the active one and is now being set to inactive,
    // and no other general meter is active, this could be an issue.
    // However, the dedicated "set active" endpoint is a better place to manage this.
  }
  next();
});

module.exports = mongoose.model('Meter', meterSchema);