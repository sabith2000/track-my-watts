// server/routes/billingCycleRoutes.js
const express = require('express');
const router = express.Router();
const {
  startNewBillingCycle,
  closeCurrentBillingCycle,
  getActiveBillingCycle,
  getAllBillingCycles,
  getBillingCycleById,
  updateBillingCycle,
  deleteBillingCycle,
  getExportDataForCycle // <--- IMPORT THIS
} = require('../controllers/billingCycleController');

router.route('/')
  .get(getAllBillingCycles);

router.route('/start')
  .post(startNewBillingCycle);

router.route('/close-current')
  .post(closeCurrentBillingCycle);

router.route('/active')
  .get(getActiveBillingCycle);

// --- NEW EXPORT ROUTE ---
router.route('/:id/export-data')
  .get(getExportDataForCycle);

router.route('/:id')
  .get(getBillingCycleById)
  .put(updateBillingCycle)
  .delete(deleteBillingCycle);

module.exports = router;