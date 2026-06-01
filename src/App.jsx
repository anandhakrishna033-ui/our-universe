import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Image as ImageIcon, Video, Mail, Music, Calendar, Clock, Shield, Palette, Download, Trash2, Lock, ArrowRight, Check, Sparkles, MapPin, Plus, PenTool, Mic, StopCircle, Play, Pause, Volume2, Type, StickyNote, X, ChevronDown, ChevronUp, Copy, AlertCircle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import DashboardLayout from './components/layout/DashboardLayout';
import emailjs from '@emailjs/browser'; 
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

// --- FIREBASE IMPORTS ---
import { db, storage, auth } from './firebase'; 
import { collection, addDoc, getDocs, query, where, doc, deleteDoc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import imageCompression from 'browser-image-compression';

// ==========================================
// UTILITY: PRIVATE BASE64 CONVERTER
// ==========================================
const fileToBase64 = (fileOrBlob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(fileOrBlob);
});

// Custom glowing heart icon for your map pins
const heartIcon = new L.DivIcon({
  html: `<div style="font-size: 28px; color: #E11D48; filter: drop-shadow(0px 0px 8px rgba(225,29,72,0.8));">❤️</div>`,
  className: 'custom-heart-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

// The Custom Pulsing Heart Marker for the LovelyMap
const lovelyHeartMarker = new L.DivIcon({
  className: 'bg-transparent',
  html: `<div class="relative flex h-8 w-8 items-center justify-center">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-6 w-6 bg-[#8B1235] items-center justify-center text-white text-xs shadow-lg">❤️</span>
        </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});


// ==========================================
// CUSTOM UI MODALS (Replaces default alerts)
// ==========================================
const CaptionModal = ({ isOpen, onClose, onSubmit, fileCount }) => {
  const [caption, setCaption] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(caption);
    setCaption(""); 
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-serif font-bold text-[#8B1235] mb-2">
              {fileCount > 1 ? `Uploading ${fileCount} Photos` : "Add a Caption"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">Give your memory a beautiful short caption.</p>
            
            <form onSubmit={handleSubmit}>
              <input 
                autoFocus
                type="text" 
                value={caption} 
                onChange={(e) => setCaption(e.target.value)} 
                placeholder="e.g. A beautiful moment..." 
                className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-[#8B1235] bg-gray-50 mb-6"
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-[#8B1235] text-white font-bold rounded-xl shadow-md hover:bg-[#6A0D28] transition-colors">Save Photos</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-sm shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-2xl font-serif font-bold text-gray-800 mb-2">{title}</h3>
            <p className="text-gray-500 mb-8">{message}</p>
            
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 text-gray-600 font-bold bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
              <button onClick={onConfirm} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl shadow-md hover:bg-red-600 transition-colors">Yes, Delete</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const AlertModal = ({ isOpen, onClose, title, message }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-sm shadow-2xl text-center">
            <div className="w-16 h-16 bg-pink-50 text-[#8B1235] rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles size={32} />
            </div>
            <h3 className="text-2xl font-serif font-bold text-gray-800 mb-2">{title}</h3>
            <p className="text-gray-500 mb-8">{message}</p>
            <button onClick={onClose} className="w-full py-3 bg-[#8B1235] text-white font-bold rounded-xl shadow-md hover:bg-[#6A0D28] transition-colors">Okay</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};


// ==========================================
// 1. BULLETPROOF AUDIO PLAYER
// ==========================================
const AudioPlayer = ({ src }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playableUrl, setPlayableUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!src) return;
    if (src.startsWith('data:')) {
      fetch(src)
        .then(res => res.blob())
        .then(blob => {
          const objectUrl = URL.createObjectURL(blob);
          setPlayableUrl(objectUrl);
        })
        .catch(err => {
          console.error("Audio conversion failed:", err);
          setPlayableUrl(src); 
        });
    } else {
      setPlayableUrl(src);
    }
    return () => {
      if (playableUrl && playableUrl.startsWith('blob:')) {
        URL.revokeObjectURL(playableUrl);
      }
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current || !playableUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => {
        console.error("Audio playback failed:", e);
        setError("Browser blocked audio. Check silent mode.");
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const currentProgress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setProgress(isNaN(currentProgress) ? 0 : currentProgress);
  };

  return (
    <div>
      <div className="flex items-center gap-3 bg-white/50 p-3 rounded-2xl border border-white/50 shadow-sm mt-3">
        <audio 
          ref={audioRef} 
          src={playableUrl} 
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          className="hidden" 
          preload="auto"
        />
        <button type="button" onClick={togglePlay} disabled={!playableUrl} className="w-10 h-10 flex items-center justify-center bg-[#8B1235] text-white rounded-full hover:bg-[#6A0D28] transition-colors shadow-sm shrink-0 disabled:opacity-50">
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-[#8B1235]" 
            style={{ width: `${progress}%` }}
            layout
          ></motion.div>
        </div>
        <Volume2 size={16} className="text-gray-400 shrink-0" />
      </div>
      {error && <p className="text-xs text-red-500 mt-1 ml-2 font-bold flex items-center gap-1"><AlertCircle size={12}/> {error}</p>}
    </div>
  );
};

// ==========================================
// 2. TRUE SECURE GATEWAY (Firebase Auth + Universe + PIN)
// ==========================================
const AuthGateway = ({ onUnlock }) => {
  const [authStep, setAuthStep] = useState('LOADING'); // LOADING, AUTH, UNIVERSE_SETUP, PIN_SETUP, PIN_ENTRY
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [joinCode, setJoinCode] = useState('');
  
  const [user, setUser] = useState(null);
  const [universeId, setUniverseId] = useState(null);
  
  const [pin, setPin] = useState('');
  const [savedPin, setSavedPin] = useState(() => localStorage.getItem('personalPin'));
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Monitor Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Check if user has a Universe assigned in the database
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUniverseId(userDoc.data().universeId);
          setAuthStep(savedPin ? 'PIN_ENTRY' : 'PIN_SETUP');
        } else {
          setAuthStep('UNIVERSE_SETUP');
        }
      } else {
        setUser(null);
        setUniverseId(null);
        setAuthStep('AUTH');
      }
    });
    return () => unsubscribe();
  }, [savedPin]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (isLoginMode) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) { setError(err.message.replace("Firebase: ", "")); }
    setIsLoading(false);
  };

  const handleUniverseSetup = async (mode) => {
    setIsLoading(true);
    try {
      const assignedId = mode === 'CREATE' ? `UNIVERSE-${Math.floor(Math.random() * 1000000)}` : joinCode.trim();
      if (mode === 'JOIN' && !assignedId) throw new Error("Please enter a Universe Code.");
      
      // Save their universe ID to their user profile
      await setDoc(doc(db, "users", user.uid), { email: user.email, universeId: assignedId });
      setUniverseId(assignedId);
      setAuthStep(savedPin ? 'PIN_ENTRY' : 'PIN_SETUP');
    } catch (err) { setError(err.message); }
    setIsLoading(false);
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (authStep === 'PIN_SETUP') {
      if (pin.length < 4) return setError("PIN must be at least 4 digits.");
      localStorage.setItem('personalPin', pin);
      setSavedPin(pin);
      onUnlock(user, universeId);
    } else if (authStep === 'PIN_ENTRY') {
      if (pin === savedPin) onUnlock(user, universeId);
      else { setError("Incorrect PIN."); setPin(''); }
    }
  };

  const handleLogout = () => { signOut(auth); setPin(''); };

  if (authStep === 'LOADING') return <div className="min-h-screen bg-[#f0dce1] flex items-center justify-center font-serif text-[#8B1235] text-xl animate-pulse">Loading Gateway...</div>;

  return (
    <div className="min-h-screen bg-[#f0dce1] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-30%] left-[-30%] w-[500px] h-[500px] bg-pink-200/50 rounded-full mix-blend-multiply filter blur-[120px] animate-pulse"></div>
      
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/60 backdrop-blur-xl p-8 md:p-10 rounded-[2rem] shadow-xl border border-white/50 max-w-md w-full relative z-10 text-center">
        <div className="w-16 h-16 bg-rose-100 text-[#8b0a2f] rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          {authStep === 'AUTH' ? <Shield size={32} /> : authStep === 'UNIVERSE_SETUP' ? <Sparkles size={32} /> : <Lock size={32} />}
        </div>
        
        <h1 className="text-3xl font-serif text-[#8B1235] mb-2">
          {authStep === 'AUTH' ? "Our Universe" : authStep === 'UNIVERSE_SETUP' ? "Initialize Universe" : "App Locked"}
        </h1>
        
        {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl mb-4 text-sm font-bold animate-bounce">{error}</div>}

        {/* STEP 1: FIREBASE EMAIL/PASSWORD */}
        {authStep === 'AUTH' && (
          <form onSubmit={handleAuthSubmit} className="space-y-4 mt-6">
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" className="w-full px-5 py-4 rounded-2xl bg-white border border-pink-100 outline-none focus:border-[#8B1235] text-gray-800 shadow-inner" />
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full px-5 py-4 rounded-2xl bg-white border border-pink-100 outline-none focus:border-[#8B1235] text-gray-800 shadow-inner" />
            <button type="submit" disabled={isLoading} className="w-full mt-2 bg-[#8B1235] text-white py-4 rounded-2xl font-bold text-lg hover:bg-[#6A0D28] shadow-md flex justify-center gap-2">
              {isLoading ? "Authenticating..." : (isLoginMode ? "Secure Login" : "Create Account")}
            </button>
            <p className="text-sm text-gray-500 mt-4 cursor-pointer hover:text-[#8B1235]" onClick={() => setIsLoginMode(!isLoginMode)}>
              {isLoginMode ? "Need an account? Sign up" : "Have an account? Log in"}
            </p>
          </form>
        )}

        {/* STEP 2: CREATE OR JOIN UNIVERSE */}
        {authStep === 'UNIVERSE_SETUP' && (
          <div className="space-y-6 mt-6">
            <p className="text-sm text-gray-500 mb-4">You need a shared space to store memories.</p>
            <button onClick={() => handleUniverseSetup('CREATE')} disabled={isLoading} className="w-full bg-[#8B1235] text-white py-4 rounded-2xl font-bold shadow-md hover:bg-[#6A0D28]">
              Create New Universe
            </button>
            <div className="relative flex items-center py-2"><div className="flex-grow border-t border-gray-300"></div><span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-bold">OR</span><div className="flex-grow border-t border-gray-300"></div></div>
            <div>
              <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Enter Partner's Universe Code" className="w-full px-5 py-4 rounded-xl bg-white border outline-none text-center font-bold tracking-widest text-gray-800 mb-2 shadow-inner" />
              <button onClick={() => handleUniverseSetup('JOIN')} disabled={isLoading} className="w-full bg-gray-800 text-white py-4 rounded-xl font-bold shadow-md hover:bg-black">
                Join Existing Universe
              </button>
            </div>
            <p className="text-sm text-red-400 cursor-pointer mt-4" onClick={handleLogout}>Log out</p>
          </div>
        )}

        {/* STEP 3 & 4: PERSONAL DEVICE PIN */}
        {(authStep === 'PIN_SETUP' || authStep === 'PIN_ENTRY') && (
          <form onSubmit={handlePinSubmit} className="space-y-4 mt-6">
            <p className="text-sm text-gray-500 mb-4">{authStep === 'PIN_SETUP' ? "Create a personal 4-digit PIN for this device." : "Enter your PIN to unlock."}</p>
            <input type="password" required maxLength="8" value={pin} onChange={e => setPin(e.target.value)} placeholder={authStep === 'PIN_ENTRY' ? "Enter PIN" : "Create PIN"} className="w-full px-5 py-4 rounded-2xl bg-white border-2 border-pink-100 outline-none focus:border-[#8B1235] text-center text-2xl tracking-widest text-gray-800 shadow-inner" />
            <button type="submit" className="w-full mt-2 bg-[#8B1235] text-white py-4 rounded-2xl font-bold text-lg hover:bg-[#6A0D28] shadow-md">
              {authStep === 'PIN_ENTRY' ? "Unlock App" : "Set PIN & Enter"}
            </button>
            <p className="text-sm text-red-400 mt-4 cursor-pointer hover:underline" onClick={handleLogout}>Log out entirely</p>
          </form>
        )}
      </motion.div>
    </div>
  );
};

// ==========================================
// 3. MAIN PAGES (Dashboard & Quotes)
// ==========================================
const RotatingQuotes = ({ quotes }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!quotes || quotes.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % quotes.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [quotes]);

  if (!quotes || quotes.length === 0) return null;

  return (
    <div className="h-24 flex items-center justify-center overflow-hidden mb-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -15, filter: "blur(4px)" }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="text-2xl md:text-3xl font-serif italic text-gray-800 text-center px-4"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          "{quotes[currentIndex]?.text}"
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const LiveClockCard = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 md:p-5 shadow-sm border border-white flex items-center gap-4 hover:scale-[1.02] transition-transform">
      <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
        <Clock size={24} />
      </div>
      <div>
        <h3 className="text-xl md:text-2xl font-bold text-gray-800 leading-none tracking-tight">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </h3>
        <p className="text-sm text-gray-600 mt-1">Our Time</p>
      </div>
    </div>
  );
};

const Home = ({ memories, quotes, deleteMemory }) => {
  const recentMemories = memories.slice(0, 4); 
  const navigate = useNavigate();
  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.15 } } };
  
  return (
    <div className="max-w-6xl mx-auto pb-10">
      <RotatingQuotes quotes={quotes} />
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/40 backdrop-blur-md rounded-3xl md:rounded-[2rem] p-6 md:p-10 mb-6 md:mb-8 relative overflow-hidden shadow-sm border border-white/50">
        <div className="relative z-10 max-w-xl">
          <p className="text-rose-500 font-medium mb-1 md:mb-2 text-sm md:text-base flex items-center gap-2"><Sparkles size={16} /> Welcome back to our universe</p>
          <h1 className="text-3xl md:text-5xl font-serif text-gray-800 leading-tight mb-4">"I will be there for you <span className="text-[#8B1235] italic font-light">always</span>."</h1>
          <p className="text-gray-600 mb-6 md:mb-8 text-sm md:text-base leading-relaxed">Every photo, every letter, every little moment we share is kept safe right here.</p>
          <button onClick={() => navigate('/create-memory')} className="bg-[#8B1235] text-white px-5 md:px-6 py-2.5 md:py-3 rounded-full font-medium hover:bg-[#6A0D28] transition-all flex items-center gap-2 text-sm md:text-base shadow-md hover:shadow-lg">
            <Plus size={18} /> Add New Memory
          </button>
        </div>
      </motion.div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 md:p-5 shadow-sm border border-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0"><Heart size={24} /></div>
          <div><h3 className="text-2xl font-bold text-gray-800 leading-none">{memories.length}</h3><p className="text-sm text-gray-600 mt-1">Total Memories</p></div>
        </div>
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 md:p-5 shadow-sm border border-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0"><ImageIcon size={24} /></div>
          <div><h3 className="text-2xl font-bold text-gray-800 leading-none">{memories.filter(m => (m.images && m.images.length > 0) || m.img).length}</h3><p className="text-sm text-gray-600 mt-1">Photos</p></div>
        </div>
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 md:p-5 shadow-sm border border-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0"><MapPin size={24} /></div>
          <div><h3 className="text-2xl font-bold text-gray-800 leading-none">{memories.filter(m => m.location).length}</h3><p className="text-sm text-gray-600 mt-1">Places Visited</p></div>
        </div>
        <LiveClockCard />
      </motion.div>

      <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white">
        <h2 className="text-xl font-serif font-bold text-gray-800 mb-6">Our Latest Moments</h2>
        {memories.length === 0 ? (
           <p className="text-gray-500 text-center py-10">No memories yet. Add your first one!</p>
        ) : (
          <motion.div layout className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <AnimatePresence>
              {recentMemories.map((m) => {
                const coverImg = (m.images && m.images.length > 0) ? m.images[0] : m.img;
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                    transition={{ duration: 0.4, type: "spring" }}
                    whileHover={{ scale: 1.05 }} 
                    key={m.firestoreId || m.id} 
                    className="bg-white p-2.5 pb-6 rounded-sm shadow-md border border-gray-100 relative group"
                  >
                    <button 
                      onClick={() => deleteMemory(m.firestoreId || m.id)} 
                      className="absolute top-4 right-4 bg-white/80 p-2 rounded-full text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10"
                      title="Delete Memory"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="w-full aspect-square bg-gray-100 mb-3 overflow-hidden rounded-sm relative">
                      {coverImg ? (
                        <motion.img 
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
                          src={coverImg} alt={m.title} className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon /></div>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-800 font-serif truncate">{m.title}</p>
                      <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">{m.date}</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 4. MEMORY CREATION
// ==========================================
const CreateMemory = ({ onAddMemory, showAlert }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ title: '', date: '', location: '', description: '' });
  const [imgFiles, setImgFiles] = useState([]);
  const [imgPreviews, setImgPreviews] = useState([]);
  const [voiceBlob, setVoiceBlob] = useState(null);
  const [voicePreview, setVoicePreview] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const mediaRecorderRef = useRef(null);

  const handleMultiImageUpload = async (e) => {
    const files = Array.from(e.target.files).slice(0, 4);
    if (!files.length) return;

    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImgPreviews(prev => [...prev, ...newPreviews].slice(0, 4));

    const compressedFiles = [];
    const options = { maxSizeMB: 0.4, maxWidthOrHeight: 1080, useWebWorker: true };
    
    for (const file of files) {
      try {
        const compressed = await imageCompression(file, options);
        compressedFiles.push(compressed);
      } catch (err) {
        compressedFiles.push(file);
      }
    }
    setImgFiles(prev => [...prev, ...compressedFiles].slice(0, 4));
  };

  const removeImage = (index) => {
    setImgPreviews(prev => prev.filter((_, i) => i !== index));
    setImgFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm')) options = { mimeType: 'audio/webm' };
      else if (MediaRecorder.isTypeSupported('audio/mp4')) options = { mimeType: 'audio/mp4' };
      else if (MediaRecorder.isTypeSupported('audio/aac')) options = { mimeType: 'audio/aac' };
      
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      const audioChunks = [];
      mediaRecorderRef.current.ondataavailable = (e) => { if (e.data && e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorderRef.current.onstop = () => { 
        const actualMimeType = mediaRecorderRef.current.mimeType;
        const audioBlob = new Blob(audioChunks, { type: actualMimeType }); 
        setVoiceBlob(audioBlob);
        setVoicePreview(URL.createObjectURL(audioBlob)); 
      };
      mediaRecorderRef.current.start(); 
      setIsRecording(true);
    } catch (err) { 
      showAlert("Mic Access Denied", "Microphone access denied. Please check your browser permissions."); 
    }
  };

  const stopRecording = () => { mediaRecorderRef.current.stop(); setIsRecording(false); };

  const handleSubmit = async (e) => { 
    e.preventDefault(); 
    if (!formData.title) return;
    setIsSaving(true);
    const success = await onAddMemory({ ...formData, imgFiles, voiceBlob }); 
    setIsSaving(false);
    if (success) navigate('/memories'); 
  };

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <h1 className="text-3xl md:text-4xl font-serif font-bold mb-8">Add a Memory ✨</h1>
      <form onSubmit={handleSubmit} className="bg-white/70 backdrop-blur-xl p-8 rounded-3xl shadow-sm border border-white space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input type="text" required onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-[#8B1235]" placeholder="e.g. The night we met" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="text" onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-[#8B1235]" placeholder="dd/mm/yyyy" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input type="text" onChange={e => setFormData({...formData, location: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-[#8B1235]" placeholder="e.g. Central Park" />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Upload Photos (Max 4)</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
            {imgPreviews.map((preview, idx) => (
              <div key={idx} className="relative aspect-square group">
                <img src={preview} className="h-full w-full object-cover rounded-xl shadow-sm"/>
                <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md opacity-80 hover:opacity-100"><Trash2 size={14}/></button>
              </div>
            ))}
            {imgPreviews.length < 4 && (
              <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl hover:bg-white/50 cursor-pointer transition">
                <Plus className="text-gray-400 mb-1" />
                <span className="text-xs text-gray-500 font-medium">Add Photo</span>
                <input type="file" accept="image/*" multiple onChange={handleMultiImageUpload} className="hidden" />
              </label>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Voice Note</label>
          {!isRecording && !voicePreview && <button type="button" onClick={startRecording} className="flex items-center gap-2 px-6 py-3 rounded-full font-bold bg-pink-100 text-[#8B1235] hover:bg-pink-200"><Mic size={18}/> Record Voice</button>}
          {isRecording && <button type="button" onClick={stopRecording} className="flex items-center gap-2 px-6 py-3 rounded-full font-bold bg-red-500 text-white shadow-md animate-pulse"><StopCircle size={18}/> Stop Recording</button>}
          {voicePreview && <div className="text-sm text-green-600 font-bold flex items-center gap-2 mt-2 bg-green-50 w-max px-4 py-2 rounded-full border border-green-200"><Check size={16}/> Voice note ready!</div>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Our Story</label>
          <textarea rows="4" onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-[#8B1235]" placeholder="Write what happened..."></textarea>
        </div>
        
        <button type="submit" disabled={isSaving} className="w-full bg-[#8B1235] text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 transition-colors shadow-md hover:shadow-lg">
          {isSaving ? "Safely embedding to Database... ✨" : "Save Private Memory"}
        </button>
      </form>
    </div>
  );
};

// ==========================================
// 5. BEAUTIFUL POLAROID GALLERY 📷
// ==========================================
const PolaroidGallery = ({ galleryPhotos, memories, onAddPhotos, deleteGalleryPhoto }) => {
  const [isUploading, setIsUploading] = useState(false);
  
  // NEW STATE FOR THE MODAL
  const [pendingFiles, setPendingFiles] = useState([]);
  const [isCaptionModalOpen, setIsCaptionModalOpen] = useState(false);

  const combinedPhotos = [
    ...galleryPhotos.map(p => ({ ...p, source: 'gallery' })),
    ...memories.filter(m => (m.images && m.images.length > 0) || m.img).map(m => ({ 
      id: m.firestoreId || m.id, 
      imgUrl: (m.images && m.images.length > 0) ? m.images[0] : m.img, 
      heading: m.title, 
      timestamp: m.date, 
      source: 'memory' 
    }))
  ];

  const rotations = [-3, 2, -1, 4, -2, 3]; 

  // 1. Just catch the files and open the modal
  const handleMultiUploadClick = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setPendingFiles(files);
    setIsCaptionModalOpen(true);
    e.target.value = null; // Reset the input
  };

  // 2. Process the upload AFTER the modal is submitted
  const processUpload = async (customCaption) => {
    setIsCaptionModalOpen(false); // Close the modal
    setIsUploading(true);

    const finalCaption = customCaption.trim() !== "" ? customCaption : "A beautiful moment";

    for (const file of pendingFiles) {
      try {
        const options = { maxSizeMB: 0.3, maxWidthOrHeight: 800, useWebWorker: true };
        const compressedFile = await imageCompression(file, options);
        const base64String = await fileToBase64(compressedFile);
        
        await onAddPhotos({ 
          imgUrl: base64String, 
          heading: finalCaption, 
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error("Upload failed for a photo:", error);
      }
    }
    
    setIsUploading(false);
    setPendingFiles([]); // Clear the queue
  };

  return (
    <div className="max-w-6xl mx-auto pb-10 relative">
      <CaptionModal 
        isOpen={isCaptionModalOpen} 
        fileCount={pendingFiles.length}
        onClose={() => { setIsCaptionModalOpen(false); setPendingFiles([]); }} 
        onSubmit={processUpload} 
      />

      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold font-serif text-gray-800">Our Gallery 📷</h1>
          <p className="text-gray-500 mt-2 text-sm md:text-base">A collection of our favorite moments and memories.</p>
        </div>
        <label className="bg-[#8B1235] text-white px-6 py-3 rounded-full cursor-pointer hover:bg-[#6A0D28] transition shadow-md font-medium flex items-center gap-2 w-full md:w-auto justify-center">
          {isUploading ? (
            <><span className="animate-pulse">Uploading Photos...</span></>
          ) : (
            <><Plus size={20} /> Add Photos</>
          )}
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleMultiUploadClick} disabled={isUploading} />
        </label>
      </div>

      {combinedPhotos.length === 0 ? (
        <div className="bg-white/50 border border-white p-10 rounded-3xl text-center shadow-sm">
          <ImageIcon className="mx-auto text-gray-300 w-16 h-16 mb-4" />
          <p className="text-gray-500 font-medium">Your gallery is empty. Upload some beautiful photos to get started.</p>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 px-2 md:px-4">
          <AnimatePresence>
            {combinedPhotos.map((photo, index) => {
              const rotateValue = rotations[index % rotations.length];
              return (
                <motion.div 
                  key={photo.id} layout
                  initial={{ opacity: 0, scale: 0.8, y: 20, rotate: rotateValue }}
                  animate={{ opacity: 1, scale: 1, y: 0, rotate: rotateValue }}
                  exit={{ opacity: 0, scale: 0.8, filter: 'blur(5px)' }}
                  transition={{ duration: 0.4 }}
                  whileHover={{ scale: 1.05, rotate: 0, zIndex: 10, transition: { duration: 0.2 } }}
                  className="bg-[#FCF8F9] p-3 pb-12 md:p-4 md:pb-16 rounded-sm shadow-xl hover:shadow-2xl border border-gray-200 relative group cursor-pointer"
                >
                  <div className="w-full aspect-square bg-gray-200 overflow-hidden shadow-inner border border-black/5">
                    <img src={photo.imgUrl} className="w-full h-full object-cover" alt={photo.heading} />
                  </div>
                  <div className="absolute bottom-0 left-0 w-full h-12 md:h-16 flex items-center justify-center px-4">
                    <p className="font-serif italic text-gray-800 text-sm md:text-base font-medium truncate text-center w-full">{photo.heading}</p>
                  </div>
                  {photo.source === 'gallery' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteGalleryPhoto(photo.id); }}
                      className="absolute top-4 right-4 bg-white/90 p-2 rounded-full text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-md z-20"
                      title="Delete Photo"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  {photo.source === 'memory' && (
                    <div className="absolute top-4 left-4 bg-white/90 px-2 py-1 rounded text-[10px] uppercase font-bold text-rose-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">From Memory</div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

// ==========================================
// 6. ALL MEMORIES PAGE
// ==========================================
const Memories = ({ memories, deleteMemory, editMemory }) => {
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '' });

  const openMemory = (m) => {
    setSelectedMemory(m);
    setEditForm({ title: m.title, description: m.description });
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    editMemory(selectedMemory.firestoreId, editForm);
    setSelectedMemory({ ...selectedMemory, ...editForm });
    setIsEditing(false);
  };

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-800 mb-8">All Memories 💭</h1>
      
      {memories.length === 0 ? (
        <p className="text-gray-500 text-center py-10 bg-white/50 backdrop-blur-sm rounded-3xl border border-white">No memories yet. Add your first one!</p>
      ) : (
        <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          <AnimatePresence>
            {memories.map((m, idx) => {
              const coverImg = (m.images && m.images.length > 0) ? m.images[0] : m.img;
              const randomRotation = (idx % 2 === 0 ? 1 : -1) * ((idx % 3) + 1); // Slight random tilt
              
              return (
                <motion.div 
                  key={m.firestoreId || m.id} layout
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05, rotate: randomRotation, zIndex: 10 }}
                  onClick={() => openMemory(m)}
                  className="bg-white p-3 pb-12 rounded-sm shadow-xl hover:shadow-2xl border border-gray-200 relative cursor-pointer group"
                >
                  <button onClick={(e) => { e.stopPropagation(); deleteMemory(m.firestoreId || m.id); }} className="absolute top-4 right-4 bg-white/90 p-2 rounded-full text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-md z-20">
                    <Trash2 size={16} />
                  </button>
                  <div className="w-full aspect-square bg-gray-100 overflow-hidden shadow-inner border border-black/5">
                    {coverImg ? <img src={coverImg} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon /></div>}
                  </div>
                  <div className="absolute bottom-0 left-0 w-full h-12 flex items-center justify-center px-4">
                    <p className="font-serif italic text-gray-800 text-sm font-bold truncate">{m.title}</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* FULL SCREEN READING MODAL */}
      <AnimatePresence>
        {selectedMemory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto" onClick={() => setSelectedMemory(null)}>
            <motion.div 
              initial={{ scale: 0.8, y: 50, rotate: -2 }} animate={{ scale: 1, y: 0, rotate: 0 }} exit={{ scale: 0.8, opacity: 0, y: 50 }} 
              transition={{ type: "spring", bounce: 0.4 }}
              className="bg-[#FCF8F9] p-6 md:p-10 w-full max-w-2xl rounded-sm shadow-2xl relative my-auto border-[10px] border-white" 
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setSelectedMemory(null)} className="absolute -top-4 -right-4 bg-white text-gray-800 p-3 rounded-full shadow-xl hover:bg-gray-100 z-50"><X size={24}/></button>
              
              {!isEditing ? (
                <>
                  <button onClick={() => setIsEditing(true)} className="absolute top-4 right-4 bg-gray-100 text-gray-600 px-4 py-2 rounded-full font-bold text-sm hover:bg-gray-200 transition">Edit Note</button>
                  <p className="text-rose-500 font-bold tracking-widest uppercase text-xs mb-2">{selectedMemory.date} {selectedMemory.location && `• ${selectedMemory.location}`}</p>
                  <h2 className="text-3xl md:text-5xl font-serif font-bold text-gray-900 mb-6 leading-tight">{selectedMemory.title}</h2>
                  
                  {selectedMemory.images && selectedMemory.images.length > 0 && (
                     <div className={`grid gap-3 mb-8 ${selectedMemory.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                       {selectedMemory.images.map((img, i) => <img key={i} src={img} className="w-full object-cover rounded-xl shadow-md h-64 border-4 border-white" />)}
                     </div>
                  )}

                  <div className="prose prose-rose max-w-none text-lg md:text-xl text-gray-700 font-serif leading-relaxed whitespace-pre-wrap bg-white/50 p-6 rounded-2xl border border-pink-100 shadow-inner">
                    {selectedMemory.description || "No story written for this moment yet."}
                  </div>
                  {selectedMemory.voiceNote && <div className="mt-6"><AudioPlayer src={selectedMemory.voiceNote} /></div>}
                </>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-2xl font-serif font-bold text-[#8B1235]">Edit Memory</h3>
                  <input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full p-4 rounded-xl border border-gray-300 font-bold text-xl outline-none focus:border-rose-400" />
                  <textarea rows="8" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full p-4 rounded-xl border border-gray-300 font-serif text-lg outline-none focus:border-rose-400" />
                  <div className="flex justify-end gap-3 pt-4">
                    <button onClick={() => setIsEditing(false)} className="px-6 py-3 font-bold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
                    <button onClick={handleSaveEdit} className="px-6 py-3 font-bold bg-[#8B1235] text-white rounded-xl shadow-md hover:bg-[#6A0D28]">Save Changes</button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// 7. TIMELINE & LOVELY MAP PLACES
// ==========================================
const Timeline = ({ memories }) => {
  const [expandedId, setExpandedId] = useState(null);
  const [likedMemories, setLikedMemories] = useState({});

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const toggleLike = (e, id) => {
    e.stopPropagation();
    setLikedMemories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const sortedMemories = [...memories].reverse();

  return (
    <div className="max-w-5xl mx-auto pb-20 px-4 md:px-8 relative">
      <div className="text-center mb-16 relative z-10">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-800 mb-3">Our Journey 🕰️</h1>
        <p className="text-gray-500 font-medium">Every step we've taken, beautifully unfolding.</p>
      </div>

      <div className="absolute left-8 md:left-1/2 top-32 bottom-0 w-1.5 md:-translate-x-1/2 rounded-full bg-gradient-to-b from-rose-200 via-pink-300 to-purple-200 opacity-60"></div>

      <div className="space-y-12 md:space-y-24 relative z-10">
        {sortedMemories.map((m, idx) => {
          const isEven = idx % 2 === 0;
          const isExpanded = expandedId === (m.firestoreId || m.id);
          const isLiked = likedMemories[m.firestoreId || m.id];
          const coverImg = (m.images && m.images.length > 0) ? m.images[0] : m.img;

          return (
            <motion.div 
              key={m.firestoreId || m.id}
              initial={{ opacity: 0, x: isEven ? -50 : 50, y: 20 }}
              whileInView={{ opacity: 1, x: 0, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
              className={`flex flex-col md:flex-row items-center w-full ${isEven ? 'md:justify-start' : 'md:justify-end'} relative group`}
            >
              <div className="absolute left-4 md:left-1/2 w-8 h-8 rounded-full border-4 border-[#FCF8F9] bg-[#8B1235] md:-translate-x-1/2 shadow-md z-20 group-hover:scale-125 group-hover:bg-rose-400 transition-all duration-300 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>

              <div className={`w-full pl-16 md:pl-0 md:w-[45%] ${isEven ? 'md:pr-12' : 'md:pl-12'}`}>
                <motion.div 
                  layout
                  onClick={() => toggleExpand(m.firestoreId || m.id)}
                  className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-white hover:shadow-xl transition-shadow cursor-pointer relative overflow-hidden"
                >
                  <div className="inline-block bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 shadow-sm border border-rose-100">
                    {m.date}
                  </div>

                  <div className="flex justify-between items-start gap-4">
                    <h3 className="text-2xl font-serif font-bold text-gray-800 leading-tight mb-2">{m.title}</h3>
                    <button 
                      onClick={(e) => toggleLike(e, m.firestoreId || m.id)} 
                      className={`p-2 rounded-full transition-colors ${isLiked ? 'bg-rose-100 text-rose-500' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                    >
                      <Heart size={18} fill={isLiked ? "currentColor" : "none"} className={isLiked ? "animate-pulse" : ""} />
                    </button>
                  </div>

                  {!isExpanded && coverImg && (
                    <div className="w-full h-24 mt-3 rounded-xl overflow-hidden relative border border-gray-100">
                      <img src={coverImg} className="w-full h-full object-cover filter brightness-95 group-hover:scale-105 transition-transform duration-700" alt={m.title} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                    </div>
                  )}

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }} 
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        {m.location && (
                          <p className="text-sm text-gray-500 mt-3 mb-4 flex items-center gap-1 font-medium bg-gray-50 w-max px-3 py-1.5 rounded-lg border border-gray-100">
                            <MapPin size={14} className="text-blue-500" /> {m.location}
                          </p>
                        )}
                        {m.description && (
                          <p className="text-gray-600 leading-relaxed text-md mb-6 bg-rose-50/30 p-4 rounded-2xl italic font-serif border-l-4 border-rose-300">
                            "{m.description}"
                          </p>
                        )}
                        {m.images && m.images.length > 0 ? (
                          <div className={`grid gap-2 mb-4 ${m.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            {m.images.map((imgBase64, i) => (
                              <img key={i} src={imgBase64} className="w-full h-48 object-cover rounded-2xl shadow-sm border border-gray-100" />
                            ))}
                          </div>
                        ) : m.img ? (
                          <img src={m.img} className="w-full h-48 object-cover rounded-2xl shadow-sm mb-4 border border-gray-100" />
                        ) : null}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="w-full flex justify-center mt-4 text-gray-300 group-hover:text-rose-400 transition-colors">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          );
        })}
        {memories.length === 0 && (
          <div className="text-center text-gray-400 font-medium py-20">The journey begins when you add your first memory.</div>
        )}
      </div>
    </div>
  );
};

const LovelyMap = ({ memories }) => {
  const [markers, setMarkers] = useState([]);
  
  useEffect(() => {
    const fetchCoordinates = async () => {
      const placesWithCoords = [];
      const places = memories.filter(m => m.location);
      for (const place of places) {
        await new Promise(resolve => setTimeout(resolve, 600));
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place.location)}&format=json&limit=1`);
          const data = await response.json();
          if (data && data.length > 0) {
            placesWithCoords.push({ ...place, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
          }
        } catch (error) { console.error("Error finding coordinates for:", place.location); }
      }
      setMarkers(placesWithCoords);
    };
    fetchCoordinates();
  }, [memories]);

  const center = markers.length > 0 ? [markers[0].lat, markers[0].lng] : [8.5241, 76.9366];

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-800">The Map of Us 🌍</h1>
        <p className="text-sm font-medium bg-rose-100 text-rose-700 px-4 py-2 rounded-full shadow-sm">
          {markers.length} {markers.length === 1 ? 'Pin' : 'Pins'} Dropped
        </p>
      </div>
      <div className="bg-white/60 backdrop-blur-xl p-4 md:p-6 rounded-[2rem] shadow-sm border border-white/40">
        <div className="w-full h-[500px] md:h-[650px] rounded-2xl overflow-hidden shadow-inner border-4 border-white relative z-0">
          <MapContainer center={center} zoom={7} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png" />
            {markers.map((marker, idx) => {
              const coverImg = (marker.images && marker.images.length > 0) ? marker.images[0] : marker.img;
              return (
                <Marker key={idx} position={[marker.lat, marker.lng]} icon={lovelyHeartMarker}>
                  <Popup className="custom-popup border-0 shadow-lg rounded-xl">
                    <div className="p-1 text-center min-w-[150px]">
                      {coverImg && <img src={coverImg} alt={marker.title} className="w-full h-28 object-cover rounded-lg mb-3 shadow-md" />}
                      <h3 className="font-bold font-serif text-[#8B1235] text-lg leading-tight">{marker.title}</h3>
                      <p className="text-xs font-semibold text-gray-600 mt-1 uppercase tracking-wider">{marker.location}</p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 8. TIME CAPSULE & LOVE LETTERS 💌
// ==========================================
const LockedLetter = ({ letter }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTime = () => {
      if (!letter.unlockDate) return '';
      const unlockTime = new Date(letter.unlockDate).getTime();
      const now = new Date().getTime();
      const distance = unlockTime - now;

      if (distance < 0) return "Unlocked! Refresh the page.";

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      return `${days}d ${hours}h ${minutes}m remaining`;
    };

    setTimeLeft(calculateTime());
    const timer = setInterval(() => setTimeLeft(calculateTime()), 60000); 
    return () => clearInterval(timer);
  }, [letter.unlockDate]);

  return (
    <div className="bg-rose-900/10 backdrop-blur-md border border-rose-900/20 rounded-3xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
      <Lock size={48} className="text-rose-600 mb-4 opacity-80" />
      <h3 className="text-2xl font-bold text-rose-900 mb-2">Time Capsule Sealed</h3>
      <p className="text-rose-700 mb-4">"Do not open until our special day."</p>
      <div className="bg-rose-900 text-white px-4 py-2 rounded-full font-mono text-sm font-bold shadow-inner">
        {timeLeft}
      </div>
    </div>
  );
};

const Letters = ({ letters, deleteLetter }) => {
  const navigate = useNavigate();
  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-800">Love Letters 💌</h1>
        <button onClick={() => navigate('/create-letter')} className="bg-[#8B1235] text-white px-5 py-2.5 rounded-full font-medium hover:bg-[#6A0D28] transition-all flex items-center gap-2 shadow-sm">
          <PenTool size={18} /> Write a Letter
        </button>
      </div>

      {letters.length === 0 ? (
        <p className="text-gray-500 text-center py-10 bg-white/50 backdrop-blur-sm rounded-3xl border border-white">No letters written yet. Leave a sweet note!</p>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence>
            {letters.map((letter, idx) => {
              const isLocked = letter.unlockDate && new Date(letter.unlockDate).getTime() > new Date().getTime();

              if (isLocked) {
                return (
                  <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: idx * 0.1 }} key={letter.firestoreId || letter.id} className="relative group">
                     <button onClick={() => deleteLetter(letter.firestoreId || letter.id)} className="absolute top-4 right-4 bg-white/80 p-2 rounded-full text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-sm z-50">
                        <Trash2 size={16} />
                      </button>
                     <LockedLetter letter={letter} />
                  </motion.div>
                );
              }

              return (
                <motion.div 
                  key={letter.firestoreId || letter.id} layout
                  initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 0.9, filter: 'blur(5px)' }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  whileHover={{ scale: 1.01 }} 
                  className={`relative overflow-hidden rounded-3xl shadow-sm border border-gray-100 min-h-[300px] flex flex-col group ${letter.layout === 'image-background' ? 'text-white' : 'bg-white/80 backdrop-blur-md text-gray-800'}`}
                >
                  <button onClick={() => deleteLetter(letter.firestoreId || letter.id)} className="absolute top-4 right-4 bg-white/80 p-2 rounded-full text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-sm z-50">
                    <Trash2 size={16} />
                  </button>

                  {letter.layout === 'image-background' && letter.img && (
                    <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url(${letter.img})` }}>
                      <div className="absolute inset-0 bg-black/50"></div>
                    </div>
                  )}

                  <div className="relative z-10 p-6 md:p-8 flex flex-col flex-1">
                    <div className="mb-4 border-b border-current pb-4 opacity-80">
                      <h3 className="text-2xl font-bold mb-1">{letter.title}</h3>
                      <p className="text-xs uppercase tracking-wider">{letter.date} • {letter.time}</p>
                    </div>
                    {letter.layout === 'image-top' && letter.img && (
                      <motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} src={letter.img} alt="attachment" className="w-full h-48 object-cover rounded-xl mb-4 shadow-sm" />
                    )}
                    <div className={`flex-1 whitespace-pre-wrap text-lg leading-relaxed ${letter.font}`}>{letter.content}</div>
                    {letter.layout === 'image-bottom' && letter.img && (
                      <motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} src={letter.img} alt="attachment" className="w-full h-48 object-cover rounded-xl mt-6 shadow-sm" />
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

const CreateLetter = ({ onAddLetter, showAlert }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ title: '', content: '', font: 'font-serif', img: '', layout: 'image-top', unlockDate: '' });
  const [isSaving, setIsSaving] = useState(false);
  const symbols = ['♡', '✨', '🌙', '🌸', '🦋', '💌', '♾️', '💍', '🥺', '❤️'];

  const handleAddSymbol = (sym) => setFormData({ ...formData, content: formData.content + sym });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const options = { maxSizeMB: 0.3, maxWidthOrHeight: 800, useWebWorker: true };
        const compressedFile = await imageCompression(file, options);
        const base64String = await fileToBase64(compressedFile);
        setFormData({ ...formData, img: base64String }); 
      } catch (error) { 
        showAlert("Image Too Large", "Failed to process image. Try a slightly smaller picture."); 
      }
    }
  };

  const removeImage = () => setFormData({ ...formData, img: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;
    setIsSaving(true);
    const now = new Date();
    const date = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const success = await onAddLetter({ ...formData, date, time });
    setIsSaving(false);
    if (success) navigate('/letters');
  };

  return (
    <div className="max-w-3xl mx-auto pb-10">
      <h1 className="text-3xl md:text-4xl font-serif font-bold mb-8 text-gray-800">Draft a Love Letter ✍️</h1>
      <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-sm border border-white space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Heading / Subject</label>
          <input type="text" required onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-[#8B1235] bg-white/50" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Letter Font</label>
            <select onChange={e => setFormData({...formData, font: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-[#8B1235] bg-white/50 cursor-pointer">
              <option value="font-serif">Elegant Serif (Classic)</option>
              <option value="font-sans">Clean Sans (Modern)</option>
              <option value="font-mono">Typewriter (Vintage)</option>
              <option value="italic font-serif">Handwritten Style</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Image Layout</label>
            <select onChange={e => setFormData({...formData, layout: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-[#8B1235] bg-white/50 cursor-pointer">
              <option value="image-top">Image at the Top</option>
              <option value="image-bottom">Image at the Bottom</option>
              <option value="image-background">Full Background Image</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-rose-600 mb-1">Time Capsule Lock</label>
            <input type="datetime-local" onChange={e => setFormData({...formData, unlockDate: e.target.value})} className="w-full p-3 rounded-xl border border-rose-200 outline-none focus:border-[#8B1235] bg-rose-50 text-rose-900" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Attach Picture or Handwritten Letter</label>
          {!formData.img ? (
            <label className="flex flex-col items-center justify-center w-full h-32 md:h-40 border-2 border-dashed border-gray-300 rounded-xl bg-white/50 hover:bg-white/80 cursor-pointer transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500"><span className="font-semibold text-[#8B1235]">Tap to upload</span></p>
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          ) : (
            <div className="relative w-full h-48 md:h-64 rounded-xl overflow-hidden shadow-sm group">
              <img src={formData.img} alt="Preview" className="w-full h-full object-cover" />
              <button type="button" onClick={removeImage} className="absolute top-3 right-3 bg-white/90 text-red-500 p-2.5 rounded-full hover:bg-red-50 shadow-md"><Trash2 size={18} /></button>
            </div>
          )}
        </div>

        <div>
          <div className="flex justify-between items-end mb-2">
            <label className="block text-sm font-bold text-gray-700">Your Letter</label>
            <div className="flex gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200 overflow-x-auto">
              {symbols.map(sym => <button key={sym} type="button" onClick={() => handleAddSymbol(sym)} className="hover:bg-white p-1 rounded transition-colors text-sm shrink-0">{sym}</button>)}
            </div>
          </div>
          <textarea required rows="8" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className={`w-full p-4 rounded-xl border border-gray-200 outline-none focus:border-[#8B1235] bg-white/50 resize-none ${formData.font}`} />
        </div>
        <button type="submit" disabled={isSaving} className="w-full bg-[#8B1235] text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 hover:bg-[#6A0D28] shadow-md">
          {isSaving ? "Sealing envelope... 💌" : "Seal & Save Letter 💌"}
        </button>
      </form>
    </div>
  );
};

// ==========================================
// 11. OUR BUCKET LIST 📝
// ==========================================
const BucketList = ({ bucketList, addGoal, toggleGoal, deleteGoal, currentUser }) => {
  const [newGoal, setNewGoal] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("✈️ Travel");
  const [filter, setFilter] = useState("All");
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Photo Proof State
  const [completingGoalId, setCompletingGoalId] = useState(null);

  const categories = ["✈️ Travel", "🍕 Food", "🪂 Crazy", "🛋️ Cozy", "💕 Romance"];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newGoal.trim()) return;
    addGoal({ 
      title: newGoal, 
      completed: false, 
      category: selectedCategory,
      authorEmail: currentUser?.email || "Unknown" 
    });
    setNewGoal("");
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !completingGoalId) return;
    
    try {
      const options = { maxSizeMB: 0.3, maxWidthOrHeight: 800, useWebWorker: true };
      const compressed = await imageCompression(file, options);
      const base64 = await fileToBase64(compressed);
      
      toggleGoal(completingGoalId, true, base64); // Pass image to backend
      setCompletingGoalId(null);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000); 
    } catch (err) {
      alert("Failed to upload photo proof.");
    }
  };

  const handleToggle = (id, isCompleted) => {
    if (!isCompleted) {
      // If marking as complete, ask for a photo!
      setCompletingGoalId(id);
    } else {
      // If un-checking, just toggle it normally
      toggleGoal(id, false);
    }
  };

  const filteredList = filter === "All" ? bucketList : bucketList.filter(g => g.category === filter);

  return (
    <div className="max-w-4xl mx-auto pb-10">
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} />}
      
      {/* Photo Proof Modal */}
      <AnimatePresence>
        {completingGoalId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl">
              <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4"><ImageIcon size={32} /></div>
              <h3 className="text-2xl font-bold font-serif text-gray-800 mb-2">Goal Completed! 🎉</h3>
              <p className="text-gray-500 mb-6">Attach a photo of this moment to immortalize it as a polaroid.</p>
              
              <label className="block w-full bg-[#8B1235] text-white py-3 rounded-xl font-bold cursor-pointer hover:bg-[#6A0D28] transition shadow-md mb-3">
                Upload Photo Proof
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
              <button onClick={() => { toggleGoal(completingGoalId, true); setCompletingGoalId(null); setShowConfetti(true); setTimeout(() => setShowConfetti(false), 4000); }} className="block w-full py-3 text-gray-500 font-bold bg-gray-100 rounded-xl hover:bg-gray-200 transition">
                Skip Photo
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <h1 className="text-3xl md:text-4xl font-serif font-bold mb-8 text-gray-800">Our Bucket List ✈️</h1>
      
      {/* Filter Row */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 custom-scrollbar">
        <button onClick={() => setFilter("All")} className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-colors ${filter === "All" ? "bg-gray-800 text-white" : "bg-white text-gray-500 hover:bg-gray-100"}`}>All</button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)} className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-colors shadow-sm ${filter === cat ? "bg-[#8B1235] text-white" : "bg-white text-gray-600 hover:bg-rose-50"}`}>{cat}</button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mb-8 bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-white shadow-sm flex flex-col gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button type="button" key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition ${selectedCategory === cat ? "bg-rose-100 text-rose-700 border border-rose-200" : "bg-gray-50 text-gray-500"}`}>{cat}</button>
          ))}
        </div>
        <div className="flex gap-3">
          <input type="text" value={newGoal} onChange={(e) => setNewGoal(e.target.value)} placeholder="What's our next adventure?" className="flex-1 p-4 rounded-2xl border border-gray-200 outline-none focus:border-[#8B1235] shadow-inner bg-white" />
          <button type="submit" className="bg-[#8B1235] text-white px-6 py-4 rounded-2xl font-bold hover:bg-[#6A0D28] transition shadow-md"><Plus size={24} /></button>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {filteredList.map(goal => (
            <motion.div key={goal.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className={`relative overflow-hidden rounded-3xl border shadow-sm transition-all ${goal.completed ? 'bg-[#FCF8F9] border-rose-100' : 'bg-white/80 border-gray-100 hover:shadow-md'}`}>
              
              {/* If it has a photo proof, show it like a polaroid header */}
              {goal.completed && goal.proofImage && (
                <div className="w-full h-40 bg-gray-200 relative">
                  <img src={goal.proofImage} className="w-full h-full object-cover filter contrast-110" alt="Proof" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                </div>
              )}

              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => handleToggle(goal.id, goal.completed)}>
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${goal.completed ? 'bg-green-500 border-green-500 shadow-md' : 'border-gray-300 bg-gray-50'}`}>
                    {goal.completed && <Check size={16} className="text-white" />}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block mb-0.5">{goal.category}</span>
                    <span className={`text-lg font-serif font-bold transition-all block leading-tight ${goal.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>{goal.title}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button onClick={() => deleteGoal(goal.id)} className="text-gray-300 hover:text-red-500 bg-white p-2 rounded-full shadow-sm"><Trash2 size={16} /></button>
                  {goal.authorEmail && (
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[10px] font-bold uppercase border border-blue-200" title={`Added by ${goal.authorEmail}`}>
                      {goal.authorEmail.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
// ==========================================
// 12. THE DUAL PROMISE JARS 🫙🫙
// ==========================================
const PromiseJar = ({ promises, addPromise, deletePromise, showAlert }) => {
  const [newPromise, setNewPromise] = useState('');
  const [targetJar, setTargetJar] = useState('jar1'); 
  const [drawnPromise, setDrawnPromise] = useState(null);

  const [jar1Name, setJar1Name] = useState(() => localStorage.getItem('jar1Name') || "My Jar");
  const [jar2Name, setJar2Name] = useState(() => localStorage.getItem('jar2Name') || "Her Jar");

  useEffect(() => {
    localStorage.setItem('jar1Name', jar1Name);
    localStorage.setItem('jar2Name', jar2Name);
  }, [jar1Name, jar2Name]);

  const playMagicalDropSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const playTone = (freq, delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine'; 
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + delay + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 1.2);
      };
      playTone(1046.50, 0);   
      playTone(1318.51, 0.1); 
      playTone(1567.98, 0.2); 
    } catch (err) {
      console.log("Audio blocked.");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newPromise.trim()) return;
    playMagicalDropSound();
    addPromise({ text: newPromise, target: targetJar });
    setNewPromise('');
  };

  const jar1Promises = promises.filter(p => p.target === 'jar1' || !p.target);
  const jar2Promises = promises.filter(p => p.target === 'jar2');

  const drawRandomPromise = (jarPromises) => {
    if (jarPromises.length === 0) return showAlert("Empty Jar", "This jar is empty! Add a sweet note first.");
    const randomIdx = Math.floor(Math.random() * jarPromises.length);
    setDrawnPromise(jarPromises[randomIdx]);
  };

   const JarVisual = ({ name, setName, jarPromises, onDraw }) => (
    <div className="flex flex-col items-center justify-center p-6 md:p-8 relative w-full group">
      <input 
        type="text" 
        value={name} 
        onChange={(e) => setName(e.target.value)} 
        className="text-xl md:text-2xl font-serif font-bold text-[#8B1235] bg-transparent text-center outline-none border-b-2 border-transparent focus:border-pink-200 mb-6 w-full transition-colors z-10"
        placeholder="Name this jar..."
      />
      {/* THE FROSTED GLASS JAR */}
      <div onClick={() => onDraw(jarPromises)} className="w-48 h-64 rounded-b-[3rem] rounded-t-2xl relative cursor-pointer hover:scale-105 transition-transform flex flex-col justify-end overflow-hidden pb-4 border-[3px] border-white/50 bg-white/10 backdrop-blur-md shadow-[inset_0_0_20px_rgba(255,255,255,0.6),_0_15px_30px_rgba(0,0,0,0.1)]">
        
        {/* THE CORK LID */}
        <div className="absolute top-0 w-full h-8 bg-gradient-to-r from-amber-800 via-amber-600 to-amber-900 border-b-4 border-amber-900/80 shadow-[0_5px_10px_rgba(0,0,0,0.3)] z-20 flex items-center justify-center">
           <div className="w-full h-[2px] bg-amber-900/30 opacity-50 absolute top-2"></div>
           <div className="w-full h-[2px] bg-amber-900/30 opacity-50 absolute top-5"></div>
        </div>
        
        {/* GLASS HIGHLIGHT GLARE */}
        <div className="absolute top-0 left-[10%] w-3 h-full bg-gradient-to-b from-white/60 to-transparent rounded-full transform -skew-x-12 z-20 pointer-events-none"></div>

        {/* THE FALLING NOTES */}
        <div className="flex justify-center w-full h-[90%] px-4 relative z-10 overflow-hidden">
          <AnimatePresence>
            {jarPromises.map((p, i) => {
              const seed = p.id ? p.id.charCodeAt(0) + i : i;
              const pseudoRandomX = Math.sin(seed) * 50; 
              const pseudoRandomY = -(i * 4) - Math.abs(Math.cos(seed) * 15); 
              const pseudoRandomRot = Math.sin(seed * 2) * 60; 
              const colors = ['bg-pink-100', 'bg-rose-100', 'bg-white', 'bg-red-50'];
              const noteColor = colors[seed % colors.length];

              return (
                <motion.div 
                  key={p.id || i}
                  initial={{ y: -300, opacity: 0, x: pseudoRandomX, rotate: pseudoRandomRot - 90 }}
                  animate={{ y: pseudoRandomY, opacity: 0.95, x: pseudoRandomX, rotate: pseudoRandomRot }}
                  transition={{ type: "spring", bounce: 0.6, duration: 1.5, delay: 0.1 }}
                  className={`w-10 h-10 ${noteColor} shadow-md border border-black/5 absolute bottom-2 flex items-center justify-center rounded-sm`}
                  style={{ zIndex: i }}
                >
                  <div className="w-6 h-6 border border-pink-200/50 rounded-sm opacity-50"></div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
      <p className="mt-8 text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer group-hover:text-rose-500 transition-colors bg-white/50 px-4 py-2 rounded-full" onClick={() => onDraw(jarPromises)}>
        Tap jar to open 
      </p>
    </div>
  );
  return (
    <div className="max-w-5xl mx-auto pb-10">
      <h1 className="text-3xl md:text-4xl font-serif font-bold mb-8 text-gray-800 text-center md:text-left">The Promise Jars 🫙</h1>
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <JarVisual name={jar1Name} setName={setJar1Name} jarPromises={jar1Promises} onDraw={drawRandomPromise} color="bg-blue-50/30" />
        <JarVisual name={jar2Name} setName={setJar2Name} jarPromises={jar2Promises} onDraw={drawRandomPromise} color="bg-rose-50/30" />
      </div>
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-white/60 backdrop-blur-md p-6 md:p-8 rounded-[2rem] shadow-sm border border-white">
          <h3 className="text-xl font-serif font-bold text-gray-800 mb-6">Fold a New Note ✍️</h3>
          <div className="flex bg-white p-1 rounded-xl shadow-inner border border-gray-100 mb-4 w-max">
            <button type="button" onClick={() => setTargetJar('jar1')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${targetJar === 'jar1' ? 'bg-[#8B1235] text-white shadow-md' : 'text-gray-500 hover:text-gray-800'}`}>For {jar1Name}</button>
            <button type="button" onClick={() => setTargetJar('jar2')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${targetJar === 'jar2' ? 'bg-[#8B1235] text-white shadow-md' : 'text-gray-500 hover:text-gray-800'}`}>For {jar2Name}</button>
          </div>
          <textarea value={newPromise} onChange={(e) => setNewPromise(e.target.value)} placeholder="Write a tiny promise, compliment, or memory here..." className="w-full p-4 rounded-xl border border-gray-200 outline-none focus:border-pink-300 bg-white/50 resize-none font-serif text-lg" rows="3" />
          <button type="submit" className="w-full mt-4 bg-[#8B1235] text-white py-4 rounded-xl font-bold hover:bg-[#6A0D28] transition-all hover:shadow-lg shadow-sm flex items-center justify-center gap-2">Drop Note into Jar <ChevronDown size={18} /></button>
        </form>
        {promises.length > 0 && (
          <div className="mt-8 pt-8 border-t border-gray-200 space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Manage All Notes</p>
            {promises.map((p) => (
              <div key={p.id} className="flex justify-between items-center bg-white/80 p-4 rounded-xl shadow-sm border border-white">
                <div>
                  <p className="text-sm font-bold text-rose-500 uppercase text-[10px] mb-1">In {p.target === 'jar2' ? jar2Name : jar1Name}</p>
                  <p className="text-gray-700 font-serif italic pr-4">"{p.text}"</p>
                </div>
                <button onClick={() => deletePromise(p.id)} className="text-gray-400 hover:text-red-500 ml-2 bg-white p-2 rounded-full shadow-sm"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        )}
      </div>
      <AnimatePresence>
        {drawnPromise && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setDrawnPromise(null)}>
            <motion.div initial={{ scale: 0.5, y: 100, rotate: -10 }} animate={{ scale: 1, y: 0, rotate: 0 }} exit={{ scale: 0.8, opacity: 0, y: 20 }} transition={{ type: "spring", bounce: 0.4 }} className="bg-[#FCF8F9] p-10 max-w-md w-full rounded-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-16 h-5 bg-yellow-200/60 rotate-2 shadow-sm"></div>
              <button onClick={() => setDrawnPromise(null)} className="absolute top-2 right-3 text-gray-400 hover:text-gray-800"><X size={20}/></button>
              <p className="text-2xl font-serif text-gray-800 text-center leading-relaxed italic mt-4">"{drawnPromise.text}"</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// 13. FREEFORM MOOD BOARD 📌
// ==========================================
const MoodBoard = ({ boardItems, addBoardItem, updateBoardItem, deleteBoardItem }) => {
  const [newText, setNewText] = useState("");
  const [noteColor, setNoteColor] = useState("bg-yellow-200");
  const [noteFont, setNoteFont] = useState("'Comic Sans MS', 'Chalkboard SE', cursive");
  const [editingId, setEditingId] = useState(null);
  const [showDrawPad, setShowDrawPad] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);

  const colors = [
    { bg: 'bg-yellow-200', border: 'border-yellow-400' },
    { bg: 'bg-pink-200', border: 'border-pink-400' },
    { bg: 'bg-blue-200', border: 'border-blue-400' },
    { bg: 'bg-green-200', border: 'border-green-400' }
  ];

  const fonts = [
    { label: 'Handwriting', css: "'Comic Sans MS', 'Chalkboard SE', cursive" },
    { label: 'Typewriter', css: "'Courier New', Courier, monospace" },
    { label: 'Classic', css: "Georgia, serif" }
  ];

  const handleAddText = (e) => {
    e.preventDefault();
    if (!newText.trim()) return;
    const viewport = document.getElementById("board-viewport");
    const startX = viewport ? viewport.scrollLeft + 150 : 150;
    const startY = viewport ? viewport.scrollTop + 150 : 150;
    addBoardItem({ type: 'text', content: newText, x: startX, y: startY, w: 200, h: 200, color: noteColor, font: noteFont });
    setNewText('');
  };

  const handleAddImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const options = { maxSizeMB: 0.4, maxWidthOrHeight: 1080, useWebWorker: true };
      const compressed = await imageCompression(file, options);
      const base64 = await fileToBase64(compressed);
      const viewport = document.getElementById("board-viewport");
      const startX = viewport ? viewport.scrollLeft + 150 : 150;
      const startY = viewport ? viewport.scrollTop + 150 : 150;
      addBoardItem({ type: 'image', content: base64, x: startX, y: startY, w: 250, h: 250 });
    } catch (err) { alert("Image upload failed."); }
  };

  useEffect(() => {
    if (showDrawPad && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height); 
      ctx.lineCap = "round";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#8B1235";
    }
  }, [showDrawPad]);

  const startDraw = (e) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || !canvasRef.current) return;
    e.preventDefault(); 
    const ctx = canvasRef.current.getContext("2d");
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDraw = () => setIsDrawing(false);

  const saveDrawing = () => {
    if (!canvasRef.current) return;
    const base64 = canvasRef.current.toDataURL("image/png");
    const viewport = document.getElementById("board-viewport");
    const startX = viewport ? viewport.scrollLeft + 150 : 150;
    const startY = viewport ? viewport.scrollTop + 150 : 150;
    addBoardItem({ type: 'drawing', content: base64, x: startX, y: startY, w: 300, h: 300 });
    setShowDrawPad(false);
  };

  return (
    <div className="max-w-7xl mx-auto pb-10 flex flex-col h-[calc(100vh-100px)]">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 shrink-0 relative z-40">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-800">Mood Board 📌</h1>
          <p className="text-gray-500 mt-1 text-sm md:text-base">Double-click any item to Crop & Resize. Drag to move.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 bg-white/80 backdrop-blur-xl p-3 rounded-2xl shadow-sm border border-white">
          <form onSubmit={handleAddText} className="flex flex-wrap items-center gap-2 border-r border-gray-200 pr-3">
            <input type="text" value={newText} onChange={e => setNewText(e.target.value)} placeholder="Type note..." className="px-3 py-2 rounded-xl text-sm border outline-none focus:border-rose-300 w-28 md:w-36 bg-white/50" />
            <div className="flex gap-1">
              {colors.map(c => (
                <button key={c.bg} type="button" onClick={() => setNoteColor(c.bg)} className={`w-5 h-5 rounded-full ${c.bg} border-2 ${noteColor === c.bg ? 'border-gray-800 scale-110 shadow-md' : c.border} transition-transform`}></button>
              ))}
            </div>
            <select value={noteFont} onChange={e => setNoteFont(e.target.value)} className="px-2 py-1 text-xs border rounded-lg outline-none bg-white text-gray-600 font-medium cursor-pointer">
              {fonts.map(f => <option key={f.label} value={f.css}>{f.label}</option>)}
            </select>
            <button type="submit" className="bg-yellow-100 text-yellow-700 p-2 rounded-xl hover:bg-yellow-200 transition shadow-sm"><StickyNote size={18}/></button>
          </form>
          <label className="bg-rose-100 text-rose-700 px-4 py-2 rounded-xl hover:bg-rose-200 transition cursor-pointer flex items-center gap-2 font-bold text-sm shadow-sm">
            <ImageIcon size={18} /> Pic
            <input type="file" accept="image/*" className="hidden" onChange={handleAddImage} />
          </label>
          <button onClick={() => setShowDrawPad(true)} className="bg-purple-100 text-purple-700 px-4 py-2 rounded-xl hover:bg-purple-200 transition flex items-center gap-2 font-bold text-sm shadow-sm">
            <PenTool size={18} /> Ink
          </button>
        </div>
      </div>

      <div id="board-viewport" className="flex-1 bg-white/40 backdrop-blur-sm rounded-3xl border border-white relative overflow-auto shadow-inner custom-scrollbar" onClick={() => setEditingId(null)}>
        <div className="w-[3000px] h-[3000px] relative" style={{ backgroundImage: 'radial-gradient(#d1d5db 2px, transparent 2px)', backgroundSize: '40px 40px' }}>
          {boardItems.map(item => {
            const isEditing = editingId === item.id;
            return (
              <motion.div
                key={item.id} drag={!isEditing} dragMomentum={false}
                onDragEnd={(e, info) => updateBoardItem(item.id, { x: item.x + info.offset.x, y: item.y + info.offset.y })}
                initial={{ x: item.x, y: item.y }}
                onDoubleClick={(e) => { e.stopPropagation(); setEditingId(item.id); }}
                className={`absolute group transition-shadow ${isEditing ? 'z-50 shadow-2xl scale-105' : 'cursor-grab active:cursor-grabbing shadow-sm hover:shadow-lg z-10'}`}
                style={{ touchAction: "none" }}
              >
                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => deleteBoardItem(item.id)} className={`absolute -top-4 -right-4 bg-white text-red-500 p-2 rounded-full shadow-lg transition-opacity ${isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} z-20`}><Trash2 size={16}/></button>
                {isEditing && (
                  <div className="absolute -inset-3 border-2 border-blue-500 border-dashed rounded-xl pointer-events-none z-30 flex items-end justify-center pb-2">
                    <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Drag bottom right to crop</span>
                  </div>
                )}
                
                {item.type === 'text' && (
                  <div className={`${item.color || 'bg-yellow-200'} p-5 shadow-inner border border-black/5 transform rotate-1 overflow-hidden relative`} style={{ fontFamily: item.font || "'Comic Sans MS', cursive", width: item.w || 200, height: item.h || 200, resize: isEditing ? 'both' : 'none' }} onMouseUp={(e) => isEditing && updateBoardItem(item.id, { w: e.target.offsetWidth, h: e.target.offsetHeight })}>
                    <p className="text-gray-800 text-lg md:text-xl leading-relaxed whitespace-pre-wrap">{item.content}</p>
                  </div>
                )}

                {item.type === 'image' && (
                  <div className="bg-white p-2 pb-10 shadow-sm transform -rotate-1 relative">
                    <div style={{ width: item.w || 250, height: item.h || 250, resize: isEditing ? 'both' : 'none', overflow: 'hidden' }} onMouseUp={(e) => isEditing && updateBoardItem(item.id, { w: e.target.offsetWidth, h: e.target.offsetHeight })}>
                      <img src={item.content} className="w-full h-full object-cover pointer-events-none rounded-sm border border-gray-100" />
                    </div>
                  </div>
                )}

                {item.type === 'drawing' && (
                  <div className="relative" style={{ width: item.w || 300, height: item.h || 300, resize: isEditing ? 'both' : 'none', overflow: 'hidden' }} onMouseUp={(e) => isEditing && updateBoardItem(item.id, { w: e.target.offsetWidth, h: e.target.offsetHeight })}>
                    <img src={item.content} className="w-full h-full object-contain pointer-events-none drop-shadow-sm" />
                  </div>
                )}
              </motion.div>
            );
          })}
          {boardItems.length === 0 && <div className="absolute top-[10%] left-[10%] text-gray-400 font-medium text-xl">Double tap any item to edit. Click background to save.</div>}
        </div>
      </div>

      <AnimatePresence>
        {showDrawPad && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setShowDrawPad(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="font-serif font-bold text-xl text-gray-800">Digital Ink ✍️</h3>
                  <p className="text-xs text-gray-500 font-medium mt-1">Background will be transparent.</p>
                </div>
                <button onClick={() => setShowDrawPad(false)} className="bg-gray-100 text-gray-500 p-2 rounded-full hover:bg-red-100 hover:text-red-500 transition-colors"><X size={20}/></button>
              </div>
              <div className="w-full h-72 border-2 border-gray-300 rounded-2xl relative shadow-inner cursor-crosshair overflow-hidden" style={{ backgroundImage: 'radial-gradient(#e5e7eb 2px, transparent 2px)', backgroundSize: '20px 20px' }}>
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full touch-none bg-transparent" onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw} onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}></canvas>
              </div>
              <div className="flex justify-between items-center mt-6">
                <button onClick={() => { const ctx = canvasRef.current.getContext('2d'); ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); }} className="text-gray-500 font-bold hover:text-gray-800 text-sm flex items-center gap-1"><Trash2 size={16}/> Clear</button>
                <button onClick={saveDrawing} className="bg-[#8B1235] text-white px-6 py-3 rounded-full font-bold hover:bg-[#6A0D28] shadow-md flex items-center gap-2 transition-all hover:scale-105">Stick to Board <Check size={18}/></button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {editingId && <div className="absolute inset-0 bg-black/5 z-20 pointer-events-none rounded-3xl transition-opacity"></div>}
    </div>
  );
};

// ==========================================
// SILENT EMAIL NOTIFICATION HELPER
// ==========================================
const sendInstantNotification = (itemType, itemTitle) => {
  const email1 = localStorage.getItem('notifyEmail1');
  const email2 = localStorage.getItem('notifyEmail2');
  const validEmails = [email1, email2].filter(Boolean);

  if (validEmails.length === 0) return;

  validEmails.forEach((targetEmail) => {
    const templateParams = {
      to_email: targetEmail,
      subject: `New ${itemType} Added to Our Universe! ✨`,
      message: `A new ${itemType} titled "${itemTitle}" was just added. Go check it out!`
    };

    emailjs.send(
      'service_qwk8ies', 
      'template_7vk7y9m', 
      templateParams, 
      'ICqdxeukLfDRZVg9K'
    ).then(() => console.log(`Silent ping sent successfully to ${targetEmail}!`))
     .catch((err) => console.error(`Silent email failed for ${targetEmail}:`, err));
  });
};

// ==========================================
// 9. FULL ADVANCED SETTINGS PAGE 
// ==========================================
const SettingsPage = ({ theme, setTheme, activeUniverse, quotes, deleteQuote, showAlert }) => {
  const [newQuote, setNewQuote] = useState("");
  const [isSavingQuote, setIsSavingQuote] = useState(false);
  const [email1, setEmail1] = useState(() => localStorage.getItem('notifyEmail1') || '');
  const [email2, setEmail2] = useState(() => localStorage.getItem('notifyEmail2') || '');

  const handleAddQuote = async (e) => {
    e.preventDefault();
    if (!newQuote.trim()) return;
    setIsSavingQuote(true);
    try {
      await addDoc(collection(db, "quotes"), { text: newQuote, timestamp: new Date(), universeId: activeUniverse });
      setNewQuote("");
      showAlert("Quote Added! ✨", "Your quote was beautifully added to the universe.");
    } catch (error) {
      showAlert("Error", "Failed to add quote.");
    }
    setIsSavingQuote(false);
  };

  const handleSaveEmails = () => {
    localStorage.setItem('notifyEmail1', email1);
    localStorage.setItem('notifyEmail2', email2);
    showAlert("Saved! 💌", "Notification emails saved! You will now get pinged when memories are added.");
  };

  const copyUniverseCode = () => {
    navigator.clipboard.writeText(activeUniverse);
    showAlert("Copied! 🔑", "Universe Code copied! Send this to your partner.");
  };

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } }};
  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 md:mb-10">
        <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2">Universe Settings ⚙️</h1>
        <p className="opacity-70 text-sm md:text-base">Manage your space, appearance, and memory backups.</p>
      </motion.div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 md:space-y-8">
        
        {/* --- UNIVERSE CODE SHARING --- */}
        <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-sm border border-white/40">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-green-100 text-green-600 rounded-xl"><Lock size={20} /></div>
            <h2 className="text-xl font-semibold text-gray-800">Your Shared Universe</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">Send this code to your partner. When they create an account, they can select "Join Universe" and paste this code to sync your memories securely.</p>
          
          <div className="flex items-center bg-gray-50 border border-gray-200 p-4 rounded-xl gap-4">
            <code className="text-xl font-bold tracking-widest text-[#8B1235] flex-1 text-center">{activeUniverse}</code>
            <button onClick={copyUniverseCode} className="bg-[#8B1235] text-white p-3 rounded-lg hover:bg-[#6A0D28] transition-colors"><Copy size={20} /></button>
          </div>
        </motion.div>

        {/* --- EMAIL NOTIFICATIONS --- */}
        <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-sm border border-white/40">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl"><Mail size={20} /></div>
            <h2 className="text-xl font-semibold text-gray-800">Email Notifications</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">Get pinged instantly on your phone when a new memory or letter is added.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Your Email</label>
              <input type="email" value={email1} onChange={(e) => setEmail1(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-blue-400 bg-white/50" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Partner's Email</label>
              <input type="email" value={email2} onChange={(e) => setEmail2(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-blue-400 bg-white/50" placeholder="partner@example.com" />
            </div>
            <button onClick={handleSaveEmails} className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors w-full md:w-auto flex items-center justify-center gap-2 shadow-sm">
              <Check size={18} /> Save Notification Emails
            </button>
          </div>
        </motion.div>

        {/* --- WHISPERS OF THE UNIVERSE (ROTATING QUOTES) --- */}
        <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-sm border border-white/40">
           <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-pink-100 text-[#8B1235] rounded-xl"><PenTool size={20} /></div>
            <h2 className="text-xl font-semibold text-gray-800">Whispers of the Universe</h2>
          </div>
          
          <form onSubmit={handleAddQuote} className="mb-6">
            <label className="block text-sm md:text-base text-gray-600 mb-2 font-medium">Add a lovely sentence to rotate on the dashboard</label>
            <textarea value={newQuote} onChange={(e) => setNewQuote(e.target.value)} placeholder="e.g. You are my today and all of my tomorrows..." className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-200 bg-white/50 resize-none font-serif text-lg" rows="3" />
            <button type="submit" disabled={isSavingQuote || !newQuote.trim()} className="mt-4 bg-[#8B1235] text-white px-6 py-3 rounded-xl w-full font-medium hover:bg-[#6A0D28] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {isSavingQuote ? "Adding to the stars..." : <><Sparkles size={18}/> Add to Dashboard</>}
            </button>
          </form>

          {quotes && quotes.length > 0 && (
            <div className="mt-6 border-t border-gray-100 pt-6">
              <h3 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">Active Quotes</h3>
              <div className="space-y-3">
                <AnimatePresence>
                  {quotes.map(q => (
                    <motion.div key={q.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="flex justify-between items-center bg-white/80 p-3 rounded-xl border border-pink-50 shadow-sm">
                      <p className="font-serif italic text-gray-700 truncate pr-4 text-sm md:text-base">"{q.text}"</p>
                      <button onClick={() => deleteQuote(q.id)} className="text-gray-400 hover:text-red-500 p-2 transition-colors shrink-0 bg-white rounded-lg shadow-sm border border-gray-100"><Trash2 size={16}/></button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </motion.div>

        {/* --- APPEARANCE & THEMES --- */}
        <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-sm border border-white/40">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-purple-100 text-purple-600 rounded-xl"><Palette size={20} /></div>
            <h2 className="text-xl font-semibold text-gray-800">Aesthetic Theme</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button onClick={() => setTheme('light')} className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-3 ${theme === 'light' ? 'border-rose-400 bg-rose-50 shadow-md scale-[1.02]' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}>
              <div className="flex gap-2"><div className="w-6 h-6 rounded-full bg-[#FCF8F9] border border-gray-200 shadow-sm"></div><div className="w-6 h-6 rounded-full bg-[#8B1235] shadow-sm"></div></div>
              <div><p className="font-semibold text-gray-800">Light Romantic</p><p className="text-xs text-gray-500 mt-0.5">Soft whites and deep maroon.</p></div>
            </button>
            <button onClick={() => setTheme('beach')} className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-3 ${theme === 'beach' ? 'border-cyan-400 bg-cyan-50 shadow-md scale-[1.02]' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}>
              <div className="flex gap-2"><div className="w-6 h-6 rounded-full bg-[#F4F9F9] border border-cyan-200 shadow-sm"></div><div className="w-6 h-6 rounded-full bg-[#0C4A6E] shadow-sm"></div></div>
              <div><p className="font-semibold text-gray-800">Heavenly Beach</p><p className="text-xs text-gray-500 mt-0.5">Soft ocean blues and warm shores.</p></div>
            </button>
            <button onClick={() => setTheme('sunset')} className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-3 ${theme === 'sunset' ? 'border-orange-400 bg-orange-50 shadow-md scale-[1.02]' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}>
              <div className="flex gap-2"><div className="w-6 h-6 rounded-full bg-[#FFF2EB] border border-gray-200 shadow-sm"></div><div className="w-6 h-6 rounded-full bg-[#ea580c] shadow-sm"></div></div>
              <div><p className="font-semibold text-gray-800">Sunset Glow</p><p className="text-xs text-gray-500 mt-0.5">Warm peaches and vibrant orange.</p></div>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

// ==========================================
// 10. MAIN APP ROUTER & FIREBASE LOGIC
// ==========================================
function App() {
  const [theme, setTheme] = useState('light');
  
  // SECURE AUTH STATES
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeUniverse, setActiveUniverse] = useState(null);
  
  // Data States
  const [memories, setMemories] = useState([]);
  const [letters, setLetters] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [bucketList, setBucketList] = useState([]);
  const [promises, setPromises] = useState([]);
  const [boardItems, setBoardItems] = useState([]);
  
  const [loading, setLoading] = useState(false);
  
  // CENTRALIZED MODAL STATES
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null, type: null, title: '', message: '' });
  const [alertState, setAlertState] = useState({ isOpen: false, title: '', message: '' });

  const showAlert = (title, message) => setAlertState({ isOpen: true, title, message });

 // --- 1. FETCH FROM FIREBASE (FILTERED BY UNIVERSE ID) ---
  useEffect(() => {
    // THIS IS THE GUARD CLAUSE
    if (!isAuthenticated || !activeUniverse) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchData = async () => {
      try {
        const fetchAndSort = async (colName, sortField = 'id') => {
          const q = query(collection(db, colName), where("universeId", "==", activeUniverse));
          const snap = await getDocs(q);
          const data = snap.docs.map(doc => ({ firestoreId: doc.id, id: doc.id, ...doc.data() }));
          return data.sort((a, b) => (b[sortField] > a[sortField] ? 1 : -1));
        };

        setMemories(await fetchAndSort('memories'));
        setLetters(await fetchAndSort('letters', 'createdAt'));
        setQuotes(await fetchAndSort('quotes', 'timestamp'));
        setGalleryPhotos(await fetchAndSort('gallery', 'timestamp'));
        setBucketList(await fetchAndSort('bucketlist'));
        setPromises(await fetchAndSort('promises'));
        setBoardItems(await fetchAndSort('moodboard'));
      } catch (err) {
        console.error("Error fetching data: ", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [isAuthenticated, activeUniverse]);

  // --- 2. DATABASE ACTIONS (STAMPED WITH UNIVERSE ID) ---
  const addMemory = async (newMemoryData) => {
    try {
      const imagesBase64 = [];
      if (newMemoryData.imgFiles && newMemoryData.imgFiles.length > 0) {
        for (const file of newMemoryData.imgFiles) {
          const base64 = await fileToBase64(file);
          imagesBase64.push(base64);
        }
      }

      let voiceBase64 = '';
      if (newMemoryData.voiceBlob) voiceBase64 = await fileToBase64(newMemoryData.voiceBlob);

      const finalMemory = {
        title: newMemoryData.title,
        date: newMemoryData.date || '',
        location: newMemoryData.location || '',
        description: newMemoryData.description || '',
        images: imagesBase64, 
        voiceNote: voiceBase64,
        id: Date.now(),
        universeId: activeUniverse 
      };

      const docRef = await addDoc(collection(db, "memories"), finalMemory);
      setMemories(prev => [{ ...finalMemory, firestoreId: docRef.id }, ...prev]);
      sendInstantNotification("Memory", finalMemory.title);
      return true;
    } catch (err) {
      showAlert("Upload Failed", `Memory upload failed! Reason: ${err.message}`);
      return false;
    }
  };

  // --- GLOBAL DELETION TRIGGERS ---
  const triggerDeleteMemory = (id) => setConfirmModal({ isOpen: true, id, type: 'memory', title: 'Delete Memory?', message: 'Are you sure you want to permanently delete this memory from your universe? This cannot be undone.' });
  const triggerDeleteLetter = (id) => setConfirmModal({ isOpen: true, id, type: 'letter', title: 'Delete Letter?', message: 'Are you sure you want to permanently delete this letter?' });
  const triggerDeleteGalleryPhoto = (id) => setConfirmModal({ isOpen: true, id, type: 'gallery', title: 'Remove Photo?', message: 'Are you sure you want to remove this beautiful photo from the gallery?' });
  const triggerDeleteQuote = (id) => setConfirmModal({ isOpen: true, id, type: 'quote', title: 'Delete Quote?', message: 'Are you sure you want to delete this quote from your universe?' });
  const triggerDeleteGoal = (id) => setConfirmModal({ isOpen: true, id, type: 'goal', title: 'Delete Goal?', message: 'Are you sure you want to remove this goal from your bucket list?' });
  const triggerDeletePromise = (id) => setConfirmModal({ isOpen: true, id, type: 'promise', title: 'Delete Note?', message: 'Are you sure you want to permanently remove this sweet note?' });
const editMemory = async (id, updatedFields) => {
    try {
      await updateDoc(doc(db, "memories", id), updatedFields);
      setMemories(prev => prev.map(m => m.firestoreId === id ? { ...m, ...updatedFields } : m));
    } catch (err) { console.error(err); }
  };

  const editLetter = async (id, updatedFields) => {
    try {
      await updateDoc(doc(db, "letters", id), updatedFields);
      setLetters(prev => prev.map(l => l.firestoreId === id ? { ...l, ...updatedFields } : l));
    } catch (err) { console.error(err); }
  };
  // --- GLOBAL DELETION EXECUTOR ---
  const handleConfirmAction = async () => {
    const { type, id } = confirmModal;
    if (!id) return;
    
    try {
      if (type === 'memory') {
        await deleteDoc(doc(db, "memories", id));
        setMemories(prev => prev.filter(m => m.firestoreId !== id));
      } else if (type === 'letter') {
        await deleteDoc(doc(db, "letters", id));
        setLetters(prev => prev.filter(l => l.firestoreId !== id));
      } else if (type === 'gallery') {
        await deleteDoc(doc(db, "gallery", id));
        setGalleryPhotos(prev => prev.filter(p => p.id !== id));
      } else if (type === 'quote') {
        await deleteDoc(doc(db, "quotes", id));
        setQuotes(prev => prev.filter(q => q.id !== id));
      } else if (type === 'goal') {
        await deleteDoc(doc(db, "bucketlist", id));
        setBucketList(prev => prev.filter(g => g.id !== id));
      } else if (type === 'promise') {
        await deleteDoc(doc(db, "promises", id));
        setPromises(prev => prev.filter(p => p.id !== id));
      }
      setConfirmModal({ isOpen: false, id: null, type: null, title: '', message: '' }); 
    } catch (err) { 
      console.error("Error deleting item: ", err); 
    }
  };


  const addLetter = async (newLetterData) => {
    try {
      const finalLetter = { ...newLetterData, createdAt: new Date().toISOString(), universeId: activeUniverse }; 
      const docRef = await addDoc(collection(db, "letters"), finalLetter);
      setLetters(prev => [{ firestoreId: docRef.id, ...finalLetter }, ...prev]);
      sendInstantNotification("Love Letter", finalLetter.title);
      return true;
    } catch (err) {
      showAlert("Image Too Large", "Attached image is too large! Try a smaller picture.");
      return false;
    }
  };

  const addGalleryPhotos = async (newPhoto) => {
    const finalPhoto = { ...newPhoto, universeId: activeUniverse }; 
    const docRef = await addDoc(collection(db, "gallery"), finalPhoto);
    setGalleryPhotos(prev => [{ id: docRef.id, ...finalPhoto }, ...prev]);
  };

  const addGoal = async (goal) => {
    try {
      const finalGoal = { ...goal, universeId: activeUniverse }; 
      const docRef = await addDoc(collection(db, "bucketlist"), finalGoal);
      setBucketList(prev => [...prev, { id: docRef.id, ...finalGoal }]);
    } catch (err) { console.error(err); }
  };
  
 const toggleGoal = async (id, completed, proofImage = null) => {
    try {
      const updateData = { completed };
      if (proofImage) updateData.proofImage = proofImage;
      await updateDoc(doc(db, "bucketlist", id), updateData);
      setBucketList(prev => prev.map(g => g.id === id ? { ...g, ...updateData } : g));
    } catch (err) { console.error(err); }
  };
  
  const addPromise = async (promise) => {
    try {
      const finalPromise = { ...promise, universeId: activeUniverse };
      const docRef = await addDoc(collection(db, "promises"), finalPromise);
      setPromises(prev => [...prev, { id: docRef.id, ...finalPromise }]);
    } catch (err) { console.error(err); }
  };

  const addBoardItem = async (item) => {
    try {
      const finalItem = { ...item, universeId: activeUniverse }; 
      const docRef = await addDoc(collection(db, "moodboard"), finalItem);
      setBoardItems(prev => [...prev, { id: docRef.id, ...finalItem }]);
    } catch (err) { console.error(err); }
  };
  
  const updateBoardItem = async (id, newProps) => {
    try {
      await updateDoc(doc(db, "moodboard", id), newProps);
      setBoardItems(prev => prev.map(item => item.id === id ? { ...item, ...newProps } : item));
    } catch (err) { console.error(err); }
  };
  
  const deleteBoardItem = async (id) => {
    try {
      await deleteDoc(doc(db, "moodboard", id));
      setBoardItems(prev => prev.filter(i => i.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleUnlock = (user, uId) => {
    setCurrentUser(user);
    setActiveUniverse(uId);
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) return <AuthGateway onUnlock={handleUnlock} />;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FCF8F9] flex items-center justify-center">
        <div className="animate-pulse text-[#8B1235] text-xl font-serif">Syncing Universe {activeUniverse}... ✨</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <DashboardLayout theme={theme}>
        <Routes>
          <Route path="/" element={<Home memories={memories} quotes={quotes} deleteMemory={triggerDeleteMemory} />} />
          <Route path="/timeline" element={<Timeline memories={memories} />} />
          <Route path="/places" element={<LovelyMap memories={memories} />} />
          <Route path="/create-memory" element={<CreateMemory onAddMemory={addMemory} showAlert={showAlert} />} />
          
          <Route path="/gallery" element={<PolaroidGallery galleryPhotos={galleryPhotos} memories={memories} onAddPhotos={addGalleryPhotos} deleteGalleryPhoto={triggerDeleteGalleryPhoto} />} />
          
          <Route path="/letters" element={<Letters letters={letters} deleteLetter={triggerDeleteLetter} />} />
          <Route path="/create-letter" element={<CreateLetter onAddLetter={addLetter} showAlert={showAlert} />} />
          
          <Route path="/memories" element={<Memories memories={memories} deleteMemory={triggerDeleteMemory} />} />
          
          <Route path="/bucket-list" element={<BucketList bucketList={bucketList} addGoal={addGoal} toggleGoal={toggleGoal} deleteGoal={triggerDeleteGoal} />} />
          
          <Route path="/promise-jar" element={<PromiseJar promises={promises} addPromise={addPromise} deletePromise={triggerDeletePromise} showAlert={showAlert} />} />
          <Route path="/mood-board" element={<MoodBoard boardItems={boardItems} addBoardItem={addBoardItem} updateBoardItem={updateBoardItem} deleteBoardItem={deleteBoardItem} />} /> 

          <Route path="/settings" element={
            <SettingsPage 
              theme={theme} setTheme={setTheme}
              activeUniverse={activeUniverse}
              quotes={quotes} deleteQuote={triggerDeleteQuote}
              showAlert={showAlert}
            />
          } />
        </Routes>
      </DashboardLayout>

      {/* GLOBAL MODALS */}
      <DeleteConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={handleConfirmAction}
        title={confirmModal.title}
        message={confirmModal.message}
      />

      <AlertModal 
        isOpen={alertState.isOpen}
        onClose={() => setAlertState({ ...alertState, isOpen: false })}
        title={alertState.title}
        message={alertState.message}
      />
    </BrowserRouter>
  );
}

export default App;