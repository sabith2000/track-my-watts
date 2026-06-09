// meter-tracker/controllers/slabRateController.js
const SlabRateConfig = require('../models/SlabRateConfig');

// @desc    Add a new slab rate configuration
// @route   POST /api/slabs
// @access  Public (for now, will add auth later if needed)
exports.addSlabRateConfig = async (req, res) => {
    try {
        let {
            configName,
            effectiveDate,
            isCurrentlyActive,
            slabsLessThanOrEqual500,
            slabsGreaterThan500
        } = req.body;

        configName = configName ? String(configName).trim() : '';

        // Basic validation
        if (!configName || !slabsLessThanOrEqual500 || !slabsGreaterThan500) {
            return res.status(400).json({ message: 'Config name and both slab categories are required.' });
        }
        
        if (!Array.isArray(slabsLessThanOrEqual500) || slabsLessThanOrEqual500.length === 0) {
            return res.status(400).json({ message: 'slabsLessThanOrEqual500 must be a non-empty array.' });
        }
        
        if (!Array.isArray(slabsGreaterThan500) || slabsGreaterThan500.length === 0) {
            return res.status(400).json({ message: 'slabsGreaterThan500 must be a non-empty array.' });
        }

        // If this new config is set to active, deactivate others
        if (isCurrentlyActive) {
            await SlabRateConfig.updateMany({}, { $set: { isCurrentlyActive: false } });
        }

        const newConfig = new SlabRateConfig({
            configName,
            effectiveDate,
            isCurrentlyActive,
            slabsLessThanOrEqual500,
            slabsGreaterThan500
        });

        const savedConfig = await newConfig.save();
        res.status(201).json(savedConfig);
    } catch (error) {
        console.error('Error adding slab rate config:', error);
        if (error.code === 11000) { // Duplicate key error (for configName)
            return res.status(400).json({ message: 'Configuration name already exists.' });
        }
        res.status(500).json({ message: 'Server error while adding slab rate config.' });
    }
};

// @desc    Get all slab rate configurations
// @route   GET /api/slabs
// @access  Public
exports.getSlabRateConfigs = async (req, res) => {
    try {
        const configs = await SlabRateConfig.find().sort({ effectiveDate: -1 }); // Sort by newest first
        res.status(200).json(configs);
    } catch (error) {
        console.error('Error fetching slab rate configs:', error);
        res.status(500).json({ message: 'Server error while fetching slab rate configs.' });
    }
};

// @desc    Get the currently active slab rate configuration
// @route   GET /api/slabs/active
// @access  Public
exports.getActiveSlabRateConfig = async (req, res) => {
    try {
        const activeConfig = await SlabRateConfig.findOne({ isCurrentlyActive: true });
        if (!activeConfig) {
            return res.status(404).json({ message: 'No active slab rate configuration found.' });
        }
        res.status(200).json(activeConfig);
    } catch (error) {
        console.error('Error fetching active slab rate config:', error);
        res.status(500).json({ message: 'Server error while fetching active slab rate config.' });
    }
};

// @desc    Set a slab rate configuration to active
// @route   PUT /api/slabs/:id/activate
// @access  Public
exports.setActiveSlabRateConfig = async (req, res) => {
    try {
        const configId = req.params.id;

        // Deactivate all other configurations
        await SlabRateConfig.updateMany({ _id: { $ne: configId } }, { $set: { isCurrentlyActive: false } });

        // Activate the specified configuration
        const updatedConfig = await SlabRateConfig.findByIdAndUpdate(
            configId,
            { $set: { isCurrentlyActive: true } },
            { new: true } // Return the updated document
        );

        if (!updatedConfig) {
            return res.status(404).json({ message: 'Slab rate configuration not found.' });
        }

        res.status(200).json(updatedConfig);
    } catch (error) {
        console.error('Error activating slab rate config:', error);
        res.status(500).json({ message: 'Server error while activating slab rate config.' });
    }
};

// ... (keep existing functions: addSlabRateConfig, getSlabRateConfigs, getActiveSlabRateConfig, setActiveSlabRateConfig)

// @desc    Update a slab rate configuration
// @route   PUT /api/slabs/:id
// @access  Public
exports.updateSlabRateConfig = async (req, res) => {
    try {
        const configId = req.params.id;
        let {
            configName,
            effectiveDate,
            slabsLessThanOrEqual500,
            slabsGreaterThan500
        } = req.body;

        configName = configName ? String(configName).trim() : '';

        // Basic validation
        if (!configName || !slabsLessThanOrEqual500 || !slabsGreaterThan500) {
            return res.status(400).json({ message: 'Config name and both slab categories are required.' });
        }
        
        if (!Array.isArray(slabsLessThanOrEqual500) || slabsLessThanOrEqual500.length === 0) {
            return res.status(400).json({ message: 'slabsLessThanOrEqual500 must be a non-empty array.' });
        }
        
        if (!Array.isArray(slabsGreaterThan500) || slabsGreaterThan500.length === 0) {
            return res.status(400).json({ message: 'slabsGreaterThan500 must be a non-empty array.' });
        }

        const updatedConfig = await SlabRateConfig.findByIdAndUpdate(
            configId,
            {
                $set: {
                    configName,
                    effectiveDate,
                    slabsLessThanOrEqual500,
                    slabsGreaterThan500
                }
            },
            { new: true, runValidators: true } // Return updated and run validators
        );

        if (!updatedConfig) {
            return res.status(404).json({ message: 'Slab rate configuration not found.' });
        }

        res.status(200).json(updatedConfig);
    } catch (error) {
        console.error('Error updating slab rate config:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Configuration name already exists.' });
        }
        res.status(500).json({ message: 'Server error while updating slab rate configuration.' });
    }
};

// @desc    Delete a slab rate configuration
// @route   DELETE /api/slabs/:id
// @access  Public (for now)
exports.deleteSlabRateConfig = async (req, res) => {
  try {
    const configId = req.params.id;
    const configToDelete = await SlabRateConfig.findById(configId);

    if (!configToDelete) {
      return res.status(404).json({ message: 'Slab rate configuration not found.' });
    }

    // Prevent deletion of an active configuration
    if (configToDelete.isCurrentlyActive) {
      return res.status(400).json({ message: 'Cannot delete an active slab rate configuration. Please activate another configuration first.' });
    }

    await SlabRateConfig.findByIdAndDelete(configId);
    // or await configToDelete.deleteOne(); for Mongoose 7+ if you prefer instance method

    res.status(200).json({ message: 'Slab rate configuration deleted successfully.' });

  } catch (error) {
    console.error('Error deleting slab rate config:', error);
    res.status(500).json({ message: 'Server error while deleting slab rate configuration.' });
  }
};