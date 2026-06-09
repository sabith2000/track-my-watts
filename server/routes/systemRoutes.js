// track-my-watts/server/routes/systemRoutes.js
const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');

router.route('/status').get(systemController.getSystemStatus);

module.exports = router;
