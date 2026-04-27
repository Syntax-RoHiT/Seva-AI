import React from 'react';
import { Typography, Grid, Stack, alpha } from '@mui/material';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Download, Share2, Globe, MapPin, Activity, Network, Sparkles, Loader2 } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { summarizeSituation } from '../../services/geminiService';
import LookerStudioEmbed from '../../components/analytics/LookerStudioEmbed';


const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const dataByCity = [
  { name: 'Mumbai', reports: 4000, resolved: 2400 },
  { name: 'Delhi', reports: 3000, resolved: 1398 },
  { name: 'Jaipur', reports: 2000, resolved: 1800 },
  { name: 'Chennai', reports: 2780, resolved: 2108 },
  { name: 'Patna', reports: 1890, resolved: 1200 },
];

const pieData = [
  { name: 'Medical', value: 400 },
  { name: 'Rescue', value: 300 },
  { name: 'Infrastructure', value: 300 },
  { name: 'Logistics', value: 200 },
];

const COLORS = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981'];

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const indiaCenter = {
  lat: 20.5937,
  lng: 78.9629,
};

const clusters = [
  { id: 1, name: 'Western Hub', lat: 19.0760, lng: 72.8777, count: 1240, status: 'HIGH' },
  { id: 2, name: 'Northern Hub', lat: 28.6139, lng: 77.2090, count: 980, status: 'MEDIUM' },
  { id: 3, name: 'Southern Hub', lat: 13.0827, lng: 80.2707, count: 750, status: 'LOW' },
  { id: 4, name: 'Eastern Hub', lat: 25.5941, lng: 85.1376, count: 450, status: 'MEDIUM' },
];

import { useAuth } from '../../context/AuthContext';

