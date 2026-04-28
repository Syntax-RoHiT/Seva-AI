import React from 'react';
import { Grid, Slider } from '@mui/material';
import {
  Camera, Mic, MapPin, Utensils, HeartPulse, Tent,
  Droplets, Search, GraduationCap, CheckCircle2,
  ChevronLeft, Send, Zap, Info, ShieldAlert, Target,
  Signal, Home, Cpu, Wifi, WifiOff, Globe, StopCircle, Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { calculateUrgencyScore } from '../../services/scoringService';
import { getAICapabilities } from '../../services/edgeAIService';
import { parseMultipleImages, parseVoiceNote } from '../../services/geminiService';

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
  const [submittedReportId, setSubmittedReportId] = React.useState('');
  const [submittedUrgency, setSubmittedUrgency] = React.useState(0);
  
  const [selectedType, setSelectedType] = React.useState('medical');
  const [severity, setSeverity] = React.useState(3);
  const [details, setDetails] = React.useState('');
  const [affectedCount, setAffectedCount] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const [aiMode, setAIMode] = React.useState<AIMode>('CHECKING');
  const [aiStatusMsg, setAIStatusMsg] = React.useState('Detecting AI capabilities...');
  const [lastInferenceMs, setLastInferenceMs] = React.useState<number | undefined>();
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);

  // Images state
  const [images, setImages] = React.useState<{ base64: string; mimeType: string }[]>([]);
  const [imageLoading, setImageLoading] = React.useState(false);

  // Audio recording state
  const [isRecording, setIsRecording] = React.useState(false);
  const [audioLoading, setAudioLoading] = React.useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);

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
    const files = Array.from(e.target.files || []).slice(0, 5 - images.length);
    if (!files.length) return;
    setImageLoading(true);
    setAIStatusMsg('Parsing images via AI Vision...');
    
    const newImages: { base64: string; mimeType: string }[] = [];
    
    for (const file of files) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
      newImages.push({ base64, mimeType: file.type });
    }

    const updatedImages = [...images, ...newImages];
    setImages(updatedImages);

    try {
      const t0 = performance.now();
      const parsed = await parseMultipleImages(updatedImages);
      
      setDetails(prev => prev ? prev + '\n' + parsed.summary : parsed.summary);
      if (parsed.needType && parsed.needType[0]) setSelectedType(parsed.needType[0].toLowerCase());
      if (parsed.severity) setSeverity(Math.min(5, Math.max(1, parsed.severity)));
      if (parsed.affectedCount) setAffectedCount(String(parsed.affectedCount));
      
      setAIMode('SERVER_FALLBACK'); 
      setLastInferenceMs(Math.round(performance.now() - t0));
      setAIStatusMsg('Images parsed successfully');
    } catch (err) {
      console.error('Image AI parsing failed', err);
      setAIStatusMsg('Image parsing failed');
    } finally {
      setImageLoading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processVoiceNote(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setAIStatusMsg('Recording audio...');
    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAIStatusMsg('Processing voice note...');
    }
  };

  const processVoiceNote = async (blob: Blob) => {
    setAudioLoading(true);
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target?.result as string);
      reader.readAsDataURL(blob);
    });

    try {
      const t0 = performance.now();
      const parsed = await parseVoiceNote(base64, blob.type);
      
      setDetails(prev => prev ? prev + '\n[Voice]: ' + parsed.summary : '[Voice]: ' + parsed.summary);
      if (parsed.needType && parsed.needType[0]) setSelectedType(parsed.needType[0].toLowerCase());
      if (parsed.severity) setSeverity(Math.min(5, Math.max(1, parsed.severity)));
      if (parsed.affectedCount) setAffectedCount(String(parsed.affectedCount));

      setAIMode('SERVER_FALLBACK');
      setLastInferenceMs(Math.round(performance.now() - t0));
      setAIStatusMsg('Voice note transcribed successfully');
    } catch (err) {
      console.error('Voice note processing failed', err);
      setAIStatusMsg('Voice transcription failed');
    } finally {
      setAudioLoading(false);
    }
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
    if (!details.trim() && !selectedType && images.length === 0) return;
    
    // Location is mandatory
    if (!location) {
      setAIStatusMsg('📍 Location lock is required before submitting. Please tap the Location button.');
      return;
    }
    
    setLoading(true);
    setAIStatusMsg('Submitting report...');
    
    try {
      const urgencyScore = calculateUrgencyScore({
        severity: severity,
        unresolvedHours: 0,
        zoneDensity: 1.5,
        repeatBonus: 0,
        weatherBonus: 0.5,
      });

      const docRef = await addDoc(collection(db, 'reports'), {
        text: details,
        type: selectedType,
        location: location || { lat: 26.9124, lng: 75.7873 },
        locationDescription: location
          ? `${location.lat.toFixed(4)}°N, ${location.lng.toFixed(4)}°E`
          : 'Unknown Location',
        reporterId:   user?.uid || 'anonymous',
        reporterName: user?.displayName || 'Guest Reporter',
        needType:     [selectedType.toUpperCase()],
        severity:     severity,
        urgencyScore,
        status:       'PENDING',
        isLifeThreatening: severity >= 4,
        summary:      details.substring(0, 100),
        edgeAIMode:   aiMode,
        edgeInferenceMs: lastInferenceMs || 0,
        createdAt:    serverTimestamp(),
        updatedAt:    serverTimestamp(),
        meta: {
          affectedCount: parseInt(affectedCount) || 0,
          imageCount: images.length,
          locationLocked: !!location,
        },
      });

      const imageUrls: string[] = [];
      if (images.length > 0) {
        setAIStatusMsg('Uploading images to secure storage...');
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          const imageRef = ref(storage, `reports/${docRef.id}/image_${i}.jpg`);
          await uploadString(imageRef, img.base64, 'data_url');
          const url = await getDownloadURL(imageRef);
          imageUrls.push(url);
        }
        await updateDoc(doc(db, 'reports', docRef.id), { imageUrls });
      }

      setSubmittedReportId(docRef.id);
      setSubmittedUrgency(urgencyScore);
      setSubmitted(true);
    } catch (err) {
      console.error('Signal broadcast failed', err);
      setAIStatusMsg('Submission failed. Check network.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setImages([]);
    setDetails('');
    setAffectedCount('');
    setSeverity(3);
    setAIStatusMsg('Ready for next report.');
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
          
          <div className="bg-gray-50 border border-gray-200 p-4 mb-6 text-left">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Report ID</span>
              <span className="text-xs font-mono font-bold text-gray-900">{submittedReportId.substring(0, 8)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Urgency Score</span>
              <span className="text-xs font-bold text-red-600">{submittedUrgency.toFixed(1)} / 10.0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">AI Processing</span>
              <AIModeChip mode={aiMode} inferenceMs={lastInferenceMs} />
            </div>
          </div>
          
          <p className="text-sm text-gray-500 mb-8 leading-relaxed font-medium">
            Your emergency report has been routed. Nearby volunteers and response units will be notified based on urgency.
          </p>
          <div className="space-y-3">
            <button
              onClick={resetForm}
              className="w-full py-4 bg-blue-600 text-white font-semibold uppercase text-xs tracking-wider hover:bg-blue-700 transition-colors shadow-sm"
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
              AI Processing Status
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
                    {React.isValidElement(type.icon) && React.cloneElement(type.icon as React.ReactElement<any>, { size: 24 })}
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
            <h3 className="text-lg font-bold uppercase tracking-wide">Attach Evidence</h3>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            onChange={handleImageUpload}
          />

          <div className="grid grid-cols-3 gap-4 mb-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={imageLoading || images.length >= 5}
              className="aspect-square bg-white border border-gray-200 hover:border-blue-300 transition-colors flex flex-col items-center justify-center gap-2 relative overflow-hidden"
            >
              {imageLoading ? (
                <>
                  <Cpu size={24} className="text-blue-600 animate-pulse" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">Parsing AI...</span>
                </>
              ) : (
                <>
                  <Camera size={24} className="text-gray-400" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    Photos ({images.length}/5)
                  </span>
                </>
              )}
            </button>

            {isRecording ? (
              <button onClick={stopRecording} className="aspect-square border border-red-300 bg-red-50 flex flex-col items-center justify-center gap-2 animate-pulse">
                <StopCircle size={24} className="text-red-600" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-red-700">Stop</span>
              </button>
            ) : (
              <button 
                onClick={startRecording} 
                disabled={audioLoading}
                className="aspect-square bg-white border border-gray-200 hover:border-blue-300 transition-colors flex flex-col items-center justify-center gap-2"
              >
                {audioLoading ? (
                  <>
                    <Cpu size={24} className="text-blue-600 animate-pulse" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">Transcribing</span>
                  </>
                ) : (
                  <>
                    <Mic size={24} className="text-gray-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Voice Note</span>
                  </>
                )}
              </button>
            )}

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

          {images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {images.map((img, idx) => (
                <div key={idx} className="relative w-20 h-20 shrink-0 border border-gray-200 shadow-sm">
                  <img src={img.base64} className="w-full h-full object-cover" />
                  <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-red-600 text-white p-1 hover:bg-red-700">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
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
                Incident Description & AI Transcript
              </div>
              <textarea
                rows={4}
                placeholder="Describe what happened or speak to record..."
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
