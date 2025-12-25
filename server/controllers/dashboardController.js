// server/controllers/dashboardController.js
const Meter = require('../models/Meter');
const Reading = require('../models/Reading');
const BillingCycle = require('../models/BillingCycle');
const SlabRateConfig = require('../models/SlabRateConfig');
const Setting = require('../models/Settings'); 

// Helper function to calculate cost based on slabs
function calculateCostForConsumption(consumedUnits, slabConfig) {
    if (!slabConfig || consumedUnits < 0) return 0;

    let totalCost = 0;
    let unitsToBill = consumedUnits;

    const applicableSlabs = consumedUnits <= 500 ? slabConfig.slabsLessThanOrEqual500 : slabConfig.slabsGreaterThan500;
    const sortedSlabs = [...applicableSlabs].sort((a, b) => a.fromUnit - b.fromUnit);

    let billedUnitsInPreviousTiers = 0;

    for (const slab of sortedSlabs) {
        if (unitsToBill <= 0) break;

        if (consumedUnits > (slab.fromUnit - 1)) {
            const unitsActuallyInThisSlabSegment = Math.min(consumedUnits, slab.toUnit) - Math.max(billedUnitsInPreviousTiers, slab.fromUnit - 1);

            if (unitsActuallyInThisSlabSegment > 0) {
                totalCost += unitsActuallyInThisSlabSegment * slab.rate;
                billedUnitsInPreviousTiers += unitsActuallyInThisSlabSegment;
            }
        } else {
            break;
        }
        if (billedUnitsInPreviousTiers >= consumedUnits) break;
    }
    return parseFloat(totalCost.toFixed(2));
}

// Helper: Determine Current Tier info
function getCurrentTierInfo(consumedUnits, slabConfig) {
    if (!slabConfig) return { rate: 0, label: 'N/A' };
    const applicableSlabs = consumedUnits <= 500 ? slabConfig.slabsLessThanOrEqual500 : slabConfig.slabsGreaterThan500;
    const sortedSlabs = [...applicableSlabs].sort((a, b) => a.fromUnit - b.fromUnit);
    
    let currentSlab = sortedSlabs[0];
    for (const slab of sortedSlabs) {
        if (consumedUnits >= slab.fromUnit) {
            currentSlab = slab;
        } else {
            break;
        }
    }
    return {
        rate: currentSlab ? currentSlab.rate : 0,
        range: currentSlab ? `${currentSlab.fromUnit}-${currentSlab.toUnit === 999999 ? '∞' : currentSlab.toUnit}` : ''
    };
}

