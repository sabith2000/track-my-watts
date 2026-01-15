// server/controllers/billingCycleController.js
const BillingCycle = require('../models/BillingCycle');
const Reading = require('../models/Reading');
const SlabRateConfig = require('../models/SlabRateConfig');
const Meter = require('../models/Meter'); // Import Meter model to get names

// Helper to calculate cost
function calculateCostForConsumption(consumedUnits, slabConfig) {
    if (!slabConfig || consumedUnits <= 0) { return 0; }
    let totalCost = 0;
    
    const applicableSlabs = consumedUnits <= 500 ? slabConfig.slabsLessThanOrEqual500 : slabConfig.slabsGreaterThan500;
    const sortedSlabs = [...applicableSlabs].sort((a, b) => a.fromUnit - b.fromUnit);
    
    let billedUnitsInPreviousTiers = 0;
    
    for (const slab of sortedSlabs) {
        if (consumedUnits > (slab.fromUnit - 1)) {
            const unitsInThisSlab = Math.min(consumedUnits, slab.toUnit) - Math.max(billedUnitsInPreviousTiers, slab.fromUnit - 1);
            if (unitsInThisSlab > 0) {
                totalCost += unitsInThisSlab * slab.rate;
                billedUnitsInPreviousTiers += unitsInThisSlab;
            }
        }
        if (billedUnitsInPreviousTiers >= consumedUnits) break;
    }
    return parseFloat(totalCost.toFixed(2));
}

