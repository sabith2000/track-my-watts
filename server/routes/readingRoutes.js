// meter-tracker/server/routes/readingRoutes.js
const express = require('express');
const router = express.Router();
const {
  addReading,
  getAllReadings,
  getReadingById,
  updateReading,
  deleteReading,
  deleteAllReadingsGlobally,
  getLatestReadingForMeter
} = require('../controllers/readingController');

router.route('/')
  .get(getAllReadings)
  .post(addReading);

router.route('/action/delete-all-globally')
    .delete(deleteAllReadingsGlobally);

router.get('/latest/:meterId', getLatestReadingForMeter);

router.route('/:id')
  .get(getReadingById)
  .put(updateReading)
  .delete(deleteReading);

module.exports = router;