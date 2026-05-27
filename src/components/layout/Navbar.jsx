import React from 'react';
import { Settings, Menu, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

const Navbar = ({ onMenuClick }) => {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-lg border-b border-white/20 shadow-sm">
      {/* Max-width container to align with your main content layout */}
      <div className="max-w-6xl mx-auto h-16 flex items-center justify-between px-4 md:px-6">
        
        {/* Left Section: Branding & Menu */}
        <div className="flex items-center gap-4">
          <button 
            onClick={onMenuClick} 
            className="md:hidden p-2 text-gray-600 hover:bg-rose-50 hover:text-[#8B1235] rounded-xl transition-all duration-200"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex items-center gap-2 text-[#8B1235]">
            <Heart size={20} fill="currentColor" className="hidden sm:block" />
            <h1 className="text-lg font-serif font-semibold tracking-tight text-gray-800">
              Our Universe
            </h1>
          </div>
        </div>
        
        {/* Right Section: Actions */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 font-medium italic hidden sm:block">
            "Every moment is a treasure."
          </span>
          
          <Link 
            to="/settings" 
            className="p-2.5 rounded-full hover:bg-rose-50 transition-all duration-200 text-gray-600 hover:text-[#8B1235] border border-gray-100 hover:border-rose-100 shadow-sm bg-white"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;