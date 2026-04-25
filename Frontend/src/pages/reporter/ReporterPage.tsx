import React from 'react';
import { 
  Typography, 
  Stack, 
  IconButton,
  alpha,
  Grid,
  Slider,
  TextField
} from '@mui/material';
import { 
  Camera, 
  Mic, 
  MapPin, 
  Utensils, 
  HeartPulse, 
  Tent, 
  Droplets, 
  GraduationCap, 
  Search,
  CheckCircle2,
  ChevronLeft,
  Send,
  Zap,
  Info,
  ShieldAlert,
  Target,
  Signal,
  Home
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { parseIncidentReport } from '../../services/geminiService';
import { calculateUrgencyScore } from '../../services/scoringService';

const needTypes = [
  { id: 'food', label: 'Ration / Bhojan', icon: <Utensils /> },
  { id: 'medical', label: 'Dawayi / Medical', icon: <HeartPulse /> },
  { id: 'shelter', label: 'Ashray (Shelter)', icon: <Tent /> },
  { id: 'water', label: 'Peene Ka Paani', icon: <Droplets /> },
  { id: 'rescue', label: 'Rescue (Bachav)', icon: <Search /> },
  { id: 'education', label: 'Padhayi / Shiksha', icon: <GraduationCap /> },
];

export default function ReporterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = React.useState(false);
  const [selectedType, setSelectedType] = React.useState('medical');
  const [severity, setSeverity] = React.useState(3);
  const [details, setDetails] = React.useState('');
  const [affectedCount, setAffectedCount] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleBack = () => {
    navigate('/');
  };

  const handleSubmit = async () => {
    if (!details.trim() && !selectedType) return;

    setLoading(true);
    try {
      const aiData = await parseIncidentReport(details || selectedType);
      
      const initialScore = calculateUrgencyScore({
        severity: aiData.severity || severity,
        unresolvedHours: 0,
        zoneDensity: 1.5,
        repeatBonus: 0,
        weatherBonus: 0.5
      });

      await addDoc(collection(db, 'reports'), {
        text: details,
        type: selectedType,
        location: 'Sector 4, Jaipur',
        reporterId: user?.uid || 'anonymous',
        reporterName: user?.displayName || 'Guest Reporter',
        needType: aiData.needType,
        severity: aiData.severity || severity,
        urgencyScore: initialScore,
        status: 'PENDING',
        isLifeThreatening: aiData.isLifeThreatening,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        meta: {
          affectedCount: aiData.affectedCount || parseInt(affectedCount) || 0,
          aiParsed: true
        }
      });

      setSubmitted(true);
    } catch (error) {
      console.error("Signal broadcast failed", error);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full glass-panel p-10 rounded-[2.5rem] border-secondary-container/20 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-secondary-container"></div>
          <div className="w-20 h-20 rounded-full bg-secondary-container flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(255,255,255,0.2)]">
            <CheckCircle2 color="black" size={40} />
          </div>
          
          <h2 className="text-4xl font-display font-black uppercase tracking-tighter mb-4 text-white">Suchna Bhej Di Gayi</h2>
          <p className="text-[11px] font-mono text-white/40 uppercase tracking-widest mb-10 leading-relaxed font-bold">
            Reference Track: #7721-RX. Aapki suchna mukhya kendra tak pahunch gayi hai. Hamari team jald hi karravayi shuru karegi.
          </p>

          <div className="space-y-4 mb-10">
            {[
              { id: 'REC', label: 'Signal Received', date: 'Abhi abhi', completed: true },
              { id: 'AI', label: 'Processing (AI)', date: 'Jaari hai', completed: false },
              { id: 'DST', label: 'Dispatch', date: 'Taiyaar', completed: false },
            ].map((step, idx) => (
              <div key={step.id} className="flex items-center gap-4 text-left">
                <div className={`w-1 h-8 rounded-full ${step.completed ? 'bg-secondary-container' : 'bg-white/5'}`}></div>
                <div>
                  <div className={`text-[10px] font-display font-bold uppercase tracking-widest ${step.completed ? 'text-secondary-container' : 'text-white/20'}`}>
                    {step.label}
                  </div>
                  <div className="text-[9px] font-mono text-white/10 uppercase tracking-tighter">{step.date}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => setSubmitted(false)}
              className="w-full py-5 rounded-2xl bg-white text-black font-display font-black uppercase text-[11px] tracking-[0.2em] hover:bg-secondary-container transition-all active:scale-95"
            >
              Report New Signal
            </button>
            <button 
              onClick={() => navigate('/')}
              className="w-full py-4 rounded-xl border border-white/10 font-display text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-2"
            >
              <Home size={14} />
              Return to Home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20 font-sans text-white">
      {/* Tactical Header */}
      <div className="sticky top-0 z-50 glass-panel border-x-0 border-t-0 p-4 rounded-none border-white/5">
        <div className="container max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <IconButton onClick={() => navigate('/')} className="!text-white/40 hover:!text-white transition-colors">
              <ChevronLeft size={24} />
            </IconButton>
            <div className="cursor-pointer" onClick={() => navigate('/')}>
              <div className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-secondary-container mb-0.5">Emergency Suchna Vyavastha</div>
              <h1 className="text-xl font-display font-black uppercase tracking-tighter">Aapda Report Protocol</h1>
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end">
            <div className="text-[9px] font-mono text-white/20 uppercase tracking-widest">Operator Identity Locked</div>
            <div className="text-[10px] font-mono text-white/40 uppercase font-black">{user?.displayName || 'GUEST-01'}</div>
          </div>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto px-6 mt-12 mb-20 space-y-16">
        {/* Step 1: Type Selection */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-secondary-container/10 border border-secondary-container/20 flex items-center justify-center text-secondary-container">
              <Zap size={16} />
            </div>
            <h3 className="font-display text-lg font-black uppercase tracking-tighter">I. Sanket Ka Prakar</h3>
          </div>
          
          <Grid container spacing={2}>
            {needTypes.map((type) => (
              <Grid item xs={6} sm={4} key={type.id}>
                <button 
                  onClick={() => setSelectedType(type.id)}
                  className={`w-full p-6 lg:p-8 rounded-3xl border transition-all duration-300 text-center group ${
                    selectedType === type.id 
                    ? 'glass-panel border-secondary-container/50 bg-secondary-container/5' 
                    : 'bg-white/5 border-white/5 hover:bg-white/[0.08] hover:border-white/10'
                  }`}
                >
                  <div className={`mb-4 mx-auto w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    selectedType === type.id ? 'bg-secondary-container text-black' : 'bg-white/5 text-white/30 group-hover:text-white/60'
                  }`}>
                    {React.isValidElement(type.icon) && React.cloneElement(type.icon as React.ReactElement<{ size: number }>, { size: 24 })}
                  </div>
                  <div className={`text-[10px] font-display font-black uppercase tracking-[0.2em] transition-colors ${
                    selectedType === type.id ? 'text-white' : 'text-white/20 group-hover:text-white/40'
                  }`}>
                    {type.label}
                  </div>
                </button>
              </Grid>
            ))}
          </Grid>
        </section>

        {/* Step 2: Evidence */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
              <Camera size={16} />
            </div>
            <h3 className="font-display text-lg font-black uppercase tracking-tighter">II. As-paas Ke Saboot</h3>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {[
              { id: 'IMG', label: 'Photo Bhejein', icon: <Camera size={24} /> },
              { id: 'AUD', label: 'Voice Record', icon: <Mic size={24} /> },
              { id: 'LOC', label: 'Location Lock', icon: <MapPin size={24} /> },
            ].map((tool) => (
              <button key={tool.id} className="aspect-square glass-panel p-4 rounded-3xl border border-white/5 hover:border-white/20 transition-all group flex flex-col items-center justify-center gap-4">
                <div className="text-white/20 group-hover:text-secondary-container transition-colors">
                  {tool.icon}
                </div>
                <div className="text-[9px] font-display font-bold uppercase tracking-widest text-white/10 group-hover:text-white/40">
                  {tool.label}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Step 3: Intensity */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                <ShieldAlert size={16} />
              </div>
              <h3 className="font-display text-lg font-black uppercase tracking-tighter">III. Khatre Ka Anuman</h3>
            </div>
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-display font-black uppercase tracking-widest border transition-colors ${
              severity >= 4 ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-secondary-container/10 border-secondary-container/20 text-secondary-container'
            }`}>
              LEVEL {severity} / 5
            </div>
          </div>
          
          <div className="glass-panel p-10 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
             <div className="flex items-center gap-3 mb-6 text-white/30">
                <Info size={14} />
                <span className="text-[10px] font-mono tracking-widest uppercase font-bold">1: Minimum Sync Required • 5: Direct Structural Threat</span>
             </div>
             <Slider 
              value={severity} 
              onChange={(_, v) => setSeverity(v as number)} 
              min={1} 
              max={5} 
              step={1}
              marks
              className="!text-secondary-container"
              sx={{
                '& .MuiSlider-thumb': {
                  width: 28,
                  height: 28,
                  backgroundColor: '#fff',
                  border: '4px solid currentColor',
                  '&:before': { display: 'none' }
                },
                '& .MuiSlider-rail': { opacity: 0.1 }
              }}
            />
          </div>
        </section>

        {/* Step 4: Intel */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
              <Target size={16} />
            </div>
            <h3 className="font-display text-lg font-black uppercase tracking-tighter">IV. Sanket Ki Jankari</h3>
          </div>
          
          <div className="space-y-6">
            <div className="relative group">
              <div className="absolute top-4 left-6 text-[10px] font-display font-black uppercase tracking-[0.2em] text-white/20 group-focus-within:text-secondary-container transition-colors">Ghatna Ka Vivran</div>
              <textarea 
                rows={5} 
                placeholder="Yahan batayein ki kya hua hai..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full glass-panel bg-white/5 border border-white/5 p-10 pt-16 rounded-[2.5rem] text-sm text-white/80 placeholder:text-white/10 focus:border-secondary-container/40 focus:outline-none transition-all resize-none font-mono tracking-tight font-bold"
              />
            </div>

            <div className="relative group">
              <div className="absolute top-4 left-6 text-[10px] font-display font-black uppercase tracking-[0.2em] text-white/20 group-focus-within:text-white/40 transition-colors">Environmental Impact Count</div>
              <input 
                type="number" 
                placeholder="Estimated population involved..."
                value={affectedCount}
                onChange={(e) => setAffectedCount(e.target.value)}
                className="w-full glass-panel bg-white/5 border border-white/5 px-10 pt-16 pb-6 rounded-[2.5rem] text-sm text-white focus:border-white/20 focus:outline-none transition-all font-mono font-bold tracking-tight"
              />
            </div>
          </div>
        </section>

        <button 
          disabled={loading}
          onClick={handleSubmit}
          className={`w-full py-6 rounded-3xl font-display text-xs font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all active:scale-[0.98] mt-12 mb-10 ${
            loading 
            ? 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed' 
            : 'bg-white text-black hover:bg-secondary-container shadow-[0_0_50px_rgba(255,255,255,0.1)]'
          }`}
        >
          {loading ? (
            <>
              <Signal className="animate-pulse" size={20} />
              Broadcasting Signal...
            </>
          ) : (
            <>
              Emergency Suchna Bhejein
              <Send size={20} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
