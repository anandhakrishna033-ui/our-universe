import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Settings } from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen, onAccountClick }) => {
  const location = useLocation();

  const getLinkClass = (path) => {
    const isActive = location.pathname === path;
    return `block px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
      isActive 
        ? "bg-[var(--color-primary)] text-white shadow-md" 
        : "text-gray-700 hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-primary)]"
    }`;
  };

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
        className={`fixed md:relative top-0 left-0 h-screen w-72 md:w-64 bg-[var(--color-bg)] border-r border-black/5 shadow-2xl md:shadow-sm z-50 flex flex-col transform transition-transform duration-500 ease-in-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-20 flex items-center justify-between px-6 border-b border-black/5 shrink-0">
          <h2 className="text-3xl font-serif text-[var(--color-primary)] tracking-wide">
            Our Story <span className="text-[var(--color-heart)]">♡</span>
          </h2>
          
          {/* Mobile Close Button */}
          <button 
            onClick={closeMenu}
            className="md:hidden p-2 text-gray-400 hover:text-[var(--color-primary)] bg-white hover:bg-[var(--color-bg-alt)] rounded-full transition-colors shadow-sm"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation & Account Container */}
        <nav className="flex-1 p-5 flex flex-col overflow-y-auto overscroll-none custom-scrollbar">
          
          {/* Links Section (Takes up available top space) */}
          <div className="space-y-2 flex-1">
            <Link to="/" className={getLinkClass('/')} onClick={closeMenu}>Dashboard</Link>
            <Link to="/memories" className={getLinkClass('/memories')} onClick={closeMenu}>Memories</Link>
            <Link to="/gallery" className={getLinkClass('/gallery')} onClick={closeMenu}>Gallery</Link>
            <Link to="/letters" className={getLinkClass('/letters')} onClick={closeMenu}>Letters</Link>
            <Link to="/timeline" className={getLinkClass('/timeline')} onClick={closeMenu}>Timeline</Link>
            
            <Link to="/bucket-list" className={getLinkClass('/bucket-list')} onClick={closeMenu}>Bucket List</Link>
            <Link to="/promise-jar" className={getLinkClass('/promise-jar')} onClick={closeMenu}>Promise Jar</Link>
            <Link to="/mood-board" className={getLinkClass('/mood-board')} onClick={closeMenu}>Mood Board</Link>
            
            <div className="pt-6 pb-2">
              <p className="px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Settings & More
              </p>
            </div>
            
            <Link to="/create-memory" className={getLinkClass('/create-memory')} onClick={closeMenu}>Add Memory</Link>
            <Link to="/places" className={getLinkClass('/places')} onClick={closeMenu}>Places</Link>
            <Link to="/settings" className={getLinkClass('/settings')} onClick={closeMenu}>Settings</Link>
          </div>

          {/* --- UPGRADED: CLEAN ACCOUNT BUTTON --- */}
          <div className="mt-8 pt-6 border-t border-black/10 shrink-0">
            <button 
              onClick={() => onAccountClick()} 
              className="w-full py-3 px-4 flex items-center justify-between text-sm text-gray-700 bg-white hover:bg-[var(--color-bg-alt)] border border-gray-200 rounded-xl font-bold transition-colors shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center">
                  <User size={16} />
                </div>
                Account & Security
              </div>
              <Settings size={16} className="text-gray-400" />
            </button>
          </div>

        </nav>  
      </motion.aside>
    </>
  );
};

export default Sidebar;