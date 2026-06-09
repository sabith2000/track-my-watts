// meter-tracker/client/src/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import ReadingsPage from './pages/ReadingsPage';
import SettingsPage from './pages/SettingsPage';
import BillingCyclesPage from './pages/BillingCyclesPage';
import AnalyticsPage from './pages/AnalyticsPage'; 
import WelcomeWizardPage from './pages/WelcomeWizardPage'; // --- NEW IMPORT ---

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <>
      <Routes>
        <Route path="/welcome" element={<WelcomeWizardPage />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="readings" element={<ReadingsPage />} />
          <Route path="billing-cycles" element={<BillingCyclesPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      
      <ToastContainer
        position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop={false}
        closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored"
      />
    </>
  );
}

export default App;