import React from 'react';
import { Grid, Slider } from '@mui/material';
import {
  Camera, Mic, MapPin, Utensils, HeartPulse, Tent,
  Droplets, Search, GraduationCap, CheckCircle2,
  ChevronLeft, Send, Zap, Info, ShieldAlert, Target,
  Signal, Home, Cpu, Wifi, WifiOff, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { calculateUrgencyScore } from '../../services/scoringService';
import { processReportEdge, getAICapabilities, extractTextFromImage, type EdgeAIResult } from '../../services/edgeAIService';
import { parseImageReport } from '../../services/geminiService';

const needTypes = [
  { id: 'food',      label: 'Ration / Bhojan',  icon: <Utensils /> },
  { id: 'medical',   label: 'Dawayi / Medical', icon: <HeartPulse /> },
  { id: 'shelter',   label: 'Ashray (Shelter)', icon: <Tent /> },
  { id: 'water',     label: 'Peene Ka Paani',   icon: <Droplets /> },
  { id: 'rescue',    label: 'Rescue (Bachav)',  icon: <Search /> },
  { id: 'education', label: 'Padhayi / Shiksha',icon: <GraduationCap /> },
];

type AIMode = 'EDGE_CHROME_AI' | 'EDGE_WEBGPU' | 'SERVER_FALLBACK' | 'CHECKING' | 'IDLE';

function AIModeChip({ mode, inferenceMs }: { mode: AIMode; inferenceMs?: number }) {
  const config: Record<AIMode, { label: string; color: string; icon: React.ReactNode }> = {
    EDGE_CHROME_AI:   { label: 'Gemma Nano (On-Device)', color: 'text-green-400 border-green-400/30 bg-green-400/5', icon: <Cpu size={10} /> },
    EDGE_WEBGPU:      { label: 'Gemma 2B (WebGPU)',      color: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/5',   icon: <Zap size={10} /> },
    SERVER_FALLBACK:  { label: 'Gemini Flash (Server)',  color: 'text-amber-400 border-amber-400/30 bg-amber-400/5',icon: <Globe size={10} /> },
    CHECKING:         { label: 'Detecting AI Mode...',   color: 'text-white/40 border-white/10 bg-white/5',         icon: <Signal size={10} className="animate-pulse" /> },
    IDLE:             { label: 'AI Ready',               color: 'text-white/40 border-white/10 bg-white/5',         icon: <Cpu size={10} /> },
  };
  const c = config[mode];
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-mono font-bold uppercase tracking-widest ${c.color}`}>
      {c.icon}
      {c.label}
      {inferenceMs && mode !== 'IDLE' && mode !== 'CHECKING' && (
        <span className="opacity-60">• {inferenceMs}ms</span>
      )}
    </div>
  );
}

export default function ReporterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [submitted, setSubmitted] = React.useState(false);
  const [selectedType, setSelectedType] = React.useState('medical');
  const [severity, setSeverity] = React.useState(3);
  const [details, setDetails] = React.useState('');
  const [affectedCount, setAffectedCount] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  // Edge AI state
  const [aiMode, setAIMode] = React.useState<AIMode>('CHECKING');
  const [aiStatusMsg, setAIStatusMsg] = React.useState('Detecting AI capabilities...');
  const [lastInferenceMs, setLastInferenceMs] = React.useState<number | undefined>();
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);

  // Media state
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [imageLoading, setImageLoading] = React.useState(false);
  const [imageParsed, setImageParsed] = React.useState(false);
  const [location, setLocation] = React.useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Check AI capabilities on mount
  React.useEffect(() => {
    getAICapabilities().then(caps => {
      setAIMode(caps.mode as AIMode);
      if (caps.chromeAI)       setAIStatusMsg('Gemma Nano ready — offline processing enabled');
      else if (caps.webGPU)    setAIStatusMsg('WebGPU detected — Gemma 2B available');
      else                     setAIStatusMsg('Edge AI unavailable — using server inference');
    });

    const handleOnline  = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Image Upload + OCR ──────────────────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageLoading(true);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setImagePreview(base64);
      try {
        // Try edge-first OCR
        const ocrText = await extractTextFromImage(base64);
        let parsed: EdgeAIResult;
        if (ocrText !== '[IMAGE_OCR_REQUIRED]') {
          parsed = await processReportEdge(ocrText, setAIStatusMsg);
        } else {
          // Fall back to server Gemini vision
          const serverParsed = await parseImageReport(base64, file.type);
          parsed = {
            needType: serverParsed.needType,
            severity: serverParsed.severity,
            affectedCount: serverParsed.affectedCount,
            summary: serverParsed.summary,
            isLifeThreatening: serverParsed.isLifeThreatening ?? false,
            processingMode: 'SERVER_FALLBACK',
            processingMs: 0,
          };
        }
        // Auto-fill form
        setDetails(parsed.summary);
        if (parsed.needType[0]) setSelectedType(parsed.needType[0].toLowerCase());
        setSeverity(Math.min(5, Math.max(1, parsed.severity)));
        if (parsed.affectedCount) setAffectedCount(String(parsed.affectedCount));
        setAIMode(parsed.processingMode);
        setLastInferenceMs(parsed.processingMs);
        setImageParsed(true);
      } catch (err) {
        console.error('Image OCR failed', err);
      } finally {
        setImageLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Geolocation ─────────────────────────────────────────────────────────────
  const handleLocationLock = () => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
      },
      () => setLocationLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!details.trim() && !selectedType) return;
    setLoading(true);
    try {
      setAIStatusMsg('Processing report with Edge AI...');
      const parsed = await processReportEdge(details || selectedType, setAIStatusMsg);
      setAIMode(parsed.processingMode);
      setLastInferenceMs(parsed.processingMs);

      const urgencyScore = calculateUrgencyScore({
        severity: parsed.severity || severity,
        unresolvedHours: 0,
        zoneDensity: 1.5,
        repeatBonus: 0,
        weatherBonus: 0.5,
      });

      await addDoc(collection(db, 'reports'), {
        text: details,
        type: selectedType,
        location: location || { lat: 26.9124, lng: 75.7873 },
        locationDescription: location
          ? `${location.lat.toFixed(4)}°N, ${location.lng.toFixed(4)}°E`
          : 'Jaipur (Default)',
        reporterId:   user?.uid || 'anonymous',
        reporterName: user?.displayName || 'Guest Reporter',
        needType:     parsed.needType,
        severity:     parsed.severity || severity,
        urgencyScore,
        status:       'PENDING',
        isLifeThreatening: parsed.isLifeThreatening,
        summary:      parsed.summary,
        edgeAIMode:   parsed.processingMode,
        edgeInferenceMs: parsed.processingMs,
        createdAt:    serverTimestamp(),
        updatedAt:    serverTimestamp(),
        meta: {
          affectedCount: parsed.affectedCount || parseInt(affectedCount) || 0,
          imageAttached: !!imagePreview,
          locationLocked: !!location,
        },
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Signal broadcast failed', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Success Screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 font-sans">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full glass-panel p-10 rounded-[2.5rem] border-secondary-container/20 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-secondary-container" />
          <div className="w-20 h-20 rounded-full bg-secondary-container flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(255,255,255,0.2)]">
            <CheckCircle2 color="black" size={40} />
          </div>
          <h2 className="text-4xl font-display font-black uppercase tracking-tighter mb-3 text-white">
            Suchna Bhej Di Gayi
          </h2>
          <div className="mb-6">
            <AIModeChip mode={aiMode} inferenceMs={lastInferenceMs} />
          </div>
          <p className="text-[11px] font-mono text-white/40 uppercase tracking-widest mb-10 leading-relaxed font-bold">
            Processed {aiMode === 'EDGE_CHROME_AI' || aiMode === 'EDGE_WEBGPU' ? 'on-device — no data left this phone' : 'via cloud'}. Urgency score computed. Swarm Assembler notified.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => { setSubmitted(false); setImagePreview(null); setImageParsed(false); setDetails(''); }}
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

  // ── Main Form ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black pb-20 font-sans text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 glass-panel border-x-0 border-t-0 p-4 rounded-none border-white/5">
        <div className="container max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="text-white/40 hover:text-white transition-colors p-2 rounded-lg">
              <ChevronLeft size={24} />
            </button>
            <div>
              <div className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-secondary-container mb-0.5">
                Emergency Suchna Vyavastha
              </div>
              <h1 className="text-xl font-display font-black uppercase tracking-tighter">
                Aapda Report Protocol
              </h1>
            </div>
          </div>
          {/* Connectivity + AI mode */}
          <div className="hidden md:flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              {isOffline
                ? <><WifiOff size={10} className="text-amber-400" /><span className="text-[9px] font-mono text-amber-400 uppercase">Offline</span></>
                : <><Wifi size={10} className="text-green-400" /><span className="text-[9px] font-mono text-green-400 uppercase">Online</span></>
              }
            </div>
            <AIModeChip mode={aiMode} inferenceMs={lastInferenceMs} />
          </div>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto px-6 mt-8 mb-20 space-y-12">

        {/* AI Status Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center gap-4"
        >
          <div className="p-2 rounded-xl bg-secondary-container/10 text-secondary-container shrink-0">
            <Cpu size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] font-display font-bold uppercase tracking-[0.2em] text-secondary-container mb-0.5">
              AI Processing Mode
            </div>
            <div className="text-[10px] font-mono text-white/50 truncate">{aiStatusMsg}</div>
          </div>
          <div className="shrink-0 ml-auto">
            <AIModeChip mode={aiMode} />
          </div>
        </motion.div>

        {/* Step 1: Need Type */}
        <section>
          <div className="flex items-center gap-3 mb-6">
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
                  className={`w-full p-6 rounded-3xl border transition-all duration-300 text-center group ${
                    selectedType === type.id
                      ? 'glass-panel border-secondary-container/50 bg-secondary-container/5'
                      : 'bg-white/5 border-white/5 hover:bg-white/[0.08] hover:border-white/10'
                  }`}
                >
                  <div className={`mb-3 mx-auto w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                    selectedType === type.id ? 'bg-secondary-container text-black' : 'bg-white/5 text-white/30 group-hover:text-white/60'
                  }`}>
                    {React.isValidElement(type.icon) && React.cloneElement(type.icon as React.ReactElement<{ size: number }>, { size: 22 })}
                  </div>
                  <div className={`text-[10px] font-display font-black uppercase tracking-[0.15em] ${
                    selectedType === type.id ? 'text-white' : 'text-white/20 group-hover:text-white/40'
                  }`}>
                    {type.label}
                  </div>
                </button>
              </Grid>
            ))}
          </Grid>
        </section>

        {/* Step 2: Evidence — Image OCR + Voice + Location */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
              <Camera size={16} />
            </div>
            <h3 className="font-display text-lg font-black uppercase tracking-tighter">II. As-paas Ke Saboot</h3>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleImageUpload}
          />

          <div className="grid grid-cols-3 gap-4">
            {/* Camera → Edge AI OCR */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={imageLoading}
              className="aspect-square glass-panel p-4 rounded-3xl border border-secondary-container/30 hover:border-secondary-container/60 transition-all group flex flex-col items-center justify-center gap-3 relative overflow-hidden"
            >
              {imageLoading ? (
                <>
                  <Cpu size={24} className="text-secondary-container animate-pulse" />
                  <span className="text-[9px] font-display font-bold uppercase tracking-widest text-secondary-container">AI Parsing...</span>
                </>
              ) : imageParsed ? (
                <>
                  <div className="absolute inset-0">
                    <img src={imagePreview!} className="w-full h-full object-cover opacity-25" />
                  </div>
                  <CheckCircle2 size={24} className="relative text-secondary-container" />
                  <span className="relative text-[9px] font-display font-bold uppercase tracking-widest text-secondary-container">✓ OCR Done</span>
                </>
              ) : (
                <>
                  <Camera size={24} className="text-white/30 group-hover:text-secondary-container transition-colors" />
                  <span className="text-[9px] font-display font-bold uppercase tracking-widest text-white/20 group-hover:text-white/50">Photo + OCR</span>
                </>
              )}
            </button>

            {/* Voice Note */}
            <button className="aspect-square glass-panel p-4 rounded-3xl border border-white/5 hover:border-white/20 transition-all group flex flex-col items-center justify-center gap-3">
              <Mic size={24} className="text-white/20 group-hover:text-secondary-container transition-colors" />
              <span className="text-[9px] font-display font-bold uppercase tracking-widest text-white/10 group-hover:text-white/40">Voice Note</span>
            </button>

            {/* GPS Lock */}
            <button
              onClick={handleLocationLock}
              disabled={locationLoading}
              className={`aspect-square glass-panel p-4 rounded-3xl border transition-all group flex flex-col items-center justify-center gap-3 ${
                location ? 'border-green-500/30 bg-green-500/5' : 'border-white/5 hover:border-white/20'
              }`}
            >
              <MapPin size={24} className={location ? 'text-green-400' : 'text-white/20 group-hover:text-secondary-container transition-colors'} />
              <span className={`text-[9px] font-display font-bold uppercase tracking-widest ${
                location ? 'text-green-400' : 'text-white/10 group-hover:text-white/40'
              }`}>
                {locationLoading ? 'Locking...' : location ? '✓ GPS Locked' : 'Location Lock'}
              </span>
            </button>
          </div>

          {/* OCR Success Banner */}
          <AnimatePresence>
            {imageParsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 flex items-center gap-3 px-5 py-3 rounded-2xl border border-secondary-container/20 bg-secondary-container/5 overflow-hidden"
              >
                <div className="w-2 h-2 rounded-full bg-secondary-container animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-secondary-container font-bold">
                  Gemma OCR: Form fields auto-filled from photo
                </span>
                <AIModeChip mode={aiMode} inferenceMs={lastInferenceMs} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Step 3: Severity Slider */}
        <section>
          <div className="flex items-center justify-between mb-6">
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
          <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5">
            <div className="flex items-center gap-3 mb-6 text-white/30">
              <Info size={14} />
              <span className="text-[10px] font-mono tracking-widest uppercase font-bold">
                1: Minimum Sync Required • 5: Direct Structural Threat
              </span>
            </div>
            <Slider
              value={severity}
              onChange={(_, v) => setSeverity(v as number)}
              min={1} max={5} step={1} marks
              className="!text-secondary-container"
              sx={{
                '& .MuiSlider-thumb': { width: 28, height: 28, backgroundColor: '#fff', border: '4px solid currentColor', '&:before': { display: 'none' } },
                '& .MuiSlider-rail': { opacity: 0.1 },
              }}
            />
          </div>
        </section>

        {/* Step 4: Description */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
              <Target size={16} />
            </div>
            <h3 className="font-display text-lg font-black uppercase tracking-tighter">IV. Sanket Ki Jankari</h3>
          </div>
          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute top-4 left-6 text-[10px] font-display font-black uppercase tracking-[0.2em] text-white/20 group-focus-within:text-secondary-container transition-colors">
                Ghatna Ka Vivran
              </div>
              <textarea
                rows={5}
                placeholder="Yahan batayein ki kya hua hai... (Hindi, English, or any language)"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full glass-panel bg-white/5 border border-white/5 p-8 pt-14 rounded-[2.5rem] text-sm text-white/80 placeholder:text-white/10 focus:border-secondary-container/40 focus:outline-none transition-all resize-none font-mono tracking-tight font-bold"
              />
            </div>
            <div className="relative group">
              <div className="absolute top-4 left-6 text-[10px] font-display font-black uppercase tracking-[0.2em] text-white/20 group-focus-within:text-white/40 transition-colors">
                Prabhavit Log (Affected Count)
              </div>
              <input
                type="number"
                placeholder="Estimated population involved..."
                value={affectedCount}
                onChange={(e) => setAffectedCount(e.target.value)}
                className="w-full glass-panel bg-white/5 border border-white/5 px-8 pt-14 pb-6 rounded-[2.5rem] text-sm text-white focus:border-white/20 focus:outline-none transition-all font-mono font-bold tracking-tight"
              />
            </div>
          </div>
        </section>

        {/* Submit */}
        <button
          disabled={loading}
          onClick={handleSubmit}
          className={`w-full py-6 rounded-3xl font-display text-xs font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all active:scale-[0.98] ${
            loading
              ? 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
              : 'bg-white text-black hover:bg-secondary-container shadow-[0_0_50px_rgba(255,255,255,0.1)]'
          }`}
        >
          {loading ? (
            <><Signal className="animate-pulse" size={20} /> {aiStatusMsg}</>
          ) : (
            <><span>Emergency Suchna Bhejein</span><Send size={20} /></>
          )}
        </button>
      </div>
    </div>
  );
}
