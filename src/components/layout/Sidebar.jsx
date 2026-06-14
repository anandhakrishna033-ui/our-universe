import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Clock, LogOut } from 'lucide-react'; // Added a few icons for the account section
import { db } from '../../firebase'; // Ensure this points to your config
import { collection, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const Sidebar = ({ isOpen, setIsOpen, onLogout }) => {
  const location = useLocation();

  // --- NEW: VISITOR STATE ---
  const [visitors, setVisitors] = useState([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [localName, setLocalName] = useState(localStorage.getItem('universe_visitor') || 'Guest');

  // --- NEW: FIREBASE VISITOR LOGIC ---
  useEffect(() => {
    // Listens to the 'visitors' collection in real-time
    const unsubscribe = onSnapshot(collection(db, 'visitors'), (snapshot) => {
      const visitorData = snapshot.docs.map(doc => doc.data());
      // Sort visitors so the most recently active person is at the top
      visitorData.sort((a, b) => (b.lastSeen?.toMillis() || 0) - (a.lastSeen?.toMillis() || 0));
      setVisitors(visitorData);
    });
    return () => unsubscribe(); // Cleanup listener when sidebar closes
  }, []);

  const handleSaveName = async () => {
    if (localName.trim()) {
      const newName = localName.trim();
      localStorage.setItem('universe_visitor', newName);
      setIsEditingName(false);
      try {
        const visitorRef = doc(db, 'visitors', newName.toLowerCase());
        await setDoc(visitorRef, {
          name: newName,
          lastSeen: serverTimestamp() 
        }, { merge: true });
      } catch (error) {
        console.error("Error updating name:", error);
      }
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "Just now";
    return timestamp.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // --- EXISTING LOGIC ---
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
        <nav className="flex-1 p-5 flex flex-col overflow-y-auto custom-scrollbar">
          
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

          {/* --- NEW: ACCOUNT & LIVE VISITORS SECTION --- */}
          <div className="mt-8 pt-6 border-t border-black/10 shrink-0">
            
            {/* Current User Card */}
            <div className="mb-5 bg-[var(--color-bg-alt)] p-4 rounded-xl border border-black/5 shadow-sm">
              <h2 className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2 flex items-center gap-1">
                <User size={12} /> Current Visitor
              </h2>
              {isEditingName ? (
                <div className="flex gap-2 mt-1">
                  <input 
                    type="text" 
                    value={localName} 
                    onChange={(e) => setLocalName(e.target.value)}
                    className="w-full text-sm p-1.5 border border-black/10 rounded-md focus:outline-none focus:border-[var(--color-primary)]"
                    autoFocus
                  />
                  <button onClick={handleSaveName} className="text-xs bg-[var(--color-primary)] text-white px-3 rounded-md font-medium hover:opacity-90">
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center mt-1">
                  <span className="font-bold text-gray-800 text-lg">{localName}</span>
                  <button onClick={() => setIsEditingName(true)} className="text-xs text-[var(--color-primary)] hover:underline font-medium">
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Live Universe Logins */}
            <h2 className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-3 flex items-center gap-1 px-1">
              <Clock size={12} /> Live Status
            </h2>
            <div className="space-y-3 mb-6 px-1 max-h-32 overflow-y-auto custom-scrollbar">
              {visitors.map((visitor, idx) => {
                const isOnline = visitor.lastSeen && (Date.now() - visitor.lastSeen.toMillis() < 300000); // Online if active in last 5 mins
                return (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-300'}`} />
                      <span className="text-gray-700 font-medium">{visitor.name}</span>
                    </div>
                    <span className="text-xs text-gray-400">{formatTime(visitor.lastSeen)}</span>
                  </div>
                );
              })}
            </div>

            {/* Logout Button */}
            <button 
              onClick={() => {
                localStorage.removeItem('universe_visitor'); 
                if(onLogout) onLogout();
              }} 
              className="w-full py-3 flex items-center justify-center gap-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-xl font-bold transition-colors"
            >
              <LogOut size={16} /> Lock Universe
            </button>
          </div>

        </nav>  
      </motion.aside>
    </>
  );
};

export default Sidebar;