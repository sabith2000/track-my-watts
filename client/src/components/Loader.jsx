// client/src/components/Loader.jsx
import React from 'react';

const Loader = ({ fullScreen = false, text = "Loading..." }) => {
  const containerClasses = fullScreen
    ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm"
    : "flex flex-col items-center justify-center p-8 min-h-[200px]";

  return (
    <div className={containerClasses}>
      <div className="relative flex h-12 w-12">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-12 w-12 bg-indigo-500"></span>
        {/* Spinner Icon */}
        <svg 
          className="animate-spin absolute inset-0 m-auto h-6 w-6 text-white" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <p className="mt-4 text-sm font-semibold text-indigo-700 animate-pulse">{text}</p>
    </div>
  );
};

export default Loader;