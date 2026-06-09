// meter-tracker/controllers/readingController.js
const Reading = require('../models/Reading');
const Meter = require('../models/Meter');
const BillingCycle = require('../models/BillingCycle');

// @desc    Add a new meter reading
// @route   POST /api/readings
// @access  Public
// meter-tracker/server/controllers/readingController.js
// ... (other imports at the top)

exports.addReading = async (req, res) => {
  try {
    let { meterId, date, readingValue, notes, isEstimated } = req.body;

    const newReadingValueFloat = parseFloat(readingValue);
    if (!meterId || !date || isNaN(newReadingValueFloat)) {
      return res.status(400).json({ message: 'Meter ID, date, and valid numeric reading value are required.' });
    }
    notes = notes ? String(notes).trim() : '';

    const meterExists = await Meter.findById(meterId);
    if (!meterExists) {
      return res.status(404).json({ message: 'Meter not found.' });
    }

    const activeBillingCycle = await BillingCycle.findOne({ status: 'active' });
    if (!activeBillingCycle) {
      return res.status(400).json({ message: 'No active billing cycle found. Please start or activate a billing cycle.' });
    }
    
    const readingDate = new Date(date);
    if (readingDate < activeBillingCycle.startDate) {
         return res.status(400).json({ message: `Reading date (${readingDate.toLocaleDateString()}) cannot be before the start date (${activeBillingCycle.startDate.toLocaleDateString()}) of the active billing cycle.` });
    }

    const previousReading = await Reading.findOne({ meter: meterId })
      .sort({ date: -1, createdAt: -1 });

    let unitsConsumed = 0;

    if (previousReading) {
      // --- START OF NEW VALIDATION ---
      if (newReadingValueFloat < previousReading.readingValue) {
        return res.status(400).json({
          message: `New reading value (${newReadingValueFloat}) for meter "${meterExists.name}" must be greater than or equal to its previous reading value (${previousReading.readingValue} recorded on ${new Date(previousReading.date).toLocaleDateString()}). Please enter a valid sequential reading.`,
        });
      }
      // --- END OF NEW VALIDATION ---
      unitsConsumed = newReadingValueFloat - previousReading.readingValue;
    } else {
      // This is the first reading for this meter in the system.
      unitsConsumed = 0; // Establishes baseline for consumption calculation within the app for this meter
    }

    const newReading = new Reading({
      meter: meterId,
      billingCycle: activeBillingCycle._id,
      date: readingDate,
      readingValue: newReadingValueFloat, // Use the parsed float value
      unitsConsumedSincePrevious: unitsConsumed,
      notes,
      isEstimated
    });

    const savedReading = await newReading.save();
    res.status(201).json(savedReading);

  } catch (error) {
    console.error('Error adding reading:', error);
    // Handle other potential errors like database issues, etc.
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: "Validation Error", details: error.message });
    }
    res.status(500).json({ message: 'Server error while adding reading.' });
  }
};

// ... (rest of the controller functions: getAllReadings, getReadingById, etc.)

// @desc    Get all readings (optionally filtered by meter and/or billing cycle)
// @route   GET /api/readings
// @access  Public
exports.getAllReadings = async (req, res) => {
  try {
    const { meterId, billingCycleId, startDate, endDate, limit = 20, page = 1 } = req.query;
    const query = {};

    if (meterId) query.meter = meterId;
    if (billingCycleId) query.billingCycle = billingCycleId;
    if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate); // $gte: greater than or equal
        if (endDate) query.date.$lte = new Date(endDate);     // $lte: less than or equal
    }

    const options = {
        sort: { date: -1, createdAt: -1 }, // Show newest readings first
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
        populate: [ // To get details from referenced models
            { path: 'meter', select: 'name meterType' }, // Select specific fields from Meter
            { path: 'billingCycle', select: 'startDate endDate status' } // Select specific fields from BillingCycle
        ]
    };

    const readings = await Reading.find(query, null, options);
    const totalReadings = await Reading.countDocuments(query);

    res.status(200).json({
        readings,
        totalPages: Math.ceil(totalReadings / limit),
        currentPage: parseInt(page),
        totalReadings
    });
  } catch (error) {
    console.error('Error fetching readings:', error);
    res.status(500).json({ message: 'Server error while fetching readings.' });
  }
};

