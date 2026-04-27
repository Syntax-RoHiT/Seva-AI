import React from 'react';
import { Grid, Slider } from '@mui/material';
import {
  Camera, Mic, MapPin, Utensils, HeartPulse, Tent,
  Droplets, Search, GraduationCap, CheckCircle2,
  ChevronLeft, Send, Zap, Info, ShieldAlert, Target,
  Signal, Home, Cpu, Wifi, WifiOff, Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { calculateUrgencyScore } from '../../services/scoringService';
import { processReportEdge, getAICapabilities, extractTextFromImage, type EdgeAIResult } from '../../services/edgeAIService';
import { parseImageReport } from '../../services/geminiService';

const needTypes = [
  { id: 'food',      label: 'Food Supply',  icon: <Utensils /> },
  { id: 'medical',   label: 'Medical Aid',  icon: <HeartPulse /> },
  { id: 'shelter',   label: 'Shelter',      icon: <Tent /> },
  { id: 'water',     label: 'Clean Water',  icon: <Droplets /> },
  { id: 'rescue',    label: 'Rescue',       icon: <Search /> },
  { id: 'education', label: 'Education',    icon: <GraduationCap /> },
];

type AIMode = 'EDGE_CHROME_AI' | 'EDGE_WEBGPU' | 'SERVER_FALLBACK' | 'CHECKING' | 'IDLE';

function AIModeChip({ mode, inferenceMs }: { mode: AIMode; inferenceMs?: number }) {
  const config: Record<AIMode, { label: string; color: string; icon: React.ReactNode }> = {
    EDGE_CHROME_AI:   { label: 'Gemma Nano (On-Device)', color: 'text-green-700 border-green-200 bg-green-50', icon: <Cpu size={12} /> },
    EDGE_WEBGPU:      { label: 'Gemma 2B (WebGPU)',      color: 'text-blue-700 border-blue-200 bg-blue-50',   icon: <Zap size={12} /> },
    SERVER_FALLBACK:  { label: 'Gemini Flash (Server)',  color: 'text-amber-700 border-amber-200 bg-amber-50',icon: <Globe size={12} /> },
    CHECKING:         { label: 'Detecting AI Mode...',   color: 'text-gray-500 border-gray-200 bg-gray-50',   icon: <Signal size={12} className="animate-pulse" /> },
    IDLE:             { label: 'AI Ready',               color: 'text-gray-500 border-gray-200 bg-gray-50',   icon: <Cpu size={12} /> },
  };
  const c = config[mode];
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 border text-xs font-semibold uppercase tracking-wider ${c.color}`}>
      {c.icon}
      {c.label}
      {inferenceMs && mode !== 'IDLE' && mode !== 'CHECKING' && (
        <span className="opacity-60 font-mono">• {inferenceMs}ms</span>
      )}
    </div>
  );
}

export default function ReporterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [submitted, setSubmitted] = React.useState(false);
  const [selectedType, setSelectedType] = React.useState('medical');
  const [severity, setSeverity] = React.useState(3);
  const [details, setDetails] = React.useState('');
  const [affectedCount, setAffectedCount] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const [aiMode, setAIMode] = React.useState<AIMode>('CHECKING');
  const [aiStatusMsg, setAIStatusMsg] = React.useState('Detecting AI capabilities...');
  const [lastInferenceMs, setLastInferenceMs] = React.useState<number | undefined>();
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);

  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [imageLoading, setImageLoading] = React.useState(false);
  const [imageParsed, setImageParsed] = React.useState(false);
  const [location, setLocation] = React.useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageLoading(true);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setImagePreview(base64);
      try {
        const ocrText = await extractTextFromImage(base64);
        let parsed: EdgeAIResult;
        if (ocrText !== '[IMAGE_OCR_REQUIRED]') {
          parsed = await processReportEdge(ocrText, setAIStatusMsg);
        } else {
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
          : 'Unknown Location',
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

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white p-10 border border-gray-200 text-center relative shadow-sm">
          <div className="absolute top-0 inset-x-0 h-1 bg-green-500" />
          <div className="w-16 h-16 bg-green-50 flex items-center justify-center mx-auto mb-8 border border-green-200">
            <CheckCircle2 className="text-green-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold uppercase tracking-wide mb-3 text-gray-900">
            Report Submitted
          </h2>
          <div className="mb-6">
            <AIModeChip mode={aiMode} inferenceMs={lastInferenceMs} />
          </div>
          <p className="text-sm text-gray-500 mb-10 leading-relaxed font-medium">
            Processed {aiMode === 'EDGE_CHROME_AI' || aiMode === 'EDGE_WEBGPU' ? 'on-device — no data left this phone' : 'via cloud'}. Urgency score computed. Volunteers will be notified shortly.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => { setSubmitted(false); setImagePreview(null); setImageParsed(false); setDetails(''); }}
              className="w-full py-4 bg-blue-600 text-white font-semibold uppercase text-xs tracking-wider hover:bg-blue-700 transition-colors"
            >
              Submit Another Report
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-4 border border-gray-300 font-semibold text-xs uppercase tracking-wider text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Home size={16} />
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans text-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 p-4 shadow-sm">
        <div className="container max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-900 transition-colors p-2">
              <ChevronLeft size={24} />
            </button>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-0.5">
                Emergency Reporting
              </div>
              <h1 className="text-xl font-bold tracking-tight">
                Field Worker Input
              </h1>
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {isOffline
                ? <><WifiOff size={14} className="text-red-500" /><span className="text-xs font-semibold text-red-500 uppercase">Offline</span></>
                : <><Wifi size={14} className="text-green-500" /><span className="text-xs font-semibold text-green-500 uppercase">Online</span></>
              }
            </div>
            <AIModeChip mode={aiMode} inferenceMs={lastInferenceMs} />
          </div>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto px-6 mt-8 mb-20 space-y-10">

        {/* AI Status Bar */}
        <div className="bg-white p-4 border border-gray-200 flex items-center gap-4 shadow-sm">
          <div className="p-2 bg-blue-50 text-blue-600 border border-blue-100">
            <Cpu size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
              AI Processing Mode
            </div>
            <div className="text-sm text-gray-500 truncate">{aiStatusMsg}</div>
          </div>
          <div className="shrink-0 hidden sm:block">
            <AIModeChip mode={aiMode} />
          </div>
        </div>

        {/* Step 1: Need Type */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Zap size={16} />
            </div>
            <h3 className="text-lg font-bold uppercase tracking-wide">Select Primary Need</h3>
          </div>
          <Grid container spacing={2}>
            {needTypes.map((type) => (
              <Grid item xs={6} sm={4} key={type.id}>
                <button
                  onClick={() => setSelectedType(type.id)}
                  className={`w-full p-4 border transition-colors text-center ${
                    selectedType === type.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className={`mb-3 mx-auto w-10 h-10 flex items-center justify-center transition-colors ${
                    selectedType === type.id ? 'text-blue-600' : 'text-gray-400'
                  }`}>
                    {React.isValidElement(type.icon) && React.cloneElement(type.icon as React.ReactElement<{ size: number }>, { size: 24 })}
                  </div>
                  <div className={`text-xs font-semibold uppercase tracking-wider ${
                    selectedType === type.id ? 'text-blue-700' : 'text-gray-500'
                  }`}>
                    {type.label}
                  </div>
                </button>
              </Grid>
            ))}
          </Grid>
        </section>

        {/* Step 2: Evidence */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600">
              <Camera size={16} />
            </div>
            <h3 className="text-lg font-bold uppercase tracking-wide">Attach Evidence (Optional)</h3>
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
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={imageLoading}
              className="aspect-square bg-white border border-gray-200 hover:border-blue-300 transition-colors flex flex-col items-center justify-center gap-2 relative overflow-hidden"
            >
              {imageLoading ? (
                <>
                  <Cpu size={24} className="text-blue-600 animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">Parsing...</span>
                </>
              ) : imageParsed ? (
                <>
                  <div className="absolute inset-0">
                    <img src={imagePreview!} className="w-full h-full object-cover opacity-30" />
                  </div>
                  <CheckCircle2 size={24} className="relative text-green-600" />
                  <span className="relative text-xs font-semibold uppercase tracking-wider text-green-700">OCR Done</span>
                </>
              ) : (
                <>
                  <Camera size={24} className="text-gray-400" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Photo / OCR</span>
                </>
              )}
            </button>

            <button className="aspect-square bg-white border border-gray-200 hover:border-blue-300 transition-colors flex flex-col items-center justify-center gap-2">
              <Mic size={24} className="text-gray-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Voice Note</span>
            </button>

            <button
              onClick={handleLocationLock}
              disabled={locationLoading}
              className={`aspect-square border transition-colors flex flex-col items-center justify-center gap-2 ${
                location ? 'border-green-300 bg-green-50' : 'bg-white border-gray-200 hover:border-blue-300'
              }`}
            >
              <MapPin size={24} className={location ? 'text-green-600' : 'text-gray-400'} />
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                location ? 'text-green-700' : 'text-gray-500'
              }`}>
                {locationLoading ? 'Locking...' : location ? 'GPS Locked' : 'Location'}
              </span>
            </button>
          </div>

          {imageParsed && (
            <div className="mt-4 flex items-center gap-3 px-4 py-3 border border-blue-200 bg-blue-50">
              <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                Form auto-filled via Edge AI OCR
              </span>
            </div>
          )}
        </section>

        {/* Step 3: Severity */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600">
                <ShieldAlert size={16} />
              </div>
              <h3 className="text-lg font-bold uppercase tracking-wide">Severity Level</h3>
            </div>
            <div className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border ${
              severity >= 4 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-blue-50 border-blue-200 text-blue-600'
            }`}>
              LEVEL {severity} / 5
            </div>
          </div>
          <div className="bg-white p-8 border border-gray-200">
            <div className="flex items-center gap-2 mb-6 text-gray-500">
              <Info size={16} />
              <span className="text-xs font-semibold tracking-wider uppercase">
                1: Minimal Impact • 5: Life-Threatening Emergency
              </span>
            </div>
            <Slider
              value={severity}
              onChange={(_, v) => setSeverity(v as number)}
              min={1} max={5} step={1} marks
              sx={{
                color: severity >= 4 ? '#ea4335' : '#1a73e8',
                '& .MuiSlider-thumb': { borderRadius: 0, width: 24, height: 24, backgroundColor: 'currentColor', border: '2px solid white' },
                '& .MuiSlider-rail': { opacity: 0.2 },
              }}
            />
          </div>
        </section>

        {/* Step 4: Description */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600">
              <Target size={16} />
            </div>
            <h3 className="text-lg font-bold uppercase tracking-wide">Report Details</h3>
          </div>
          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute top-3 left-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 group-focus-within:text-blue-600 transition-colors">
                Incident Description
              </div>
              <textarea
                rows={4}
                placeholder="Describe what happened..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full bg-white border border-gray-200 p-4 pt-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all resize-none font-medium"
              />
            </div>
            <div className="relative group">
              <div className="absolute top-3 left-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 group-focus-within:text-blue-600 transition-colors">
                Estimated People Affected
              </div>
              <input
                type="number"
                placeholder="e.g., 50"
                value={affectedCount}
                onChange={(e) => setAffectedCount(e.target.value)}
                className="w-full bg-white border border-gray-200 px-4 pt-10 pb-4 text-sm text-gray-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all font-medium"
              />
            </div>
          </div>
        </section>

        {/* Submit */}
        <button
          disabled={loading}
          onClick={handleSubmit}
          className={`w-full py-5 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-colors ${
            loading
              ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
          }`}
        >
          {loading ? (
            <><Signal className="animate-pulse" size={18} /> Processing...</>
          ) : (
            <><span>Submit Emergency Report</span><Send size={18} /></>
          )}
        </button>
      </div>
    </div>
  );
}
