import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Image as ImageIcon, Video, Mail, Music, Calendar, Clock, Shield, Palette, Download, Trash2, Lock, ArrowRight, Check, Sparkles, MapPin, Plus, PenTool, Mic, StopCircle, Play, Pause, Volume2, Type, StickyNote, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import DashboardLayout from './components/layout/DashboardLayout';
import emailjs from '@emailjs/browser'; 
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

// --- FIREBASE IMPORTS ---
import { db, storage } from './firebase'; 
import { collection, addDoc, getDocs, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
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

// The Custom Pulsing Heart Marker for the new LovelyMap
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
// 1. BULLETPROOF AUDIO PLAYER
// ==========================================
const AudioPlayer = ({ src }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playableUrl, setPlayableUrl] = useState('');

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
      audioRef.current.play().catch(error => {
        console.error("Audio playback failed:", error);
        alert("Your browser blocked the audio. Try making sure your phone isn't on silent mode!");
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
// 4. MEMORY CREATION (With Multiple Images)
// ==========================================
const CreateMemory = ({ onAddMemory }) => {
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
    } catch (err) { alert("Microphone access denied. Please check your browser permissions."); }
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

  const handleMultiUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setIsUploading(true);

    const batchHeading = files.length > 1 
      ? prompt(`Uploading ${files.length} photos. Give them a shared caption (or leave blank):`) 
      : prompt("Give this memory a short caption:");

    for (const file of files) {
      try {
        const options = { maxSizeMB: 0.3, maxWidthOrHeight: 800, useWebWorker: true };
        const compressedFile = await imageCompression(file, options);
        const base64String = await fileToBase64(compressedFile);
        
        await onAddPhotos({ 
          imgUrl: base64String, 
          heading: batchHeading || "A beautiful moment", 
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error("Upload failed for a photo:", error);
      }
    }
    setIsUploading(false);
  };

  return (
    <div className="max-w-6xl mx-auto pb-10">
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
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleMultiUpload} disabled={isUploading} />
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
// 6. ALL MEMORIES PAGE (With Interactive Layout Toggle)
// ==========================================
const Memories = ({ memories, deleteMemory }) => {
  const [layout, setLayout] = useState('grid'); // 'grid' or 'story'

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-800">All Memories 💭</h1>
        <div className="flex bg-white/60 backdrop-blur-md p-1 rounded-xl shadow-sm border border-white">
          <button onClick={() => setLayout('grid')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${layout === 'grid' ? 'bg-[#8B1235] text-white shadow-md' : 'text-gray-500 hover:text-gray-800'}`}>Grid View</button>
          <button onClick={() => setLayout('story')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${layout === 'story' ? 'bg-[#8B1235] text-white shadow-md' : 'text-gray-500 hover:text-gray-800'}`}>Story View</button>
        </div>
      </div>
      
      {memories.length === 0 ? (
        <p className="text-gray-500 text-center py-10 bg-white/50 backdrop-blur-sm rounded-3xl border border-white">No memories yet. Add your first one!</p>
      ) : (
        <motion.div layout className={layout === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-12 max-w-2xl mx-auto"}>
          <AnimatePresence>
            {memories.map((m, idx) => (
              <motion.div 
                key={m.firestoreId || m.id} layout
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
                className={`bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white relative group flex flex-col ${layout === 'grid' ? 'p-6 hover:scale-[1.02] transition-transform' : 'p-8 md:p-10'}`}
              >
                <button onClick={() => deleteMemory(m.firestoreId || m.id)} className="absolute top-4 right-4 bg-white/90 p-2 rounded-full text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-md z-20">
                  <Trash2 size={16} />
                </button>
                
                {m.images && m.images.length > 0 ? (
                  <div className={`grid gap-2 mb-6 ${m.images.length === 1 ? 'grid-cols-1' : m.images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'}`}>
                    {m.images.map((imgBase64, i) => (
                      <img key={i} src={imgBase64} alt={`Memory ${i}`} className={`w-full object-cover rounded-2xl shadow-sm ${m.images.length === 1 ? 'h-64 md:h-80' : 'h-40 md:h-48'}`} />
                    ))}
                  </div>
                ) : m.img ? (
                  <div className="grid gap-2 mb-6 grid-cols-1">
                     <img src={m.img} alt="Memory" className="w-full object-cover rounded-2xl shadow-sm h-64 md:h-80" />
                  </div>
                ) : null}
                
                <h3 className={`${layout === 'story' ? 'text-3xl' : 'text-2xl'} font-bold text-gray-800 font-serif mb-1`}>{m.title}</h3>
                <p className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-3">{m.date}</p>
                {m.location && <p className="text-sm text-gray-500 mb-4 flex items-center gap-1 font-medium"><MapPin size={14} className="text-blue-400" /> {m.location}</p>}
                {m.description && <p className={`text-gray-600 leading-relaxed flex-1 ${layout === 'story' ? 'text-lg' : 'text-sm mb-4'}`}>{m.description}</p>}
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
// 7. TIMELINE & LOVELY MAP PLACES
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

const CreateLetter = ({ onAddLetter }) => {
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
      } catch (error) { alert("Failed to process image. Try a slightly smaller picture."); }
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
const BucketList = ({ bucketList, addGoal, toggleGoal, deleteGoal }) => {
  const [newGoal, setNewGoal] = useState("");
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newGoal.trim()) return;
    addGoal({ title: newGoal, completed: false });
    setNewGoal("");
  };

  const handleToggle = (id, isCompleted) => {
    toggleGoal(id, !isCompleted);
    if (!isCompleted) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000); 
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} />}
      <h1 className="text-3xl md:text-4xl font-serif font-bold mb-8 text-gray-800">Our Bucket List ✈️</h1>
      
      <form onSubmit={handleSubmit} className="mb-8 flex gap-3">
        <input type="text" value={newGoal} onChange={(e) => setNewGoal(e.target.value)} placeholder="e.g. Visit Japan, Bake a cake..." className="flex-1 p-4 rounded-2xl border border-gray-200 outline-none focus:border-[#8B1235] shadow-sm bg-white/80" />
        <button type="submit" className="bg-[#8B1235] text-white px-6 py-4 rounded-2xl font-bold hover:bg-[#6A0D28] transition shadow-sm"><Plus size={24} /></button>
      </form>

      <div className="space-y-4">
        <AnimatePresence>
          {bucketList.map(goal => (
            <motion.div key={goal.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className={`flex items-center justify-between p-5 rounded-2xl border shadow-sm transition-all ${goal.completed ? 'bg-green-50 border-green-100 opacity-70' : 'bg-white/80 border-gray-100 hover:shadow-md'}`}>
              <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => handleToggle(goal.id, goal.completed)}>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${goal.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                  {goal.completed && <Check size={14} className="text-white" />}
                </div>
                <span className={`text-lg font-medium transition-all ${goal.completed ? 'line-through text-green-700' : 'text-gray-800'}`}>{goal.title}</span>
              </div>
              <button onClick={() => deleteGoal(goal.id)} className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={18} /></button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ==========================================
// 12. THE PROMISE JAR 🫙
// ==========================================
const PromiseJar = ({ promises, addPromise, deletePromise }) => {
  const [newPromise, setNewPromise] = useState('');
  const [drawnPromise, setDrawnPromise] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newPromise.trim()) return;
    addPromise({ text: newPromise });
    setNewPromise('');
  };

  const drawRandomPromise = () => {
    if (promises.length === 0) return alert("The jar is empty! Add a sweet note first.");
    const randomIdx = Math.floor(Math.random() * promises.length);
    setDrawnPromise(promises[randomIdx]);
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <h1 className="text-3xl md:text-4xl font-serif font-bold mb-8 text-gray-800">The Promise Jar 🫙</h1>
      <p className="text-gray-500 mb-10">Leave a tiny promise, a compliment, or a sweet note. Draw one out when you need a smile.</p>

      <div className="grid md:grid-cols-2 gap-10">
        <div className="flex flex-col items-center justify-center bg-white/40 p-10 rounded-3xl border border-white/50 shadow-sm relative">
          {/* Jar Visual */}
          <div 
            onClick={drawRandomPromise}
            className="w-48 h-64 border-4 border-gray-300 bg-blue-50/30 rounded-b-3xl rounded-t-xl relative cursor-pointer hover:scale-105 transition-transform shadow-inner flex items-center justify-center overflow-hidden"
          >
            <div className="absolute top-0 w-full h-8 bg-gray-300 border-b-4 border-gray-400 opacity-80"></div>
            {promises.length > 0 ? (
              <div className="flex flex-wrap justify-center p-4 gap-2 absolute bottom-4">
                {promises.slice(0, 15).map((_, i) => (
                  <div key={i} className="w-8 h-8 bg-pink-200 rotate-12 shadow-sm opacity-80" style={{ transform: `rotate(${Math.random() * 40 - 20}deg)` }}></div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 font-medium z-10">Empty</p>
            )}
          </div>
          <p className="mt-6 text-sm font-bold text-gray-500 uppercase tracking-widest cursor-pointer hover:text-pink-500 transition-colors" onClick={drawRandomPromise}>
            Tap to draw a note
          </p>
        </div>

        <div>
          <form onSubmit={handleSubmit} className="bg-white/60 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Add to the Jar</h3>
            <textarea 
              value={newPromise}
              onChange={(e) => setNewPromise(e.target.value)}
              placeholder="e.g. I promise to always bring you coffee... or just 'You look beautiful today.'"
              className="w-full p-4 rounded-xl border border-gray-200 outline-none focus:border-[#8B1235] bg-white/50 resize-none font-serif"
              rows="4"
            />
            <button type="submit" className="w-full mt-4 bg-[#8B1235] text-white py-3 rounded-xl font-bold hover:bg-[#6A0D28] transition-colors shadow-sm">Fold & Drop in Jar</button>
          </form>

          {/* List to manage them */}
          {promises.length > 0 && (
            <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
              {promises.map((p) => (
                <div key={p.id} className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-600 truncate flex-1 font-serif italic">"{p.text}"</p>
                  <button onClick={() => deletePromise(p.id)} className="text-gray-400 hover:text-red-500 ml-2"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {drawnPromise && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setDrawnPromise(null)}>
            <motion.div initial={{ scale: 0.8, y: 50, rotate: -5 }} animate={{ scale: 1, y: 0, rotate: 0 }} exit={{ scale: 0.8, opacity: 0, y: 20 }} className="bg-[#FCF8F9] p-10 max-w-md w-full rounded-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-12 h-4 bg-yellow-200/50 rotate-2 shadow-sm"></div>
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
  
  const handleAddText = (e) => {
    e.preventDefault();
    if(!newText.trim()) return;
    addBoardItem({ type: 'text', content: newText, x: 50, y: 50 });
    setNewText('');
  };

  const handleAddImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const options = { maxSizeMB: 0.3, maxWidthOrHeight: 600, useWebWorker: true };
      const compressed = await imageCompression(file, options);
      const base64 = await fileToBase64(compressed);
      addBoardItem({ type: 'image', content: base64, x: 80, y: 80 });
    } catch (err) { alert("Image upload failed."); }
  };

  return (
    <div className="max-w-6xl mx-auto pb-10 flex flex-col h-[calc(100vh-100px)]">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-800">Mood Board 📌</h1>
          <p className="text-gray-500 mt-1 text-sm md:text-base">Drag items around. We save exactly where you leave them.</p>
        </div>
        
        <div className="flex gap-3 bg-white/60 backdrop-blur-md p-2 rounded-2xl shadow-sm border border-white">
          <form onSubmit={handleAddText} className="flex gap-2">
            <input type="text" value={newText} onChange={e => setNewText(e.target.value)} placeholder="Type a sticky note..." className="px-4 py-2 rounded-xl text-sm border outline-none focus:border-rose-300 w-32 md:w-48" />
            <button type="submit" className="bg-yellow-100 text-yellow-700 p-2 rounded-xl hover:bg-yellow-200 transition"><StickyNote size={18}/></button>
          </form>
          <label className="bg-rose-100 text-rose-700 p-2 rounded-xl hover:bg-rose-200 transition cursor-pointer flex items-center justify-center">
            <ImageIcon size={18} />
            <input type="file" accept="image/*" className="hidden" onChange={handleAddImage} />
          </label>
        </div>
      </div>

      <div className="flex-1 bg-white/30 rounded-3xl border-2 border-dashed border-gray-300 relative overflow-hidden shadow-inner">
        {boardItems.map(item => (
          <motion.div
            key={item.id}
            drag
            dragMomentum={false}
            onDragEnd={(e, info) => {
              // Update position locally/firebase on drop
              updateBoardItem(item.id, { x: item.x + info.offset.x, y: item.y + info.offset.y });
            }}
            initial={{ x: item.x, y: item.y }}
            className="absolute cursor-grab active:cursor-grabbing group shadow-md hover:shadow-xl transition-shadow"
            style={{ touchAction: "none" }}
          >
            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => deleteBoardItem(item.id)} className="absolute -top-3 -right-3 bg-white text-red-500 p-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"><Trash2 size={14}/></button>
            
            {item.type === 'text' && (
              <div className="bg-yellow-200 p-4 w-40 min-h-[100px] shadow-sm font-serif text-gray-800 text-sm leading-relaxed transform rotate-1">
                {item.content}
              </div>
            )}

            {item.type === 'image' && (
              <div className="bg-white p-2 pb-8 w-48 shadow-sm transform -rotate-2">
                <img src={item.content} className="w-full h-auto object-cover border border-gray-100 pointer-events-none" />
              </div>
            )}
          </motion.div>
        ))}
        {boardItems.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-medium">Board is empty. Add a note or polaroid!</div>}
      </div>
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
const SettingsPage = ({ theme, setTheme, secretWord, setSecretWord, isPasswordRequired, setIsPasswordRequired, quotes, deleteQuote }) => {
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState(secretWord);
  
  const [newQuote, setNewQuote] = useState("");
  const [isSavingQuote, setIsSavingQuote] = useState(false);

  const [email1, setEmail1] = useState(() => localStorage.getItem('notifyEmail1') || '');
  const [email2, setEmail2] = useState(() => localStorage.getItem('notifyEmail2') || '');

  const saveNewPassword = () => {
    if (newPasswordInput.trim().length > 0) {
      setSecretWord(newPasswordInput.trim());
      setIsEditingPassword(false);
    }
  };

  const handleAddQuote = async (e) => {
    e.preventDefault();
    if (!newQuote.trim()) return;
    setIsSavingQuote(true);
    try {
      await addDoc(collection(db, "quotes"), { text: newQuote, timestamp: new Date() });
      setNewQuote("");
      alert("Quote added to the universe! ✨ (Refresh to see it below)");
    } catch (error) {
      alert("Failed to add quote.");
    }
    setIsSavingQuote(false);
  };

  const handleSaveEmails = () => {
    localStorage.setItem('notifyEmail1', email1);
    localStorage.setItem('notifyEmail2', email2);
    alert("Notification emails saved! You will now get pinged when memories are added. 💌");
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
              <input
                type="email"
                value={email1}
                onChange={(e) => setEmail1(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-blue-400 bg-white/50"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Partner's Email</label>
              <input
                type="email"
                value={email2}
                onChange={(e) => setEmail2(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-blue-400 bg-white/50"
                placeholder="partner@example.com"
              />
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
            <textarea 
              value={newQuote}
              onChange={(e) => setNewQuote(e.target.value)}
              placeholder="e.g. You are my today and all of my tomorrows..." 
              className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-200 bg-white/50 resize-none font-serif text-lg"
              rows="3"
            />
            <button type="submit" disabled={isSavingQuote || !newQuote.trim()} className="mt-4 bg-[#8B1235] text-white px-6 py-3 rounded-xl w-full font-medium hover:bg-[#6A0D28] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {isSavingQuote ? "Adding to the stars..." : <><Sparkles size={18}/> Add to Dashboard</>}
            </button>
          </form>

          {/* Active Quotes List to Delete */}
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
                    <input type="text" value={newPasswordInput} onChange={(e) => setNewPasswordInput(e.target.value)} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#8B1235] bg-white/50" />
                    <button onClick={saveNewPassword} className="px-4 py-2 bg-[#8B1235] text-white rounded-xl flex items-center gap-2 text-sm font-medium hover:bg-[#6A0D28]"><Check size={16} /> Save</button>
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
  const [quotes, setQuotes] = useState([]);
  const [galleryPhotos, setGalleryPhotos] = useState([]);
  
  const [bucketList, setBucketList] = useState([]);
  const [promises, setPromises] = useState([]);
  const [boardItems, setBoardItems] = useState([]);
  
  const [loading, setLoading] = useState(true);

  // --- 1. FETCH FROM FIREBASE ON LOAD ---
  useEffect(() => {
    if (isPasswordRequired && !isAuthenticated) return;

    const fetchData = async () => {
      try {
        const memoriesQuery = query(collection(db, 'memories'), orderBy('id', 'desc'));
        const memorySnapshot = await getDocs(memoriesQuery);
        setMemories(memorySnapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() })));

        const lettersQuery = query(collection(db, 'letters'), orderBy('createdAt', 'desc'));
        const letterSnapshot = await getDocs(lettersQuery);
        setLetters(letterSnapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() })));
        
        const qQuotes = query(collection(db, "quotes"), orderBy("timestamp", "desc"));
        const quotesSnapshot = await getDocs(qQuotes);
        setQuotes(quotesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const qGallery = query(collection(db, "gallery"), orderBy("timestamp", "desc"));
        const gallerySnapshot = await getDocs(qGallery);
        setGalleryPhotos(gallerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const qBucket = query(collection(db, "bucketlist"));
        const bucketSnap = await getDocs(qBucket);
        setBucketList(bucketSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const qPromises = query(collection(db, "promises"));
        const promiseSnap = await getDocs(qPromises);
        setPromises(promiseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const qBoard = query(collection(db, "moodboard"));
        const boardSnap = await getDocs(qBoard);
        setBoardItems(boardSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      } catch (err) {
        console.error("Error fetching data: ", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [isAuthenticated, isPasswordRequired]);

  // --- 2. DATABASE ACTIONS ---
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
        id: Date.now() 
      };

      const docRef = await addDoc(collection(db, "memories"), finalMemory);
      setMemories(prev => [{ ...finalMemory, firestoreId: docRef.id }, ...prev]);
      sendInstantNotification("Memory", finalMemory.title);
      return true;
    } catch (err) {
      alert(`Memory upload failed! Reason: ${err.message}`);
      return false;
    }
  };

  const deleteMemory = async (firestoreId) => {
    if (!firestoreId || !window.confirm("Are you sure you want to delete this memory?")) return;
    try {
      await deleteDoc(doc(db, "memories", firestoreId));
      setMemories(prev => prev.filter(m => m.firestoreId !== firestoreId));
    } catch (err) { console.error("Error deleting memory: ", err); }
  };

  const addLetter = async (newLetterData) => {
    try {
      const finalLetter = { ...newLetterData, createdAt: new Date().toISOString() };
      const docRef = await addDoc(collection(db, "letters"), finalLetter);
      setLetters(prev => [{ firestoreId: docRef.id, ...finalLetter }, ...prev]);
      sendInstantNotification("Love Letter", finalLetter.title);
      return true;
    } catch (err) {
      alert("Attached image is too large! Try a smaller picture.");
      return false;
    }
  };

  const deleteLetter = async (firestoreId) => {
    if (!firestoreId || !window.confirm("Are you sure you want to delete this letter?")) return;
    try {
      await deleteDoc(doc(db, "letters", firestoreId));
      setLetters(prev => prev.filter(l => l.firestoreId !== firestoreId));
    } catch (err) { console.error("Error deleting letter: ", err); }
  };

  const addGalleryPhotos = async (newPhoto) => {
    const docRef = await addDoc(collection(db, "gallery"), newPhoto);
    setGalleryPhotos(prev => [{ id: docRef.id, ...newPhoto }, ...prev]);
  };

  const deleteGalleryPhoto = async (id) => {
    if (!id || !window.confirm("Are you sure you want to remove this from the gallery?")) return;
    try {
      await deleteDoc(doc(db, "gallery", id));
      setGalleryPhotos(prev => prev.filter(p => p.id !== id));
    } catch (err) { console.error("Error deleting photo: ", err); }
  };

  const deleteQuote = async (id) => {
    if (!id || !window.confirm("Are you sure you want to delete this quote?")) return;
    try {
      await deleteDoc(doc(db, "quotes", id));
      setQuotes(prev => prev.filter(q => q.id !== id));
    } catch (err) { console.error("Error deleting quote: ", err); }
  };

  const addGoal = async (goal) => {
    try {
      const docRef = await addDoc(collection(db, "bucketlist"), goal);
      setBucketList(prev => [...prev, { id: docRef.id, ...goal }]);
    } catch (err) { console.error(err); }
  };
  const toggleGoal = async (id, completed) => {
    try {
      await updateDoc(doc(db, "bucketlist", id), { completed });
      setBucketList(prev => prev.map(g => g.id === id ? { ...g, completed } : g));
    } catch (err) { console.error(err); }
  };
  const deleteGoal = async (id) => {
    try {
      await deleteDoc(doc(db, "bucketlist", id));
      setBucketList(prev => prev.filter(g => g.id !== id));
    } catch (err) { console.error(err); }
  };

  // --- PROMISE JAR ACTIONS ---
  const addPromise = async (promise) => {
    try {
      const docRef = await addDoc(collection(db, "promises"), promise);
      setPromises(prev => [...prev, { id: docRef.id, ...promise }]);
    } catch (err) { console.error(err); }
  };
  const deletePromise = async (id) => {
    try {
      await deleteDoc(doc(db, "promises", id));
      setPromises(prev => prev.filter(p => p.id !== id));
    } catch (err) { console.error(err); }
  };

  // --- MOOD BOARD ACTIONS ---
  const addBoardItem = async (item) => {
    try {
      const docRef = await addDoc(collection(db, "moodboard"), item);
      setBoardItems(prev => [...prev, { id: docRef.id, ...item }]);
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

  useEffect(() => {
    localStorage.setItem('passwordRequired', isPasswordRequired);
    localStorage.setItem('secretWord', secretWord);
  }, [isPasswordRequired, secretWord]);

  const handleUnlock = () => {
    setIsAuthenticated(true);
    sessionStorage.setItem('unlocked', 'true'); 
  };

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
          <Route path="/" element={<Home memories={memories} quotes={quotes} deleteMemory={deleteMemory} />} />
          <Route path="/timeline" element={<Timeline memories={memories} />} />
          <Route path="/places" element={<LovelyMap memories={memories} />} />
          <Route path="/create-memory" element={<CreateMemory onAddMemory={addMemory} />} />
          
          <Route path="/gallery" element={<PolaroidGallery galleryPhotos={galleryPhotos} memories={memories} onAddPhotos={addGalleryPhotos} deleteGalleryPhoto={deleteGalleryPhoto} />} />
          
          <Route path="/letters" element={<Letters letters={letters} deleteLetter={deleteLetter} />} />
          <Route path="/create-letter" element={<CreateLetter onAddLetter={addLetter} />} />
          <Route path="/memories" element={<Memories memories={memories} deleteMemory={deleteMemory} />} />
          
          <Route path="/bucket-list" element={<BucketList bucketList={bucketList} addGoal={addGoal} toggleGoal={toggleGoal} deleteGoal={deleteGoal} />} />
          
          <Route path="/promise-jar" element={<PromiseJar promises={promises} addPromise={addPromise} deletePromise={deletePromise} />} />
          <Route path="/mood-board" element={<MoodBoard boardItems={boardItems} addBoardItem={addBoardItem} updateBoardItem={updateBoardItem} deleteBoardItem={deleteBoardItem} />} /> 

          <Route path="/settings" element={
            <SettingsPage 
              theme={theme} setTheme={setTheme}
              secretWord={secretWord} setSecretWord={setSecretWord}
              isPasswordRequired={isPasswordRequired} setIsPasswordRequired={setIsPasswordRequired}
              quotes={quotes} deleteQuote={deleteQuote}
            />
          } />
        </Routes>
      </DashboardLayout>
    </BrowserRouter>
  );
}

export default App;