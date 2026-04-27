import React from 'react';
import { Grid } from '@mui/material';
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

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

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
    <div className="h-full font-sans bg-gray-50 text-gray-900 flex flex-col gap-6 p-0 md:p-0">
      {/* Strategic Header */}
      <div className="flex-shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-2 h-2 bg-blue-600 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600">National Data Sync Active</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-tight text-gray-900">National Command Center</h1>
          <p className="text-gray-500 font-semibold text-xs uppercase tracking-wider mt-2">Authority: CENTRAL CONTROL HUB v4.2</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="px-6 py-3 border border-gray-300 text-xs font-bold uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2 bg-white">
            <Download size={16} />
            Export Dossier
          </button>
          <button className="px-6 py-3 bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm">
            <Share2 size={16} />
            Share Protocol
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* National Heatmap Section */}
        <div className="bg-white flex-1 border border-gray-200 relative overflow-hidden shadow-sm min-h-[400px]">
        <div className="absolute top-8 left-8 z-10 pointer-events-none">
           <div className="pointer-events-auto flex items-center gap-4 bg-white px-6 py-3 border border-gray-200 shadow-sm">
              <div className="w-2 h-2 bg-red-500 animate-pulse" />
              <div className="text-xs font-bold uppercase tracking-widest text-gray-900">Real-Time National Matrix</div>
           </div>
        </div>

        <div className="absolute top-8 right-8 z-10 pointer-events-none">
           <div className="pointer-events-auto flex flex-col gap-2">
              {['HIGH', 'MEDIUM', 'LOW'].map(lvl => (
                <div key={lvl} className="bg-white px-4 py-2 flex items-center gap-3 border border-gray-200 shadow-sm text-[10px] font-bold uppercase text-gray-600">
                  <div className={`w-2 h-2 ${lvl === 'HIGH' ? 'bg-red-500' : lvl === 'MEDIUM' ? 'bg-amber-500' : 'bg-green-500'}`} />
                  {lvl} SEVERITY
                </div>
              ))}
           </div>
        </div>

        <div className="w-full h-full bg-gray-100">
          {isLoaded && GOOGLE_MAPS_API_KEY ? (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={indiaCenter}
              zoom={5}
              options={{
                disableDefaultUI: true,
                zoomControl: true,
                styles: [
                  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
                  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
                  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
                  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
                  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e9e9e9' }] },
                  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
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
                  <div className="p-4 min-w-[200px] bg-white text-gray-900 border border-gray-200">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-1">{selectedCluster.name} UNIT</div>
                    <div className="text-xl font-bold uppercase tracking-tight mb-4">{selectedCluster.count} Incidents</div>
                    <button className="w-full py-2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-colors">Analyze Sector Hub</button>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-6 text-gray-400">
              <Activity className="animate-spin" size={48} strokeWidth={1} />
              <div className="text-[10px] font-bold uppercase tracking-[0.2em]">Establishing Data Uplink...</div>
              {!GOOGLE_MAPS_API_KEY && <div className="text-[10px] text-red-500 uppercase font-bold">VITE_GOOGLE_MAPS_API_KEY MISSING</div>}
            </div>
          )}
        </div>
        </div>

        {/* Right Side Panel */}
        <div className="w-full lg:w-[400px] xl:w-[500px] flex flex-col gap-6 overflow-y-auto scrollbar-hide shrink-0 pb-6 lg:pb-0">
          {/* Global Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 gap-4">
            {[
              { label: 'National Safety Index', value: '7.8 / 10', icon: <Globe />, detail: 'UP 0.4 FROM Q2', color: '#10b981' },
              { label: 'Active Control Hubs', value: '528', icon: <MapPin />, detail: '9 NEW DEPLOYMENTS', color: '#3b82f6' },
              { label: 'Inter-State Coordination', value: '96.2%', icon: <Network />, detail: 'AI LAYER OPTIMIZED', color: '#f59e0b' }
            ].map((stat, i) => (
              <div key={i} className="bg-white p-6 border border-gray-200 flex items-center gap-4 hover:border-blue-400 group shadow-sm">
                 <div className="w-12 h-12 shrink-0 bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 group-hover:text-blue-600 transition-colors">
                    {React.isValidElement(stat.icon) && React.cloneElement(stat.icon as React.ReactElement<any>, { size: 24, strokeWidth: 1.5 })}
                 </div>
                 <div>
                   <div className="text-2xl font-bold uppercase tracking-tight text-gray-900">{stat.value}</div>
                   <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{stat.label}</div>
                 </div>
              </div>
            ))}
          </div>

          {/* Policy Analysis (AI) */}
          <div className="bg-white p-8 border border-gray-200 flex flex-col shadow-sm">
             <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 border border-blue-100 text-blue-600">
                    <Sparkles size={18} />
                  </div>
                  <h3 className="text-lg font-bold uppercase tracking-tight">Policy Analysis</h3>
                </div>
                <button onClick={handleGenerateSummary} disabled={isSummarizing || reports.length === 0} className="px-4 py-2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-sm">
                  {isSummarizing ? 'Scanning...' : 'Scan'}
                </button>
             </div>

             <div className="">
               {aiSummary ? (
                 <div className="text-xs font-medium text-gray-700 leading-relaxed space-y-4 whitespace-pre-wrap">
                   {aiSummary}
                 </div>
               ) : (
                 <div className="py-6 text-center border border-dashed border-gray-300">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Neural Analysis Required</p>
                 </div>
               )}
             </div>
          </div>
        </div>
      </div>


      {/* Social Impact Analytics — Looker Studio */}
      <LookerStudioEmbed />
    </div>
  );
}
