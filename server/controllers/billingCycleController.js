// server/controllers/billingCycleController.js
const BillingCycle = require('../models/BillingCycle');
const Reading = require('../models/Reading');
const SlabRateConfig = require('../models/SlabRateConfig');
const Meter = require('../models/Meter'); // Import Meter model to get names
const { calculateCostForConsumption } = require('../utils/costCalculator');

// @desc    Start a new billing cycle
exports.startNewBillingCycle = async (req, res) => {
  try {
    let { startDate, notes } = req.body;
    if (!startDate) return res.status(400).json({ message: 'Start date is required.' });

    // Sanitization
    const parsedDate = new Date(startDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: 'Invalid start date format.' });
    }
    const cleanNotes = notes ? String(notes).trim() : '';

    const existingActiveCycle = await BillingCycle.findOne({ status: 'active' });
    if (existingActiveCycle) {
      return res.status(400).json({
        message: `An active billing cycle already exists starting ${existingActiveCycle.startDate}. Please close it first.`,
      });
    }

    const newCycle = new BillingCycle({ startDate: parsedDate, notes: cleanNotes, status: 'active' });
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
    let { governmentCollectionDate, notesForClosedCycle, notesForNewCycle } = req.body;
    if (!governmentCollectionDate) return res.status(400).json({ message: 'Government collection date is required.' });

    // Sanitization
    const collectionDate = new Date(governmentCollectionDate);
    if (isNaN(collectionDate.getTime())) {
      return res.status(400).json({ message: 'Invalid government collection date format.' });
    }

    const currentActiveCycle = await BillingCycle.findOne({ status: 'active' });

    if (!currentActiveCycle) return res.status(404).json({ message: 'No active billing cycle found.' });
    if (collectionDate < currentActiveCycle.startDate) return res.status(400).json({ message: 'Collection date cannot be before start date.' });

    // --- IMMUTABLE SNAPSHOT LOGIC ---
    const activeSlabConfig = await SlabRateConfig.findOne({ isCurrentlyActive: true });
    const readings = await Reading.find({ billingCycle: currentActiveCycle._id });
    const meters = await Meter.find().lean();
    const meterMap = meters.reduce((acc, m) => { acc[m._id] = m; return acc; }, {});

    // Group consumption by meter
    const meterConsumptionMap = {};
    readings.forEach(r => {
        const mId = r.meter.toString();
        const units = Number(r.unitsConsumedSincePrevious) || 0;
        meterConsumptionMap[mId] = (meterConsumptionMap[mId] || 0) + units;
    });

    let finalTotalUnits = 0;
    let finalTotalCost = 0;
    const finalMeterDetails = [];

    // Calculate per meter
    Object.entries(meterConsumptionMap).forEach(([mId, units]) => {
        finalTotalUnits += units;
        const cost = activeSlabConfig ? calculateCostForConsumption(units, activeSlabConfig) : 0;
        finalTotalCost += cost;

        const meterInfo = meterMap[mId] || { name: 'Unknown Meter', meterType: 'N/A' };
        finalMeterDetails.push({
            meterName: meterInfo.name,
            meterType: meterInfo.meterType,
            units: parseFloat(units.toFixed(2)),
            cost: parseFloat(cost.toFixed(2))
        });
    });

    let appliedSlabRateSnapshot = null;
    if (activeSlabConfig) {
        appliedSlabRateSnapshot = {
            configName: activeSlabConfig.configName,
            effectiveDate: activeSlabConfig.effectiveDate,
            slabsLessThanOrEqual500: activeSlabConfig.slabsLessThanOrEqual500.map(s => ({ fromUnit: s.fromUnit, toUnit: s.toUnit, rate: s.rate })),
            slabsGreaterThan500: activeSlabConfig.slabsGreaterThan500.map(s => ({ fromUnit: s.fromUnit, toUnit: s.toUnit, rate: s.rate }))
        };
    }

    // Close current cycle with snapshot data
    currentActiveCycle.endDate = collectionDate;
    currentActiveCycle.governmentCollectionDate = collectionDate;
    currentActiveCycle.status = 'closed';
    if (notesForClosedCycle) currentActiveCycle.notes = String(notesForClosedCycle).trim();
    
    currentActiveCycle.finalTotalUnits = parseFloat(finalTotalUnits.toFixed(2));
    currentActiveCycle.finalTotalCost = parseFloat(finalTotalCost.toFixed(2));
    currentActiveCycle.finalMeterDetails = finalMeterDetails;
    if (appliedSlabRateSnapshot) {
        currentActiveCycle.appliedSlabRateSnapshot = appliedSlabRateSnapshot;
    }
    
    await currentActiveCycle.save();

    // Start new cycle
    const newCycle = new BillingCycle({
      startDate: collectionDate,
      status: 'active',
      notes: notesForNewCycle ? String(notesForNewCycle).trim() : 'New cycle started automatically.'
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
        // --- HYBRID LOGIC FOR SNAPSHOTS ---
        if (cycle.status === 'closed' && cycle.finalTotalCost !== undefined && cycle.finalTotalCost >= 0) {
            // Use snapshot data
            return {
                ...cycle,
                totalUnits: cycle.finalTotalUnits,
                totalCost: cycle.finalTotalCost,
                meterDetails: cycle.finalMeterDetails,
                rateName: cycle.appliedSlabRateSnapshot?.configName || 'Unknown Rate'
            };
        }

        // Active cycle or legacy closed cycle without snapshot: Calculate dynamically
        const readings = await Reading.find({ billingCycle: cycle._id });

        // Group consumption by meter
        const meterConsumptionMap = {};
        readings.forEach(r => {
            const mId = r.meter.toString();
            meterConsumptionMap[mId] = (meterConsumptionMap[mId] || 0) + (Number(r.unitsConsumedSincePrevious) || 0);
        });

        let totalUnits = 0;
        let totalCost = 0;
        const meterDetails = [];

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
            meterDetails,
            rateName: activeSlabConfig?.configName || 'Unknown Rate',
            appliedSlabRateSnapshot: activeSlabConfig ? {
                configName: activeSlabConfig.configName,
                effectiveDate: activeSlabConfig.effectiveDate,
                slabsLessThanOrEqual500: activeSlabConfig.slabsLessThanOrEqual500,
                slabsGreaterThan500: activeSlabConfig.slabsGreaterThan500
            } : null
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

// @desc    Get COMPLETE data for Export (Summary + Raw Readings + Stats)
// @route   GET /api/billing-cycles/:id/export-data
exports.getExportDataForCycle = async (req, res) => {
    try {
        const cycleId = req.params.id;
        
        // 1. Fetch Cycle
        const cycle = await BillingCycle.findById(cycleId).lean();
        if (!cycle) return res.status(404).json({ message: 'Cycle not found' });
        
        const activeSlabConfig = await SlabRateConfig.findOne({ isCurrentlyActive: true });
        
        // 2. Fetch Readings (Sort strictly by date)
        const readings = await Reading.find({ billingCycle: cycleId })
                                      .populate('meter', 'name meterType')
                                      .sort({ date: 1 })
                                      .lean();

        // 3. Check for Snapshot Data
        let totalUnits = 0;
        let totalCost = 0;
        let meterDetails = [];
        let rateName = 'Unknown Rate';

        if (cycle.status === 'closed' && cycle.finalTotalCost !== undefined && cycle.finalTotalCost >= 0) {
            totalUnits = cycle.finalTotalUnits;
            totalCost = cycle.finalTotalCost;
            meterDetails = cycle.finalMeterDetails;
            rateName = cycle.appliedSlabRateSnapshot?.configName || 'Unknown Rate';
        } else {
            // Dynamic Calculation
            const meterConsumptionMap = {};
            readings.forEach(r => {
                const mId = r.meter?._id?.toString() || 'unknown';
                const units = Number(r.unitsConsumedSincePrevious) || 0; 
                meterConsumptionMap[mId] = (meterConsumptionMap[mId] || 0) + units;
            });

            Object.entries(meterConsumptionMap).forEach(([mId, units]) => {
                totalUnits += units;
                const cost = activeSlabConfig ? calculateCostForConsumption(units, activeSlabConfig) : 0;
                totalCost += cost;

                const readingWithMeter = readings.find(r => (r.meter?._id?.toString() || 'unknown') === mId);
                const meterName = readingWithMeter?.meter?.name || 'Unknown Meter';
                const meterType = readingWithMeter?.meter?.meterType || 'N/A';

                meterDetails.push({ 
                    meterName, 
                    meterType, 
                    units: parseFloat(units.toFixed(2)), 
                    cost: parseFloat(cost.toFixed(2)) 
                });
            });
            rateName = activeSlabConfig?.configName || 'Unknown Rate';
            cycle.appliedSlabRateSnapshot = activeSlabConfig ? {
                configName: activeSlabConfig.configName,
                effectiveDate: activeSlabConfig.effectiveDate,
                slabsLessThanOrEqual500: activeSlabConfig.slabsLessThanOrEqual500,
                slabsGreaterThan500: activeSlabConfig.slabsGreaterThan500
            } : null;
        }

        // 4. Calculate Analytics (Peak Usage)
        const dailyUsage = {};
        readings.forEach(r => {
            if (r.date) {
                const dateStr = new Date(r.date).toISOString().split('T')[0];
                const units = Number(r.unitsConsumedSincePrevious) || 0;
                dailyUsage[dateStr] = (dailyUsage[dateStr] || 0) + units;
            }
        });

        let peakDay = cycle.startDate;
        let peakUsage = 0;

        Object.entries(dailyUsage).forEach(([date, usage]) => {
            if (usage > peakUsage) {
                peakUsage = usage;
                peakDay = date;
            }
        });

        const daysInCycle = cycle.endDate 
            ? Math.ceil((new Date(cycle.endDate) - new Date(cycle.startDate)) / (1000 * 60 * 60 * 24)) 
            : Math.ceil((new Date() - new Date(cycle.startDate)) / (1000 * 60 * 60 * 24)) || 1;
            
        const analytics = {
            averageDailyConsumption: (daysInCycle > 0 ? (totalUnits / daysInCycle) : 0).toFixed(2),
            peakUsageDay: peakDay,
            peakUsageAmount: peakUsage.toFixed(2),
            totalReadingsCount: readings.length,
            daysInCycle
        };

        // 5. Send Package
        res.status(200).json({
            cycle: { 
                ...cycle, 
                totalUnits: parseFloat(totalUnits.toFixed(2)), 
                totalCost: parseFloat(totalCost.toFixed(2)), 
                meterDetails,
                rateName
            },
            readings: readings.map(r => ({
                date: r.date,
                meterName: r.meter?.name || 'Unknown',
                meterType: r.meter?.meterType || 'N/A',
                readingValue: r.readingValue, 
                unitsConsumed: r.unitsConsumedSincePrevious || 0
            })),
            analytics
        });

    } catch (error) {
        console.error("Export Error:", error);
        res.status(500).json({ message: 'Server error during export generation.' });
    }
};