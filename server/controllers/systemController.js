// track-my-watts/server/controllers/systemController.js
const Meter = require('../models/Meter');
const SlabRateConfig = require('../models/SlabRateConfig');
const BillingCycle = require('../models/BillingCycle');

// @desc    Get system initialization status
// @route   GET /api/system/status
exports.getSystemStatus = async (req, res) => {
  try {
    const meterCount = await Meter.countDocuments();
    const slabCount = await SlabRateConfig.countDocuments();
    const cycleCount = await BillingCycle.countDocuments();

    const hasMeters = meterCount > 0;
    const hasSlabs = slabCount > 0;
    const hasCycles = cycleCount > 0;

    const isInitialized = hasMeters && hasSlabs && hasCycles;

    res.status(200).json({
      isInitialized,
      setupProgress: {
        hasMeters,
        hasSlabs,
        hasCycles
      }
    });
  } catch (error) {
    console.error('Error fetching system status:', error);
    res.status(500).json({ message: 'Server error while fetching system status.' });
  }
};
