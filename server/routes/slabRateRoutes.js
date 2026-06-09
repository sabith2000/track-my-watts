// meter-tracker/server/routes/slabRateRoutes.js
const express = require('express');
const router = express.Router();
const {
    addSlabRateConfig,
    getSlabRateConfigs,
    getActiveSlabRateConfig,
    setActiveSlabRateConfig,
    deleteSlabRateConfig,
    updateSlabRateConfig // <-- ADDED
} = require('../controllers/slabRateController');

router.route('/')
    .get(getSlabRateConfigs)
    .post(addSlabRateConfig);

router.route('/active')
    .get(getActiveSlabRateConfig);

router.route('/:id/activate')
   .put(setActiveSlabRateConfig);

router.route('/:id')
   .put(updateSlabRateConfig) // <-- ADDED
   .delete(deleteSlabRateConfig);

module.exports = router;