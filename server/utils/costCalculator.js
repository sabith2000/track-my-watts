// server/utils/costCalculator.js

// Helper function to calculate cost based on slabs
function calculateCostForConsumption(consumedUnits, slabConfig) {
    if (!slabConfig || consumedUnits <= 0) return 0;

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

module.exports = {
    calculateCostForConsumption,
    getCurrentTierInfo
};
