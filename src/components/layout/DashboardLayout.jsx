import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const DashboardLayout = ({ children, theme, onAccountClick }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Define background styles based on the current theme
  const getThemeStyles = () => {
    switch (theme) {
      case 'beach':
        return 'bg-[#F4F9F9] text-[#0C4A6E]'; // Soft sandy-white background, deep ocean text
      case 'sunset':
        return 'bg-[#FFF2EB] text-[#5C2A18]';
      case 'light':
      default:
        return 'bg-[#FCF8F9] text-gray-800';
    }
  };

  // Define ambient orb colors based on theme
  const getOrbStyles = () => {
    switch (theme) {
      case 'beach':
        return { orb1: 'bg-sky-200/40', orb2: 'bg-teal-100/50' }; // Clear sky and shallow water orbs
      case 'sunset':
        return { orb1: 'bg-orange-300/40', orb2: 'bg-peach-300/40' };
      case 'light':
      default:
        return { orb1: 'bg-pink-100/50', orb2: 'bg-rose-100/50' };
    }
  };

  const orbs = getOrbStyles();

  return (
    <div className={`flex h-screen overflow-hidden relative font-sans transition-colors duration-500 ${getThemeStyles()}`}>
      
      {/* --- AMBIENT GLOW ANIMATIONS --- */}
      <div className={`absolute top-0 left-0 w-[800px] h-[800px] ${orbs.orb1} rounded-full mix-blend-multiply filter blur-[150px] opacity-70 pointer-events-none transition-colors duration-700`}></div>
      <div className={`absolute bottom-0 right-0 w-[600px] h-[600px] ${orbs.orb2} rounded-full mix-blend-multiply filter blur-[150px] opacity-70 pointer-events-none transition-colors duration-700`}></div>
      
      {/* --- UPGRADED: PASSING THE ONACCOUNTCLICK PROP TO SIDEBAR --- */}
      <Sidebar 
        isOpen={isMobileMenuOpen} 
        setIsOpen={setIsMobileMenuOpen} 
        theme={theme} 
        onAccountClick={onAccountClick} 
      />

      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <Navbar onMenuClick={() => setIsMobileMenuOpen(true)} theme={theme} />
        
       <main className="flex-1 overflow-x-hidden overflow-y-auto overscroll-none p-4 md:p-8 scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;