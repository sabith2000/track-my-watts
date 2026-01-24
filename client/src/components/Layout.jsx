// client/src/components/Layout.jsx
import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

// --- CONFIGURATION ---
const NAV_ITEMS = [
  { name: 'Dashboard', path: '/' },
  { name: 'Readings', path: '/readings' },
  { name: 'Billing Cycles', path: '/billing-cycles' },
  { name: 'Analytics', path: '/analytics' },
  { name: 'Settings', path: '/settings' },
];

// --- ICONS ---
const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setIsMobileMenuOpen(false); }, [location]);

  useEffect(() => {
    if (isMobileMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobileMenuOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans selection:bg-green-200 selection:text-green-900">
      
      {/* --- HEADER --- */}
      <nav className="bg-slate-900 text-white shadow-xl sticky top-0 z-50 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* UPDATED: Fixed height to h-16 (64px) for a compact look */}
          <div className="flex justify-between items-center h-16"> 
            
            {/* 1. LOGO SECTION */}
            <NavLink to="/" className="flex items-center gap-3 group shrink-0" onClick={() => setIsMobileMenuOpen(false)}>
              <div className="relative">
                <div className="absolute inset-0 bg-green-500 blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-700 rounded-full"></div>
                <img 
                  src="/logo.png" 
                  alt="TrackMyWatts" 
                  className="relative h-9 w-9 sm:h-10 sm:w-10 transition-transform duration-500 ease-out group-hover:rotate-12 group-hover:scale-110" 
                />
              </div>
              
              {/* Text Container */}
              <div className="flex flex-col justify-center pt-0.5">
                {/* Title: Russo One Font */}
                <span className="font-display text-lg sm:text-2xl tracking-wide uppercase bg-gradient-to-r from-green-400 via-emerald-200 to-teal-400 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] leading-none">
                  Track My Watts
                </span>
                
                {/* Subtitle: Birthstone Signature Font */}
                <span className="font-signature text-xl text-yellow-400 -mt-1 tracking-wide group-hover:text-yellow-300 transition-colors opacity-90">
                  By LMS
                </span>
              </div>
            </NavLink>

            {/* 2. DESKTOP NAV */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={({ isActive }) => `
                    group relative px-3 py-2 text-sm font-bold tracking-wide transition-all duration-300 rounded-md overflow-hidden
                    ${isActive 
                      ? 'text-white' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  {({ isActive }) => (
                    <>
                      <span className="relative z-10">{item.name}</span>
                      <span className={`
                        absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-green-400 to-emerald-500 shadow-[0_0_10px_rgba(74,222,128,0.8)]
                        transition-transform duration-500 ease-out origin-left
                        ${isActive ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-50'}
                      `} />
                      <span className={`
                         absolute inset-0 bg-gradient-to-t from-green-500/10 to-transparent opacity-0 transition-opacity duration-300
                         ${isActive ? 'opacity-100' : 'group-hover:opacity-50'}
                      `} />
                    </>
                  )}
                </NavLink>
              ))}
            </div>

            {/* 3. MOBILE BUTTON */}
            <div className="flex items-center md:hidden">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors active:scale-95"
              >
                {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
              </button>
            </div>
          </div>
        </div>

        {/* --- MOBILE DRAWER --- */}
        {isMobileMenuOpen && (
          <div className="md:hidden relative z-50">
            {/* Matches h-16 header height (top-16) */}
            <div className="fixed inset-0 top-16 bg-black/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="absolute top-0 left-0 w-full bg-slate-900 border-b border-slate-700 shadow-2xl animate-[slideDown_0.2s_ease-out]">
              <div className="px-4 py-3 space-y-1">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => `
                      block px-4 py-3 text-base font-bold rounded-xl transition-all border-l-4 
                      ${isActive 
                        ? 'bg-slate-800 text-white border-green-500' 
                        : 'text-slate-400 border-transparent hover:bg-slate-800 hover:text-white'
                      }
                    `}
                  >
                    {item.name}
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[80vh]">
        <div key={location.pathname} className="animate-[softFadeUp_0.4s_cubic-bezier(0.16,1,0.3,1)]">
          <Outlet />
        </div>
      </main>

      {/* --- FOOTER --- */}
      <footer className="bg-white border-t border-slate-100 py-5 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs sm:text-sm text-slate-500">
          
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-700 tracking-tight">© {new Date().getFullYear()} TrackMyWatts</span>
            <span className="hidden sm:inline w-px h-3 bg-slate-300"></span>
            <span className="italic text-slate-400 font-medium">Powering Smart Decisions</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-100 rounded-full shadow-sm hover:border-pink-100 hover:shadow-md transition-all group cursor-default">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-pink-400 transition-colors">Made with</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-pink-400 animate-[heartbeat_1.5s_ease-in-out_infinite]">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
              {/* Signature Font in Footer */}
              <span className="font-signature text-xl text-slate-600 ml-1">by LMS</span>
            </div>

            <div className="flex items-center px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full shadow-md text-white hover:shadow-lg hover:scale-105 transition-all cursor-default">
              <span className="font-mono text-[10px] font-bold tracking-wide">v{import.meta.env.VITE_APP_VERSION}</span>
            </div>
          </div>
        </div>
      </footer>
      
      <style>{`
        @keyframes softFadeUp {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}

export default Layout;