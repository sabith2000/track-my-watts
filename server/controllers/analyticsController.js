// server/controllers/analyticsController.js
const Reading = require('../models/Reading');
const BillingCycle = require('../models/BillingCycle');
const SlabRateConfig = require('../models/SlabRateConfig');
const mongoose = require('mongoose');

// Helper to calculate cost based on the user's specific logic
function calculateCostForConsumption(consumedUnits, slabConfig) {
    if (!slabConfig || consumedUnits <= 0) { return 0; }
    let totalCost = 0;
    
    // Choose the correct slab set based on total consumption
    const applicableSlabs = consumedUnits <= 500 ? slabConfig.slabsLessThanOrEqual500 : slabConfig.slabsGreaterThan500;
    
    // Sort slabs by 'fromUnit' to ensure correct order
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

// Helper to format date
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

// @desc    Get analytics data grouped by billing cycle (Sum of Individual Meter Costs)
// @route   GET /api/analytics/cycle-summary
exports.getCycleSummary = async (req, res) => {
    try {
        const activeSlabConfig = await SlabRateConfig.findOne({ isCurrentlyActive: true });

        // 1. Get raw consumption grouped by Cycle AND Meter
        // We need to calculate cost for EACH meter individually first
        const rawMeterData = await Reading.aggregate([
            { $lookup: { from: 'billingcycles', localField: 'billingCycle', foreignField: '_id', as: 'cycleInfo' } },
            { $unwind: '$cycleInfo' },
            { 
                $group: { 
                    _id: { cycle: '$billingCycle', meter: '$meter' },
                    meterTotalUnits: { $sum: '$unitsConsumedSincePrevious' },
                    cycleStartDate: { $first: '$cycleInfo.startDate' },
                    cycleEndDate: { $first: '$cycleInfo.endDate' },
                    cycleStatus: { $first: '$cycleInfo.status' }
                } 
            }
        ]);

        // 2. Process data in JavaScript to calculate costs and re-group by Cycle
        const cycleMap = {};

        rawMeterData.forEach(item => {
            const cycleId = item._id.cycle.toString();
            const units = item.meterTotalUnits;
            
            // Calculate cost for THIS specific meter's consumption
            const cost = activeSlabConfig ? calculateCostForConsumption(units, activeSlabConfig) : 0;

            if (!cycleMap[cycleId]) {
                cycleMap[cycleId] = {
                    id: cycleId,
                    startDate: new Date(item.cycleStartDate),
                    endDate: new Date(item.cycleEndDate),
                    status: item.cycleStatus,
                    totalConsumption: 0,
                    totalCost: 0
                };
            }

            // Add this meter's contribution to the cycle totals
            cycleMap[cycleId].totalConsumption += units;
            cycleMap[cycleId].totalCost += cost;
        });

        // 3. Convert Map to Array and Sort
        const analyticsData = Object.values(cycleMap)
            .sort((a, b) => a.startDate - b.startDate)
            .map(cycle => {
                let cycleLabel = `${formatDate(cycle.startDate)} - ${formatDate(cycle.endDate)}`;
                if (cycle.status === 'active') {
                    cycleLabel = `${formatDate(cycle.startDate)} (Current)`;
                }

                return {
                    id: cycle.id,
                    name: cycleLabel,
                    totalConsumption: parseFloat(cycle.totalConsumption.toFixed(2)),
                    totalCost: parseFloat(cycle.totalCost.toFixed(2))
                };
            });
        
        res.status(200).json(analyticsData);

    } catch (error) {
        console.error("Error fetching cycle analytics:", error);
        res.status(500).json({ message: "Server error while fetching analytics data." });
    }
};

// @desc    Get consumption data per meter, per cycle (Stacked Bar Chart)
// @note    Logic remains the same as this visualization was already correct
// @route   GET /api/analytics/meter-breakdown
exports.getMeterBreakdownByCycle = async (req, res) => {
    try {
        const meterBreakdownData = await Reading.aggregate([
            { $lookup: { from: 'billingcycles', localField: 'billingCycle', foreignField: '_id', as: 'cycleInfo' } },
            { $unwind: '$cycleInfo' },
            { $lookup: { from: 'meters', localField: 'meter', foreignField: '_id', as: 'meterInfo' } },
            { $unwind: '$meterInfo' },
            {
                $group: {
                    _id: {
                        cycleId: '$billingCycle',
                        meterId: '$meter',
                        meterName: '$meterInfo.name',
                        cycleStartDate: '$cycleInfo.startDate',
                        cycleEndDate: '$cycleInfo.endDate',
                        cycleStatus: '$cycleInfo.status'
                    },
                    totalConsumption: { $sum: '$unitsConsumedSincePrevious' }
                }
            },
            {
                $group: {
                    _id: '$_id.cycleId',
                    startDate: { $first: '$_id.cycleStartDate' },
                    endDate: { $first: '$_id.cycleEndDate' },
                    status: { $first: '$_id.cycleStatus' },
                    meterConsumptions: {
                        $push: {
                            meterId: '$_id.meterId',
                            meterName: '$_id.meterName',
                            consumption: '$totalConsumption'
                        }
                    }
                }
            },
            { $sort: { startDate: 1 } }
        ]);

        const formattedData = meterBreakdownData.map(cycle => {
            let cycleName = `${formatDate(cycle.startDate)} - ${formatDate(cycle.endDate)}`;
            if (cycle.status === 'active') {
                cycleName = `${formatDate(cycle.startDate)} (Current)`;
            }

            const chartObject = { name: cycleName };
            cycle.meterConsumptions.forEach(meter => {
                chartObject[meter.meterName] = parseFloat(meter.consumption.toFixed(2));
            });
            return chartObject;
        });

        res.status(200).json(formattedData);

    } catch (error) {
        console.error("Error fetching meter breakdown analytics:", error);
        res.status(500).json({ message: "Server error while fetching analytics data." });
    }
};