// track-my-watts/server/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const path = require('path');

// Import routes
const slabRateRoutes = require('./routes/slabRateRoutes');
const meterRoutes = require('./routes/meterRoutes');
const billingCycleRoutes = require('./routes/billingCycleRoutes');
const readingRoutes = require('./routes/readingRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const settingsRoutes = require('./routes/settingsRoutes'); 
const systemRoutes = require('./routes/systemRoutes'); // --- NEW IMPORT ---
const Meter = require('./models/Meter');

// Load environment variables from .env file
dotenv.config();

// Connect to Database
connectDB();

// Initialize the Express application
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Define API routes
app.use('/api/slabs', slabRateRoutes);
app.use('/api/meters', meterRoutes);
app.use('/api/billing-cycles', billingCycleRoutes);
app.use('/api/readings', readingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/system', systemRoutes); // --- NEW ROUTE ---

// Serve Frontend in Production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/dist', 'index.html'));
  });
}

// Define the port
const PORT = process.env.PORT || 5001;

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});