export default function GovernmentDashboard() {
  const { user, loading } = useAuth();
  const [selectedCluster, setSelectedCluster] = React.useState<any>(null);
  const [aiSummary, setAiSummary] = React.useState<string>('');
  const [isSummarizing, setIsSummarizing] = React.useState(false);
  const [reports, setReports] = React.useState<any[]>([]);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  React.useEffect(() => {
    if (loading || !user) return;

    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data());
      setReports(data);
    }, (error) => {
      console.error("Government Dashboard snapshot error:", error);
    });
    return () => unsubscribe();
  }, [user, loading]);

  const handleGenerateSummary = async () => {
    if (reports.length === 0) return;
    setIsSummarizing(true);
    try {
      const summary = await summarizeSituation(reports);
      setAiSummary(summary);
    } catch (error) {
      console.error(error);
      setAiSummary("Error generating tactical oversight.");
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-1000 font-sans">
      {/* Strategic Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse"></span>
            <span className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-secondary-container">Rashtriya Suchna Sync Sakriya</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black uppercase tracking-tighter text-white">Rashtriya Aapda Niyantran</h1>
          <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest mt-2 px-1">Authority: MUKHYA NIYANTRAN KENDRA v4.2</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="px-6 py-3 rounded-xl border border-white/5 font-display text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2">
            <Download size={16} />
            Export Dossier
          </button>
          <button className="px-6 py-3 rounded-xl bg-white text-black font-display text-[10px] font-bold uppercase tracking-widest hover:bg-secondary-container transition-all flex items-center gap-2">
            <Share2 size={16} />
            Share Protocol
          </button>
        </div>
      </div>

      {/* National Heatmap Section */}
      <div className="glass-panel h-[500px] rounded-[2.5rem] border border-white/5 relative overflow-hidden">
        <div className="absolute top-8 left-8 z-10 pointer-events-none">
           <div className="pointer-events-auto flex items-center gap-4 glass-panel px-6 py-3 rounded-full border-white/10 backdrop-blur-md">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <div className="text-[10px] font-display font-black uppercase tracking-widest text-white">Real-Time National Satcom Matrix</div>
           </div>
        </div>

        <div className="absolute top-8 right-8 z-10 pointer-events-none">
           <div className="pointer-events-auto flex flex-col gap-2">
              {['HIGH', 'MEDIUM', 'LOW'].map(lvl => (
                <div key={lvl} className="glass-panel px-4 py-2 rounded-xl flex items-center gap-3 border-white/5 text-[9px] font-mono uppercase text-white/40">
                  <div className={`w-1.5 h-1.5 rounded-full ${lvl === 'HIGH' ? 'bg-red-500' : lvl === 'MEDIUM' ? 'bg-amber-500' : 'bg-green-500'}`} />
                  {lvl} SEVERITY UNITS
                </div>
              ))}
           </div>
        </div>

        <div className="w-full h-full bg-black/20">
          {isLoaded && GOOGLE_MAPS_API_KEY ? (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={indiaCenter}
              zoom={5}
              options={{
                mapTypeId: 'satellite',
                disableDefaultUI: true,
                zoomControl: true,
                styles: [
                  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
                  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
                  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
                ]
              }}
            >
              {clusters.map(cluster => (
                <Marker
                  key={cluster.id}
                  position={{ lat: cluster.lat, lng: cluster.lng }}
                  onClick={() => setSelectedCluster(cluster)}
                  icon={{
                    path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
                    fillColor: cluster.status === 'HIGH' ? '#EF4444' : cluster.status === 'MEDIUM' ? '#F59E0B' : '#10B981',
                    fillOpacity: 0.6,
                    strokeWeight: 2,
                    strokeColor: '#FFFFFF',
                    scale: Math.sqrt(cluster.count) * 2,
                  }}
                />
              ))}
              {selectedCluster && (
                <InfoWindow
                  position={{ lat: selectedCluster.lat, lng: selectedCluster.lng }}
                  onCloseClick={() => setSelectedCluster(null)}
                >
                  <div className="p-4 min-w-[200px] bg-black text-white font-sans border border-white/10 rounded-2xl">
                    <div className="text-[10px] font-display font-black uppercase tracking-widest text-secondary-container mb-1">{selectedCluster.name} UNIT</div>
                    <div className="text-xl font-display font-black uppercase tracking-tighter mb-4">{selectedCluster.count} Incidents</div>
                    <button className="w-full py-2 bg-white text-black rounded-lg text-[9px] font-display font-black uppercase tracking-widest hover:bg-secondary-container transition-colors">Analyze Vector Hub</button>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-6 text-white/20">
              <Activity className="animate-spin" size={48} strokeWidth={1} />
              <div className="text-[10px] font-mono uppercase tracking-[0.4em]">Establishing Satellite Uplink...</div>
              {!GOOGLE_MAPS_API_KEY && <div className="text-[10px] text-red-400/50 uppercase font-mono">VITE_GOOGLE_MAPS_API_KEY MISSING</div>}
            </div>
          )}
        </div>
      </div>

      <Grid container spacing={4}>
        {/* Strategic Data Visualization */}
        <Grid item xs={12} lg={8}>
          <div className="glass-panel p-10 h-[550px] rounded-[2.5rem] border border-white/5 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-display text-xl font-black uppercase tracking-tighter text-white/80">Rashtriya Sahayta Gati Metrics</h3>
                <p className="text-[9px] font-mono uppercase text-white/20 tracking-widest">Velocity Metrics / National Scale</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <div className="text-[9px] font-mono text-white/40 uppercase">Signals</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <div className="text-[9px] font-mono text-white/40 uppercase">Resolved</div>
                </div>
              </div>
            </div>
            
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={dataByCity} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#ffffff20', fontSize: 10, fontWeight: 700, letterSpacing: 2 }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#ffffff20', fontSize: 10 }} 
                    />
                    <Tooltip 
                      cursor={{ fill: '#ffffff05' }}
                      contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff10', borderRadius: '16px', padding: '16px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}
                    />
                    <Bar dataKey="reports" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="resolved" fill="#10B981" radius={[4, 4, 0, 0]} />
                 </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Grid>

        <Grid item xs={12} lg={4}>
          <div className="flex flex-col gap-4 h-full">
            <div className="glass-panel p-10 h-[300px] rounded-[2.5rem] border border-white/5 flex flex-col">
              <h3 className="font-display text-xl font-black uppercase tracking-tighter text-white/80 mb-8">Samagri Anuman</h3>
              
              <div className="flex-1 min-h-0">
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff10', borderRadius: '16px' }} />
                   </PieChart>
                 </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel p-10 flex-1 rounded-[2.5rem] border border-secondary-container/20 flex flex-col relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Sparkles size={120} />
               </div>
               <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary-container/10 rounded-lg text-secondary-container">
                      <Sparkles size={18} />
                    </div>
                    <h3 className="font-display text-lg font-black uppercase tracking-tighter">Niti Vishleshan (AI)</h3>
                  </div>
                  <button 
                  onClick={handleGenerateSummary}
                  disabled={isSummarizing || reports.length === 0}
                  className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white transition-colors"
                  >
                    {isSummarizing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto scrollbar-hide">
                 {aiSummary ? (
                   <div className="text-[11px] font-mono text-white/70 leading-relaxed space-y-4 whitespace-pre-wrap">
                     {aiSummary}
                   </div>
                 ) : (
                   <div className="h-full flex flex-col items-center justify-center text-center">
                     <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] mb-4">Neural Analysis Required</p>
                     <button 
                      onClick={handleGenerateSummary}
                      className="px-6 py-3 bg-white text-black rounded-xl text-[9px] font-display font-black uppercase tracking-widest hover:bg-secondary-container transition-all"
                     >
                        Run Strategic Scan
                     </button>
                   </div>
                 )}
               </div>
            </div>
          </div>
        </Grid>

        {/* Global Statistics Grid */}
        <Grid item xs={12}>
           <Grid container spacing={4}>
              {[
                { label: 'Rashtriya Suraksha index', value: '7.8 / 10', icon: <Globe />, detail: 'UP 0.4 FROM Q2', color: '#10B981' },
                { label: 'Sakriya Sanchalan Kendra', value: '528', icon: <MapPin />, detail: '9 NEW DEPLOYMENTS', color: '#3B82F6' },
                { label: 'Inter-State Coordination', value: '96.2%', icon: <Network />, detail: 'AI LAYER OPTIMIZED', color: '#F59E0B' }
              ].map((stat, i) => (
                <Grid item xs={12} md={4} key={i}>
                  <div className="glass-panel p-10 rounded-[2.5rem] border border-white/5 text-center transition-all hover:scale-[1.02] group">
                     <div className="mb-4 mx-auto w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 group-hover:text-white group-hover:bg-white/10 transition-all duration-500">
                        {React.isValidElement(stat.icon) && React.cloneElement(stat.icon as React.ReactElement<any>, { size: 32, strokeWidth: 1.5 })}
                     </div>
                     <div className="text-4xl lg:text-5xl font-display font-black uppercase tracking-tighter text-white mb-2">{stat.value}</div>
                     <div className="text-[10px] font-display font-bold uppercase tracking-[0.3em] text-white/20 mb-4">{stat.label}</div>
                     <div className={`text-[9px] font-mono font-black tracking-widest uppercase py-1 px-3 rounded-full inline-block border ${
                       stat.color === '#10B981' ? 'border-green-500/20 text-green-500 bg-green-500/5' : 
                       stat.color === '#3B82F6' ? 'border-blue-500/20 text-blue-500 bg-blue-500/5' : 
                       'border-amber-500/20 text-amber-500 bg-amber-500/5'
                     }`}>
                       {stat.detail}
                     </div>
                  </div>
                </Grid>
              ))}
           </Grid>
        </Grid>
      </Grid>

      {/* Social Impact Analytics — Looker Studio */}
      <LookerStudioEmbed />
    </div>
  );
}
