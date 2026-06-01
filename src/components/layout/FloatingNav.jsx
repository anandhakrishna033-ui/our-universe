import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Heart, Mail, Plus, Grip, X, MapPin, ListTodo, Archive, Image as ImageIcon, Clock, Palette, Settings } from 'lucide-react';

const FloatingNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Helper to check if a link is active
  const isActive = (path) => location.pathname === path;

  // The primary visible dock links
  const dockLinks = [
    { icon: Home, path: '/', label: 'Home' },
    { icon: Heart, path: '/memories', label: 'Memories' },
  ];

  const rightDockLinks = [
    { icon: Mail, path: '/letters', label: 'Letters' },
  ];

  // The expanded menu links
  const expandedLinks = [
    { icon: ImageIcon, path: '/gallery', label: 'Gallery' },
    { icon: Clock, path: '/timeline', label: 'Timeline' },
    { icon: MapPin, path: '/places', label: 'Our Map' },
    { icon: ListTodo, path: '/bucket-list', label: 'Bucket List' },
    { icon: Archive, path: '/promise-jar', label: 'Promise Jars' },
    { icon: Palette, path: '/mood-board', label: 'Mood Board' },
    { icon: Settings, path: '/settings', label: 'Settings' },
  ];

  const handleNavigate = (path) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* 1. THE FULL SCREEN "MORE" MENU */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }} 
            animate={{ opacity: 1, backdropFilter: "blur(12px)" }} 
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }} 
            className="fixed inset-0 z-[60] bg-[var(--color-bg)]/80 flex flex-col items-center justify-center p-6"
          >
            <button 
              onClick={() => setIsMenuOpen(false)} 
              className="absolute top-8 right-8 p-3 bg-white rounded-full text-gray-500 hover:text-[var(--color-primary)] shadow-lg transition-transform hover:scale-110"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-3xl font-serif text-[var(--color-primary)] font-bold mb-10">Explore Our Universe ✨</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-4xl">
              {expandedLinks.map((link, idx) => {
                const Icon = link.icon;
                return (
                  <motion.button
                    key={link.path}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => handleNavigate(link.path)}
                    className={`flex flex-col items-center justify-center gap-3 p-6 rounded-3xl shadow-sm border transition-all ${isActive(link.path) ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-white text-gray-600 hover:text-[var(--color-primary)] hover:shadow-md border-white/50'}`}
                  >
                    <Icon size={32} strokeWidth={1.5} />
                    <span className="font-bold tracking-wide text-sm">{link.label}</span>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. THE FLOATING GLASS DOCK */}
      <div className="fixed bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-2xl rounded-full px-2 py-2 flex items-center gap-1 md:gap-2">
          
          {/* Left Icons */}
          {dockLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link 
                key={link.path} 
                to={link.path} 
                className={`p-3 md:p-4 rounded-full transition-all duration-300 ${isActive(link.path) ? 'bg-[var(--color-primary)] text-white shadow-md scale-105' : 'text-gray-500 hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-primary)]'}`}
              >
                <Icon size={22} strokeWidth={isActive(link.path) ? 2.5 : 2} />
              </Link>
            )
          })}

          {/* Central Prominent "Add Memory" Button */}
          <div className="px-2">
            <Link 
              to="/create-memory" 
              className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-gradient-to-tr from-[var(--color-primary)] to-pink-400 text-white rounded-full shadow-[0_0_20px_rgba(0,0,0,0.2)] hover:scale-110 transition-transform duration-300"
            >
              <Plus size={28} strokeWidth={3} />
            </Link>
          </div>

          {/* Right Icons */}
          {rightDockLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link 
                key={link.path} 
                to={link.path} 
                className={`p-3 md:p-4 rounded-full transition-all duration-300 ${isActive(link.path) ? 'bg-[var(--color-primary)] text-white shadow-md scale-105' : 'text-gray-500 hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-primary)]'}`}
              >
                <Icon size={22} strokeWidth={isActive(link.path) ? 2.5 : 2} />
              </Link>
            )
          })}

          {/* Expanded Menu Toggle */}
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="p-3 md:p-4 rounded-full text-gray-500 hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-primary)] transition-all duration-300"
          >
            <Grip size={22} strokeWidth={2} />
          </button>

        </div>
      </div>
    </>
  );
};

export default FloatingNav;