import React from 'react';
import { 
  Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { 
  TrendingUp, Users, Activity, ShieldAlert, ArrowUpRight,
  Navigation, Target, Cpu, CheckCircle2, XCircle, Clock
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, limit, addDoc, updateDoc, doc, serverTimestamp, deleteDoc, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import TacticalAssistant from '../../components/ai/TacticalAssistant';
import LiveHeatmap from '../../components/maps/LiveHeatmap';

export default function NGOAdminDashboard() {
  const { user, loading } = useAuth();
  
  const [tab, setTab] = React.useState<'DISPATCH' | 'APPROVALS'>('DISPATCH');
  
  const [liveReports, setLiveReports] = React.useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = React.useState<any[]>([]);
  const [activeVolunteersCount, setActiveVolunteersCount] = React.useState(0);
  const [totalProcessedCount, setTotalProcessedCount] = React.useState(0);

  // Live data listeners
  React.useEffect(() => {
    if (loading || !user) return;

    // 1. Live Reports
    const qReports = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(50));
    const unsubReports = onSnapshot(qReports, (snapshot) => {
      const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setLiveReports(reports);
      setTotalProcessedCount(reports.filter(r => r.status === 'RESOLVED').length);
    });

    // 2. Pending Approvals
    const qPending = query(collection(db, 'pendingUsers'), where('status', '==', 'PENDING_APPROVAL'));
    const unsubPending = onSnapshot(qPending, (snapshot) => {
      setPendingUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });

    // 3. Active Volunteers Count
    const qVols = query(collection(db, 'users'), where('role', '==', 'VOLUNTEER'), where('approved', '==', true));
    const unsubVols = onSnapshot(qVols, (snapshot) => {
      setActiveVolunteersCount(snapshot.size);
    });

    return () => {
      unsubReports();
      unsubPending();
      unsubVols();
    };
  }, [user, loading]);

  const activeTasksCount = liveReports.filter(r => r.status === 'PENDING' || r.status === 'DISPATCHED').length;
  const maxUrgency = liveReports.length > 0 ? Math.max(...liveReports.map(r => r.urgencyScore || 0)) : 0;
  const threatLevel = maxUrgency >= 8 ? 'CRITICAL' : maxUrgency >= 5 ? 'ELEVATED' : 'NOMINAL';

  const stats = [
    { label: 'Active Tasks', value: activeTasksCount.toString(), change: 'LIVE', color: '#3b82f6', icon: <Target size={20} /> },
    { label: 'Threat Level', value: threatLevel, change: maxUrgency.toFixed(1), color: threatLevel === 'CRITICAL' ? '#ef4444' : '#f59e0b', icon: <ShieldAlert size={20} /> },
    { label: 'Volunteers', value: activeVolunteersCount.toString(), change: 'READY', color: '#10b981', icon: <Users size={20} /> },
    { label: 'Resolutions', value: totalProcessedCount.toString(), change: 'TOTAL', color: '#8b5cf6', icon: <Activity size={20} /> },
  ];

  const handleApprove = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'pendingUsers', userId), { status: 'APPROVED' });
      await updateDoc(doc(db, 'users', userId), { approved: true });
    } catch (e) { console.error("Approval failed", e); }
  };

  const handleReject = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'pendingUsers', userId), { status: 'REJECTED' });
      await deleteDoc(doc(db, 'users', userId)); // Remove the user doc
    } catch (e) { console.error("Rejection failed", e); }
  };

  const handleSwarmCycle = async () => {
    // If VITE_SEVA_ENGINE_URL is missing from the GitHub Secrets, fallback to the production Cloud Run URL
    const url = import.meta.env.VITE_SEVA_ENGINE_URL || 'https://seva-backend-282246312713.asia-south1.run.app';
    try {
      const res = await fetch(`${url}/swarm-cycle`, { method: 'POST' });
      const data = await res.json();
      alert(`Algorithm Optimized: ${data.matched || 0} deployments created.`);
    } catch (error) {
      console.error("Swarm API failed", error);
      alert("Swarm Assembler API unavailable. Please ensure the backend is running and CORS is enabled.");
    }
  };

  const handleUnitDispatch = async () => {
    try {
      const pendingReport = liveReports.find(r => r.status === 'PENDING' || !r.status);
      if (!pendingReport) {
        alert("No pending tasks to dispatch!");
        return;
      }
      
      await updateDoc(doc(db, 'reports', pendingReport.id), {
        status: 'DISPATCHED',
        updatedAt: serverTimestamp()
      });
      alert(`Dispatch initiated for Report ID: ${pendingReport.id.substring(0,8)}`);
    } catch (err) {
      console.error(err);
      alert("Manual dispatch failed. Please check permissions.");
    }
  };

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
            onClick={handleSwarmCycle}
            className="px-6 py-3 border border-gray-300 text-xs tracking-widest font-bold uppercase hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700 bg-white"
          >
            <Cpu size={16} />
            Swarm Assembler
          </button>
          <button 
            onClick={handleUnitDispatch}
            className="px-6 py-3 bg-blue-600 text-white text-xs tracking-widest font-bold uppercase hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
          >
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
              <div className="bg-white p-6 border border-gray-200 relative group hover:border-blue-400 transition-colors shadow-sm">
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

      {/* Tabs */}
      <div className="px-4 md:px-0">
        <div className="flex border-b border-gray-200 mb-4 gap-8">
          <button 
            onClick={() => setTab('DISPATCH')}
            className={`pb-4 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 ${tab === 'DISPATCH' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            Live Dispatch Queue
          </button>
          <button 
            onClick={() => setTab('APPROVALS')}
            className={`pb-4 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 flex items-center gap-2 ${tab === 'APPROVALS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            Pending Approvals
            {pendingUsers.length > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] rounded-full">{pendingUsers.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Main Area */}
      {tab === 'DISPATCH' ? (
        <div className="flex-1 flex flex-col xl:flex-row gap-6 min-h-0 px-4 md:px-0 pb-6">
          <div className="flex-1 bg-white border border-gray-200 relative overflow-hidden shadow-sm min-h-[400px]">
            <LiveHeatmap />
          </div>

          <div className="w-full xl:w-[600px] flex flex-col shrink-0 bg-white border border-gray-200 shadow-sm min-h-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border-b border-gray-200 shrink-0">
              <div>
                <h2 className="text-xl font-bold uppercase tracking-tight mb-2 text-gray-900">Dispatch Queue</h2>
              </div>
            </div>

            <TableContainer className="scrollbar-hide flex-1 overflow-auto">
              <Table>
                <TableHead className="bg-gray-50">
                  <TableRow>
                    <TableCell className="!border-gray-200 !text-[10px] !font-bold !uppercase !tracking-widest !text-gray-500">Target</TableCell>
                    <TableCell className="!border-gray-200 !text-[10px] !font-bold !uppercase !tracking-widest !text-gray-500">Need</TableCell>
                    <TableCell className="!border-gray-200 !text-[10px] !font-bold !uppercase !tracking-widest !text-gray-500">Score</TableCell>
                    <TableCell className="!border-gray-200 !text-[10px] !font-bold !uppercase !tracking-widest !text-gray-500">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {liveReports.slice(0, 15).map((row) => (
                    <TableRow key={row.id} className="group hover:bg-gray-50 transition-colors">
                      <TableCell className="!border-gray-200">
                        <div className="text-xs font-bold uppercase tracking-wide text-gray-900">{row.locationDescription || 'Unknown'}</div>
                        <div className="text-[10px] font-semibold text-gray-400 uppercase mt-1">ID: {row.id.substring(0, 8)}</div>
                      </TableCell>
                      <TableCell className="!border-gray-200">
                        <span className="px-3 py-1 bg-gray-100 border border-gray-200 text-[10px] font-bold uppercase tracking-widest text-gray-600">
                          {row.needType?.[0] || 'GENERAL'}
                        </span>
                      </TableCell>
                      <TableCell className="!border-gray-200">
                        <span className={`text-xs font-bold tracking-tight ${row.urgencyScore >= 8 ? 'text-red-600' : 'text-gray-600'}`}>
                          {row.urgencyScore?.toFixed(1) || '0.0'}
                        </span>
                      </TableCell>
                      <TableCell className="!border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 ${row.status === 'PENDING' ? 'bg-amber-500' : row.status === 'DISPATCHED' ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">{row.status}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {liveReports.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="!border-gray-200 !text-center !py-8 !text-xs !font-bold !text-gray-400 !uppercase tracking-widest">
                        Queue Empty
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </div>
      ) : (
        // APPROVALS TAB
        <div className="bg-white border border-gray-200 shadow-sm mx-4 md:mx-0">
          <TableContainer>
            <Table>
              <TableHead className="bg-gray-50">
                <TableRow>
                  <TableCell className="!border-gray-200 !text-[10px] !font-bold !uppercase !tracking-widest !text-gray-500">User Details</TableCell>
                  <TableCell className="!border-gray-200 !text-[10px] !font-bold !uppercase !tracking-widest !text-gray-500">Requested Role</TableCell>
                  <TableCell className="!border-gray-200 !text-[10px] !font-bold !uppercase !tracking-widest !text-gray-500">Organization</TableCell>
                  <TableCell className="!border-gray-200 !text-[10px] !font-bold !uppercase !tracking-widest !text-gray-500 !text-right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingUsers.map(user => (
                  <TableRow key={user.uid}>
                    <TableCell className="!border-gray-200">
                      <div className="text-xs font-bold text-gray-900 uppercase">{user.displayName}</div>
                      <div className="text-[10px] font-semibold text-gray-500 mt-1">{user.email}</div>
                    </TableCell>
                    <TableCell className="!border-gray-200">
                      <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-[10px] font-bold uppercase tracking-widest text-blue-700">
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell className="!border-gray-200 text-xs font-semibold text-gray-600 uppercase">
                      {user.organization || '—'}
                    </TableCell>
                    <TableCell className="!border-gray-200 !text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleApprove(user.uid)}
                          className="p-2 bg-green-50 text-green-600 hover:bg-green-100 transition-colors border border-green-200"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleReject(user.uid)}
                          className="p-2 bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-200"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {pendingUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="!border-gray-200 !text-center !py-12">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <CheckCircle2 size={32} className="mb-2 opacity-50" />
                        <span className="text-xs font-bold uppercase tracking-widest">No pending approvals</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      )}

      <TacticalAssistant />
    </div>
  );
}
