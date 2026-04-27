import { 
  Grid, 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';

import React from 'react';
import { 
  TrendingUp, 
  Users, 
  Activity, 
  ShieldAlert, 
  ArrowUpRight,
  Navigation,
  Target,
  Cpu,
} from 'lucide-react';

import { collection, query, orderBy, onSnapshot, limit, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion } from 'motion/react';
import { 
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import TacticalAssistant from '../../components/ai/TacticalAssistant';
import { runSwarmMatch } from '../../services/matchingService';
import LiveHeatmap from '../../components/maps/LiveHeatmap';
import { useAuth } from '../../context/AuthContext';

const stats = [
  { label: 'Sanchalan Status', value: '42', change: '+12%', color: '#60A5FA', icon: <Target size={18} /> },
  { label: 'Khatra Level', value: 'CRITICAL', change: 'ELEVATED', color: '#F87171', icon: <ShieldAlert size={18} /> },
  { label: 'Seva Sathis', value: '1,420', change: '+84', color: '#34D399', icon: <Users size={18} /> },
  { label: 'Suchna Pravah', value: '12.4TB', change: '+2.1', color: '#FBBF24', icon: <Activity size={18} /> },
];

const resourceForecast = [
  { time: '08:00', food: 400, medical: 240, water: 500 },
  { time: '12:00', food: 300, medical: 139, water: 450 },
  { time: '16:00', food: 200, medical: 980, water: 390 },
  { time: '20:00', food: 278, medical: 390, water: 480 },
  { time: '00:00', food: 189, medical: 480, water: 520 },
];

const chartData = [
  { name: '08:00', value: 400 },
  { name: '10:00', value: 300 },
  { name: '12:00', value: 600 },
  { name: '14:00', value: 800 },
  { name: '16:00', value: 500 },
  { name: '18:00', value: 900 },
  { name: '20:00', value: 1100 },
];


export default function NGOAdminDashboard() {
  const { user, loading } = useAuth();
  const [liveReports, setLiveReports] = React.useState<any[]>([]);


  React.useEffect(() => {
    if (loading || !user) return;

    const q = query(
      collection(db, 'reports'), 
      orderBy('createdAt', 'desc'),
      limit(8)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLiveReports(reports);
    }, (error) => {
      console.error("NGO Dashboard snapshot error:", error);
    });

    return () => unsubscribe();
  }, [user, loading]);

  return (
    <div className="space-y-10 animate-in fade-in duration-1000">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse"></span>
              <span className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-secondary-container">Kendra Sanchalan Sakriya Hai</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-black uppercase tracking-tighter">Niyantran Kendra</h1>
            <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest mt-2 px-1">Secure Link Established • Node: XE-901</p>
          </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={async () => {
              try {
                // Mock volunteers for demo
                const mockVolunteers = [
                  { id: 'V1', name: 'Rahul', location: { lat: 26.91, lng: 75.78 }, skills: ['RESCUE', 'MEDICAL'] },
                  { id: 'V2', name: 'Priya', location: { lat: 26.92, lng: 75.79 }, skills: ['FOOD', 'WATER'] },
                ];
                const matches = await runSwarmMatch(liveReports, mockVolunteers);
                console.log("Swarm Match Results:", matches);
                alert(`Swarm Assembler Optimized ${matches.length} deployments.`);
              } catch (error) {
                console.error("Matching failed", error);
              }
            }}
            className="px-6 py-3 rounded-xl border border-white/10 font-display text-[11px] tracking-widest font-bold uppercase hover:bg-white/5 transition-all flex items-center gap-2"
          >
            <Cpu size={14} />
            Swarm Assembler
          </button>
          <button className="px-6 py-3 rounded-xl bg-white text-black font-display text-[11px] tracking-widest font-black uppercase hover:bg-secondary-container transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            <Navigation size={14} />
            Unit Dispatch
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <Grid container spacing={4}>
        {stats.map((stat, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-panel p-6 rounded-2xl relative group hover:border-white/20 transition-all cursor-crosshair"
            >
              <div className="absolute top-0 left-0 w-1 h-0 group-hover:h-full transition-all duration-500" style={{ backgroundColor: stat.color }}></div>
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 rounded-lg bg-white/5 border border-white/5 text-white/40 group-hover:text-white transition-colors">
                  {stat.icon}
                </div>
                <span className="text-[9px] font-mono tracking-widest opacity-40 uppercase">{stat.change}</span>
              </div>
              <div className="text-3xl font-display font-black uppercase tracking-tighter mb-1">{stat.value}</div>
              <div className="text-[9px] font-display font-bold uppercase tracking-widest text-white/30">{stat.label}</div>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Bento Grid Main */}
      <Grid container spacing={4}>
        {/* Live Urgency Heatmap */}
        <Grid item xs={12} lg={8}>
          <LiveHeatmap />
        </Grid>

        {/* Analytics Card */}
        <Grid item xs={12} lg={4}>
          <div className="h-full flex flex-col gap-4">
             {/* Samagri Forecast */}
             <div className="glass-panel p-8 rounded-[2rem] border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-lg font-black uppercase tracking-tighter">Samagri Anuman (Forecast)</h3>
                <TrendingUp size={18} className="text-secondary-container" />
              </div>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={resourceForecast}>
                    <defs>
                      <linearGradient id="colorFood" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00eefc" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00eefc" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="food" stroke="#00eefc" fillOpacity={1} fill="url(#colorFood)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex justify-between text-[8px] font-mono uppercase text-white/40 tracking-widest">
                <span>08:00</span>
                <span>Peak Load Predicted</span>
                <span>00:00</span>
              </div>
            </div>

            {/* Live Sathi Feed */}
            <div className="glass-panel p-8 rounded-[2rem] border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-lg font-black uppercase tracking-tighter">Live Sathi Feed</h3>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-[8px] font-mono text-green-500 uppercase">Live</span>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { name: 'Sathi Rahul', loc: 'Sector 4', status: 'Active' },
                  { name: 'Sathi Priya', loc: 'Mumbai', status: 'En Route' },
                ].map((sathi, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary-container/10 flex items-center justify-center text-secondary-container">
                        <Users size={14} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-white uppercase">{sathi.name}</div>
                        <div className="text-[8px] text-white/40 uppercase">{sathi.loc}</div>
                      </div>
                    </div>
                    <div className="text-[8px] font-mono text-secondary-container bg-secondary-container/10 px-2 py-0.5 rounded border border-secondary-container/20">
                      {sathi.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel p-8 rounded-[2rem] border border-white/10 flex-1">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-display text-lg font-black uppercase tracking-tighter">Suchna Pravah Gati</h3>
                <Activity size={18} className="text-secondary-container" />
              </div>
              <div className="h-40 w-full mb-8">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px', textTransform: 'uppercase' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#fff" strokeWidth={2} fill="url(#velocityGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-white/5 pb-4">
                  <span className="text-[10px] font-display font-bold uppercase tracking-widest text-white/40">Peak Processing</span>
                  <span className="text-sm font-mono font-bold tracking-tighter text-secondary-container">92.4%</span>
                </div>
                <div className="flex justify-between items-end border-b border-white/5 pb-4">
                  <span className="text-[10px] font-display font-bold uppercase tracking-widest text-white/40">Anomaly Detection</span>
                  <span className="text-sm font-mono font-bold tracking-tighter text-green-400">NOMINAL</span>
                </div>
              </div>
            </div>
            <div className="glass-panel p-8 rounded-[2rem] border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-lg font-black uppercase tracking-tighter">Intelligence Feed</h3>
                <div className="px-3 py-1 bg-white/5 rounded-full text-[9px] font-mono text-white/40 uppercase animate-pulse">Live Signal</div>
              </div>
              <div className="space-y-6">
                {liveReports.slice(0, 4).map(report => (
                  <div key={report.id} className="flex gap-4 group cursor-pointer">
                    <div className="w-1 rounded-full bg-white/10 group-hover:bg-secondary-container transition-colors"></div>
                    <div>
                      <div className="text-[10px] font-display font-bold uppercase tracking-widest mb-1 group-hover:text-white transition-colors">Incident: {report.location}</div>
                      <p className="text-[11px] text-white/40 line-clamp-1 font-mono uppercase">{report.text || "No details provided"}</p>
                    </div>
                  </div>
                ))}
                {liveReports.length === 0 && (
                  <div className="text-[10px] font-mono text-white/20 uppercase text-center py-4 tracking-widest">Awaiting signals...</div>
                )}
              </div>
            </div>
          </div>
        </Grid>

        {/* Priority Table */}
        <Grid item xs={12}>
          <div className="glass-panel p-8 md:p-12 rounded-[2.5rem] border border-white/10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div>
                <h2 className="text-2xl font-display font-black uppercase tracking-tighter mb-2">Prathmik Prayas Queue</h2>
                <div className="flex items-center gap-2">
                  <div className="px-2 py-0.5 bg-red-500/20 text-red-500 text-[8px] font-black uppercase tracking-[0.2em] rounded border border-red-500/20">Critical Focus Sakriya</div>
                  <span className="text-[10px] text-white/20 font-mono uppercase tracking-widest">Processing Layer: V12.0</span>
                </div>
              </div>
              <button className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors flex items-center gap-2">
                Export Strategic Data
                <ArrowUpRight size={14} />
              </button>
            </div>

            <TableContainer className="scrollbar-hide">
              <Table>
                <TableHead>
                  <TableRow>
                     <TableCell className="!border-white/5 !text-[10px] !font-display !font-bold !uppercase !tracking-widest !text-white/20">Target / Unit ID</TableCell>
                     <TableCell className="!border-white/5 !text-[10px] !font-display !font-bold !uppercase !tracking-widest !text-white/20">Need Vector</TableCell>
                     <TableCell className="!border-white/5 !text-[10px] !font-display !font-bold !uppercase !tracking-widest !text-white/20">Signal Score</TableCell>
                     <TableCell className="!border-white/5 !text-[10px] !font-display !font-bold !uppercase !tracking-widest !text-white/20">Status</TableCell>
                     <TableCell className="!border-white/5 !text-[10px] !font-display !font-bold !uppercase !tracking-widest !text-white/20 !text-right">Deployment</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {liveReports.map((row) => (
                    <TableRow key={row.id} className="group hover:bg-white/5 transition-colors">
                      <TableCell className="!border-white/5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-mono text-[10px] font-bold text-white/40 group-hover:text-white transition-colors">
                            {row.id.substring(0, 3)}
                          </div>
                          <div>
                            <div className="text-xs font-display font-bold uppercase tracking-wide group-hover:text-secondary-container transition-colors">{row.location}</div>
                            <div className="text-[9px] font-mono text-white/20 uppercase mt-1">ID: {row.id.substring(0, 8)}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="!border-white/5">
                        <span className="px-3 py-1 bg-white/5 rounded-full text-[9px] font-display font-bold uppercase tracking-widest text-white/40">
                          {row.needType?.[0] || 'GENERAL'}
                        </span>
                      </TableCell>
                      <TableCell className="!border-white/5">
                        <div className="flex items-center gap-4">
                          <span className={`text-[11px] font-mono font-black tracking-tighter ${row.urgencyScore > 8 ? 'text-red-400' : 'text-white/60'}`}>{row.urgencyScore?.toFixed(1) || '0.0'}</span>
                          <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(row.urgencyScore || 0) * 10}%` }}
                              className={`h-full ${row.urgencyScore > 8 ? 'bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.3)]' : 'bg-secondary-container'}`}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="!border-white/5">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${row.status === 'PENDING' ? 'bg-amber-400' : row.status === 'ACTIVE' ? 'bg-blue-400' : 'bg-green-400'}`}></span>
                          <span className="text-[10px] font-display font-bold uppercase tracking-widest text-white/40">{row.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="!border-white/5 !text-right">
                         <button 
                          disabled={row.status !== 'PENDING'}
                          onClick={async () => {
                            try {
                              const batch = [
                                updateDoc(doc(db, 'reports', row.id), { status: 'ACTIVE', updatedAt: serverTimestamp() }),
                                addDoc(collection(db, 'missions'), {
                                  reportId: row.id,
                                  location: row.location,
                                  type: row.needType?.[0] || 'GENERAL',
                                  severity: row.severity,
                                  urgencyScore: row.urgencyScore,
                                  status: 'PENDING',
                                  createdAt: serverTimestamp(),
                                  updatedAt: serverTimestamp(),
                                  adminId: 'SYSTEM-ALPHA'
                                })
                              ];
                              await Promise.all(batch);
                            } catch (error) {
                              console.error("Mission dispatch failed", error);
                            }
                          }}
                          className={`px-6 py-2 rounded-xl text-[9px] font-display font-black uppercase tracking-widest transition-all ${
                            row.status === 'PENDING' 
                            ? 'bg-white text-black hover:bg-secondary-container' 
                            : 'bg-white/5 text-white/20 cursor-not-allowed'
                          }`}
                        >
                          {row.status === 'PENDING' ? 'Authorize Unit' : 'Unit Assigned'}
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </Grid>
      </Grid>
      <TacticalAssistant />
    </div>
  );
}
