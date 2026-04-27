import React from 'react';
import { 
  Typography, 
  Stack, 
  Avatar, 
  Switch, 
  alpha,
  Grid,
  Dialog,
  DialogContent,
  IconButton
} from '@mui/material';
import { 
  ShieldCheck, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  X, 
  Phone, 
  MessageCircle,
  ShieldAlert,
  Navigation,
  Zap,
  Activity,
  ChevronRight,
  Target,
  Signal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { startGPSTracking, stopGPSTracking } from '../../services/gpsService';


export default function VolunteerDashboard() {
  const { user, loading } = useAuth();
  const [online, setOnline] = React.useState(true);
  const [missions, setMissions] = React.useState<any[]>([]);
  const [activeMission, setActiveMission] = React.useState<any>(null);
  const [showMission, setShowMission] = React.useState(false);
  const [gpsError, setGpsError] = React.useState<string | null>(null);
  const [gpsActive, setGpsActive] = React.useState(false);

  // Start GPS tracking when user is online
  React.useEffect(() => {
    if (!user || loading) return;
    if (online) {
      startGPSTracking(user.uid, (err) => setGpsError(err));
      setGpsActive(true);
    } else {
      stopGPSTracking(user.uid);
      setGpsActive(false);
    }
    return () => {
      if (user) stopGPSTracking(user.uid);
    };
  }, [online, user, loading]);

  React.useEffect(() => {
    if (loading || !user) return;

    // Listen to available missions instead of raw reports
    const q = query(
      collection(db, 'missions'), 
      where('status', '==', 'PENDING')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveMissions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMissions(liveMissions);
    }, (error) => {
      console.error("Volunteer Dashboard snapshot error:", error);
    });

    return () => unsubscribe();
  }, [user, loading]);

  const handleAcceptMission = async (missionId: string) => {
    try {
      const mission = missions.find(m => m.id === missionId);
      if (!mission) return;

      const missionRef = doc(db, 'missions', missionId);
      const reportRef = doc(db, 'reports', mission.reportId);

      await Promise.all([
        updateDoc(missionRef, {
          status: 'DISPATCHED',
          volunteerId: user?.uid,
          volunteerName: user?.displayName,
          dispatchedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }),
        updateDoc(reportRef, {
          status: 'DISPATCHED',
          assignedTo: user?.uid,
          assignedName: user?.displayName,
          updatedAt: serverTimestamp()
        })
      ]);

      setShowMission(false);
      setActiveMission(null);
    } catch (error) {
      console.error("Mission acceptance failed", error);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-1000 font-sans">
      {/* HUD Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse"></span>
            <span className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-secondary-container">Field Signal Locked</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black uppercase tracking-tighter">Seva Deck</h1>
          <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest mt-2 px-1">Sathi Pehchan: {user?.displayName || 'OPERATOR-01'}</p>
        </div>
        
        <div className="flex items-center gap-6 glass-panel px-6 py-4 rounded-2xl border-white/5">
          {/* GPS Status Badge */}
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full transition-colors ${gpsActive ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
            <span className={`text-[9px] font-mono uppercase tracking-widest ${gpsActive ? 'text-green-400' : 'text-white/20'}`}>
              {gpsError ? 'GPS Error' : gpsActive ? 'GPS Live' : 'GPS Off'}
            </span>
          </div>
          <div className="w-px h-5 bg-white/10" />
          <div className="text-right">
            <div className={`text-[9px] font-display font-bold uppercase tracking-widest mb-1 ${online ? 'text-green-400' : 'text-white/20'}`}>
              {online ? 'Seva Sakriya' : 'Signal Offline'}
            </div>
            <div className="text-[11px] font-mono font-bold text-white/40">{online ? 'SAMPARK MEIN' : 'DISCONNECTED'}</div>
          </div>
          <Switch 
            checked={online} 
            onChange={(e) => setOnline(e.target.checked)} 
            className="!text-secondary-container"
          />
        </div>
      </div>

      <Grid container spacing={4}>
        <Grid item xs={12} lg={8}>
          {/* Dispatch Area */}
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className={`glass-panel p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden transition-all duration-500 border group ${missions.length > 0 ? 'border-secondary-container/30' : 'border-white/5'}`}
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Signal size={200} strokeWidth={0.5} />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className={`p-4 rounded-2xl bg-white/5 border border-white/10 ${missions.length > 0 ? 'text-secondary-container' : 'text-white/20'}`}>
                  <Target size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-display font-black uppercase tracking-tight">
                    {missions.length > 0 ? `${missions.length} Seva Abhiyan Identified` : 'Environment Scan Active'}
                  </h2>
                  <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest">Global Positioning Sync: NOMINAL</p>
                </div>
              </div>

              <div className="max-w-md">
                <p className="text-sm text-white/60 mb-10 leading-relaxed font-sans uppercase tracking-tight">
                  {missions.length > 0 
                    ? 'Neural layer has identified high-impact requirements matching your coordinates. Authorize extraction protocols below.' 
                    : 'Standing by for strategic signals. Maintain proximity to the tactical hub for faster response times.'}
                </p>

                <button 
                  disabled={missions.length === 0}
                  onClick={() => {
                    setActiveMission(missions[0]);
                    setShowMission(true);
                  }}
                  className={`px-10 py-5 rounded-2xl font-display text-xs tracking-[0.2em] font-black uppercase transition-all flex items-center gap-4 ${
                    missions.length > 0 
                    ? 'bg-white text-black hover:bg-secondary-container shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-95' 
                    : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                  }`}
                >
                  {missions.length > 0 ? 'Abhiyan Shuru Karein' : 'Signal Scan...'}
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </motion.div>

          <div className="mt-12">
            <h3 className="font-display text-lg font-black uppercase tracking-tighter mb-8">Completed Operations</h3>
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="glass-panel p-6 rounded-2xl border border-white/5 group hover:border-white/20 transition-all flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-green-400/40 group-hover:text-green-400 transition-colors">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <div className="text-xs font-display font-bold uppercase tracking-widest mb-1">Tactical Extraction • Sector {i * 12}</div>
                      <div className="text-[10px] font-mono text-white/20 uppercase">PROTOCOL COMPLIANT • 0{i}:14 HRS</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-display font-black text-secondary-container tracking-tighter">+{i * 120} XP</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Grid>

        <Grid item xs={12} lg={4}>
          <div className="flex flex-col gap-6">
            {/* Progression */}
            <div className="glass-panel p-8 rounded-[2rem] border border-white/10 relative overflow-hidden">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="font-display text-lg font-black uppercase tracking-tighter">Seva Points (Progress)</h3>
                  <Zap size={18} className="text-secondary-container" />
               </div>
               
               <div className="mb-10">
                 <div className="flex justify-between items-end mb-3">
                   <span className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-white/30">Agla Pad (Milestone): Seva Ratna</span>
                   <span className="text-sm font-mono font-black tracking-tighter text-secondary-container">68%</span>
                 </div>
                 <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '68%' }}
                      className="h-full bg-secondary-container shadow-[0_0_20px_rgba(0,186,199,0.5)]"
                    />
                 </div>
                 <div className="flex justify-between mt-2 font-mono text-[9px] uppercase tracking-widest text-white/20">
                   <span>2,480 PTS</span>
                   <span>5,000 PTS</span>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-3 mb-8">
                 {[1, 2, 3, 4].map(i => (
                   <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 text-center group hover:bg-white/10 transition-colors">
                     <div className="text-2xl mb-2 opacity-60 group-hover:opacity-100 transition-opacity grayscale group-hover:grayscale-0">
                       {i === 1 ? '🥇' : i === 2 ? '⚡' : i === 3 ? '🧡' : '🤝'}
                     </div>
                     <div className="text-[8px] font-display font-bold uppercase tracking-widest text-white/30">{i === 1 ? 'Pratham' : i === 2 ? 'Gati' : i === 3 ? 'Kalyan' : 'Sathi'}</div>
                   </div>
                 ))}
               </div>

               <div className="pt-6 border-t border-white/5 flex justify-between items-center">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-white/10 overflow-hidden">
                        <img src={`https://i.pravatar.cc/150?u=${i}`} className="w-full h-full object-cover grayscale" />
                      </div>
                    ))}
                  </div>
                  <div className="text-[9px] font-mono text-white/40 uppercase font-bold tracking-tight">12 Sathis Nearby</div>
               </div>
            </div>

            {/* Weather Alert */}
            <div className="glass-panel p-8 rounded-[2rem] border border-red-500/20 bg-red-500/5">
              <div className="flex items-center gap-3 mb-4">
                <ShieldAlert size={20} className="text-red-400" />
                <h3 className="font-display text-xs font-black uppercase tracking-[0.2em] text-red-400">Aapda Chetavani</h3>
              </div>
              <p className="text-[11px] text-white/60 font-mono uppercase leading-relaxed font-bold tracking-tight">
                Northwest Bharat mein khatre ke sanket. Kripya savdhan rahein aur emergency equipment taiyaar rakhein.
              </p>
            </div>
          </div>
        </Grid>
      </Grid>

      {/* Mission Modal */}
      <Dialog 
        open={showMission} 
        onClose={() => setShowMission(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ className: "!bg-[#000] !rounded-[2.5rem] !border !border-white/10 !overflow-hidden relative" }}
      >
        <DialogContent className="!p-0">
          <div className="h-48 bg-white/5 relative">
            <img 
              src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2074&auto=format&fit=crop" 
              className="w-full h-full object-cover opacity-20 grayscale"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
            <IconButton 
              onClick={() => setShowMission(false)} 
              className="!absolute !top-4 !right-4 !bg-black/50 !text-white hover:!bg-white hover:!text-black transition-all"
            >
              <X size={16} />
            </IconButton>
          </div>
          
          <div className="p-10 pt-4">
            <div className="mb-8">
              <div className="text-[10px] font-display font-bold uppercase tracking-[0.3em] text-secondary-container mb-2">Seva Ka Avsar</div>
              <h3 className="text-3xl font-display font-black uppercase tracking-tighter leading-none mb-4">
                {activeMission?.needType?.[0] || 'Aapda'} • {activeMission?.location || 'SECTOR RADIAL'}
              </h3>
              
              <div className="flex flex-wrap gap-2">
                <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 flex items-center gap-2 text-[9px] font-mono uppercase text-white/40">
                  <MapPin size={10} />
                  Door: 2.1km
                </div>
                <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 flex items-center gap-2 text-[9px] font-mono uppercase text-secondary-container font-bold">
                  <Activity size={10} />
                  Priority Score: {activeMission?.urgencyScore?.toFixed(1) || '0.0'}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-white/60 font-mono uppercase leading-relaxed mb-10 border-l border-white/10 pl-4 py-2 font-bold tracking-tight">
              {activeMission?.text || 'Tactical assessment suggests field deployment required for localized extraction. Environmental factors elevated.'}
            </p>

            <div className="space-y-4">
              <button 
                onClick={() => handleAcceptMission(activeMission?.id)}
                className="w-full py-5 rounded-2xl bg-white text-black font-display text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-secondary-container transition-all active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)]"
              >
                Abhiyan Swikaar Karein
                <Navigation size={18} />
              </button>
              
              <div className="flex gap-4">
                <button className="flex-1 py-4 rounded-xl border border-white/10 font-display text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 transition-all">
                  Comms Log
                </button>
                <button className="flex-1 py-4 rounded-xl border border-white/10 font-display text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 transition-all">
                  Unit Intel
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
