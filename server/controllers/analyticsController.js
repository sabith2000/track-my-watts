// server/controllers/analyticsController.js
const Reading = require('../models/Reading');
const BillingCycle = require('../models/BillingCycle');
const SlabRateConfig = require('../models/SlabRateConfig');
const mongoose = require('mongoose');
const { calculateCostForConsumption } = require('../utils/costCalculator');

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

        // 1. Fetch all cycles first to check for snapshots
        const cycles = await BillingCycle.find().lean();
        const cycleSnapshotMap = {};
        const cycleDetailsMap = {};
        
        cycles.forEach(cycle => {
            cycleDetailsMap[cycle._id.toString()] = {
                startDate: cycle.startDate,
                endDate: cycle.endDate,
                status: cycle.status
            };
            
            if (cycle.status === 'closed' && cycle.finalTotalCost !== undefined && cycle.finalTotalCost >= 0) {
                cycleSnapshotMap[cycle._id.toString()] = {
                    id: cycle._id.toString(),
                    startDate: new Date(cycle.startDate),
                    endDate: new Date(cycle.endDate),
                    status: cycle.status,
                    totalConsumption: cycle.finalTotalUnits,
                    totalCost: cycle.finalTotalCost
                };
            }
        });

        // 2. Get raw consumption for active/legacy cycles
        // Filter out cycles that have snapshots
        const cyclesWithSnapshots = Object.keys(cycleSnapshotMap).map(id => new mongoose.Types.ObjectId(id));
        
        const rawMeterData = await Reading.aggregate([
            { $match: { billingCycle: { $nin: cyclesWithSnapshots } } },
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

        // 3. Process dynamic data
        const cycleMap = {};

        rawMeterData.forEach(item => {
            const cycleId = item._id.cycle.toString();
            const units = item.meterTotalUnits;
            
            const cost = activeSlabConfig ? calculateCostForConsumption(units, activeSlabConfig) : 0;

            if (!cycleMap[cycleId]) {
                cycleMap[cycleId] = {
                    id: cycleId,
                    startDate: new Date(item.cycleStartDate),
                    endDate: item.cycleEndDate ? new Date(item.cycleEndDate) : null,
                    status: item.cycleStatus,
                    totalConsumption: 0,
                    totalCost: 0
                };
            }

            cycleMap[cycleId].totalConsumption += units;
            cycleMap[cycleId].totalCost += cost;
        });

        // Also add cycles that have no readings but have basic cycle info
        cycles.forEach(cycle => {
            const id = cycle._id.toString();
            if (!cycleSnapshotMap[id] && !cycleMap[id]) {
                cycleMap[id] = {
                    id: id,
                    startDate: new Date(cycle.startDate),
                    endDate: cycle.endDate ? new Date(cycle.endDate) : null,
                    status: cycle.status,
                    totalConsumption: 0,
                    totalCost: 0
                };
            }
        });

        // 4. Merge Snapshots and Dynamic Data
        const allCyclesData = [
            ...Object.values(cycleSnapshotMap),
            ...Object.values(cycleMap)
        ];

        // 5. Sort and format
        const analyticsData = allCyclesData
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