import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();

  const getLinkClass = (path) => {
    const isActive = location.pathname === path;
    return `block px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
      isActive 
        ? "bg-[#8B1235] text-white shadow-md" 
        : "text-gray-700 hover:bg-pink-50 hover:text-[#8B1235]"
    }`;
  };

  // Function to close menu on mobile after clicking a link
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Dark Overlay Background */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMenu}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* The Sidebar Itself */}
      <motion.aside 
        className={`fixed md:relative top-0 left-0 h-screen w-72 md:w-64 bg-white border-r border-gray-100 shadow-2xl md:shadow-sm z-50 flex flex-col transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-20 flex items-center justify-between px-6 border-b border-gray-100 shrink-0">
          <h2 className="text-3xl font-serif text-[#8B1235] tracking-wide">
            Our Story <span className="text-pink-300">♡</span>
          </h2>
          
          {/* Mobile Close Button */}
          <button 
            onClick={closeMenu}
            className="md:hidden p-2 text-gray-400 hover:text-[#8B1235] bg-gray-50 hover:bg-pink-50 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-5 space-y-2 overflow-y-auto custom-scrollbar">
          <Link to="/" className={getLinkClass('/')} onClick={closeMenu}>Dashboard</Link>
          <Link to="/memories" className={getLinkClass('/memories')} onClick={closeMenu}>Memories</Link>
          <Link to="/gallery" className={getLinkClass('/gallery')} onClick={closeMenu}>Gallery</Link>
          <Link to="/letters" className={getLinkClass('/letters')} onClick={closeMenu}>Letters</Link>
          <Link to="/timeline" className={getLinkClass('/timeline')} onClick={closeMenu}>Timeline</Link>
          
          {/* NEW INTERACTIVE FEATURES */}
          <Link to="/bucket-list" className={getLinkClass('/bucket-list')} onClick={closeMenu}>Bucket List</Link>
          <Link to="/jukebox" className={getLinkClass('/jukebox')} onClick={closeMenu}>Jukebox</Link>
          <Link to="/countdowns" className={getLinkClass('/countdowns')} onClick={closeMenu}>Countdowns</Link>
          
          <div className="pt-6 pb-2">
            <p className="px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Settings & More
            </p>
          </div>
          
          <Link to="/create-memory" className={getLinkClass('/create-memory')} onClick={closeMenu}>Add Memory</Link>
          <Link to="/places" className={getLinkClass('/places')} onClick={closeMenu}>Places</Link>
          <Link to="/settings" className={getLinkClass('/settings')} onClick={closeMenu}>Settings</Link>
        </nav>
      </motion.aside>
    </>
  );
};

export default Sidebar;