// @desc    Start a new billing cycle
exports.startNewBillingCycle = async (req, res) => {
  try {
    const { startDate, notes } = req.body;
    if (!startDate) return res.status(400).json({ message: 'Start date is required.' });

    const existingActiveCycle = await BillingCycle.findOne({ status: 'active' });
    if (existingActiveCycle) {
      return res.status(400).json({
        message: `An active billing cycle already exists starting ${existingActiveCycle.startDate}. Please close it first.`,
      });
    }

    const newCycle = new BillingCycle({ startDate, notes, status: 'active' });
    const savedCycle = await newCycle.save();
    res.status(201).json(savedCycle);
  } catch (error) {
    console.error('Error starting new billing cycle:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Close the current active billing cycle
exports.closeCurrentBillingCycle = async (req, res) => {
  try {
    const { governmentCollectionDate, notesForClosedCycle, notesForNewCycle } = req.body;
    if (!governmentCollectionDate) return res.status(400).json({ message: 'Government collection date is required.' });

    const collectionDate = new Date(governmentCollectionDate);
    const currentActiveCycle = await BillingCycle.findOne({ status: 'active' });

    if (!currentActiveCycle) return res.status(404).json({ message: 'No active billing cycle found.' });
    if (collectionDate < currentActiveCycle.startDate) return res.status(400).json({ message: 'Collection date cannot be before start date.' });

    // Close current
    currentActiveCycle.endDate = collectionDate;
    currentActiveCycle.governmentCollectionDate = collectionDate;
    currentActiveCycle.status = 'closed';
    if (notesForClosedCycle) currentActiveCycle.notes = notesForClosedCycle;
    await currentActiveCycle.save();

    // Start new
    const newCycle = new BillingCycle({
      startDate: collectionDate,
      status: 'active',
      notes: notesForNewCycle || 'New cycle started automatically.'
    });
    const savedNewCycle = await newCycle.save();

    res.status(200).json({ message: 'Cycle closed and new one started.', closedCycle: currentActiveCycle, newActiveCycle: savedNewCycle });
  } catch (error) {
    console.error('Error closing cycle:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Get the current active billing cycle
exports.getActiveBillingCycle = async (req, res) => {
  try {
    const activeCycle = await BillingCycle.findOne({ status: 'active' });
    if (!activeCycle) return res.status(404).json({ message: 'No active billing cycle found.' });
    res.status(200).json(activeCycle);
  } catch (error) {
    console.error('Error fetching active cycle:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Get all billing cycles WITH detailed meter breakdown
exports.getAllBillingCycles = async (req, res) => {
  try {
    // 1. Fetch raw cycles
    const cycles = await BillingCycle.find().sort({ startDate: -1 }).lean();
    
    // 2. Fetch active rates & Meter Names
    const activeSlabConfig = await SlabRateConfig.findOne({ isCurrentlyActive: true });
    const meters = await Meter.find().lean();
    const meterMap = meters.reduce((acc, m) => { acc[m._id] = m; return acc; }, {});

    // 3. Enhance each cycle
    const enrichedCycles = await Promise.all(cycles.map(async (cycle) => {
        const readings = await Reading.find({ billingCycle: cycle._id });

        // Group consumption by meter
        const meterConsumptionMap = {};
        readings.forEach(r => {
            const mId = r.meter.toString();
            meterConsumptionMap[mId] = (meterConsumptionMap[mId] || 0) + r.unitsConsumedSincePrevious;
        });

        let totalUnits = 0;
        let totalCost = 0;
        const meterDetails = []; // --- NEW: To hold detailed breakdown ---

        // Calculate per meter
        Object.entries(meterConsumptionMap).forEach(([mId, units]) => {
            totalUnits += units;
            const cost = activeSlabConfig ? calculateCostForConsumption(units, activeSlabConfig) : 0;
            totalCost += cost;

            // Push detail
            const meterInfo = meterMap[mId] || { name: 'Unknown Meter', meterType: 'N/A' };
            meterDetails.push({
                meterName: meterInfo.name,
                meterType: meterInfo.meterType,
                units: parseFloat(units.toFixed(2)),
                cost: parseFloat(cost.toFixed(2))
            });
        });

        return {
            ...cycle,
            totalUnits: parseFloat(totalUnits.toFixed(2)),
            totalCost: parseFloat(totalCost.toFixed(2)),
            meterDetails // --- NEW: Sending this array to frontend ---
        };
    }));

    res.status(200).json(enrichedCycles);
  } catch (error) {
    console.error('Error fetching all billing cycles:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// @desc    Get a single billing cycle by ID
exports.getBillingCycleById = async (req, res) => {
    try {
        const cycle = await BillingCycle.findById(req.params.id);
        if (!cycle) return res.status(404).json({ message: 'Billing cycle not found.' });
        res.status(200).json(cycle);
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
};

// @desc    Update a billing cycle
exports.updateBillingCycle = async (req, res) => {
    try {
        const cycle = await BillingCycle.findById(req.params.id);
        if (!cycle) return res.status(404).json({ message: 'Not found.' });
        Object.assign(cycle, req.body);
        await cycle.save();
        res.status(200).json(cycle);
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
};

// @desc    Delete a billing cycle
exports.deleteBillingCycle = async (req, res) => {
  try {
    const cycleId = req.params.id;
    const cycleToDelete = await BillingCycle.findById(cycleId);
    if (!cycleToDelete) return res.status(404).json({ message: 'Not found.' });

    const associatedReadingsCount = await Reading.countDocuments({ billingCycle: cycleId });
    if (associatedReadingsCount > 0) {
      return res.status(400).json({ message: `Cannot delete cycle with ${associatedReadingsCount} readings.` });
    }

    await BillingCycle.findByIdAndDelete(cycleId);
    res.status(200).json({ message: 'Deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// ... (Keep existing code above) ...

// @desc    Get COMPLETE data for Export (Summary + Raw Readings + Stats)
// @route   GET /api/billing-cycles/:id/export-data
exports.getExportDataForCycle = async (req, res) => {
    try {
        const cycleId = req.params.id;
        
        // 1. Fetch Cycle & Config
        const cycle = await BillingCycle.findById(cycleId).lean();
        if (!cycle) return res.status(404).json({ message: 'Cycle not found' });
        
        const activeSlabConfig = await SlabRateConfig.findOne({ isCurrentlyActive: true });
        
        // 2. Fetch All Readings for this Cycle
        // Populate meter details so we have names in the raw data
        const readings = await Reading.find({ billingCycle: cycleId })
                                      .populate('meter', 'name meterType')
                                      .sort({ date: 1 })
                                      .lean();

        // 3. Calculate Summary (Same logic as getAllBillingCycles to ensure match)
        const meterConsumptionMap = {};
        readings.forEach(r => {
            const mId = r.meter._id.toString();
            meterConsumptionMap[mId] = (meterConsumptionMap[mId] || 0) + r.unitsConsumedSincePrevious;
        });

        let totalUnits = 0;
        let totalCost = 0;
        const meterDetails = [];

        Object.entries(meterConsumptionMap).forEach(([mId, units]) => {
            totalUnits += units;
            const cost = activeSlabConfig ? calculateCostForConsumption(units, activeSlabConfig) : 0;
            totalCost += cost;

            // Find meter name from the readings array (since we populated it)
            const readingWithMeter = readings.find(r => r.meter._id.toString() === mId);
            const meterName = readingWithMeter ? readingWithMeter.meter.name : 'Unknown';
            const meterType = readingWithMeter ? readingWithMeter.meter.meterType : 'N/A';

            meterDetails.push({ meterName, meterType, units, cost });
        });

        // 4. Calculate Basic Analytics (Sheet 3 Data)
        // Group by Date to find Peak Usage
        const dailyUsage = {};
        readings.forEach(r => {
            const dateStr = new Date(r.date).toISOString().split('T')[0];
            dailyUsage[dateStr] = (dailyUsage[dateStr] || 0) + r.unitsConsumedSincePrevious;
        });
        
        // Find Peak Day
        let peakDay = '-';
        let peakUsage = 0;
        Object.entries(dailyUsage).forEach(([date, usage]) => {
            if (usage > peakUsage) {
                peakUsage = usage;
                peakDay = date;
            }
        });
        
        // Calculate Daily Average
        const daysInCycle = cycle.endDate 
            ? Math.ceil((new Date(cycle.endDate) - new Date(cycle.startDate)) / (1000 * 60 * 60 * 24)) 
            : Math.ceil((new Date() - new Date(cycle.startDate)) / (1000 * 60 * 60 * 24)) || 1;
            
        const analytics = {
            averageDailyConsumption: (totalUnits / daysInCycle).toFixed(2),
            peakUsageDay: peakDay,
            peakUsageAmount: peakUsage.toFixed(2),
            totalReadingsCount: readings.length,
            daysInCycle
        };

        // 5. Send The Package
        res.status(200).json({
            cycle: { ...cycle, totalUnits, totalCost, meterDetails },
            readings: readings.map(r => ({
                date: r.date,
                meterName: r.meter.name,
                meterType: r.meter.meterType,
                readingValue: r.currentReading,
                unitsConsumed: r.unitsConsumedSincePrevious
            })),
            analytics
        });

    } catch (error) {
        console.error("Export Error:", error);
        res.status(500).json({ message: 'Server error during export generation.' });
    }
};