// track-my-watts/server/controllers/meterController.js
const Meter = require('../models/Meter');

// @desc    Add a new meter
// @route   POST /api/meters
exports.addMeter = async (req, res) => {
  try {
    const name = req.body.name ? String(req.body.name).trim() : '';
    const meterType = req.body.meterType;
    const description = req.body.description ? String(req.body.description).trim() : '';
    const colorTheme = req.body.colorTheme ? String(req.body.colorTheme).trim() : 'emerald';
    const isGeneralPurpose = req.body.isGeneralPurpose;
    const isCurrentlyActiveGeneral = req.body.isCurrentlyActiveGeneral;
    
    if (!name || !meterType) { return res.status(400).json({ message: 'Meter name and type are required.' }); }
    if (meterType !== '1-phase' && meterType !== '3-phase') { return res.status(400).json({ message: 'Meter type must be 1-phase or 3-phase.' }); }
    if (typeof isGeneralPurpose !== 'boolean') { return res.status(400).json({ message: 'isGeneralPurpose field is required and must be a boolean (true or false).' }); }
    const newMeter = new Meter({ name, meterType, isGeneralPurpose, description, colorTheme, isCurrentlyActiveGeneral: isGeneralPurpose ? (isCurrentlyActiveGeneral || false) : false });
    const savedMeter = await newMeter.save();
    res.status(201).json(savedMeter);
  } catch (error) {
    if (error.code === 11000) { return res.status(400).json({ message: 'Meter name already exists.' }); }
    res.status(500).json({ message: 'Server error while adding meter.' });
  }
};

// @desc    Get all meters
// @route   GET /api/meters
exports.getAllMeters = async (req, res) => {
  try {
    const meters = await Meter.find().sort({ createdAt: 1 });
    res.status(200).json(meters);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching meters.' });
  }
};

// @desc    Get a single meter by ID
// @route   GET /api/meters/:id
// @access  Public
exports.getMeterById = async (req, res) => {
  try {
    const meter = await Meter.findById(req.params.id);
    if (!meter) {
      return res.status(404).json({ message: 'Meter not found.' });
    }
    res.status(200).json(meter);
  } catch (error) {
    console.error('Error fetching meter by ID:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// --- MODIFIED: `updateMeter` now handles renaming ---
// @desc    Update a meter (e.g., rename it)
// @route   PUT /api/meters/:id
exports.updateMeter = async (req, res) => {
    try {
        // We only expect 'name', 'description', and 'colorTheme' for this update endpoint now
        let { name, description, colorTheme } = req.body;
        if (name !== undefined) name = String(name).trim();
        if (description !== undefined) description = String(description).trim();
        if (colorTheme !== undefined) colorTheme = String(colorTheme).trim();
        
        if (!name) {
            return res.status(400).json({ message: 'Meter name is required.' });
        }

        const meter = await Meter.findById(req.params.id);
        if (!meter) {
            return res.status(404).json({ message: 'Meter not found.' });
        }

        meter.name = name;
        if (description !== undefined) {
            meter.description = description;
        }
        if (colorTheme !== undefined) {
            meter.colorTheme = colorTheme;
        }

        const updatedMeter = await meter.save();
        res.status(200).json(updatedMeter);
    } catch (error) {
        console.error('Error updating meter:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Another meter with this name already exists.' });
        }
        res.status(500).json({ message: 'Server error while updating meter.' });
    }
};


// @desc    Set a general purpose meter as the active one
// @route   PUT /api/meters/:id/set-active-general
exports.setActiveGeneralMeter = async (req, res) => {
  try {
    const meterToActivate = await Meter.findById(req.params.id);
    if (!meterToActivate) { return res.status(404).json({ message: 'Meter not found.' }); }
    if (!meterToActivate.isGeneralPurpose) { return res.status(400).json({ message: 'This meter is not a general purpose meter.' }); }
    meterToActivate.isCurrentlyActiveGeneral = true;
    await meterToActivate.save();
    res.status(200).json(meterToActivate);
  } catch (error) {
    res.status(500).json({ message: 'Server error while setting active general meter.' });
  }
};

// (I have added back) Note: getMeterById was removed as it's not currently used by the frontend, but can be added back if needed.