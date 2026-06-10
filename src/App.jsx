import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Image as ImageIcon, Video, Mail, Music, Calendar, Clock, Shield, Palette, Download, Trash2, Lock, ArrowRight, Check, Sparkles, MapPin, Plus, PenTool, Mic, StopCircle, Play, Pause, Volume2, Type, StickyNote, X, ChevronDown, ChevronUp, Copy, AlertCircle, Home as HomeIcon, Grip, ListTodo, Archive, Settings } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import DashboardLayout from './components/layout/DashboardLayout.jsx';
import emailjs from '@emailjs/browser'; 
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import Cropper from 'react-easy-crop';

// --- FIREBASE IMPORTS ---
import { db, storage, auth } from './firebase'; 
import { collection, addDoc, getDocs, query, where, doc, deleteDoc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import imageCompression from 'browser-image-compression';

// ==========================================
// THEME ENGINE (CSS VARIABLES)
// ==========================================
const GlobalThemeStyles = () => (
  <style>{`
    :root {
      --color-primary: #8B1235;
      --color-primary-hover: #6A0D28;
      --color-bg: #FCF8F9;
      --color-bg-alt: #f0dce1;
      --color-heart: #E11D48;
    }
    [data-theme='lavender'] {
      --color-primary: #7E57C2;
      --color-primary-hover: #5E35B1;
      --color-bg: #F5F3FF;
      --color-bg-alt: #EAE6F9;
      --color-heart: #7E57C2;
    }
    [data-theme='beach'] {
      --color-primary: #0C4A6E;
      --color-primary-hover: #072C41;
      --color-bg: #F4F9F9;
      --color-bg-alt: #D0E3E8;
      --color-heart: #0891B2;
    }
    [data-theme='sunset'] {
      --color-primary: #EA580C;
      --color-primary-hover: #C2410C;
      --color-bg: #FFF2EB;
      --color-bg-alt: #FAD5C4;
      --color-heart: #EA580C;
    }
  `}</style>
);

// ==========================================
// UTILITY: PRIVATE BASE64 CONVERTER
// ==========================================
const fileToBase64 = (fileOrBlob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(fileOrBlob);
});

