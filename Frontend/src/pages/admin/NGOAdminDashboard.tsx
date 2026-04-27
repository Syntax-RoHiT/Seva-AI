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
import { 
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import TacticalAssistant from '../../components/ai/TacticalAssistant';
import { runSwarmMatch } from '../../services/matchingService';
import LiveHeatmap from '../../components/maps/LiveHeatmap';
import { useAuth } from '../../context/AuthContext';

const stats = [
  { label: 'Active Tasks', value: '42', change: '+12%', color: '#3b82f6', icon: <Target size={20} /> },
  { label: 'Threat Level', value: 'CRITICAL', change: 'ELEVATED', color: '#ef4444', icon: <ShieldAlert size={20} /> },
  { label: 'Volunteers', value: '1,420', change: '+84', color: '#10b981', icon: <Users size={20} /> },
  { label: 'Data Ingestion', value: '12.4TB', change: '+2.1TB', color: '#f59e0b', icon: <Activity size={20} /> },
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
    <div className="h-full font-sans text-gray-900 bg-gray-50 flex flex-col gap-6 p-0 md:p-0">
      {/* Header Area */}
      <div className="flex-shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 border border-gray-200 shadow-sm">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="w-2 h-2 bg-blue-600 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-widest text-blue-600">Command Center Online</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight uppercase text-gray-900">Control Hub</h1>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mt-2">Secure Link Established • Node: XE-901</p>
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
                alert(`Algorithm Optimized ${matches.length} deployments.`);
              } catch (error) {
                console.error("Matching failed", error);
              }
            }}
            className="px-6 py-3 border border-gray-300 text-xs tracking-widest font-bold uppercase hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700 bg-white"
          >
            <Cpu size={16} />
            Auto Assign
          </button>
          <button className="px-6 py-3 bg-blue-600 text-white text-xs tracking-widest font-bold uppercase hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm">
            <Navigation size={16} />
            Unit Dispatch
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="flex-shrink-0 px-4 md:px-0 w-full">
      <Grid container spacing={4}>
        {stats.map((stat, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <div 
              className="bg-white p-6 border border-gray-200 relative group hover:border-blue-400 transition-colors shadow-sm"
            >
              <div className="absolute top-0 left-0 w-1 h-0 group-hover:h-full transition-all duration-300" style={{ backgroundColor: stat.color }}></div>
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gray-50 border border-gray-200 text-gray-500 group-hover:text-gray-900 transition-colors">
                  {stat.icon}
                </div>
                <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">{stat.change}</span>
              </div>
              <div className="text-3xl font-bold uppercase tracking-tight mb-1 text-gray-900">{stat.value}</div>
              <div className="text-xs font-bold uppercase tracking-widest text-gray-500">{stat.label}</div>
            </div>
          </Grid>
        ))}
      </Grid>
      </div>

      {/* Bento Grid Main */}
      <div className="flex-1 flex flex-col xl:flex-row gap-6 min-h-0 px-4 md:px-0 pb-6">
        {/* Live Urgency Heatmap */}
        <div className="flex-1 bg-white border border-gray-200 relative overflow-hidden shadow-sm min-h-[400px]">
          <LiveHeatmap />
        </div>

        {/* Priority Table */}
        <div className="w-full xl:w-[600px] flex flex-col shrink-0 bg-white border border-gray-200 shadow-sm min-h-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border-b border-gray-200 shrink-0">
              <div>
                <h2 className="text-xl font-bold uppercase tracking-tight mb-2 text-gray-900">Dispatch Queue</h2>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wider border border-red-200">Critical Focus Active</div>
                </div>
              </div>
              <button className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-2 border border-gray-200 px-4 py-2 hover:bg-gray-50">
                Export Data
                <ArrowUpRight size={14} />
              </button>
            </div>

            <TableContainer className="scrollbar-hide flex-1 overflow-auto">
              <Table>
                <TableHead className="bg-gray-50">
                  <TableRow>
                     <TableCell className="!border-gray-200 !text-[10px] !font-bold !uppercase !tracking-widest !text-gray-500">Target / Unit ID</TableCell>
                     <TableCell className="!border-gray-200 !text-[10px] !font-bold !uppercase !tracking-widest !text-gray-500">Need Vector</TableCell>
                     <TableCell className="!border-gray-200 !text-[10px] !font-bold !uppercase !tracking-widest !text-gray-500">Signal Score</TableCell>
                     <TableCell className="!border-gray-200 !text-[10px] !font-bold !uppercase !tracking-widest !text-gray-500">Status</TableCell>
                     <TableCell className="!border-gray-200 !text-[10px] !font-bold !uppercase !tracking-widest !text-gray-500 !text-right">Deployment</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {liveReports.map((row) => (
                    <TableRow key={row.id} className="group hover:bg-gray-50 transition-colors">
                      <TableCell className="!border-gray-200">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 group-hover:text-blue-600 transition-colors uppercase">
                            {row.id.substring(0, 3)}
                          </div>
                          <div>
                            <div className="text-xs font-bold uppercase tracking-wide text-gray-900 group-hover:text-blue-600 transition-colors">{row.locationDescription || row.location || 'Unknown'}</div>
                            <div className="text-[10px] font-semibold text-gray-400 uppercase mt-1">ID: {row.id.substring(0, 8)}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="!border-gray-200">
                        <span className="px-3 py-1 bg-gray-100 border border-gray-200 text-[10px] font-bold uppercase tracking-widest text-gray-600">
                          {row.needType?.[0] || 'GENERAL'}
                        </span>
                      </TableCell>
                      <TableCell className="!border-gray-200">
                        <div className="flex items-center gap-4">
                          <span className={`text-xs font-bold tracking-tight ${row.urgencyScore > 8 ? 'text-red-600' : 'text-gray-600'}`}>{row.urgencyScore?.toFixed(1) || '0.0'}</span>
                          <div className="w-24 h-2 bg-gray-100 overflow-hidden">
                            <div 
                              style={{ width: `${(row.urgencyScore || 0) * 10}%` }}
                              className={`h-full ${row.urgencyScore > 8 ? 'bg-red-500' : 'bg-blue-600'}`}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="!border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 ${row.status === 'PENDING' ? 'bg-amber-500' : row.status === 'ACTIVE' ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">{row.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="!border-gray-200 !text-right">
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
                          className={`px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm ${
                            row.status === 'PENDING' 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
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
      </div>
      <TacticalAssistant />
    </div>
  );
}
