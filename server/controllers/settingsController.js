// track-my-watts/server/controllers/settingsController.js
const Setting = require('../models/Settings');

// @desc    Get user settings (or create them if they don't exist)
// @route   GET /api/settings
exports.getSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne({ key: 'user_settings' });

    // If no settings exist yet, create them with default values
    if (!settings) {
      console.log("No settings found, creating with defaults.");
      settings = new Setting();
      await settings.save();
    }

    res.status(200).json(settings);
  } catch (error) {
    console.error("Error getting settings:", error);
    res.status(500).json({ message: "Server error while fetching settings." });
  }
};

// @desc    Update user settings
// @route   PUT /api/settings
exports.updateSettings = async (req, res) => {
  try {
    let { consumptionTarget } = req.body;
    
    const targetVal = parseInt(consumptionTarget, 10);
    if (isNaN(targetVal) || targetVal <= 0) {
        return res.status(400).json({ message: 'Consumption target must be a valid positive number.' });
    }
    consumptionTarget = targetVal;

    // Find the settings document and update it.
    // The { new: true, upsert: true } options mean:
    // - new: return the modified document rather than the original.
    // - upsert: if no document is found, create a new one.
    const updatedSettings = await Setting.findOneAndUpdate(
      { key: 'user_settings' },
      { $set: { consumptionTarget } },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json(updatedSettings);
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ message: "Server error while updating settings." });
  }
};