const heartIcon = new L.DivIcon({
  html: `<div style="font-size: 28px; color: var(--color-heart); filter: drop-shadow(0px 0px 8px var(--color-heart));">❤️</div>`,
  className: 'custom-heart-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const lovelyHeartMarker = new L.DivIcon({
  className: 'bg-transparent',
  html: `<div class="relative flex h-8 w-8 items-center justify-center">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style="background-color: var(--color-primary)"></span>
          <span class="relative inline-flex rounded-full h-6 w-6 items-center justify-center text-white text-xs shadow-lg" style="background-color: var(--color-primary)">❤️</span>
        </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// ==========================================
// CUSTOM UI MODALS
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
            <h3 className="text-xl font-serif font-bold text-[var(--color-primary)] mb-2">
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
                className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-[var(--color-primary)] bg-gray-50 mb-6 text-gray-800"
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-[var(--color-primary)] text-white font-bold rounded-xl shadow-md hover:bg-[var(--color-primary-hover)] transition-colors">Save Photos</button>
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-sm shadow-2xl text-center">
            <div className="w-16 h-16 bg-pink-50 text-[var(--color-primary)] rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles size={32} />
            </div>
            <h3 className="text-2xl font-serif font-bold text-gray-800 mb-2">{title}</h3>
            <p className="text-gray-500 mb-8">{message}</p>
            <button onClick={onClose} className="w-full py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl shadow-md hover:bg-[var(--color-primary-hover)] transition-colors">Okay</button>
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
      fetch(src).then(res => res.blob()).then(blob => {
        const objectUrl = URL.createObjectURL(blob);
        setPlayableUrl(objectUrl);
      }).catch(err => {
        console.error("Audio conversion failed:", err);
        setPlayableUrl(src); 
      });
    } else {
      setPlayableUrl(src);
    }
    return () => {
      if (playableUrl && playableUrl.startsWith('blob:')) URL.revokeObjectURL(playableUrl);
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current || !playableUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => setError("Browser blocked audio. Check silent mode."));
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
        <audio ref={audioRef} src={playableUrl} onTimeUpdate={handleTimeUpdate} onEnded={() => setIsPlaying(false)} className="hidden" preload="auto" />
        <button type="button" onClick={togglePlay} disabled={!playableUrl} className="w-10 h-10 flex items-center justify-center bg-[var(--color-primary)] text-white rounded-full hover:bg-[var(--color-primary-hover)] transition-colors shadow-sm shrink-0 disabled:opacity-50">
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div className="h-full bg-[var(--color-primary)]" style={{ width: `${progress}%` }} layout></motion.div>
        </div>
        <Volume2 size={16} className="text-gray-400 shrink-0" />
      </div>
      {error && <p className="text-xs text-red-500 mt-1 ml-2 font-bold flex items-center gap-1"><AlertCircle size={12}/> {error}</p>}
    </div>
  );
};

// ==========================================
// 2. TRUE SECURE GATEWAY (Fixed Refresh Bug)
// ==========================================
const AuthGateway = ({ onUnlock }) => {
  const [authStep, setAuthStep] = useState('LOADING'); 
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const uId = userDoc.data().universeId;
          setUniverseId(uId);
          
          if (sessionStorage.getItem('sessionUnlocked') === 'true') {
            onUnlock(currentUser, uId);
          } else {
            setAuthStep(savedPin ? 'PIN_ENTRY' : 'PIN_SETUP');
          }
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
  }, [savedPin, onUnlock]);

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
      sessionStorage.setItem('sessionUnlocked', 'true');
      onUnlock(user, universeId);
    } else if (authStep === 'PIN_ENTRY') {
      if (pin === savedPin) {
        sessionStorage.setItem('sessionUnlocked', 'true');
        onUnlock(user, universeId);
      } else { 
        setError("Incorrect PIN."); setPin(''); 
      }
    }
  };

  const handleLogout = () => { 
    signOut(auth); 
    setPin(''); 
    sessionStorage.removeItem('sessionUnlocked'); 
  };

  if (authStep === 'LOADING') return <div className="min-h-screen bg-[var(--color-bg-alt)] flex items-center justify-center font-serif text-[var(--color-primary)] text-xl animate-pulse">Loading Gateway...</div>;

  return (
    <div className="min-h-screen bg-[var(--color-bg-alt)] flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500">
      <div className="absolute top-[-30%] left-[-30%] w-[500px] h-[500px] bg-pink-200/50 rounded-full mix-blend-multiply filter blur-[120px] animate-pulse"></div>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/60 backdrop-blur-xl p-8 md:p-10 rounded-[2rem] shadow-xl border border-white/50 max-w-md w-full relative z-10 text-center">
        <div className="w-16 h-16 bg-rose-100 text-[var(--color-primary)] rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          {authStep === 'AUTH' ? <Shield size={32} /> : authStep === 'UNIVERSE_SETUP' ? <Sparkles size={32} /> : <Lock size={32} />}
        </div>
        <h1 className="text-3xl font-serif text-[var(--color-primary)] mb-2">
          {authStep === 'AUTH' ? "Our Universe" : authStep === 'UNIVERSE_SETUP' ? "Initialize Universe" : "App Locked"}
        </h1>
        {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl mb-4 text-sm font-bold animate-bounce">{error}</div>}

        {authStep === 'AUTH' && (
          <form onSubmit={handleAuthSubmit} className="space-y-4 mt-6">
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" className="w-full px-5 py-4 rounded-2xl bg-white border border-pink-100 outline-none focus:border-[var(--color-primary)] text-gray-800 shadow-inner" />
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full px-5 py-4 rounded-2xl bg-white border border-pink-100 outline-none focus:border-[var(--color-primary)] text-gray-800 shadow-inner" />
            <button type="submit" disabled={isLoading} className="w-full mt-2 bg-[var(--color-primary)] text-white py-4 rounded-2xl font-bold text-lg hover:bg-[var(--color-primary-hover)] shadow-md flex justify-center gap-2 transition-colors">
              {isLoading ? "Authenticating..." : (isLoginMode ? "Secure Login" : "Create Account")}
            </button>
            <p className="text-sm text-gray-500 mt-4 cursor-pointer hover:text-[var(--color-primary)]" onClick={() => setIsLoginMode(!isLoginMode)}>
              {isLoginMode ? "Need an account? Sign up" : "Have an account? Log in"}
            </p>
          </form>
        )}

        {authStep === 'UNIVERSE_SETUP' && (
          <div className="space-y-6 mt-6">
            <p className="text-sm text-gray-500 mb-4">You need a shared space to store memories.</p>
            <button onClick={() => handleUniverseSetup('CREATE')} disabled={isLoading} className="w-full bg-[var(--color-primary)] text-white py-4 rounded-2xl font-bold shadow-md hover:bg-[var(--color-primary-hover)] transition-colors">
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

        {(authStep === 'PIN_SETUP' || authStep === 'PIN_ENTRY') && (
          <form onSubmit={handlePinSubmit} className="space-y-4 mt-6">
            <p className="text-sm text-gray-500 mb-4">{authStep === 'PIN_SETUP' ? "Create a personal 4-digit PIN for this device." : "Enter your PIN to unlock."}</p>
            <input type="password" required maxLength="8" value={pin} onChange={e => setPin(e.target.value)} placeholder={authStep === 'PIN_ENTRY' ? "Enter PIN" : "Create PIN"} className="w-full px-5 py-4 rounded-2xl bg-white border-2 border-pink-100 outline-none focus:border-[var(--color-primary)] text-center text-2xl tracking-widest text-gray-800 shadow-inner" />
            <button type="submit" className="w-full mt-2 bg-[var(--color-primary)] text-white py-4 rounded-2xl font-bold text-lg hover:bg-[var(--color-primary-hover)] transition-colors shadow-md">
              {authStep === 'PIN_ENTRY' ? "Unlock App" : "Set PIN & Enter"}
            </button>
            <p className="text-sm text-red-400 mt-4 cursor-pointer hover:underline" onClick={handleLogout}>Log out entirely</p>
          </form>
        )}
      </motion.div>
    </div>
  );
};

// Helper to upload a raw file to Firebase Storage and get the URL back
  const uploadFileToStorage = async (file, folderPath) => {
    if (!file) return null;
    
    // Creates a unique file path: e.g., memories/UNIVERSE-123/1680000000_photo.jpg
    const fileRef = ref(storage, `${folderPath}/${activeUniverse}/${Date.now()}_${file.name || 'upload.jpg'}`);
    
    // Upload the physical file
    await uploadBytes(fileRef, file);
    
    // Retrieve and return the public URL
    return await getDownloadURL(fileRef);
  };
// ==========================================
// PROFESSIONAL & PLAY STORE COMPLIANT PAGES
// ==========================================
const AboutPage = () => (
  <div className="max-w-3xl mx-auto pb-10">
    <h1 className="text-4xl font-serif font-bold text-gray-800 mb-8">About Our Universe ✨</h1>
    <div className="bg-white/80 backdrop-blur-md p-8 md:p-12 rounded-[2rem] shadow-sm border border-white text-gray-700 leading-relaxed font-serif text-lg space-y-6">
      <p><strong>Our Universe</strong> was created as a private, secure, and deeply personal sanctuary for two people to catalog their lives together.</p>
      <p>In a world of public social media feeds and fleeting digital moments, we built a vault. A place where every polaroid, every love letter, and every dropped pin on the map belongs entirely to us.</p>
      <p>Built with React, Framer Motion, and Firebase, this application ensures our data is encrypted, secure, and locked behind a physical device PIN. Features include collaborative Promise Jars, an infinite Mood Board, cinematic Journey Maps, and Time-Locked Letters.</p>
      <p className="text-sm text-gray-400 mt-8 pt-8 border-t border-gray-200">Version 1.0.0 | Created for Love.</p>
    </div>
  </div>
);

const PrivacyPolicy = () => (
  <div className="max-w-3xl mx-auto pb-10">
    <h1 className="text-4xl font-serif font-bold text-gray-800 mb-8">Privacy & Security Policy 🔒</h1>
    <div className="bg-white/80 backdrop-blur-md p-8 md:p-12 rounded-[2rem] shadow-sm border border-white text-gray-700 space-y-6 leading-relaxed">
      <p>Your privacy and data security are the fundamental pillars of Our Universe. We strictly adhere to global privacy standards (including Google Play Store and App Store requirements).</p>
      
      <h3 className="text-xl font-bold text-[var(--color-primary)]">1. Data Collection & Usage</h3>
      <p>We only collect the data you explicitly provide: emails for authentication/notifications, text for memories, and uploaded media. This data is used <strong>exclusively</strong> to provide the core functionality of the app. We do not sell, rent, or share your data with any third parties.</p>
      
      <h3 className="text-xl font-bold text-[var(--color-primary)]">2. Encryption & Storage</h3>
      <p>All memories, photos, and letters are stored in a secure Google Firebase Firestore database. Your data is restricted strictly to your authenticated `Universe ID`. Media files are compressed securely on your device before transmission.</p>
      
      <h3 className="text-xl font-bold text-[var(--color-primary)]">3. Local Device Lock</h3>
      <p>To prevent unauthorized physical access, a 4-digit PIN is stored locally on your device via `localStorage` and `sessionStorage`. This PIN never leaves your device.</p>
      
      <h3 className="text-xl font-bold text-[var(--color-primary)]">4. Location & Tracking</h3>
      <p><strong>Zero Background Tracking:</strong> We do not track your location in the background. Location data is only requested momentarily when you explicitly click "Use My Current Location" on the interactive map, and is only saved to the specific memory you attach it to.</p>

      <h3 className="text-xl font-bold text-[var(--color-primary)]">5. Data Deletion</h3>
      <p>You have full control over your data. Deleting a memory, photo, or note within the app permanently deletes it from the Firebase backend servers.</p>
    </div>
  </div>
);

// ==========================================
// 3. MAIN PAGES (Dashboard)
// ==========================================
const RotatingQuotes = ({ quotes }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!quotes || quotes.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % quotes.length);
    }, 7000); 
    return () => clearInterval(interval);
  }, [quotes]);

  if (!quotes || quotes.length === 0) return null;

  return (
    <div className="relative h-32 md:h-40 flex items-center justify-center overflow-hidden mb-6 md:mb-10 px-4">
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] text-8xl md:text-[10rem] font-serif text-[var(--color-primary)] pointer-events-none -translate-y-4">
        " "
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.95, y: 15, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 1.05, y: -15, filter: "blur(10px)" }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }} 
          className="text-2xl md:text-4xl font-serif text-gray-800 text-center leading-relaxed relative z-10"
        >
          <span className="text-[var(--color-primary)] opacity-40 mr-2 font-serif text-3xl">"</span>
          {quotes[currentIndex]?.text}
          <span className="text-[var(--color-primary)] opacity-40 ml-2 font-serif text-3xl">"</span>
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

const Home = ({ memories, quotes, deleteMemory, theme }) => {
  const recentMemories = memories.slice(0, 4); 
  const navigate = useNavigate();
  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20, filter: "blur(4px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 300, damping: 24 } } };
  
  return (
    <div className="max-w-6xl mx-auto pb-10">
      <RotatingQuotes quotes={quotes} />
      
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="bg-white/40 backdrop-blur-md rounded-3xl md:rounded-[2rem] p-6 md:p-10 mb-6 md:mb-8 relative overflow-hidden shadow-sm border border-white/50">
        <div className="relative z-10 max-w-2xl">
          <motion.p variants={itemVariants} className="text-[var(--color-primary)] font-bold tracking-widest uppercase mb-3 text-xs md:text-sm flex items-center gap-2">
            <Sparkles size={16} /> 
            {theme === 'lavender' ? "Welcome to our lavender dream" : theme === 'beach' ? "Welcome to our paradise" : theme === 'sunset' ? "Welcome to our golden hour" : "Welcome back to our universe"}
          </motion.p>
          <motion.h1 variants={itemVariants} className="text-4xl md:text-6xl font-serif text-gray-800 leading-tight mb-4">
            "I will be there for you <span className="text-[var(--color-primary)] italic font-light relative inline-block">
              always
              <motion.span animate={{ opacity: [0.3, 1, 0.3], scaleX: [0.9, 1, 0.9] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }} className="absolute -bottom-1 left-0 w-full h-[2px] md:h-[3px] bg-[var(--color-primary)] rounded-full origin-center" />
            </span>."
          </motion.h1>
          <motion.p variants={itemVariants} className="text-gray-600 mb-8 md:mb-10 text-base md:text-lg leading-relaxed">
            Every photo, every letter, every little moment we share is kept safe right here.
          </motion.p>
          
          <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3 md:gap-4">
            <button onClick={() => navigate('/create-memory')} className="bg-[var(--color-primary)] text-white px-6 py-3 md:py-3.5 rounded-full font-bold hover:bg-[var(--color-primary-hover)] transition-all flex items-center gap-2 shadow-md hover:shadow-xl hover:-translate-y-1">
              <Plus size={20} /> Add Memory
            </button>
            <button onClick={() => navigate('/create-letter')} className="bg-white text-[var(--color-primary)] px-5 py-3 md:py-3.5 rounded-full font-bold hover:bg-[var(--color-bg-alt)] transition-all flex items-center gap-2 shadow-sm border border-[var(--color-primary)]/10 hover:shadow-md hover:-translate-y-1">
              <PenTool size={18} /> Write Letter
            </button>
            <button onClick={() => navigate('/promise-jar')} className="bg-white text-gray-600 px-5 py-3 md:py-3.5 rounded-full font-bold hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm border border-gray-200 hover:shadow-md hover:-translate-y-1">
              <Heart size={18} className="text-[var(--color-heart)]" /> Open Jar
            </button>
          </motion.div>
        </div>
        <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-[var(--color-primary)] opacity-5 rounded-full blur-[80px] pointer-events-none"></div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 md:p-5 shadow-sm border border-white flex items-center gap-4 hover:scale-[1.02] transition-transform">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-[var(--color-heart)] flex items-center justify-center shrink-0"><Heart size={24} /></div>
          <div><h3 className="text-2xl font-bold text-gray-800 leading-none">{memories.length}</h3><p className="text-sm text-gray-600 mt-1">Total Memories</p></div>
        </div>
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 md:p-5 shadow-sm border border-white flex items-center gap-4 hover:scale-[1.02] transition-transform">
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0"><ImageIcon size={24} /></div>
          <div><h3 className="text-2xl font-bold text-gray-800 leading-none">{memories.filter(m => (m.images && m.images.length > 0) || m.img).length}</h3><p className="text-sm text-gray-600 mt-1">Photos</p></div>
        </div>
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 md:p-5 shadow-sm border border-white flex items-center gap-4 hover:scale-[1.02] transition-transform">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0"><MapPin size={24} /></div>
          <div><h3 className="text-2xl font-bold text-gray-800 leading-none">{memories.filter(m => m.location).length}</h3><p className="text-sm text-gray-600 mt-1">Places Visited</p></div>
        </div>
        <LiveClockCard />
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="bg-white/70 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white">
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
                    className="bg-white p-2.5 pb-6 rounded-sm shadow-md border border-gray-100 relative group cursor-pointer"
                    onClick={() => navigate('/memories')}
                  >
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteMemory(m.firestoreId || m.id); }} 
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
                      <p className="text-[10px] text-[var(--color-primary)] font-bold mt-1 uppercase tracking-wider">{m.date}</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

// ==========================================
// 4. MEMORY CREATION (With Interactive Map Picker)
// ==========================================
const CreateMemory = ({ onAddMemory, showAlert }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ title: '', date: '', location: '', description: '', lat: null, lng: null });
  const [imgFiles, setImgFiles] = useState([]);
  const [imgPreviews, setImgPreviews] = useState([]);
  const [voiceBlob, setVoiceBlob] = useState(null);
  const [voicePreview, setVoicePreview] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [mapCenter, setMapCenter] = useState([51.505, -0.09]); 
  const mediaRecorderRef = useRef(null);

  const LocationPickerMarker = () => {
    useMapEvents({
      click(e) {
        setFormData({ ...formData, lat: e.latlng.lat, lng: e.latlng.lng });
      },
    });
    return formData.lat && formData.lng ? (
      <Marker position={[formData.lat, formData.lng]} icon={lovelyHeartMarker} />
    ) : null;
  };

  const handleGetCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        setMapCenter([latitude, longitude]);
        setFormData({ ...formData, lat: latitude, lng: longitude });
      }, () => {
        showAlert("Location Error", "Could not get your current location. Please check your browser permissions.");
      });
    }
  };

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
      } catch (err) { compressedFiles.push(file); }
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
    } catch (err) { showAlert("Mic Access Denied", "Microphone access denied. Please check your browser permissions."); }
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
    <div className="max-w-3xl mx-auto pb-10">
      <h1 className="text-3xl md:text-4xl font-serif font-bold mb-8 text-gray-800">Add a Memory ✨</h1>
      <form onSubmit={handleSubmit} className="bg-white/70 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-sm border border-white space-y-8">
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-[var(--color-primary)] uppercase tracking-wider mb-2">Title</label>
            <input type="text" required onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-4 rounded-xl border border-gray-200 outline-none focus:border-[var(--color-primary)] bg-white/50 text-xl font-serif font-bold" placeholder="e.g. The night we met" />
          </div>
          <div>
            <label className="block text-sm font-bold text-[var(--color-primary)] uppercase tracking-wider mb-2">Date</label>
            <input type="text" onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-4 rounded-xl border border-gray-200 outline-none focus:border-[var(--color-primary)] bg-white/50" placeholder="dd/mm/yyyy" />
          </div>
        </div>
        
        <div className="bg-white/50 p-4 md:p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <label className="block text-sm font-bold text-[var(--color-primary)] uppercase tracking-wider">Pin Exact Location</label>
            <button type="button" onClick={handleGetCurrentLocation} className="text-xs font-bold bg-[var(--color-bg-alt)] text-[var(--color-primary)] px-3 py-1.5 rounded-lg hover:bg-[var(--color-primary)] hover:text-white transition flex items-center gap-1">
              <MapPin size={14} /> Use My Current Location
            </button>
          </div>
          <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full p-3 mb-4 rounded-xl border border-gray-200 outline-none focus:border-[var(--color-primary)] bg-white" placeholder="Custom location name (e.g., The little cafe where we met)" />
          
          <div className="w-full h-48 md:h-64 rounded-xl overflow-hidden border-2 border-[var(--color-primary)]/20 relative z-0">
            <MapContainer center={mapCenter} zoom={3} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png" />
              <LocationPickerMarker />
            </MapContainer>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-bold text-gray-600 shadow-md pointer-events-none z-[1000]">
              Tap anywhere on map to drop pin
            </div>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 pt-4 border-t border-gray-100">
          <div>
            <label className="block text-sm font-bold text-[var(--color-primary)] uppercase tracking-wider mb-3">Photos (Max 4)</label>
            <div className="grid grid-cols-2 gap-3">
              {imgPreviews.map((preview, idx) => (
                <div key={idx} className="relative aspect-square group">
                  <img src={preview} className="h-full w-full object-cover rounded-xl shadow-sm border border-gray-200"/>
                  <button type="button" onClick={() => removeImage(idx)} className="absolute top-2 right-2 bg-white/90 text-red-500 rounded-full p-1.5 shadow-md hover:scale-110 transition"><Trash2 size={16}/></button>
                </div>
              ))}
              {imgPreviews.length < 4 && (
                <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-[var(--color-primary)]/30 rounded-xl hover:bg-[var(--color-bg-alt)] cursor-pointer transition bg-white/30 text-[var(--color-primary)]">
                  <Plus size={24} className="mb-2 opacity-70" />
                  <span className="text-xs font-bold uppercase tracking-wider opacity-70">Add Photo</span>
                  <input type="file" accept="image/*" multiple onChange={handleMultiImageUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[var(--color-primary)] uppercase tracking-wider mb-3">Voice Note</label>
            <div className="bg-white/50 p-6 rounded-2xl border border-gray-200 flex flex-col items-center justify-center text-center h-full min-h-[150px]">
              {!isRecording && !voicePreview && (
                <button type="button" onClick={startRecording} className="flex items-center gap-2 px-6 py-3 rounded-full font-bold bg-[var(--color-bg-alt)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition shadow-sm">
                  <Mic size={18}/> Record Audio
                </button>
              )}
              {isRecording && (
                <button type="button" onClick={stopRecording} className="flex items-center gap-2 px-6 py-3 rounded-full font-bold bg-red-500 text-white shadow-md animate-pulse">
                  <StopCircle size={18}/> Stop Recording
                </button>
              )}
              {voicePreview && (
                <div className="w-full">
                  <div className="text-sm text-green-600 font-bold flex items-center justify-center gap-2 mb-3 bg-green-50 px-4 py-2 rounded-full border border-green-200">
                    <Check size={16}/> Audio Saved!
                  </div>
                  <button type="button" onClick={() => setVoicePreview('')} className="text-xs text-red-400 font-bold hover:underline">Remove</button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-bold text-[var(--color-primary)] uppercase tracking-wider mb-2">Our Story</label>
          <textarea rows="6" onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-5 rounded-2xl border border-gray-200 outline-none focus:border-[var(--color-primary)] bg-white/50 text-lg font-serif leading-relaxed" placeholder="Write what happened..."></textarea>
        </div>
        
        <button type="submit" disabled={isSaving} className="w-full bg-[var(--color-primary)] text-white py-5 rounded-2xl font-bold text-xl disabled:opacity-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1">
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
  const [lightboxIndex, setLightboxIndex] = useState(null);
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

  const handleMultiUploadClick = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setPendingFiles(files);
    setIsCaptionModalOpen(true);
    e.target.value = null; 
  };

  const processUpload = async (customCaption) => {
    setIsCaptionModalOpen(false); 
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
      } catch (error) { console.error("Upload failed for a photo:", error); }
    }
    
    setIsUploading(false);
    setPendingFiles([]); 
  };

  const slideNext = (e) => { e.stopPropagation(); setLightboxIndex((prev) => (prev + 1) % combinedPhotos.length); };
  const slidePrev = (e) => { e.stopPropagation(); setLightboxIndex((prev) => (prev - 1 + combinedPhotos.length) % combinedPhotos.length); };

  return (
    <div className="max-w-6xl mx-auto pb-10 relative">
      <CaptionModal isOpen={isCaptionModalOpen} fileCount={pendingFiles.length} onClose={() => { setIsCaptionModalOpen(false); setPendingFiles([]); }} onSubmit={processUpload} />

      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold font-serif text-gray-800">Our Gallery 📷</h1>
          <p className="text-gray-500 mt-2 text-sm md:text-base">A collection of our favorite moments and memories.</p>
        </div>
        <label className="bg-[var(--color-primary)] text-white px-6 py-3 rounded-full cursor-pointer hover:bg-[var(--color-primary-hover)] transition shadow-md font-medium flex items-center gap-2 w-full md:w-auto justify-center">
          {isUploading ? <><span className="animate-pulse">Uploading Photos...</span></> : <><Plus size={20} /> Add Photos</>}
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
                  onClick={() => setLightboxIndex(index)}
                  className="bg-white p-3 pb-12 md:p-4 md:pb-16 rounded-sm shadow-xl hover:shadow-2xl border border-gray-200 relative group cursor-pointer"
                >
                  <div className="w-full aspect-square bg-gray-200 overflow-hidden shadow-inner border border-black/5">
                    <img src={photo.imgUrl} className="w-full h-full object-cover" alt={photo.heading} />
                  </div>
                  <div className="absolute bottom-0 left-0 w-full h-12 md:h-16 flex items-center justify-center px-4">
                    <p className="font-serif italic text-gray-800 text-sm md:text-base font-medium truncate text-center w-full">{photo.heading}</p>
                  </div>
                  {photo.source === 'gallery' && (
                    <button onClick={(e) => { e.stopPropagation(); deleteGalleryPhoto(photo.id); }} className="absolute top-4 right-4 bg-white/90 p-2 rounded-full text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-md z-20">
                      <Trash2 size={16} />
                    </button>
                  )}
                  {photo.source === 'memory' && (
                    <div className="absolute top-4 left-4 bg-white/90 px-2 py-1 rounded text-[10px] uppercase font-bold text-[var(--color-primary)] shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">From Memory</div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* LIGHTBOX SLIDER */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md" onClick={() => setLightboxIndex(null)}>
            <button onClick={() => setLightboxIndex(null)} className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors z-50 p-2"><X size={32} /></button>
            <button onClick={slidePrev} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-4 z-50"><ChevronDown size={48} className="rotate-90" /></button>
            <button onClick={slideNext} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-4 z-50"><ChevronUp size={48} className="rotate-90" /></button>

            <motion.div 
              key={lightboxIndex}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -100, scale: 0.9 }}
              transition={{ type: "spring", bounce: 0.3 }}
              className="flex flex-col items-center max-w-4xl w-full px-12"
              onClick={e => e.stopPropagation()}
            >
              <img src={combinedPhotos[lightboxIndex].imgUrl} className="max-h-[70vh] w-auto object-contain rounded-xl shadow-2xl border-4 border-white/10" alt="Fullscreen" />
              <div className="mt-6 text-center">
                <h3 className="text-3xl font-serif italic text-white mb-2">{combinedPhotos[lightboxIndex].heading}</h3>
                {combinedPhotos[lightboxIndex].source === 'memory' && <span className="px-3 py-1 bg-white/20 text-white rounded-full text-xs font-bold uppercase tracking-wider">From Memory</span>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
// ==========================================
// 6. ALL MEMORIES PAGE (Fixed Scrolling + 7 Layouts)
// ==========================================
const Memories = ({ memories, deleteMemory, editMemory }) => {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', location: '', borderStyle: 'border-white', layoutStyle: 'classic' });

  // NEW: Completely lock the background body from scrolling when a memory is open!
  useEffect(() => {
    if (currentIndex !== -1) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [currentIndex]);

  const openMemory = (idx) => {
    setCurrentIndex(idx);
    const m = memories[idx];
    setEditForm({ 
      title: m.title, 
      description: m.description || '', 
      location: m.location || '', 
      borderStyle: m.borderStyle || 'border-white',
      layoutStyle: m.layoutStyle || 'classic'
    });
    setIsEditing(false);
  };

  const closeMemory = () => { setCurrentIndex(-1); setIsEditing(false); };

  const slideNext = (e) => { 
    e.stopPropagation(); 
    const nextIdx = (currentIndex + 1) % memories.length;
    openMemory(nextIdx);
  };
  
  const slidePrev = (e) => { 
    e.stopPropagation(); 
    const prevIdx = (currentIndex - 1 + memories.length) % memories.length;
    openMemory(prevIdx);
  };

  const handleSaveEdit = () => {
    const selectedMemory = memories[currentIndex];
    editMemory(selectedMemory.firestoreId, editForm);
    setIsEditing(false);
  };

  const borderOptions = [
    { label: "White", value: "border-white", hex: "bg-white" },
    { label: "Gold", value: "border-yellow-400", hex: "bg-yellow-400" },
    { label: "Pink", value: "border-pink-200", hex: "bg-pink-200" },
    { label: "None", value: "border-transparent", hex: "bg-gray-200" },
    { label: "Maroon", value: "border-[#8B1235]", hex: "bg-[#8B1235]" },
    { label: "Lavender", value: "border-[#7E57C2]", hex: "bg-[#7E57C2]" },
    { label: "Ocean", value: "border-cyan-500", hex: "bg-cyan-500" },
    { label: "Leather", value: "border-amber-800", hex: "bg-amber-800" },
    { label: "Midnight", value: "border-gray-900", hex: "bg-gray-900" }
  ];

  const layoutOptions = [
    { label: "Classic Polaroid", value: "classic" },
    { label: "Cinematic Glass", value: "cinematic" },
    { label: "Split Storybook", value: "split" },
    { label: "Vintage Journal", value: "journal" },
    { label: "Messy Scrapbook", value: "scrapbook" },
    { label: "Modern Minimal", value: "minimal" }, // NEW
    { label: "Dark Elegance", value: "dark" }     // NEW
  ];

  const selectedMemory = currentIndex >= 0 ? memories[currentIndex] : null;

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
              const randomRotation = (idx % 2 === 0 ? 1 : -1) * ((idx % 3) + 1);
              
              return (
                <motion.div 
                  key={m.firestoreId || m.id} layout
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05, rotate: randomRotation, zIndex: 10 }}
                  onClick={() => openMemory(idx)}
                  className={`bg-white p-3 pb-12 rounded-sm shadow-xl hover:shadow-2xl border-4 ${m.borderStyle || 'border-white'} relative cursor-pointer group`}
                >
                  <button onClick={(e) => { e.stopPropagation(); deleteMemory(m.firestoreId || m.id); }} className="absolute top-4 right-4 bg-white/90 p-2 rounded-full text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-md z-20">
                    <Trash2 size={16} />
                  </button>
                  <div className="w-full aspect-square bg-gray-100 overflow-hidden shadow-inner">
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

      {/* FULL SCREEN READING SLIDER MODAL */}
      <AnimatePresence>
        {selectedMemory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md overflow-hidden" onClick={closeMemory}>
            
            {!isEditing && memories.length > 1 && (
              <>
                <button onClick={slidePrev} className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2 md:p-4 z-50 transition-transform hover:scale-110"><ChevronDown size={48} className="rotate-90" /></button>
                <button onClick={slideNext} className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2 md:p-4 z-50 transition-transform hover:scale-110"><ChevronUp size={48} className="rotate-90" /></button>
              </>
            )}

            <button onClick={closeMemory} className="absolute top-6 right-6 bg-black/20 text-white hover:bg-black/50 p-3 rounded-full z-50 backdrop-blur-sm transition"><X size={32}/></button>

            {/* FIXED: Modal is now a rigid box (h-[90vh] overflow-hidden). The INSIDES will scroll independently! */}
            <motion.div 
              key={currentIndex}
              initial={{ scale: 0.9, x: 100, opacity: 0 }} 
              animate={{ scale: 1, x: 0, opacity: 1 }} 
              exit={{ scale: 0.9, x: -100, opacity: 0 }} 
              transition={{ type: "spring", bounce: 0.3 }}
              className={`w-full max-w-4xl h-[90vh] overflow-hidden rounded-xl shadow-2xl relative border-[8px] flex flex-col ${selectedMemory.borderStyle || 'border-white'} ${
                selectedMemory.layoutStyle === 'journal' ? 'bg-[#FFF9E6]' : 
                selectedMemory.layoutStyle === 'cinematic' ? 'bg-black' : 
                selectedMemory.layoutStyle === 'dark' ? 'bg-gray-900' : 'bg-[var(--color-bg)]'
              }`} 
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setIsEditing(true)} className={`absolute top-4 right-4 backdrop-blur-md px-4 py-2 rounded-full font-bold text-sm shadow-sm transition z-50 ${selectedMemory.layoutStyle === 'cinematic' || selectedMemory.layoutStyle === 'dark' ? 'bg-white/20 text-white hover:bg-white/40' : 'bg-white/50 text-gray-900 hover:bg-white'}`}>
                Edit Style
              </button>

              {!isEditing ? (
                <>
                  {/* LAYOUT 1: CLASSIC POLAROID */}
                  {(!selectedMemory.layoutStyle || selectedMemory.layoutStyle === 'classic') && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col">
                      <div className="relative shrink-0">
                        {selectedMemory.images && selectedMemory.images.length > 0 ? (
                          <div className="w-full h-72 md:h-96 relative">
                            <img src={selectedMemory.images[0]} className="w-full h-full object-cover" alt="Memory Cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-transparent to-transparent"></div>
                          </div>
                        ) : <div className="h-32 bg-[var(--color-primary)] opacity-10"></div>}
                      </div>
                      <div className="px-8 md:px-12 pb-12 -mt-16 relative z-10 shrink-0">
                        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white">
                          <div className="flex flex-col items-center text-center mb-8 border-b border-gray-100 pb-8">
                            <p className="text-[var(--color-primary)] font-bold tracking-widest uppercase text-xs mb-3">{selectedMemory.date}</p>
                            <h2 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 leading-tight mb-4">{selectedMemory.title}</h2>
                            {selectedMemory.location && (
                              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm font-medium"><MapPin size={14} className="text-[var(--color-primary)]" /> {selectedMemory.location}</span>
                            )}
                          </div>
                          <div className="prose prose-rose max-w-none text-lg md:text-xl text-gray-700 font-serif leading-loose whitespace-pre-wrap px-4">
                            {selectedMemory.description || <span className="italic text-gray-400">No story written for this moment yet. Click Edit to add one.</span>}
                          </div>
                          {selectedMemory.images && selectedMemory.images.length > 1 && (
                            <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-gray-100">
                              {selectedMemory.images.slice(1).map((img, i) => <img key={i} src={img} className="w-full h-48 object-cover rounded-xl shadow-sm border border-gray-200" />)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LAYOUT 2: CINEMATIC GLASS (Fixed Background, Scrolling Text!) */}
                  {selectedMemory.layoutStyle === 'cinematic' && (
                    <>
                      {selectedMemory.images && selectedMemory.images.length > 0 && (
                        <div className="absolute inset-0 z-0 pointer-events-none">
                          <img src={selectedMemory.images[0]} className="w-full h-full object-cover" alt="Background" />
                          <div className="absolute inset-0 bg-black/40 bg-gradient-to-t from-black/95 via-black/40 to-black/10"></div>
                        </div>
                      )}
                      <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar flex flex-col p-6 md:p-10">
                         {/* Invisible spacer pushes text down over the image */}
                         <div className="min-h-[40vh] md:min-h-[50vh] shrink-0"></div>
                         
                         <div className="bg-black/40 backdrop-blur-md border border-white/20 p-8 rounded-3xl text-white shadow-2xl shrink-0 mt-auto">
                            <p className="text-rose-300 font-bold tracking-widest uppercase text-xs mb-3">{selectedMemory.date} {selectedMemory.location && `• ${selectedMemory.location}`}</p>
                            <h2 className="text-4xl md:text-6xl font-serif font-bold leading-tight mb-6">{selectedMemory.title}</h2>
                            <div className="whitespace-pre-wrap text-lg md:text-xl text-gray-200 font-serif leading-relaxed">
                              {selectedMemory.description || <span className="italic opacity-60">No story written.</span>}
                            </div>
                         </div>
                      </div>
                    </>
                  )}

                  {/* LAYOUT 3: SPLIT STORYBOOK */}
                  {selectedMemory.layoutStyle === 'split' && (
                    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                      <div className="w-full md:w-1/2 h-64 md:h-full relative bg-gray-100 border-r border-gray-200 shrink-0">
                        {selectedMemory.images && selectedMemory.images.length > 0 ? (
                          <img src={selectedMemory.images[0]} className="absolute inset-0 w-full h-full object-cover" />
                        ) : <div className="absolute inset-0 flex items-center justify-center"><ImageIcon size={48} className="text-gray-300"/></div>}
                      </div>
                      <div className="w-full md:w-1/2 flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12 bg-white flex flex-col">
                        <p className="text-[var(--color-primary)] font-bold tracking-widest uppercase text-xs mb-2">{selectedMemory.date}</p>
                        <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 leading-tight mb-4">{selectedMemory.title}</h2>
                        {selectedMemory.location && <p className="text-sm text-gray-500 mb-6 flex items-center gap-1"><MapPin size={14} className="text-blue-400" /> {selectedMemory.location}</p>}
                        <div className="whitespace-pre-wrap text-lg text-gray-700 font-serif leading-loose">
                           {selectedMemory.description || <span className="italic text-gray-400">No story written.</span>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LAYOUT 4: VINTAGE JOURNAL */}
                  {selectedMemory.layoutStyle === 'journal' && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-14 relative" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, rgba(0,0,0,0.05) 31px, rgba(0,0,0,0.05) 32px)'}}>
                      <div className="text-center mb-10 shrink-0">
                        <h2 className="text-4xl md:text-5xl font-serif italic text-gray-800 mb-4">{selectedMemory.title}</h2>
                        <p className="text-gray-500 font-serif font-bold uppercase tracking-widest text-sm border-y border-gray-300 py-2 inline-block px-8">{selectedMemory.date} {selectedMemory.location && `• ${selectedMemory.location}`}</p>
                      </div>
                      <div className="whitespace-pre-wrap text-xl leading-[32px] text-gray-800 mb-10 px-4 md:px-8 shrink-0" style={{ fontFamily: "'Georgia', serif" }}>
                        {selectedMemory.description || <span className="italic text-gray-400">Dear journal...</span>}
                      </div>
                      {selectedMemory.images && selectedMemory.images.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-4 px-4 shrink-0">
                           {selectedMemory.images.map((img, i) => (
                             <div key={i} className="p-2 bg-white shadow-md border border-gray-200 transform rotate-1 hover:scale-105 transition">
                               <img src={img} className="max-h-64 object-cover" />
                             </div>
                           ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* LAYOUT 5: MESSY SCRAPBOOK */}
                  {selectedMemory.layoutStyle === 'scrapbook' && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12 bg-gray-50 relative">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 pointer-events-none"></div>
                      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 pointer-events-none"></div>
                      
                      <div className="flex flex-wrap justify-center gap-4 mb-12 relative z-10 pt-8 shrink-0">
                        {selectedMemory.images && selectedMemory.images.length > 0 ? (
                           selectedMemory.images.map((img, i) => {
                             const tilt = (i % 2 === 0 ? 1 : -1) * ((i * 3) + 4);
                             return (
                               <div key={i} className="relative p-3 bg-white shadow-xl border border-gray-200" style={{ transform: `rotate(${tilt}deg)` }}>
                                 <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-6 bg-white/60 backdrop-blur-sm border border-white/40 shadow-sm rotate-3"></div>
                                 <img src={img} className="w-48 h-48 md:w-64 md:h-64 object-cover" />
                               </div>
                             )
                           })
                        ) : <div className="p-10 border-4 border-dashed border-gray-300 rounded-xl text-gray-400 font-bold rotate-2">Needs Photos!</div>}
                      </div>
                      
                      <div className="relative z-10 bg-white/60 backdrop-blur-md p-8 rounded-2xl shadow-sm border border-white max-w-2xl mx-auto shrink-0">
                        <h2 className="text-3xl font-bold text-[#8B1235] mb-2">{selectedMemory.title}</h2>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-6">{selectedMemory.date} | {selectedMemory.location}</p>
                        <div className="whitespace-pre-wrap text-xl leading-relaxed text-gray-700" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
                          {selectedMemory.description || "Jot down some notes..."}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LAYOUT 6: MODERN MINIMAL */}
                  {selectedMemory.layoutStyle === 'minimal' && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-white flex flex-col">
                      {selectedMemory.images?.[0] && (
                        <div className="w-full h-64 md:h-80 shrink-0">
                          <img src={selectedMemory.images[0]} className="w-full h-full object-cover grayscale-[30%]" />
                        </div>
                      )}
                      <div className="max-w-3xl mx-auto w-full p-10 md:p-16 text-center shrink-0">
                        <p className="text-gray-400 tracking-[0.3em] uppercase text-xs mb-6">{selectedMemory.date} {selectedMemory.location && `// ${selectedMemory.location}`}</p>
                        <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-10 tracking-tight">{selectedMemory.title}</h2>
                        <div className="w-12 h-px bg-gray-300 mx-auto mb-10"></div>
                        <div className="text-lg md:text-xl text-gray-600 font-sans leading-loose text-left whitespace-pre-wrap">
                          {selectedMemory.description || <span className="italic text-gray-300">No content.</span>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LAYOUT 7: DARK ELEGANCE */}
                  {selectedMemory.layoutStyle === 'dark' && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-900 text-gray-100 flex flex-col p-6 md:p-12">
                      <div className="border border-gray-700/50 p-6 md:p-12 rounded-3xl bg-gray-800/50 backdrop-blur-sm shrink-0 shadow-2xl">
                        <p className="text-amber-500/80 font-serif italic mb-3 text-center">{selectedMemory.date} {selectedMemory.location && `• ${selectedMemory.location}`}</p>
                        <h2 className="text-3xl md:text-5xl font-serif text-amber-50 text-center mb-10">{selectedMemory.title}</h2>
                        
                        {selectedMemory.images?.[0] && (
                          <div className="w-full h-72 md:h-[28rem] rounded-xl overflow-hidden border-2 border-gray-700 mb-10 shadow-2xl">
                            <img src={selectedMemory.images[0]} className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                        <div className="prose prose-invert max-w-none text-gray-300 font-serif text-lg leading-loose whitespace-pre-wrap">
                          {selectedMemory.description || <span className="italic text-gray-600">No story written.</span>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* GLOBAL AUDIO PLAYER AT BOTTOM */}
                  {selectedMemory.voiceNote && <div className="p-8 border-t border-black/10 bg-[var(--color-bg)] shrink-0"><AudioPlayer src={selectedMemory.voiceNote} /></div>}
                </>
              ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12 space-y-8 bg-white/95 backdrop-blur-md">
                  <div className="flex items-center justify-between border-b pb-4 shrink-0">
                    <h3 className="text-2xl font-serif font-bold text-[var(--color-primary)]">Edit Memory Styling</h3>
                    <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-800"><X size={24}/></button>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 shrink-0">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Title</label>
                      <input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full p-4 rounded-xl border border-gray-200 font-bold text-xl outline-none focus:border-[var(--color-primary)] bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Location</label>
                      <div className="flex relative">
                        <MapPin size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} className="w-full p-4 pl-12 rounded-xl border border-gray-200 text-lg outline-none focus:border-[var(--color-primary)] bg-gray-50" />
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <label className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider block mb-2">1. Choose Layout Style</label>
                    <div className="flex flex-wrap gap-2 pb-2">
                      {layoutOptions.map(l => (
                        <button key={l.value} onClick={() => setEditForm({...editForm, layoutStyle: l.value})} className={`px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition ${editForm.layoutStyle === l.value ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-md' : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'}`}>
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <label className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider block mb-2">2. Choose Outer Border Color</label>
                    <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar">
                      {borderOptions.map(b => (
                        <button key={b.value} onClick={() => setEditForm({...editForm, borderStyle: b.value})} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 transition whitespace-nowrap ${editForm.borderStyle === b.value ? 'border-[var(--color-primary)] bg-gray-50 shadow-md' : 'border-gray-200 text-gray-500 bg-white hover:bg-gray-50'}`}>
                          <span className={`w-4 h-4 rounded-full border border-gray-300 shadow-sm ${b.hex}`}></span>
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Our Story</label>
                    <textarea rows="6" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full p-4 rounded-xl border border-gray-200 font-serif text-lg outline-none focus:border-[var(--color-primary)] bg-gray-50" />
                  </div>

                  <div className="flex justify-end gap-3 pt-6 border-t shrink-0">
                    <button onClick={() => setIsEditing(false)} className="px-6 py-3 font-bold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
                    <button onClick={handleSaveEdit} className="px-8 py-3 font-bold bg-[var(--color-primary)] text-white rounded-xl shadow-md hover:bg-[var(--color-primary-hover)] transition-transform hover:scale-105">Save Changes</button>
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

      <div className="absolute left-8 md:left-1/2 top-32 bottom-0 w-1.5 md:-translate-x-1/2 rounded-full bg-gradient-to-b from-gray-200 via-gray-300 to-gray-200 opacity-60"></div>

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
              <div className="absolute left-4 md:left-1/2 w-8 h-8 rounded-full border-4 border-[var(--color-bg)] bg-[var(--color-primary)] md:-translate-x-1/2 shadow-md z-20 group-hover:scale-125 group-hover:bg-[var(--color-primary-hover)] transition-all duration-300 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>

              <div className={`w-full pl-16 md:pl-0 md:w-[45%] ${isEven ? 'md:pr-12' : 'md:pl-12'}`}>
                <motion.div 
                  layout
                  onClick={() => toggleExpand(m.firestoreId || m.id)}
                  className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-white hover:shadow-xl transition-shadow cursor-pointer relative overflow-hidden"
                >
                  <div className="inline-block bg-[var(--color-bg-alt)] text-[var(--color-primary)] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 shadow-sm border border-white">
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
                          <p className="text-gray-600 leading-relaxed text-md mb-6 bg-white/50 p-4 rounded-2xl italic font-serif border-l-4 border-[var(--color-primary)]">
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

                  <div className="w-full flex justify-center mt-4 text-gray-300 group-hover:text-[var(--color-primary)] transition-colors">
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

// Helper component to control map flying animations
const MapController = ({ selectedMarker }) => {
  const map = useMap();
  useEffect(() => {
    if (selectedMarker && selectedMarker.lat && selectedMarker.lng) {
      map.flyTo([selectedMarker.lat, selectedMarker.lng], 12, {
        duration: 2.5, 
        easeLinearity: 0.25
      });
    }
  }, [selectedMarker, map]);
  return null;
};

const LovelyMap = ({ memories, theme }) => {
  const [markers, setMarkers] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);

  // Dynamic Tile URLs based on your Aesthetic Theme
  const mapTiles = {
    lavender: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",
    beach: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",
    sunset: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",
    light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
  };
  
  useEffect(() => {
    const fetchCoordinates = async () => {
      const placesWithCoords = [];
      const places = memories
        .filter(m => m.location)
        .sort((a, b) => new Date(a.id) - new Date(b.id)); 

      for (const place of places) {
        if (place.lat && place.lng) {
          placesWithCoords.push({ ...place, lat: place.lat, lng: place.lng });
          continue;
        }
        await new Promise(resolve => setTimeout(resolve, 600));
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place.location)}&format=json&limit=1`);
          const data = await response.json();
          if (data && data.length > 0) {
            placesWithCoords.push({ 
              ...place, 
              lat: parseFloat(data[0].lat), 
              lng: parseFloat(data[0].lon) 
            });
          }
        } catch (error) { 
          console.error("Error finding coordinates for:", place.location); 
        }
      }
      setMarkers(placesWithCoords);
    };
    fetchCoordinates();
  }, [memories]);

  const journeyPath = markers.map(m => [m.lat, m.lng]);
  const defaultCenter = markers.length > 0 ? [markers[0].lat, markers[0].lng] : [8.5241, 76.9366];

  return (
    <div className="max-w-7xl mx-auto pb-10 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-800">The Map of Us 🌍</h1>
          <p className="text-gray-500 mt-1 text-sm md:text-base">Everywhere we've been, connected together.</p>
        </div>
        <p className="text-sm font-medium bg-white text-[var(--color-primary)] border border-gray-200 px-4 py-2 rounded-full shadow-sm flex items-center gap-2">
          <MapPin size={16} /> {markers.length} {markers.length === 1 ? 'Pin' : 'Pins'}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* INTERACTIVE STORY MODE SIDEBAR */}
        <div className="w-full lg:w-1/3 flex flex-col bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm rounded-[2rem] overflow-hidden max-h-[400px] lg:max-h-[650px]">
          <div className="p-6 border-b border-gray-100 bg-white/80">
            <h3 className="font-serif font-bold text-xl text-[var(--color-primary)] flex items-center gap-2">
              <Sparkles size={20} /> Our Adventures
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            {markers.length === 0 ? (
              <div className="text-center text-gray-400 py-10 text-sm font-medium">Adding locations to your memories will drop pins here.</div>
            ) : (
              markers.map((marker, idx) => (
                <div 
                  key={idx}
                  onMouseEnter={() => setSelectedMarker(marker)} 
                  onTouchStart={() => setSelectedMarker(marker)}
                  onClick={() => setSelectedMarker(marker)}
                  className={`w-full text-left p-4 rounded-2xl transition-all border cursor-pointer ${selectedMarker?.id === marker.id ? 'bg-[var(--color-primary)] border-[var(--color-primary)] shadow-md text-white scale-[1.02] origin-left' : 'bg-white border-transparent hover:border-gray-200 hover:bg-gray-50 shadow-sm'}`}
                >
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${selectedMarker?.id === marker.id ? 'text-white/70' : 'text-[var(--color-primary)]'}`}>
                    Step {idx + 1}
                  </p>
                  <h4 className="font-serif font-bold text-lg leading-tight mb-1 truncate">{marker.title}</h4>
                  <p className={`text-xs font-medium flex items-center gap-1 ${selectedMarker?.id === marker.id ? 'text-white/90' : 'text-gray-500'}`}>
                    <MapPin size={12} /> {marker.location}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* THE MAP */}
        <div className="w-full lg:w-2/3 bg-white/60 backdrop-blur-xl p-4 md:p-6 rounded-[2rem] shadow-sm border border-white/40">
          <div className="w-full h-[400px] md:h-[650px] rounded-2xl overflow-hidden shadow-inner border-4 border-white relative z-0">
            <MapContainer center={defaultCenter} zoom={4} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
              <TileLayer url={mapTiles[theme] || mapTiles.light} />
              
              <MapController selectedMarker={selectedMarker} />

              {journeyPath.length > 1 && (
                <Polyline positions={journeyPath} pathOptions={{ color: 'var(--color-primary)', weight: 3, dashArray: '10, 10', opacity: 0.6 }} />
              )}

              {markers.map((marker, idx) => {
                const coverImg = (marker.images && marker.images.length > 0) ? marker.images[0] : marker.img;
                return (
                  <Marker key={idx} position={[marker.lat, marker.lng]} icon={lovelyHeartMarker}>
                    <Popup className="custom-popup border-0 shadow-lg rounded-xl">
                      <div className="p-1 text-center min-w-[150px]">
                        {coverImg && <img src={coverImg} alt={marker.title} className="w-full h-28 object-cover rounded-lg mb-3 shadow-md border border-gray-100" />}
                        <h3 className="font-bold font-serif text-[var(--color-primary)] text-lg leading-tight">{marker.title}</h3>
                        <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-wider border-t pt-2">{marker.date}</p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
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
    <div className="bg-rose-950/80 backdrop-blur-md border border-rose-800/50 rounded-sm p-8 flex flex-col items-center justify-center text-center h-full min-h-[300px] shadow-xl relative overflow-hidden">
      <div className="absolute inset-2 border border-rose-800/30 rounded-sm pointer-events-none"></div>
      <Lock size={48} className="text-rose-300 mb-4 opacity-80" />
      <h3 className="text-2xl font-serif font-bold text-rose-100 mb-2 tracking-wide">Time Capsule</h3>
      <div className="w-12 h-px bg-rose-400/50 my-3"></div>
      <p className="text-rose-200/80 mb-6 font-serif italic">"Do not open until our special day."</p>
      <div className="bg-rose-900/50 border border-rose-400/30 text-rose-100 px-5 py-2.5 rounded-full font-mono text-sm shadow-inner tracking-widest">
        {timeLeft}
      </div>
    </div>
  );
};

const Letters = ({ letters, deleteLetter, editLetter }) => {
  const navigate = useNavigate();
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', content: '' });

  const openLetter = (l) => {
    setSelectedLetter(l);
    setEditForm({ title: l.title, content: l.content });
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    editLetter(selectedLetter.firestoreId, editForm);
    setSelectedLetter({ ...selectedLetter, ...editForm });
    setIsEditing(false);
  };

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-800">Love Letters 💌</h1>
        <button onClick={() => navigate('/create-letter')} className="bg-[var(--color-primary)] text-white px-6 py-3 rounded-full font-medium hover:bg-[var(--color-primary-hover)] transition-all flex items-center gap-2 shadow-md">
          <PenTool size={18} /> Write a Letter
        </button>
      </div>

      {letters.length === 0 ? (
        <p className="text-gray-500 text-center py-10 bg-white/50 backdrop-blur-sm rounded-3xl border border-white">No letters written yet. Leave a sweet note!</p>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence>
            {letters.map((letter, idx) => {
              const isLocked = letter.unlockDate && new Date(letter.unlockDate).getTime() > new Date().getTime();
              const randomRotation = (idx % 2 === 0 ? 1 : -1) * ((idx % 3) + 1);

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
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  whileHover={{ scale: 1.02, rotate: randomRotation, zIndex: 10 }} 
                  onClick={() => openLetter(letter)}
                  className={`p-6 pb-12 rounded-sm shadow-lg hover:shadow-2xl transition-all relative cursor-pointer group flex flex-col h-[320px] overflow-hidden ${
                    letter.layout === 'image-background' 
                      ? 'border border-gray-300 text-white' 
                      : 'bg-[#FFFAF0] border-[8px] border-white outline outline-1 outline-gray-200 text-gray-800'
                  }`}
                >
                  {letter.layout !== 'image-background' && (
                    <div className="absolute inset-2 border border-rose-200/50 rounded-sm pointer-events-none z-10"></div>
                  )}

                  <button onClick={(e) => { e.stopPropagation(); deleteLetter(letter.firestoreId || letter.id); }} className="absolute top-4 right-4 bg-white/90 p-2 rounded-full text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-md z-50">
                    <Trash2 size={16} />
                  </button>

                  {letter.layout === 'image-background' && letter.img && (
                    <div className="absolute inset-0 z-0">
                      <img src={letter.img} alt="Background" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"></div>
                      <div className="absolute inset-3 border border-white/30 rounded-sm pointer-events-none"></div>
                    </div>
                  )}

                  <div className="relative z-10 flex flex-col flex-1 h-full text-center mt-2">
                    <div className="mb-4">
                      <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${letter.layout === 'image-background' ? 'text-rose-200' : 'text-rose-400'}`}>{letter.date}</p>
                      <h3 className={`text-2xl font-serif font-bold mb-2 truncate ${letter.layout === 'image-background' ? 'text-white' : 'text-[#8B1235]'}`}>{letter.title}</h3>
                      <div className={`w-10 h-px mx-auto ${letter.layout === 'image-background' ? 'bg-white/40' : 'bg-rose-200'}`}></div>
                    </div>
                    
                    {letter.img && letter.layout !== 'image-background' && (
                       <img src={letter.img} className="w-full h-28 object-cover rounded-md mb-4 shadow-sm border border-gray-200" alt="Letter Attachment" />
                    )}

                    <div className={`flex-1 whitespace-pre-wrap text-sm leading-relaxed overflow-hidden ${letter.font} ${letter.layout === 'image-background' ? 'text-gray-100' : 'text-gray-600'}`}>
                      {letter.content.substring(0, 110)}...
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* FULL SCREEN READING MODAL FOR LETTERS */}
      <AnimatePresence>
        {selectedLetter && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-sm overflow-y-auto" 
            onClick={() => setSelectedLetter(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30, rotateX: 15 }} 
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: -20 }} 
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className={`p-8 md:p-14 w-full max-w-2xl rounded-sm shadow-2xl relative my-auto ${
                selectedLetter.layout === 'image-background' 
                  ? 'border border-gray-500 text-white overflow-hidden' 
                  : 'bg-[#FDFBF7] border-[12px] border-white outline outline-1 outline-rose-100 text-gray-800'
              }`} 
              onClick={e => e.stopPropagation()}
            >
              {selectedLetter.layout !== 'image-background' && (
                <div className="absolute inset-3 border-[1.5px] border-rose-200/60 rounded-sm pointer-events-none z-10"></div>
              )}

              <button onClick={() => setSelectedLetter(null)} className="absolute top-4 right-4 bg-white/90 text-gray-800 p-2.5 rounded-full shadow-md hover:bg-gray-100 z-50 transition-transform hover:scale-110"><X size={20}/></button>
              
              {selectedLetter.layout === 'image-background' && selectedLetter.img && (
                <div className="absolute inset-0 z-0">
                  <img src={selectedLetter.img} alt="Background" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px]"></div>
                  <div className="absolute inset-4 border border-white/20 rounded-sm pointer-events-none"></div>
                </div>
              )}

              <div className="relative z-10">
                {!isEditing ? (
                  <div className="flex flex-col text-center">
                    <button onClick={() => setIsEditing(true)} className="absolute -top-2 left-0 bg-white/50 backdrop-blur-md text-gray-800 px-4 py-1.5 rounded-full font-bold text-xs hover:bg-white transition shadow-sm border border-white/50">Edit</button>
                    
                    <p className={`font-bold tracking-widest uppercase text-xs mb-3 ${selectedLetter.layout === 'image-background' ? 'text-rose-200' : 'text-[#8B1235]'}`}>
                      {selectedLetter.date} <span className="mx-1">•</span> {selectedLetter.time}
                    </p>
                    
                    <h2 className={`text-4xl md:text-5xl font-serif font-bold mb-4 leading-tight ${selectedLetter.layout === 'image-background' ? 'text-white' : 'text-gray-900'}`}>
                      {selectedLetter.title}
                    </h2>
                    
                    <div className={`text-xl mb-8 opacity-70 tracking-widest ${selectedLetter.layout === 'image-background' ? 'text-white' : 'text-rose-400'}`}>~ ♡ ~</div>
                    
                    {selectedLetter.layout === 'image-top' && selectedLetter.img && (
                      <img src={selectedLetter.img} className="w-full object-cover rounded-md mb-8 shadow-md border-4 border-white" alt="Letter Attachment" />
                    )}

                    <div className={`whitespace-pre-wrap text-lg md:text-xl leading-loose text-left ${selectedLetter.font} ${selectedLetter.layout === 'image-background' ? 'text-gray-100' : 'text-gray-700'}`}>
                      {selectedLetter.content}
                    </div>

                    {selectedLetter.layout === 'image-bottom' && selectedLetter.img && (
                      <img src={selectedLetter.img} className="w-full object-cover rounded-md mt-10 shadow-md border-4 border-white" alt="Letter Attachment" />
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 bg-white/95 backdrop-blur-md p-6 md:p-8 rounded-xl shadow-xl text-gray-800 relative z-20">
                    <h3 className="text-2xl font-serif font-bold text-[#8B1235] border-b border-rose-100 pb-3">Edit Letter</h3>
                    <input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full p-4 rounded-xl border border-gray-200 font-bold text-xl outline-none focus:border-[#8B1235] bg-gray-50/50" />
                    <textarea rows="12" value={editForm.content} onChange={e => setEditForm({...editForm, content: e.target.value})} className="w-full p-4 rounded-xl border border-gray-200 font-serif text-lg outline-none focus:border-[#8B1235] leading-relaxed bg-gray-50/50" />
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                      <button onClick={() => setIsEditing(false)} className="px-6 py-2.5 font-bold text-gray-500 hover:bg-gray-100 rounded-full transition">Cancel</button>
                      <button onClick={handleSaveEdit} className="px-6 py-2.5 font-bold bg-[#8B1235] text-white rounded-full shadow-md hover:bg-[#6A0D28] transition">Save Changes</button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CreateLetter = ({ onAddLetter, showAlert }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ title: '', content: '', font: 'font-serif', img: '', layout: 'image-top', unlockDate: '' });
  const [isSaving, setIsSaving] = useState(false);
  
  const [rawImage, setRawImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const symbols = ['♡', '✨', '🌙', '🌸', '🦋', '💌', '♾️', '💍', '🥺', '❤️'];
  const handleAddSymbol = (sym) => setFormData({ ...formData, content: formData.content + sym });

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRawImage(URL.createObjectURL(file)); 
    }
  };

  const removeImage = () => setFormData({ ...formData, img: '' });

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const confirmCrop = async () => {
    try {
      setIsSaving(true);
      const image = new Image();
      image.src = rawImage;
      await new Promise(res => image.onload = res);

      const canvas = document.createElement('canvas');
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      const ctx = canvas.getContext('2d');

      ctx.drawImage(image, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, croppedAreaPixels.width, croppedAreaPixels.height);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });
        const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1080, useWebWorker: true };
        const compressedFile = await imageCompression(file, options);
        const base64String = await fileToBase64(compressedFile);

        setFormData({ ...formData, img: base64String });
        setRawImage(null); 
        setIsSaving(false);
      }, 'image/jpeg', 0.95);
      
    } catch (error) {
      setIsSaving(false);
      if (showAlert) showAlert("Crop Error", "Failed to crop image.");
    }
  };

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
          <input type="text" required onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-[var(--color-primary)] bg-white/50" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Letter Font</label>
            <select onChange={e => setFormData({...formData, font: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-[var(--color-primary)] bg-white/50 cursor-pointer">
              <option value="font-serif">Elegant Serif (Classic)</option>
              <option value="font-sans">Clean Sans (Modern)</option>
              <option value="font-mono">Typewriter (Vintage)</option>
              <option value="italic font-serif">Handwritten Style</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Image Layout</label>
            <select onChange={e => setFormData({...formData, layout: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-[var(--color-primary)] bg-white/50 cursor-pointer">
              <option value="image-top">Image at the Top</option>
              <option value="image-bottom">Image at the Bottom</option>
              <option value="image-background">Full Background Image</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Time Capsule Lock</label>
            <input type="datetime-local" onChange={e => setFormData({...formData, unlockDate: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-[var(--color-primary)] bg-white/50" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Attach Picture or Handwritten Letter</label>
          {!formData.img ? (
            <label className="flex flex-col items-center justify-center w-full h-32 md:h-40 border-2 border-dashed border-gray-300 rounded-xl bg-white/50 hover:bg-white/80 cursor-pointer transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500"><span className="font-semibold text-[var(--color-primary)]">Tap to upload</span></p>
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          ) : (
            <div className="relative w-full h-48 md:h-64 rounded-xl overflow-hidden shadow-sm border-4 border-white group">
              <img src={formData.img} alt="Preview" className="w-full h-full object-cover" />
              <button type="button" onClick={removeImage} className="absolute top-3 right-3 bg-white/90 text-red-500 p-2.5 rounded-full hover:bg-red-50 shadow-md transition-all"><Trash2 size={18} /></button>
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
          <textarea required rows="8" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className={`w-full p-4 rounded-xl border border-gray-200 outline-none focus:border-[var(--color-primary)] bg-white/50 resize-none ${formData.font}`} />
        </div>
        <button type="submit" disabled={isSaving} className="w-full bg-[var(--color-primary)] text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 hover:bg-[var(--color-primary-hover)] shadow-md transition-colors">
          {isSaving ? "Sealing envelope... 💌" : "Seal & Save Letter 💌"}
        </button>
      </form>

      {/* --- CROP MODAL --- */}
      <AnimatePresence>
        {rawImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4">
            <h3 className="text-white text-xl font-bold mb-2 font-serif text-center">Frame Your Photo ✂️</h3>
            <p className="text-gray-400 text-xs mb-6 text-center">
              {formData.layout === 'image-background' ? "Portrait mode selected for full backgrounds." : "Landscape mode selected for classic photos."}
            </p>
            
            <div className="relative w-full max-w-2xl h-[55vh] bg-black rounded-xl overflow-hidden shadow-2xl border border-white/20">
              <Cropper
                image={rawImage}
                crop={crop}
                zoom={zoom}
                aspect={formData.layout === 'image-background' ? 9 / 16 : 4 / 3}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            
            <div className="mt-6 w-full max-w-md flex items-center gap-4 bg-white/10 p-3 rounded-full backdrop-blur-md">
               <span className="text-white text-sm pl-2"><ImageIcon size={16}/></span>
               <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(e.target.value)} className="w-full accent-rose-400" />
               <span className="text-white text-sm pr-2"><ImageIcon size={24}/></span>
            </div>
            
            <div className="mt-8 flex gap-4">
              <button type="button" onClick={() => setRawImage(null)} className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-full font-bold transition-colors shadow-lg">Cancel</button>
              <button type="button" onClick={confirmCrop} disabled={isSaving} className="px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-full font-bold transition-colors shadow-lg flex items-center gap-2 border border-rose-400/30">
                {isSaving ? "Cropping..." : <><Check size={18} /> Apply Crop</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
      
      toggleGoal(completingGoalId, true, base64);
      setCompletingGoalId(null);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000); 
    } catch (err) {
      alert("Failed to upload photo proof.");
    }
  };

  const handleToggle = (id, isCompleted) => {
    if (!isCompleted) {
      setCompletingGoalId(id);
    } else {
      toggleGoal(id, false);
    }
  };

  const filteredList = filter === "All" ? bucketList : bucketList.filter(g => g.category === filter);

  return (
    <div className="max-w-4xl mx-auto pb-10">
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} />}
      
      <AnimatePresence>
        {completingGoalId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl">
              <div className="w-16 h-16 bg-gray-100 text-[var(--color-primary)] rounded-full flex items-center justify-center mx-auto mb-4"><ImageIcon size={32} /></div>
              <h3 className="text-2xl font-bold font-serif text-gray-800 mb-2">Goal Completed! 🎉</h3>
              <p className="text-gray-500 mb-6">Attach a photo of this moment to immortalize it as a polaroid.</p>
              
              <label className="block w-full bg-[var(--color-primary)] text-white py-3 rounded-xl font-bold cursor-pointer hover:bg-[var(--color-primary-hover)] transition shadow-md mb-3">
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
      
      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 custom-scrollbar">
        <button onClick={() => setFilter("All")} className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-colors ${filter === "All" ? "bg-gray-800 text-white" : "bg-white text-gray-500 hover:bg-gray-100"}`}>All</button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)} className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-colors shadow-sm ${filter === cat ? "bg-[var(--color-primary)] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>{cat}</button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mb-8 bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-white shadow-sm flex flex-col gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button type="button" key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition ${selectedCategory === cat ? "bg-gray-100 text-[var(--color-primary)] border border-gray-200" : "bg-gray-50 text-gray-500"}`}>{cat}</button>
          ))}
        </div>
        <div className="flex gap-3">
          <input type="text" value={newGoal} onChange={(e) => setNewGoal(e.target.value)} placeholder="What's our next adventure?" className="flex-1 p-4 rounded-2xl border border-gray-200 outline-none focus:border-[var(--color-primary)] shadow-inner bg-white" />
          <button type="submit" className="bg-[var(--color-primary)] text-white px-6 py-4 rounded-2xl font-bold hover:bg-[var(--color-primary-hover)] transition shadow-md"><Plus size={24} /></button>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {filteredList.map(goal => (
            <motion.div key={goal.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className={`relative overflow-hidden rounded-3xl border shadow-sm transition-all ${goal.completed ? 'bg-[var(--color-bg)] border-white' : 'bg-white/80 border-gray-100 hover:shadow-md'}`}>
              
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
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)] block mb-0.5">{goal.category}</span>
                    <span className={`text-lg font-serif font-bold transition-all block leading-tight ${goal.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>{goal.title}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button onClick={() => deleteGoal(goal.id)} className="text-gray-300 hover:text-red-500 bg-white p-2 rounded-full shadow-sm"><Trash2 size={16} /></button>
                  {goal.authorEmail && (
                    <div className="w-6 h-6 rounded-full bg-blue-50 text-[var(--color-primary)] flex items-center justify-center text-[10px] font-bold uppercase border border-blue-100" title={`Added by ${goal.authorEmail}`}>
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
const JarVisual = ({ name, setName, jarPromises, onDraw }) => (
  <div className="flex flex-col items-center justify-center p-6 md:p-8 relative w-full group">
    <input 
      type="text" 
      value={name} 
      onChange={(e) => setName(e.target.value)} 
      className="text-xl md:text-2xl font-serif font-bold text-[var(--color-primary)] bg-transparent text-center outline-none border-b-2 border-transparent focus:border-gray-200 mb-6 w-full transition-colors z-10"
      placeholder="Name this jar..."
    />
    
    <div onClick={() => onDraw(jarPromises)} className={`w-48 h-64 rounded-b-[3rem] rounded-t-2xl relative cursor-pointer hover:scale-105 transition-transform flex flex-col justify-end overflow-hidden pb-4 border-[3px] border-white/50 bg-white/10 backdrop-blur-md shadow-[inset_0_0_20px_rgba(255,255,255,0.6),_0_15px_30px_rgba(0,0,0,0.1)]`}>
      <div className="absolute top-0 w-full h-5 bg-gray-300 border-b-4 border-gray-400 opacity-80 z-20 shadow-sm"></div>
      <div className="absolute top-0 left-[30%] w-3 h-full bg-gradient-to-b from-white/60 to-transparent rounded-full transform -skew-x-12 z-20 pointer-events-none"></div>

      <div className="flex justify-center w-full h-[90%] px-4 relative z-10 overflow-hidden">
        <AnimatePresence>
          {jarPromises.map((p, i) => {
            const seed = p.id ? p.id.toString().charCodeAt(0) + i : i;
            const pseudoRandomX = Math.sin(seed) * 50; 
            const pseudoRandomY = -(i * 4) - Math.abs(Math.cos(seed) * 15); 
            const pseudoRandomRot = Math.sin(seed * 2) * 60; 
            const colors = ['bg-gray-100', 'bg-white', 'bg-[var(--color-bg-alt)]'];
            const noteColor = colors[seed % colors.length];

            return (
              <motion.div 
                key={p.id || i}
                initial={{ y: -250, opacity: 0, x: 0, rotate: 0 }}
                animate={{ 
                  y: pseudoRandomY, 
                  opacity: 0.95, 
                  x: [0, pseudoRandomX * -0.6, pseudoRandomX * 1.4, pseudoRandomX * 0.3, pseudoRandomX],
                  rotate: [0, 45, -35, 20, pseudoRandomRot]
                }}
                transition={{ duration: 3.2, ease: "easeInOut" }}
                className={`w-10 h-10 ${noteColor} shadow-md border border-black/5 absolute bottom-2 flex items-center justify-center rounded-sm`}
                style={{ zIndex: i }}
              >
                <div className="w-6 h-6 border border-gray-200/50 rounded-sm opacity-50"></div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
    
    <p className="mt-8 text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer group-hover:text-[var(--color-primary)] transition-colors bg-white/50 px-4 py-2 rounded-full shadow-sm" onClick={() => onDraw(jarPromises)}>
      Tap jar to open 
    </p>
  </div>
);

const PromiseJar = ({ promises, addPromise, deletePromise, showAlert }) => {
  const [newPromise, setNewPromise] = useState('');
  const [targetJar, setTargetJar] = useState('jar1'); 
  const [drawnPromise, setDrawnPromise] = useState(null);
  const [drawnIds, setDrawnIds] = useState([]);

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
    } catch (err) { console.log("Audio blocked."); }
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
    const availablePromises = jarPromises.filter(p => !drawnIds.includes(p.id));

    if (jarPromises.length === 0) {
      return showAlert ? showAlert("Empty Jar", "This jar is empty! Add a sweet note first.") : alert("Empty Jar");
    }

    if (availablePromises.length === 0) {
      setDrawnIds([]); 
      return showAlert ? showAlert("Jar Empty!", "You've read all the notes! The jar has been shaken up and refilled.") : alert("Refilled!");
    }

    const randomIdx = Math.floor(Math.random() * availablePromises.length);
    const selected = availablePromises[randomIdx];
    
    setDrawnPromise(selected);
    setDrawnIds(prev => [...prev, selected.id]); 
  };

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <h1 className="text-3xl md:text-4xl font-serif font-bold mb-8 text-gray-800 text-center md:text-left">The Promise Jars 🫙</h1>
      
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <JarVisual name={jar1Name} setName={setJar1Name} jarPromises={jar1Promises} onDraw={drawRandomPromise} />
        <JarVisual name={jar2Name} setName={setJar2Name} jarPromises={jar2Promises} onDraw={drawRandomPromise} />
      </div>
      
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-white/60 backdrop-blur-md p-6 md:p-8 rounded-[2rem] shadow-sm border border-white">
          <h3 className="text-xl font-serif font-bold text-gray-800 mb-6">Fold a New Note ✍️</h3>
          <div className="flex bg-white p-1 rounded-xl shadow-inner border border-gray-100 mb-4 w-max">
            <button type="button" onClick={() => setTargetJar('jar1')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${targetJar === 'jar1' ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-gray-500 hover:text-gray-800'}`}>For {jar1Name}</button>
            <button type="button" onClick={() => setTargetJar('jar2')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${targetJar === 'jar2' ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-gray-500 hover:text-gray-800'}`}>For {jar2Name}</button>
          </div>
          <textarea value={newPromise} onChange={(e) => setNewPromise(e.target.value)} placeholder="Write a tiny promise, compliment, or memory here..." className="w-full p-4 rounded-xl border border-gray-200 outline-none focus:border-[var(--color-primary)] bg-white/50 resize-none font-serif text-lg" rows="3" />
          <button type="submit" className="w-full mt-4 bg-[var(--color-primary)] text-white py-4 rounded-xl font-bold hover:bg-[var(--color-primary-hover)] transition-all hover:shadow-lg shadow-sm flex items-center justify-center gap-2">Drop Note into Jar <ChevronDown size={18} /></button>
        </form>
        
        {promises.length > 0 && (
          <div className="mt-8 pt-8 border-t border-gray-200 space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Manage All Notes</p>
            {promises.map((p) => (
              <div key={p.id} className="flex justify-between items-center bg-white/80 p-4 rounded-xl shadow-sm border border-white">
                <div>
                  <p className="text-sm font-bold text-[var(--color-primary)] uppercase text-[10px] mb-1">In {p.target === 'jar2' ? jar2Name : jar1Name}</p>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setDrawnPromise(null)}>
            <motion.div initial={{ scale: 0.5, y: 100, rotate: -10 }} animate={{ scale: 1, y: 0, rotate: 0 }} exit={{ scale: 0.8, opacity: 0, y: 20 }} transition={{ type: "spring", bounce: 0.4 }} className="bg-[var(--color-bg)] p-10 max-w-md w-full rounded-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-16 h-5 bg-yellow-200/60 rotate-2 shadow-sm"></div>
              <button onClick={() => setDrawnPromise(null)} className="absolute top-2 right-3 text-gray-400 hover:text-[var(--color-primary)]"><X size={20}/></button>
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
  
  const [isEditMode, setIsEditMode] = useState(false); // Default to locked
  const [zoom, setZoom] = useState(1);
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

  // Pinch to Zoom Logic
  useEffect(() => {
    const viewport = document.getElementById("board-viewport");
    if (!viewport) return;

    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) { 
        e.preventDefault();
        setZoom(z => Math.max(0.3, Math.min(3, z - e.deltaY * 0.01)));
      }
    };
    
    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', handleWheel);
  }, []);

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
          <p className="text-gray-500 mt-1 text-sm md:text-base">
            {isEditMode ? "Edit Mode ON: Drag to move, double tap to resize." : "Locked Mode: Scroll, pan, and pinch freely."}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
            <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="p-1 hover:bg-gray-100 rounded">-</button>
            <span className="text-xs font-bold w-8 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1 hover:bg-gray-100 rounded">+</button>
            <div className="w-px h-4 bg-gray-200 mx-1"></div>
            <button 
              onClick={() => { setIsEditMode(!isEditMode); setEditingId(null); }} 
              className={`flex items-center gap-1 px-3 py-1 text-sm font-bold rounded-lg transition-colors ${isEditMode ? 'bg-rose-100 text-rose-600' : 'bg-green-100 text-green-600'}`}
            >
              {isEditMode ? <Lock size={14} className="opacity-50" /> : <Lock size={14} />} 
              {isEditMode ? "Lock Board" : "Unlock to Edit"}
            </button>
          </div>

          <div className={`flex flex-wrap items-center gap-3 bg-white/80 backdrop-blur-xl p-3 rounded-2xl shadow-sm border border-white transition-opacity ${!isEditMode && 'opacity-50 pointer-events-none'}`}>
            <form onSubmit={handleAddText} className="flex flex-wrap items-center gap-2 border-r border-gray-200 pr-3">
              <input type="text" value={newText} onChange={e => setNewText(e.target.value)} placeholder="Type note..." className="px-3 py-2 rounded-xl text-sm border outline-none focus:border-[var(--color-primary)] w-28 md:w-36 bg-white/50" />
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
            <label className="bg-gray-100 text-[var(--color-primary)] px-4 py-2 rounded-xl hover:bg-gray-200 transition cursor-pointer flex items-center gap-2 font-bold text-sm shadow-sm">
              <ImageIcon size={18} /> Pic
              <input type="file" accept="image/*" className="hidden" onChange={handleAddImage} />
            </label>
            <button onClick={() => setShowDrawPad(true)} className="bg-purple-100 text-[var(--color-primary)] px-4 py-2 rounded-xl hover:bg-purple-200 transition flex items-center gap-2 font-bold text-sm shadow-sm">
              <PenTool size={18} /> Ink
            </button>
          </div>
        </div>
      </div>

      <div id="board-viewport" className="flex-1 bg-white/40 backdrop-blur-sm rounded-3xl border border-white relative overflow-auto shadow-inner custom-scrollbar" onClick={() => setEditingId(null)}>
        <div className="w-[4000px] h-[4000px] relative transition-transform origin-top-left" style={{ transform: `scale(${zoom})`, backgroundImage: 'radial-gradient(#d1d5db 2px, transparent 2px)', backgroundSize: '40px 40px' }}>
          {boardItems.map(item => {
            const isEditing = editingId === item.id && isEditMode;
            return (
              <motion.div
                key={item.id} drag={isEditMode && !isEditing} dragMomentum={false}
                onDragEnd={(e, info) => updateBoardItem(item.id, { x: item.x + info.offset.x / zoom, y: item.y + info.offset.y / zoom })}
                initial={{ x: item.x, y: item.y }}
                onDoubleClick={(e) => { e.stopPropagation(); if(isEditMode) setEditingId(item.id); }}
                className={`absolute group transition-shadow ${isEditing ? 'z-50 shadow-2xl scale-105' : 'shadow-sm hover:shadow-lg z-10'} ${isEditMode ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-auto'}`}
                style={{ touchAction: "none" }}
              >
                {isEditMode && (
                  <button onPointerDown={(e) => e.stopPropagation()} onClick={() => deleteBoardItem(item.id)} className={`absolute -top-4 -right-4 bg-white text-red-500 p-2 rounded-full shadow-lg transition-opacity ${isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} z-20`}><Trash2 size={16}/></button>
                )}
                {isEditing && (
                  <div className="absolute -inset-3 border-2 border-blue-500 border-dashed rounded-xl pointer-events-none z-30 flex items-end justify-center pb-2">
                    <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Drag bottom right to resize</span>
                  </div>
                )}
                
                {item.type === 'text' && (
                  <div className={`${item.color || 'bg-yellow-200'} p-5 shadow-inner border border-black/5 transform rotate-1 overflow-hidden relative`} style={{ fontFamily: item.font || "'Comic Sans MS', cursive", width: item.w || 200, height: item.h || 200, resize: isEditing ? 'both' : 'none' }} onPointerUp={(e) => isEditing && updateBoardItem(item.id, { w: e.target.offsetWidth, h: e.target.offsetHeight })}>
                    <p className="text-gray-800 text-lg md:text-xl leading-relaxed whitespace-pre-wrap">{item.content}</p>
                  </div>
                )}

                {item.type === 'image' && (
                  <div className="bg-white p-2 pb-10 shadow-sm transform -rotate-1 relative">
                    <div style={{ width: item.w || 250, height: item.h || 250, resize: isEditing ? 'both' : 'none', overflow: 'hidden' }} onPointerUp={(e) => isEditing && updateBoardItem(item.id, { w: e.target.offsetWidth, h: e.target.offsetHeight })}>
                      <img src={item.content} className="w-full h-full object-cover pointer-events-none rounded-sm border border-gray-100" />
                    </div>
                  </div>
                )}

                {item.type === 'drawing' && (
                  <div className="relative" style={{ width: item.w || 300, height: item.h || 300, resize: isEditing ? 'both' : 'none', overflow: 'hidden' }} onPointerUp={(e) => isEditing && updateBoardItem(item.id, { w: e.target.offsetWidth, h: e.target.offsetHeight })}>
                    <img src={item.content} className="w-full h-full object-contain pointer-events-none drop-shadow-sm" />
                  </div>
                )}
              </motion.div>
            );
          })}
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
                <button onClick={saveDrawing} className="bg-[var(--color-primary)] text-white px-6 py-3 rounded-full font-bold hover:bg-[var(--color-primary-hover)] shadow-md flex items-center gap-2 transition-all hover:scale-105">Stick to Board <Check size={18}/></button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
// FULL ADVANCED SETTINGS PAGE 
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
        <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-sm border border-white/40">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-green-100 text-green-600 rounded-xl"><Lock size={20} /></div>
            <h2 className="text-xl font-semibold text-gray-800">Your Shared Universe</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">Send this code to your partner. When they create an account, they can select "Join Universe" and paste this code to sync your memories securely.</p>
          
          <div className="flex items-center bg-gray-50 border border-gray-200 p-4 rounded-xl gap-4">
            <code className="text-xl font-bold tracking-widest text-[var(--color-primary)] flex-1 text-center">{activeUniverse}</code>
            <button onClick={copyUniverseCode} className="bg-[var(--color-primary)] text-white p-3 rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"><Copy size={20} /></button>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-sm border border-white/40">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl"><Mail size={20} /></div>
            <h2 className="text-xl font-semibold text-gray-800">Email Notifications</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">Get pinged instantly on your phone when a new memory or letter is added.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Your Email</label>
              <input type="email" value={email1} onChange={(e) => setEmail1(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-[var(--color-primary)] bg-white/50" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Partner's Email</label>
              <input type="email" value={email2} onChange={(e) => setEmail2(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-[var(--color-primary)] bg-white/50" placeholder="partner@example.com" />
            </div>
            <button onClick={handleSaveEmails} className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors w-full md:w-auto flex items-center justify-center gap-2 shadow-sm">
              <Check size={18} /> Save Notification Emails
            </button>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-sm border border-white/40">
           <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-gray-100 text-[var(--color-primary)] rounded-xl"><PenTool size={20} /></div>
            <h2 className="text-xl font-semibold text-gray-800">Whispers of the Universe</h2>
          </div>
          <form onSubmit={handleAddQuote} className="mb-6">
            <label className="block text-sm md:text-base text-gray-600 mb-2 font-medium">Add a lovely sentence to rotate on the dashboard</label>
            <textarea value={newQuote} onChange={(e) => setNewQuote(e.target.value)} placeholder="e.g. You are my today and all of my tomorrows..." className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gray-200 bg-white/50 resize-none font-serif text-lg" rows="3" />
            <button type="submit" disabled={isSavingQuote || !newQuote.trim()} className="mt-4 bg-[var(--color-primary)] text-white px-6 py-3 rounded-xl w-full font-medium hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {isSavingQuote ? "Adding to the stars..." : <><Sparkles size={18}/> Add to Dashboard</>}
            </button>
          </form>

          {quotes && quotes.length > 0 && (
            <div className="mt-6 border-t border-gray-100 pt-6">
              <h3 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">Active Quotes</h3>
              <div className="space-y-3">
                <AnimatePresence>
                  {quotes.map(q => (
                    <motion.div key={q.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="flex justify-between items-center bg-white/80 p-3 rounded-xl border border-gray-100 shadow-sm">
                      <p className="font-serif italic text-gray-700 truncate pr-4 text-sm md:text-base">"{q.text}"</p>
                      <button onClick={() => deleteQuote(q.id)} className="text-gray-400 hover:text-red-500 p-2 transition-colors shrink-0 bg-white rounded-lg shadow-sm border border-gray-100"><Trash2 size={16}/></button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-sm border border-white/40">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-purple-100 text-purple-600 rounded-xl"><Palette size={20} /></div>
            <h2 className="text-xl font-semibold text-gray-800">Aesthetic Theme</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button onClick={() => setTheme('light')} className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-3 ${theme === 'light' ? 'border-rose-400 bg-rose-50 shadow-md scale-[1.02]' : 'border-transparent bg-white hover:bg-gray-50 shadow-sm'}`}>
              <div className="flex gap-2"><div className="w-6 h-6 rounded-full bg-[#FCF8F9] border border-gray-200 shadow-sm"></div><div className="w-6 h-6 rounded-full bg-[#8B1235] shadow-sm"></div></div>
              <div><p className="font-semibold text-gray-800">Light Romantic</p><p className="text-[10px] text-gray-500 mt-0.5">Soft whites and deep maroon.</p></div>
            </button>
            <button onClick={() => setTheme('lavender')} className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-3 ${theme === 'lavender' ? 'border-purple-400 bg-purple-50 shadow-md scale-[1.02]' : 'border-transparent bg-white hover:bg-gray-50 shadow-sm'}`}>
              <div className="flex gap-2"><div className="w-6 h-6 rounded-full bg-[#F5F3FF] border border-gray-200 shadow-sm"></div><div className="w-6 h-6 rounded-full bg-[#7E57C2] shadow-sm"></div></div>
              <div><p className="font-semibold text-gray-800">Lavender Dream</p><p className="text-[10px] text-gray-500 mt-0.5">Soft lavenders and deep violet.</p></div>
            </button>
            <button onClick={() => setTheme('beach')} className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-3 ${theme === 'beach' ? 'border-cyan-400 bg-cyan-50 shadow-md scale-[1.02]' : 'border-transparent bg-white hover:bg-gray-50 shadow-sm'}`}>
              <div className="flex gap-2"><div className="w-6 h-6 rounded-full bg-[#F4F9F9] border border-cyan-200 shadow-sm"></div><div className="w-6 h-6 rounded-full bg-[#0C4A6E] shadow-sm"></div></div>
              <div><p className="font-semibold text-gray-800">Heavenly Beach</p><p className="text-[10px] text-gray-500 mt-0.5">Soft ocean blues and warm shores.</p></div>
            </button>
            <button onClick={() => setTheme('sunset')} className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-3 ${theme === 'sunset' ? 'border-orange-400 bg-orange-50 shadow-md scale-[1.02]' : 'border-transparent bg-white hover:bg-gray-50 shadow-sm'}`}>
              <div className="flex gap-2"><div className="w-6 h-6 rounded-full bg-[#FFF2EB] border border-gray-200 shadow-sm"></div><div className="w-6 h-6 rounded-full bg-[#ea580c] shadow-sm"></div></div>
              <div><p className="font-semibold text-gray-800">Sunset Glow</p><p className="text-[10px] text-gray-500 mt-0.5">Warm peaches and vibrant orange.</p></div>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

// ==========================================
// MAIN APP ROUTER & FIREBASE LOGIC
// ==========================================
function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('appTheme') || 'light');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeUniverse, setActiveUniverse] = useState(null);
  
  const [memories, setMemories] = useState([]);
  const [letters, setLetters] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [bucketList, setBucketList] = useState([]);
  const [promises, setPromises] = useState([]);
  const [boardItems, setBoardItems] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null, type: null, title: '', message: '' });
  const [alertState, setAlertState] = useState({ isOpen: false, title: '', message: '' });

  const showAlert = (title, message) => setAlertState({ isOpen: true, title, message });

  useEffect(() => {
    localStorage.setItem('appTheme', theme);
    document.body.setAttribute('data-theme', theme);
    document.body.style.backgroundColor = 'var(--color-bg)';
  }, [theme]);

  useEffect(() => {
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
      } catch (err) { console.error("Error fetching data: ", err); } finally { setLoading(false); }
    };
    fetchData();
  }, [isAuthenticated, activeUniverse]);

  const addMemory = async (newMemoryData) => {
    try {
      const imageUrls = [];
      
      // 1. Upload Images to Storage
      if (newMemoryData.imgFiles && newMemoryData.imgFiles.length > 0) {
        // Run all uploads in parallel for maximum speed
        const uploadPromises = newMemoryData.imgFiles.map(file => 
          uploadFileToStorage(file, 'memories')
        );
        const resolvedUrls = await Promise.all(uploadPromises);
        imageUrls.push(...resolvedUrls.filter(url => url !== null));
      }

      // 2. Upload Voice Note to Storage
      let voiceUrl = '';
      if (newMemoryData.voiceBlob) {
        voiceUrl = await uploadFileToStorage(newMemoryData.voiceBlob, 'voice_notes');
      }

      // 3. Save the lightweight URLs to Firestore
      const finalMemory = {
        title: newMemoryData.title,
        date: newMemoryData.date || '',
        location: newMemoryData.location || '',
        lat: newMemoryData.lat || null, 
        lng: newMemoryData.lng || null, 
        description: newMemoryData.description || '',
        images: imageUrls, // No more Base64! Just clean URLs.
        voiceNote: voiceUrl,
        id: Date.now(),
        universeId: activeUniverse 
      };

      const docRef = await addDoc(collection(db, "memories"), finalMemory);
      setMemories(prev => [{ ...finalMemory, firestoreId: docRef.id }, ...prev]);
      
      return true;
    } catch (err) { 
      console.error("Upload Error:", err);
      // If you have your showAlert function, you can call it here
      return false; 
    }
  };

  const triggerDeleteMemory = (id) => setConfirmModal({ isOpen: true, id, type: 'memory', title: 'Delete Memory?', message: 'Are you sure you want to permanently delete this memory from your universe? This cannot be undone.' });
  const triggerDeleteLetter = (id) => setConfirmModal({ isOpen: true, id, type: 'letter', title: 'Delete Letter?', message: 'Are you sure you want to permanently delete this letter?' });
  const triggerDeleteGalleryPhoto = (id) => setConfirmModal({ isOpen: true, id, type: 'gallery', title: 'Remove Photo?', message: 'Are you sure you want to remove this beautiful photo from the gallery?' });
  const triggerDeleteQuote = (id) => setConfirmModal({ isOpen: true, id, type: 'quote', title: 'Delete Quote?', message: 'Are you sure you want to delete this quote from your universe?' });
  const triggerDeleteGoal = (id) => setConfirmModal({ isOpen: true, id, type: 'goal', title: 'Delete Goal?', message: 'Are you sure you want to remove this goal from your bucket list?' });
  const triggerDeletePromise = (id) => setConfirmModal({ isOpen: true, id, type: 'promise', title: 'Delete Note?', message: 'Are you sure you want to permanently remove this sweet note?' });

  const editMemory = async (id, updatedFields) => {
    try { await updateDoc(doc(db, "memories", id), updatedFields); setMemories(prev => prev.map(m => m.firestoreId === id ? { ...m, ...updatedFields } : m)); } catch (err) { console.error(err); }
  };

  const editLetter = async (id, updatedFields) => {
    try { await updateDoc(doc(db, "letters", id), updatedFields); setLetters(prev => prev.map(l => l.firestoreId === id ? { ...l, ...updatedFields } : l)); } catch (err) { console.error(err); }
  };

  const handleConfirmAction = async () => {
    const { type, id } = confirmModal;
    if (!id) return;
    try {
      if (type === 'memory') { await deleteDoc(doc(db, "memories", id)); setMemories(prev => prev.filter(m => m.firestoreId !== id)); } 
      else if (type === 'letter') { await deleteDoc(doc(db, "letters", id)); setLetters(prev => prev.filter(l => l.firestoreId !== id)); } 
      else if (type === 'gallery') { await deleteDoc(doc(db, "gallery", id)); setGalleryPhotos(prev => prev.filter(p => p.id !== id)); } 
      else if (type === 'quote') { await deleteDoc(doc(db, "quotes", id)); setQuotes(prev => prev.filter(q => q.id !== id)); } 
      else if (type === 'goal') { await deleteDoc(doc(db, "bucketlist", id)); setBucketList(prev => prev.filter(g => g.id !== id)); } 
      else if (type === 'promise') { await deleteDoc(doc(db, "promises", id)); setPromises(prev => prev.filter(p => p.id !== id)); }
      setConfirmModal({ isOpen: false, id: null, type: null, title: '', message: '' }); 
    } catch (err) { console.error("Error deleting item: ", err); }
  };

  const addLetter = async (newLetterData) => {
    try {
      const finalLetter = { ...newLetterData, createdAt: new Date().toISOString(), universeId: activeUniverse }; 
      const docRef = await addDoc(collection(db, "letters"), finalLetter);
      setLetters(prev => [{ firestoreId: docRef.id, ...finalLetter }, ...prev]);
      sendInstantNotification("Love Letter", finalLetter.title);
      return true;
    } catch (err) { showAlert("Image Too Large", "Attached image is too large! Try a smaller picture."); return false; }
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

  if (!isAuthenticated) return (
    <>
      <GlobalThemeStyles />
      <AuthGateway onUnlock={handleUnlock} />
    </>
  );

  if (loading) return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
      <GlobalThemeStyles />
      <div className="animate-pulse text-[var(--color-primary)] text-xl font-serif">Syncing Universe {activeUniverse}... ✨</div>
    </div>
  );

  return (
    <BrowserRouter>
      <GlobalThemeStyles />
      <div className="min-h-screen bg-[var(--color-bg)] text-gray-900 transition-colors duration-500 pb-20">
        
        <DashboardLayout theme={theme}>
          <Routes>
            <Route path="/" element={<Home memories={memories} quotes={quotes} deleteMemory={triggerDeleteMemory} theme={theme} />} />
            <Route path="/timeline" element={<Timeline memories={memories} />} />
            <Route path="/places" element={<LovelyMap memories={memories} theme={theme} />} />
            <Route path="/create-memory" element={<CreateMemory onAddMemory={addMemory} showAlert={showAlert} />} />
            <Route path="/gallery" element={<PolaroidGallery galleryPhotos={galleryPhotos} memories={memories} onAddPhotos={addGalleryPhotos} deleteGalleryPhoto={triggerDeleteGalleryPhoto} />} />
            <Route path="/letters" element={<Letters letters={letters} deleteLetter={triggerDeleteLetter} editLetter={editLetter} />} />
            <Route path="/create-letter" element={<CreateLetter onAddLetter={addLetter} showAlert={showAlert} />} />
            <Route path="/memories" element={<Memories memories={memories} deleteMemory={triggerDeleteMemory} editMemory={editMemory} />} />
            <Route path="/bucket-list" element={<BucketList bucketList={bucketList} addGoal={addGoal} toggleGoal={toggleGoal} deleteGoal={triggerDeleteGoal} currentUser={currentUser} />} />
            <Route path="/promise-jar" element={<PromiseJar promises={promises} addPromise={addPromise} deletePromise={triggerDeletePromise} showAlert={showAlert} />} />
            <Route path="/mood-board" element={<MoodBoard boardItems={boardItems} addBoardItem={addBoardItem} updateBoardItem={updateBoardItem} deleteBoardItem={deleteBoardItem} />} /> 
            <Route path="/settings" element={<SettingsPage theme={theme} setTheme={setTheme} activeUniverse={activeUniverse} quotes={quotes} deleteQuote={triggerDeleteQuote} showAlert={showAlert} />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
          </Routes>
        </DashboardLayout>

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
      </div>
    </BrowserRouter>
  );
}

export default App;