// @desc    Get dashboard summary data
// @route   GET /api/dashboard/summary
exports.getDashboardSummary = async (req, res) => {
    try {
        const activeCycle = await BillingCycle.findOne({ status: 'active' });
        if (!activeCycle) { return res.status(404).json({ message: 'No active billing cycle found.' }); }

        const activeSlabConfig = await SlabRateConfig.findOne({ isCurrentlyActive: true });
        if (!activeSlabConfig) { return res.status(404).json({ message: 'No active slab rate configuration found.' }); }

        const meters = await Meter.find();
        if (!meters || meters.length === 0) { return res.status(404).json({ message: 'No meters found.' }); }

        // Fetch User Settings
        let settings = await Setting.findOne({ key: 'user_settings' });
        if (!settings) {
            settings = await Setting.findOne(); 
            if (!settings) {
                settings = await Setting.create({ 
                    key: 'user_settings',
                    consumptionTarget: 500 
                });
            }
        }
        const consumptionTarget = settings.consumptionTarget;

        const now = new Date();
        const cycleStartDate = new Date(activeCycle.startDate);
        const effectiveNow = now < cycleStartDate ? cycleStartDate : now;
        let daysInCycle = Math.ceil((effectiveNow - cycleStartDate) / (1000 * 60 * 60 * 24));
        if (daysInCycle <= 0) daysInCycle = 1;

        const meterSummaries = [];
        let currentCycleTotalBill = 0;

        for (const meter of meters) {
            const readingsInCurrentCycle = await Reading.find({ meter: meter._id, billingCycle: activeCycle._id }).sort({ date: 'asc' });
            
            // 1. Calculate Consumption
            let currentCycleConsumption = 0;
            // Also prepare data for Sparkline (Group by Date)
            const dailyConsumptionMap = {};
            
            readingsInCurrentCycle.forEach(reading => { 
                currentCycleConsumption += reading.unitsConsumedSincePrevious; 
                
                // Sparkline logic: '2023-10-25'
                const dateKey = new Date(reading.date).toISOString().split('T')[0];
                dailyConsumptionMap[dateKey] = (dailyConsumptionMap[dateKey] || 0) + reading.unitsConsumedSincePrevious;
            });
            currentCycleConsumption = parseFloat(currentCycleConsumption.toFixed(2));
            
            // 2. Cost Calculation
            const currentCycleCost = calculateCostForConsumption(currentCycleConsumption, activeSlabConfig);
            currentCycleTotalBill += currentCycleCost;
            
            // 3. Stats
            const averageDailyConsumption = daysInCycle > 0 ? parseFloat((currentCycleConsumption / daysInCycle).toFixed(2)) : 0;
            const unitsRemainingToTarget = Math.max(0, consumptionTarget - currentCycleConsumption).toFixed(2);
            const percentageToTarget = parseFloat(((currentCycleConsumption / consumptionTarget) * 100).toFixed(2));

            // 4. Sparkline Generation (Last 7 Days)
            const sparklineData = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const key = d.toISOString().split('T')[0];
                sparklineData.push({
                    name: key, // Date string
                    value: parseFloat((dailyConsumptionMap[key] || 0).toFixed(2))
                });
            }

            // 5. Current Tier Info
            const currentTier = getCurrentTierInfo(currentCycleConsumption, activeSlabConfig);

            // 6. Previous Cycle Data
            let previousCycleConsumption = 0;
            const previousCycle = await BillingCycle.findOne({ status: 'closed', endDate: { $lte: activeCycle.startDate }, _id: { $ne: activeCycle._id } }).sort({ endDate: -1 });
            if (previousCycle) {
                const readingsInPreviousCycle = await Reading.find({ meter: meter._id, billingCycle: previousCycle._id });
                readingsInPreviousCycle.forEach(reading => { previousCycleConsumption += reading.unitsConsumedSincePrevious; });
                previousCycleConsumption = parseFloat(previousCycleConsumption.toFixed(2));
            }

            meterSummaries.push({
                meterId: meter._id, meterName: meter.name, meterType: meter.meterType,
                isGeneralPurpose: meter.isGeneralPurpose, isCurrentlyActiveGeneral: meter.isCurrentlyActiveGeneral,
                currentCycleConsumption, currentCycleCost, averageDailyConsumption,
                unitsRemainingToTarget,
                percentageToTarget,
                consumptionTarget, 
                previousCycleConsumption,
                sparklineData, // --- NEW ---
                currentTier    // --- NEW ---
            });
        }
        
        const overallPreviousCycle = await BillingCycle.findOne({ status: 'closed', endDate: { $lte: activeCycle.startDate }, _id: { $ne: activeCycle._id } }).sort({ endDate: -1 });

        res.status(200).json({
            currentBillingCycle: {
                id: activeCycle._id, startDate: activeCycle.startDate, endDate: activeCycle.endDate,
                status: activeCycle.status, notes: activeCycle.notes, daysInCycle: daysInCycle
            },
            previousBillingCycle: overallPreviousCycle ? { id: overallPreviousCycle._id, startDate: overallPreviousCycle.startDate, endDate: overallPreviousCycle.endDate, status: overallPreviousCycle.status, notes: overallPreviousCycle.notes } : null,
            activeSlabConfiguration: { id: activeSlabConfig._id, configName: activeSlabConfig.configName, effectiveDate: activeSlabConfig.effectiveDate },
            meterSummaries,
            currentCycleTotalBill: parseFloat(currentCycleTotalBill.toFixed(2)),
            globalConsumptionTarget: consumptionTarget
        });

    } catch (error) {
        console.error('Error fetching dashboard summary:', error);
        res.status(500).json({ message: 'Server error while fetching dashboard summary.', details: error.message });
    }
};