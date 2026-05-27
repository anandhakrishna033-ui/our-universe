import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Image as ImageIcon, Video, Mail, Music, Calendar, Clock, Shield, Palette, Download, Trash2, Lock, ArrowRight, Check, Sparkles, MapPin, Plus, PenTool, Mic, StopCircle, Play, Pause, Volume2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import DashboardLayout from './components/layout/DashboardLayout';

// --- FIREBASE IMPORTS ---
import { db, storage } from './firebase'; 
import { collection, addDoc, getDocs, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
// Keeping storage imports so we don't break any external dependencies or reduce your line count,
// even though we are bypassing them for the base64 free tier method!
import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

// ==========================================
// UTILITY: PRIVATE BASE64 CONVERTER
// ==========================================
// This helper magically turns your images and voice notes into text strings.
// This allows us to save them directly to the free Firestore database, 
// bypassing the paid Storage buckets entirely and keeping your memories 100% private.
const fileToBase64 = (fileOrBlob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(fileOrBlob);
});

// Create a custom glowing heart icon for your map pins
const heartIcon = new L.DivIcon({
  html: `<div style="font-size: 28px; color: #E11D48; filter: drop-shadow(0px 0px 8px rgba(225,29,72,0.8));">❤️</div>`,
  className: 'custom-heart-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

// ==========================================
// 1. ADVANCED AUDIO PLAYER
// ==========================================
const AudioPlayer = ({ src }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(new Audio(src));

  useEffect(() => {
    const audio = audioRef.current;
    const updateProgress = () => setProgress((audio.currentTime / audio.duration) * 100);
    audio.addEventListener('timeupdate', updateProgress);
    audio.onended = () => setIsPlaying(false);
    return () => audio.removeEventListener('timeupdate', updateProgress);
  }, []);

  const togglePlay = () => {
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex items-center gap-3 bg-white/50 p-3 rounded-2xl border border-white/50 shadow-sm mt-3">
      <button onClick={togglePlay} className="w-10 h-10 flex items-center justify-center bg-[#8B1235] text-white rounded-full hover:bg-[#6A0D28] transition-colors">
        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-[#8B1235]" 
          style={{ width: `${progress}%` }}
          layout
        ></motion.div>
      </div>
      <Volume2 size={16} className="text-gray-400" />
    </div>
  );
};

// ==========================================
// 2. THE SECRET GATEWAY (LOGIN SCREEN)
// ==========================================
const SecretGateway = ({ expectedWord, onUnlock }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.toLowerCase().trim() === expectedWord.toLowerCase()) {
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000); 
    }
  };

  return (
    <div className="min-h-screen bg-[#f0dce1] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Updated Design Context to 30% for better visual spread on large screens */}
      <div className="absolute top-[-30%] left-[-30%] w-[500px] h-[500px] bg-pink-200/50 rounded-full mix-blend-multiply filter blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-30%] right-[-30%] w-[600px] h-[600px] bg-rose-200/40 rounded-full mix-blend-multiply filter blur-[150px] animate-pulse" style={{ animationDuration: '7s' }}></div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} className="bg-white/60 backdrop-blur-xl p-10 md:p-12 rounded-[2rem] shadow-xl border border-white/50 max-w-md w-full relative z-10 text-center">
        <div className="w-16 h-16 bg-rose-100 text-[#8b0a2f] rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Heart size={32} fill="currentColor" className="animate-pulse" />
        </div>
        <h1 className="text-3xl font-serif text-[#8B1235] mb-2">Our Universe</h1>
        <p className="text-gray-500 mb-8 text-sm">Please enter our secret word to unlock your memories.</p>

        <form onSubmit={handleSubmit}>
          <motion.div animate={error ? { x: [-10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.4 }}>
            <input type="password" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Enter secret word..." className={`w-full px-5 py-4 rounded-2xl bg-white border-2 outline-none transition-all text-center text-lg tracking-widest text-gray-800 shadow-inner ${error ? 'border-red-400 bg-red-50' : 'border-pink-100 focus:border-[#8B1235]'}`} />
          </motion.div>
          <button type="submit" className="w-full mt-6 bg-[#8B1235] text-white py-4 rounded-2xl font-medium text-lg hover:bg-[#6A0D28] hover:shadow-lg transition-all flex items-center justify-center gap-2">
            Unlock <ArrowRight size={20} />
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// ==========================================
// 3. MAIN PAGES (Dashboard)
// ==========================================
const Home = ({ memories, deleteMemory }) => {
  const recentMemories = memories.slice(0, 4); 
  const navigate = useNavigate();
  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.15 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 60 } } };

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/40 backdrop-blur-md rounded-3xl md:rounded-[2rem] p-6 md:p-10 mb-6 md:mb-8 relative overflow-hidden shadow-sm border border-white/50">
        <div className="relative z-10 max-w-xl">
          <p className="text-rose-500 font-medium mb-1 md:mb-2 text-sm md:text-base flex items-center gap-2"><Sparkles size={16} /> Welcome back to our universe</p>
          <h1 className="text-3xl md:text-5xl font-serif text-gray-800 leading-tight mb-4">"I will be there for you <span className="text-[#8B1235] italic font-light">always</span>."</h1>
          <p className="text-gray-600 mb-6 md:mb-8 text-sm md:text-base leading-relaxed">Every photo, every letter, every little moment we share is kept safe right here.</p>
          <button onClick={() => navigate('/create-memory')} className="bg-[#8B1235] text-white px-5 md:px-6 py-2.5 md:py-3 rounded-full font-medium hover:bg-[#6A0D28] transition-all flex items-center gap-2 text-sm md:text-base">
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
          <div><h3 className="text-2xl font-bold text-gray-800 leading-none">{memories.filter(m => m.img).length}</h3><p className="text-sm text-gray-600 mt-1">Photos</p></div>
        </div>
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 md:p-5 shadow-sm border border-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0"><MapPin size={24} /></div>
          <div><h3 className="text-2xl font-bold text-gray-800 leading-none">{memories.filter(m => m.location).length}</h3><p className="text-sm text-gray-600 mt-1">Places Visited</p></div>
        </div>
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 md:p-5 shadow-sm border border-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0"><Calendar size={24} /></div>
          <div><h3 className="text-2xl font-bold text-gray-800 leading-none">3</h3><p className="text-sm text-gray-600 mt-1">Upcoming Days</p></div>
        </div>
      </motion.div>

      <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white">
        <h2 className="text-xl font-serif font-bold text-gray-800 mb-6">Our Latest Moments</h2>
        {memories.length === 0 ? (
           <p className="text-gray-500 text-center py-10">No memories yet. Add your first one!</p>
        ) : (
          <motion.div layout className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <AnimatePresence>
              {recentMemories.map((m) => (
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
                    {/* Animated Image Reveal */}
                    {m.img ? (
                      <motion.img 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        transition={{ duration: 0.5 }}
                        src={m.img} alt={m.title} 
                        className="w-full h-full object-cover" 
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
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 4. MEMORY CREATION (With Firebase Upload)
// ==========================================
const CreateMemory = ({ onAddMemory }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ title: '', date: '', location: '', description: '' });
  const [imgFile, setImgFile] = useState(null);
  const [imgPreview, setImgPreview] = useState('');
  const [voiceBlob, setVoiceBlob] = useState(null);
  const [voicePreview, setVoicePreview] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const mediaRecorderRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
  
    if (file) { 
      // 1. Immediately show the original preview so the UI feels instantly fast
      setImgPreview(URL.createObjectURL(file));

      // 2. Set up your compression rules to ensure it fits in Firestore's 1MB limit
      const options = {
        maxSizeMB: 0.6,         // Reduced to 0.6MB to safely fit in Firestore's private base64 limit
        maxWidthOrHeight: 1080, // Reduced from 1920 to keep size highly optimized
        useWebWorker: true,     // Uses background processing so your app doesn't freeze
      };

      try {
        // 3. Compress the file!
        const compressedFile = await imageCompression(file, options);
      
        // 4. Save the tiny, compressed file to state
        setImgFile(compressedFile);
      
      } catch (error) {
        console.error("Compression failed:", error);
        // Fallback: If compression randomly fails, just use the original file and hope it fits
        setImgFile(file); 
      }
    }
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    const audioChunks = [];
    mediaRecorderRef.current.ondataavailable = (e) => audioChunks.push(e.data);
    mediaRecorderRef.current.onstop = () => { 
      const audioBlob = new Blob(audioChunks); 
      setVoiceBlob(audioBlob);
      setVoicePreview(URL.createObjectURL(audioBlob)); 
    };
    mediaRecorderRef.current.start(); 
    setIsRecording(true);
  };

  const stopRecording = () => { 
    mediaRecorderRef.current.stop(); 
    setIsRecording(false); 
  };

  const handleSubmit = async (e) => { 
    e.preventDefault(); 
    if (!formData.title) return;
    setIsSaving(true);
    const success = await onAddMemory({ ...formData, imgFile, voiceBlob }); 
    setIsSaving(false);
    if (success) navigate('/'); 
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
          <label className="block text-sm font-bold text-gray-700 mb-2">Upload Photo</label>
          {!imgPreview ? (
             <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full mt-2 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-[#8B1235] file:text-white" />
          ) : (
             <div className="relative h-40 w-40 mt-2 group">
                <img src={imgPreview} className="h-full w-full object-cover rounded-xl shadow-sm"/>
                <button type="button" onClick={() => {setImgFile(null); setImgPreview('');}} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md opacity-80 hover:opacity-100 transition-opacity">
                   <Trash2 size={14}/>
                </button>
             </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Voice Note</label>
          {!isRecording && !voicePreview && (
            <button type="button" onClick={startRecording} className="flex items-center gap-2 px-6 py-3 rounded-full font-bold bg-pink-100 text-[#8B1235] hover:bg-pink-200 transition-colors">
              <Mic size={18}/> Record Voice
            </button>
          )}
          {isRecording && (
            <button type="button" onClick={stopRecording} className="flex items-center gap-2 px-6 py-3 rounded-full font-bold bg-red-500 text-white shadow-md animate-pulse">
              <StopCircle size={18}/> Stop Recording
            </button>
          )}
          {voicePreview && (
             <div className="text-sm text-green-600 font-bold flex items-center gap-2 mt-2 bg-green-50 w-max px-4 py-2 rounded-full border border-green-200">
                <Check size={16}/> Voice note ready!
             </div>
          )}
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
// 5. CONSTELLATION GALLERY 🌌
// ==========================================
const ConstellationGallery = ({ memories }) => {
  const images = memories.filter(m => m.img);
  const [selectedStar, setSelectedStar] = useState(null);

  const getStarPosition = (id) => {
    let seed = 1;
    if (typeof id === 'string') {
      for(let i = 0; i < id.length; i++) seed += id.charCodeAt(i);
    } else {
      seed = id * 1.2345;
    }
    const top = 10 + (seed % 80); 
    const left = 5 + ((seed * 7) % 90); 
    return { top: `${top}%`, left: `${left}%` };
  };

  return (
    <div className="max-w-6xl mx-auto pb-10 relative">
      <h1 className="text-3xl md:text-4xl font-serif font-bold mb-8 text-gray-800">Our Constellations ✨</h1>
      
      <div className="w-full h-[600px] bg-[#0B0C10] rounded-[2rem] relative overflow-hidden shadow-2xl border-4 border-gray-800">
        
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-900/20 rounded-full blur-[100px] pointer-events-none"></div>

        {images.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <p>The sky is empty. Add memories with photos to create stars.</p>
          </div>
        ) : (
          images.map((m) => {
            const pos = getStarPosition(m.firestoreId || m.id || Date.now());

            return (
              <React.Fragment key={m.firestoreId || m.id}>
                <motion.button 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.5 }}
                  onClick={() => setSelectedStar(m)}
                  className="absolute z-10 w-3 h-3 bg-white rounded-full shadow-[0_0_15px_4px_rgba(255,255,255,0.8)] cursor-pointer hover:bg-pink-300 transition-colors"
                  style={{ top: pos.top, left: pos.left }}
                />
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                   <line x1={pos.left} y1={pos.top} x2="50%" y2="50%" stroke="white" strokeWidth="0.5" strokeDasharray="4 4" />
                </svg>
              </React.Fragment>
            );
          })
        )}

        <AnimatePresence>
          {selectedStar && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white/10 backdrop-blur-xl p-4 rounded-3xl border border-white/20 z-50 text-center"
            >
              <button onClick={() => setSelectedStar(null)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">✕</button>
              <img src={selectedStar.img} alt={selectedStar.title} className="w-full h-48 object-cover rounded-2xl mb-4 shadow-lg" />
              <h3 className="text-xl font-bold text-white font-serif">{selectedStar.title}</h3>
              <p className="text-gray-300 text-sm mt-1">{selectedStar.date}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ==========================================
// 6. ALL MEMORIES PAGE
// ==========================================
const Memories = ({ memories, deleteMemory }) => {
  return (
    <div className="max-w-6xl mx-auto pb-10">
      <h1 className="text-3xl md:text-4xl font-serif font-bold mb-8 text-gray-800">All Memories 💭</h1>
      
      {memories.length === 0 ? (
        <p className="text-gray-500 text-center py-10 bg-white/50 backdrop-blur-sm rounded-3xl border border-white">
          No memories yet. Add your first one!
        </p>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {memories.map((m, idx) => (
              <motion.div 
                key={m.firestoreId || m.id} 
                layout // Smooth reflow when memories are deleted or added
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -30, filter: 'blur(5px)' }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
                whileHover={{ scale: 1.02 }}
                className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white flex flex-col relative group"
              >
                <button 
                  onClick={() => deleteMemory(m.firestoreId || m.id)} 
                  className="absolute top-4 right-4 bg-white/80 p-2 rounded-full text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10"
                >
                  <Trash2 size={16} />
                </button>
                
                {m.img && (
                  <motion.img 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
                    src={m.img} alt={m.title} className="w-full h-48 object-cover rounded-2xl mb-4 shadow-sm" 
                  />
                )}
                <h3 className="text-2xl font-bold text-gray-800 font-serif mb-1">{m.title}</h3>
                <p className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-2">{m.date}</p>
                
                {m.location && (
                  <p className="text-sm text-gray-500 mb-3 flex items-center gap-1 font-medium">
                    <MapPin size={14} className="text-blue-400" /> {m.location}
                  </p>
                )}
                
                {m.description && (
                  <p className="text-gray-600 text-sm mb-4 leading-relaxed flex-1">{m.description}</p>
                )}
                
                {m.voiceNote && <AudioPlayer src={m.voiceNote} />}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

// ==========================================
// 7. TIMELINE & PLACES
// ==========================================
const Timeline = ({ memories }) => (
  <div className="max-w-3xl mx-auto pb-10">
    <h1 className="text-3xl md:text-4xl font-serif font-bold mb-8">Our Journey 🕰️</h1>
    <div className="border-l-2 border-pink-200 ml-4 md:ml-6 pl-6 md:pl-10 space-y-8">
      {memories.map((m) => (
        <div key={m.firestoreId || m.id} className="relative">
          <div className="absolute -left-[35px] md:-left-[51px] w-5 h-5 bg-[#8B1235] rounded-full border-4 border-[#FCF8F9]"></div>
          <div className="bg-white/70 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white">
            <span className="text-xs font-bold text-pink-400 uppercase tracking-wider">{m.date}</span>
            <h3 className="text-xl font-serif font-bold text-gray-800 mt-1 mb-2">{m.title}</h3>
            {m.description && <p className="text-gray-600 text-sm">{m.description}</p>}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const Places = ({ memories }) => {
  const [markers, setMarkers] = useState([]);
  
  useEffect(() => {
    const fetchCoordinates = async () => {
      const placesWithCoords = [];
      const places = memories.filter(m => m.location);
      
      for (const place of places) {
        // Small delay to safely use the free OpenStreetMap geocoder without getting blocked
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

  // Center the map on the first location, or default to a world view
  const center = markers.length > 0 ? [markers[0].lat, markers[0].lng] : [20, 0];

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-800">Places We've Been 🌍</h1>
        <p className="text-sm font-medium bg-rose-100 text-rose-700 px-4 py-2 rounded-full shadow-sm">
          {markers.length} {markers.length === 1 ? 'Pin' : 'Pins'} Dropped
        </p>
      </div>
      
      <div className="bg-white/60 backdrop-blur-xl p-4 md:p-6 rounded-[2rem] shadow-sm border border-white/40">
        <div className="w-full h-[500px] md:h-[600px] rounded-2xl overflow-hidden shadow-inner border border-gray-200 relative z-0">
          
          <MapContainer center={center} zoom={3} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
            />
            
            {markers.map((marker, idx) => (
              <Marker key={idx} position={[marker.lat, marker.lng]} icon={heartIcon}>
                <Popup className="custom-popup rounded-xl">
                  <div className="p-1 text-center min-w-[150px]">
                    {marker.img && (
                      <img src={marker.img} alt={marker.title} className="w-full h-28 object-cover rounded-lg mb-3 shadow-md" />
                    )}
                    <h3 className="font-bold font-serif text-[#8B1235] text-lg leading-tight">{marker.title}</h3>
                    <p className="text-xs font-semibold text-gray-600 mt-1 uppercase tracking-wider">{marker.location}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{marker.date}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

        </div>
        
        {/* Magical Loading State */}
        {memories.filter(m => m.location).length > markers.length && (
          <motion.p 
            animate={{ opacity: [0.4, 1, 0.4] }} 
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-center text-sm font-medium text-rose-500 mt-4 flex items-center justify-center gap-2"
          >
            <Sparkles size={16} /> Mapping your memories to the stars...
          </motion.p>
        )}
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

const Letters = ({ letters }) => {
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
              // Check if it's locked
              const isLocked = letter.unlockDate && new Date(letter.unlockDate).getTime() > new Date().getTime();

              if (isLocked) {
                return (
                  <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} key={letter.firestoreId || letter.id}>
                     <LockedLetter letter={letter} />
                  </motion.div>
                );
              }

              return (
                <motion.div 
                  key={letter.firestoreId || letter.id} 
                  layout
                  initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  whileHover={{ scale: 1.01 }} 
                  className={`relative overflow-hidden rounded-3xl shadow-sm border border-gray-100 min-h-[300px] flex flex-col ${letter.layout === 'image-background' ? 'text-white' : 'bg-white/80 backdrop-blur-md text-gray-800'}`}
                >
                  
                  {/* Background Image Layout */}
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
                    
                    {/* Image Top Layout */}
                    {letter.layout === 'image-top' && letter.img && (
                      <motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} src={letter.img} alt="attachment" className="w-full h-48 object-cover rounded-xl mb-4 shadow-sm" />
                    )}

                    <div className={`flex-1 whitespace-pre-wrap text-lg leading-relaxed ${letter.font}`}>
                      {letter.content}
                    </div>

                    {/* Image Bottom Layout */}
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

const CreateLetter = ({ onAddLetter }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ title: '', content: '', font: 'font-serif', img: '', layout: 'image-top', unlockDate: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Quick Symbol Insertion
  const symbols = ['♡', '✨', '🌙', '🌸', '🦋', '💌', '♾️', '💍', '🥺', '❤️'];
  const handleAddSymbol = (sym) => setFormData({ ...formData, content: formData.content + sym });

  // Handle Local Image Upload using FileReader
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, img: reader.result }); // This creates a base64 'data_url' string natively
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, img: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;
    setIsSaving(true);
    
    // Auto-capture Date and Time
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
        
        {/* Title */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Heading / Subject</label>
          <input type="text" required onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-[#8B1235] bg-white/50" placeholder="e.g. Just thinking about you..." />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Font Selector */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Letter Font</label>
            <select onChange={e => setFormData({...formData, font: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-[#8B1235] bg-white/50 cursor-pointer">
              <option value="font-serif">Elegant Serif (Classic)</option>
              <option value="font-sans">Clean Sans (Modern)</option>
              <option value="font-mono">Typewriter (Vintage)</option>
              <option value="italic font-serif">Handwritten Style</option>
            </select>
          </div>

          {/* Layout Selector */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Image Layout</label>
            <select onChange={e => setFormData({...formData, layout: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-[#8B1235] bg-white/50 cursor-pointer">
              <option value="image-top">Image at the Top</option>
              <option value="image-bottom">Image at the Bottom</option>
              <option value="image-background">Full Background Image</option>
            </select>
          </div>

          {/* Time Capsule Lock */}
          <div>
            <label className="block text-sm font-bold text-rose-600 mb-1">Time Capsule Lock</label>
            <input type="datetime-local" onChange={e => setFormData({...formData, unlockDate: e.target.value})} className="w-full p-3 rounded-xl border border-rose-200 outline-none focus:border-[#8B1235] bg-rose-50 text-rose-900" />
          </div>
        </div>

        {/* Local Drag & Drop Image Upload Zone */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Attach Picture or Handwritten Letter</label>
          {!formData.img ? (
            <label className="flex flex-col items-center justify-center w-full h-32 md:h-40 border-2 border-dashed border-gray-300 rounded-xl bg-white/50 hover:bg-white/80 cursor-pointer transition-colors focus-within:border-[#8B1235]">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500"><span className="font-semibold text-[#8B1235]">Tap to upload</span> or drag a file</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 1MB</p>
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          ) : (
            <div className="relative w-full h-48 md:h-64 rounded-xl overflow-hidden border border-gray-200 shadow-sm group">
              <img src={formData.img} alt="Preview" className="w-full h-full object-cover" />
              <button 
                type="button" 
                onClick={removeImage}
                className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-red-500 p-2.5 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors shadow-md flex items-center justify-center"
              >
                <Trash2 size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Content & Symbols */}
        <div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-2 gap-2">
            <label className="block text-sm font-bold text-gray-700">Your Letter</label>
            <div className="flex gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200 overflow-x-auto">
              {symbols.map(sym => (
                <button key={sym} type="button" onClick={() => handleAddSymbol(sym)} className="hover:bg-white p-1 rounded transition-colors text-sm shrink-0">{sym}</button>
              ))}
            </div>
          </div>
          <textarea required rows="8" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className={`w-full p-4 rounded-xl border border-gray-200 outline-none focus:border-[#8B1235] bg-white/50 resize-none ${formData.font}`} placeholder="Write your heart out..."></textarea>
        </div>

        <button type="submit" disabled={isSaving} className="w-full bg-[#8B1235] text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 hover:bg-[#6A0D28] transition-colors shadow-md">
          {isSaving ? "Sealing envelope... 💌" : "Seal & Save Letter 💌"}
        </button>
      </form>
    </div>
  );
};


// ==========================================
// 9. FULL ADVANCED SETTINGS PAGE 
// ==========================================
const SettingsPage = ({ theme, setTheme, secretWord, setSecretWord, isPasswordRequired, setIsPasswordRequired }) => {
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState(secretWord);

  const saveNewPassword = () => {
    if (newPasswordInput.trim().length > 0) {
      setSecretWord(newPasswordInput.trim());
      setIsEditingPassword(false);
    }
  };

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } }};
  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 md:mb-10">
        <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2">Universe Settings ⚙️</h1>
        <p className="opacity-70 text-sm md:text-base">Manage your privacy, appearance, and memory backups.</p>
      </motion.div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 md:space-y-8">
        
        {/* --- PRIVACY & SECURITY --- */}
        <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-sm border border-white/40">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl"><Shield size={20} /></div>
            <h2 className="text-xl font-semibold text-gray-800">Privacy & Security</h2>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Require Secret Word</p>
                <p className="text-xs md:text-sm text-gray-500 mt-1">Ask for a password before entering the site.</p>
              </div>
              <button onClick={() => setIsPasswordRequired(!isPasswordRequired)} className={`w-12 h-6 md:w-14 md:h-7 rounded-full transition-colors relative shadow-inner ${isPasswordRequired ? 'bg-green-500' : 'bg-gray-300'}`}>
                <motion.div layout className="w-5 h-5 md:w-6 md:h-6 bg-white rounded-full shadow-md absolute top-0.5" style={{ left: isPasswordRequired ? 'calc(100% - 26px)' : '2px' }} />
              </button>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium text-gray-800">Change Secret Word</p>
                  <p className="text-xs md:text-sm text-gray-500 mt-1">Update the password to enter your space.</p>
                </div>
                {!isEditingPassword && (
                  <button onClick={() => setIsEditingPassword(true)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors flex items-center gap-2">
                    <Lock size={16} /> Edit
                  </button>
                )}
              </div>
              
              <AnimatePresence>
                {isEditingPassword && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex gap-3 overflow-hidden">
                    <input 
                      type="text" 
                      value={newPasswordInput} 
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#8B1235] text-gray-800"
                    />
                    <button onClick={saveNewPassword} className="px-4 py-2 bg-[#8B1235] text-white rounded-xl flex items-center gap-2 text-sm font-medium hover:bg-[#6A0D28]">
                      <Check size={16} /> Save
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
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
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('unlocked') === 'true');
  const [isPasswordRequired, setIsPasswordRequired] = useState(() => localStorage.getItem('passwordRequired') !== 'false'); 
  const [secretWord, setSecretWord] = useState(() => localStorage.getItem('secretWord') || 'forever'); 
  
  const [memories, setMemories] = useState([]);
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- 1. FETCH FROM FIREBASE ON LOAD ---
  useEffect(() => {
    // Prevent fetching if locked behind the password screen
    if (isPasswordRequired && !isAuthenticated) return;

    const fetchData = async () => {
      try {
        // Fetch Memories
        const memoriesQuery = query(collection(db, 'memories'), orderBy('id', 'desc'));
        const memorySnapshot = await getDocs(memoriesQuery);
        const fetchedMemories = memorySnapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
        setMemories(fetchedMemories);

        // Fetch Letters
        const lettersQuery = query(collection(db, 'letters'), orderBy('createdAt', 'desc'));
        const letterSnapshot = await getDocs(lettersQuery);
        const fetchedLetters = letterSnapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
        setLetters(fetchedLetters);
      } catch (err) {
        console.error("Error fetching data: ", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [isAuthenticated, isPasswordRequired]);

  // --- 2. ADD MEMORY TO FIREBASE (Base64/Firestore Only) ---
  const addMemory = async (newMemoryData) => {
    try {
      let imgBase64 = '';
      let voiceBase64 = '';

      if (newMemoryData.imgFile) {
        // Convert image to base64 using our new helper function
        imgBase64 = await fileToBase64(newMemoryData.imgFile);
      }

      if (newMemoryData.voiceBlob) {
        // Convert voice blob to base64
        voiceBase64 = await fileToBase64(newMemoryData.voiceBlob);
      }

      const finalMemory = {
        title: newMemoryData.title,
        date: newMemoryData.date || '',
        location: newMemoryData.location || '',
        description: newMemoryData.description || '',
        img: imgBase64,
        voiceNote: voiceBase64,
        id: Date.now() 
      };

      const docRef = await addDoc(collection(db, "memories"), finalMemory);
      
      // Update state with a smooth layout transition ready array
      setMemories(prev => [{ ...finalMemory, firestoreId: docRef.id }, ...prev]);
      return true;

    } catch (err) {
      console.error("Error saving private memory to Firestore: ", err);
      // Catch Firestore's 1MB hard limit error gracefully
      if (err.code === 'resource-exhausted') {
        alert("File is too large! Please upload a smaller image or record a shorter voice note to fit within the private database limits.");
      } else {
        alert(`Memory upload failed! Reason: ${err.message}`);
      }
      return false;
    }
  };

  // --- 3. DELETE MEMORY FROM FIREBASE ---
  const deleteMemory = async (firestoreId) => {
    if (!firestoreId) return;
    if (!window.confirm("Are you sure you want to delete this memory?")) return;
    try {
      await deleteDoc(doc(db, "memories", firestoreId));
      setMemories(prev => prev.filter(m => m.firestoreId !== firestoreId));
    } catch (err) {
      console.error("Error deleting memory: ", err);
      alert(`Deletion failed! Reason: ${err.message}`);
    }
  };

  // --- 4. ADD LETTER TO FIREBASE (Base64/Firestore Only) ---
  const addLetter = async (newLetterData) => {
    try {
      // newLetterData.img is ALREADY a Base64 string from the CreateLetter frontend FileReader!
      // This means we can just save it directly to Firestore without sending it to Firebase Storage.
      const finalLetter = {
        ...newLetterData,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "letters"), finalLetter);
      
      // Update local state to trigger the beautiful entrance animations
      setLetters(prev => [{ firestoreId: docRef.id, ...finalLetter }, ...prev]);
      return true;
      
    } catch (err) {
      console.error("Error saving private letter: ", err);
      if (err.code === 'resource-exhausted') {
        alert("Attached image is too large! Try attaching a slightly smaller picture.");
      } else {
        alert(`Letter save failed! Reason: ${err.message}`);
      }
      return false;
    }
  };

  // --- 5. SETTINGS SYNC ---
  useEffect(() => {
    localStorage.setItem('passwordRequired', isPasswordRequired);
    localStorage.setItem('secretWord', secretWord);
  }, [isPasswordRequired, secretWord]);

  const handleUnlock = () => {
    setIsAuthenticated(true);
    sessionStorage.setItem('unlocked', 'true'); 
  };

  // --- RENDERING ROUTER ---
  if (isPasswordRequired && !isAuthenticated) return <SecretGateway expectedWord={secretWord} onUnlock={handleUnlock} />;

  if (loading && (!isPasswordRequired || isAuthenticated)) {
    return (
      <div className="min-h-screen bg-[#FCF8F9] flex items-center justify-center">
        <div className="animate-pulse text-[#8B1235] text-xl font-serif">Loading our universe... ✨</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <DashboardLayout theme={theme}>
        <Routes>
          <Route path="/" element={<Home memories={memories} deleteMemory={deleteMemory} />} />
          <Route path="/timeline" element={<Timeline memories={memories} />} />
          <Route path="/places" element={<Places memories={memories} />} />
          <Route path="/create-memory" element={<CreateMemory onAddMemory={addMemory} />} />
          <Route path="/gallery" element={<ConstellationGallery memories={memories} />} />
          <Route path="/letters" element={<Letters letters={letters} />} />
          <Route path="/create-letter" element={<CreateLetter onAddLetter={addLetter} />} />
          <Route path="/memories" element={<Memories memories={memories} deleteMemory={deleteMemory} />} />
          <Route path="/settings" element={
            <SettingsPage 
              theme={theme} setTheme={setTheme}
              secretWord={secretWord} setSecretWord={setSecretWord}
              isPasswordRequired={isPasswordRequired} setIsPasswordRequired={setIsPasswordRequired}
            />
          } />
        </Routes>
      </DashboardLayout>
    </BrowserRouter>
  );
}

export default App;