// @desc    Get a single reading by its ID
// @route   GET /api/readings/:id
// @access  Public
exports.getReadingById = async (req, res) => {
    try {
        const reading = await Reading.findById(req.params.id)
            .populate('meter', 'name meterType')
            .populate('billingCycle', 'startDate endDate status');

        if (!reading) {
            return res.status(404).json({ message: 'Reading not found.' });
        }
        res.status(200).json(reading);
    } catch (error) {
        console.error('Error fetching reading by ID:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

// @desc    Update a reading (use with caution, can affect calculations)
// @route   PUT /api/readings/:id
// @access  Public
exports.updateReading = async (req, res) => {
    try {
        const { date, readingValue, notes, isEstimated } = req.body;
        const readingId = req.params.id;

        const reading = await Reading.findById(readingId);
        if (!reading) {
            return res.status(404).json({ message: 'Reading not found.' });
        }

        // If readingValue or date changes, unitsConsumedSincePrevious might need recalculation.
        // This can be complex as it could affect subsequent readings too if we were to chain recalculate.
        // For now, if readingValue is updated, we recalculate unitsConsumedSincePrevious based on its original previous reading.
        // A more robust solution might involve a "recalculate" flag or service.

        let unitsConsumed = reading.unitsConsumedSincePrevious;

        if (readingValue !== undefined || date !== undefined) {
            const newReadingDate = date ? new Date(date) : reading.date;
            const newReadingValue = readingValue !== undefined ? readingValue : reading.readingValue;

            // Find the reading that was *actually* previous to this one chronologically for this meter
            const previousReadingForThisMeter = await Reading.findOne({
                meter: reading.meter,
                date: { $lt: newReadingDate } // find readings strictly before the new date
            })
            .sort({ date: -1, createdAt: -1 }); // get the latest among those

            // If what we thought was the 'previous' reading is different after a date change, this gets complex.
            // Simplified approach: Recalculate based on new value and original logic.
            // This assumes the chronological order of this reading relative to others doesn't change with a date update.
            // If it does, recalculating dependent values is a larger task.

            if (previousReadingForThisMeter) {
                if (newReadingValue < previousReadingForThisMeter.readingValue) {
                    console.warn(`Updated reading value (${newReadingValue}) for meter <span class="math-inline">\{reading\.meter\} is less than its preceding reading value \(</span>{previousReadingForThisMeter.readingValue}).`);
                }
                unitsConsumed = newReadingValue - previousReadingForThisMeter.readingValue;
            } else {
                // This reading is now effectively the first for the meter, or its date was moved before all others.
                unitsConsumed = 0; // Or newReadingValue if we assume meter started at 0
            }
            reading.unitsConsumedSincePrevious = unitsConsumed;
        }


        if (date) reading.date = date;
        if (readingValue !== undefined) reading.readingValue = readingValue;
        if (notes !== undefined) reading.notes = notes;
        if (isEstimated !== undefined) reading.isEstimated = isEstimated;

        // The billing cycle association does not change on update, unless explicitly designed to.
        // We assume reading date updates don't automatically reassign billing cycles for simplicity here.

        const updatedReading = await reading.save();
        res.status(200).json(updatedReading);

    } catch (error) {
        console.error('Error updating reading:', error);
        res.status(500).json({ message: 'Server error while updating reading.' });
    }
};

// @desc    Delete a reading (use with extreme caution)
// @route   DELETE /api/readings/:id
// @access  Public
exports.deleteReading = async (req, res) => {
    try {
        const reading = await Reading.findById(req.params.id);
        if (!reading) {
            return res.status(404).json({ message: 'Reading not found.' });
        }

        const deletedMeterId = reading.meter;
        const deletedDate = reading.date;
        const deletedCreatedAt = reading.createdAt;

        await reading.deleteOne(); // or reading.remove() for older Mongoose

        // --- CHAIN REPAIR LOGIC ---
        // Find the next reading chronologically
        const nextReading = await Reading.findOne({
            meter: deletedMeterId,
            $or: [
                { date: { $gt: deletedDate } },
                { date: deletedDate, createdAt: { $gt: deletedCreatedAt } }
            ]
        }).sort({ date: 1, createdAt: 1 });

        if (nextReading) {
            // Find the new previous reading relative to the next reading
            const newPreviousReading = await Reading.findOne({
                meter: deletedMeterId,
                $or: [
                    { date: { $lt: nextReading.date } },
                    { date: nextReading.date, createdAt: { $lt: nextReading.createdAt } }
                ]
            }).sort({ date: -1, createdAt: -1 });

            if (newPreviousReading) {
                nextReading.unitsConsumedSincePrevious = nextReading.readingValue - newPreviousReading.readingValue;
            } else {
                nextReading.unitsConsumedSincePrevious = 0; // It's now the first reading
            }
            await nextReading.save();
        }

        res.status(200).json({ message: 'Reading deleted successfully. Subsequent consumption chain auto-repaired.' });

    } catch (error) {
        console.error('Error deleting reading:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

// meter-tracker/controllers/readingController.js
// ... (other functions like addReading, getAllReadings, etc.)

// @desc    Delete ALL readings from the database
// @route   DELETE /api/readings/action/delete-all-globally
// @access  Public (EXTREME CAUTION ADVISED - PROTECT THIS ROUTE APPROPRIATELY IN PRODUCTION)
exports.deleteAllReadingsGlobally = async (req, res) => {
  try {
    // Double-check with a query parameter for extra safety, e.g., ?confirm=DELETE_ALL_READINGS
    // For now, proceeding directly but this is a good place for an additional confirmation step.
    // if (req.query.confirm !== "DELETE_ALL_MY_READINGS_NOW") {
    //    return res.status(400).json({ message: "Deletion not confirmed. Add '?confirm=DELETE_ALL_MY_READINGS_NOW' query parameter to proceed." });
    // }

    const result = await Reading.deleteMany({}); // An empty filter object {} means delete all documents in the collection

    res.status(200).json({
      message: `SUCCESS: All readings have been deleted globally. ${result.deletedCount} readings were removed. This action is irreversible. All consumption data is gone.`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('CRITICAL ERROR: Could not delete all readings:', error);
    res.status(500).json({ message: 'Server error while attempting to delete all readings.', details: error.message });
  }
};