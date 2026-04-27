import React from 'react';
import { motion } from 'motion/react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  Radio, Activity, ShieldAlert, Target, Zap,
  TrendingUp, Eye, Globe, Layers
} from 'lucide-react';
import LiveHeatmap from '../../components/maps/LiveHeatmap';

const ZONE_COLORS = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MODERATE: '#f59e0b',
  LOW:      '#22c55e',
  RESOLVED: '#3b82f6',
};

function ZoneBadge({ label, count }: { label: string; count: number }) {
  const color = ZONE_COLORS[label as keyof typeof ZONE_COLORS] || '#333';
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 group hover:border-gray-300 transition-colors shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2" style={{ backgroundColor: color }} />
        <span className="text-xs font-bold uppercase tracking-widest text-gray-600">{label}</span>
      </div>
      <span className="text-sm font-bold tracking-tight" style={{ color }}>
        {count}
      </span>
    </div>
  );
}

export default function HeatmapPage() {
  const [reports, setReports] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('urgencyScore', 'desc'), limit(100));
    const unsub = onSnapshot(q, snap => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  // Zone counts
  const zones = {
    CRITICAL: reports.filter(r => r.urgencyScore >= 8).length,
    HIGH:     reports.filter(r => r.urgencyScore >= 6 && r.urgencyScore < 8).length,
    MODERATE: reports.filter(r => r.urgencyScore >= 4 && r.urgencyScore < 6).length,
    LOW:      reports.filter(r => r.urgencyScore >= 2 && r.urgencyScore < 4).length,
    RESOLVED: reports.filter(r => r.urgencyScore < 2 || r.status === 'RESOLVED').length,
  };

  const topCritical = reports.filter(r => r.urgencyScore >= 8).slice(0, 5);
  const avgScore = reports.length
    ? (reports.reduce((s, r) => s + (r.urgencyScore || 0), 0) / reports.length).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-8 font-sans bg-gray-50 min-h-screen p-6 text-gray-900">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-8 border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-2 h-2 bg-red-600 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-red-600">
              Live Urgency Intelligence
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-tight text-gray-900">
            Threat Heatmap
          </h1>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mt-2">
            {reports.length} active signals • Auto-updates every 15 min
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-5 py-3 bg-gray-50 border border-gray-200 flex items-center gap-3 shadow-sm">
            <Layers size={16} className="text-blue-600" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
              Urgency Engine: <span className="text-blue-600">ACTIVE</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Map — takes 3/4 width */}
        <div className="xl:col-span-3">
          <LiveHeatmap />
        </div>

        {/* Sidebar Panel */}
        <div className="flex flex-col gap-6">
          {/* Zone Counts */}
          <div className="bg-white p-8 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold uppercase tracking-wide text-gray-900">Zone Status</h3>
              <Eye size={18} className="text-gray-400" />
            </div>
            <div className="space-y-3">
              {(Object.entries(zones) as [string, number][]).map(([label, count]) => (
                <ZoneBadge key={label} label={label} count={count} />
              ))}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="bg-white p-8 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold uppercase tracking-wide text-gray-900">System Metrics</h3>
              <Activity size={18} className="text-blue-600" />
            </div>
            <div className="space-y-4">
              {[
                { label: 'Total Signals', value: loading ? '...' : String(reports.length), color: 'text-gray-900' },
                { label: 'Avg Urgency Score', value: loading ? '...' : avgScore, color: 'text-blue-600' },
                { label: 'Critical Zones', value: loading ? '...' : String(zones.CRITICAL), color: 'text-red-600' },
                { label: 'Resource Gaps', value: loading ? '...' : String(reports.filter(r => r.resourceGap).length), color: 'text-amber-500' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center border-b border-gray-200 pb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{item.label}</span>
                  <span className={`text-base font-bold tracking-tight ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Critical Incidents */}
          <div className="bg-red-50 p-8 border border-red-200 shadow-sm flex-1">
            <div className="flex items-center gap-3 mb-6">
              <ShieldAlert size={18} className="text-red-600" />
              <h3 className="text-lg font-bold uppercase tracking-wide text-red-600">
                Priority Queue
              </h3>
            </div>
            {topCritical.length === 0 ? (
              <div className="text-xs font-bold text-gray-500 uppercase text-center py-6 tracking-widest">
                {loading ? 'Scanning...' : 'No critical zones active'}
              </div>
            ) : (
              <div className="space-y-4">
                {topCritical.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex gap-4 group cursor-pointer bg-white p-4 border border-red-100 hover:border-red-300 transition-colors shadow-sm"
                  >
                    <div className="w-1 bg-red-200 group-hover:bg-red-500 transition-colors shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-red-600 mb-1">
                        Score: {r.urgencyScore?.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-600 truncate font-medium">
                        {r.summary || r.text || 'No details'}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Urgency Formula Legend */}
          <div className="bg-white p-8 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <Zap size={16} className="text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-900">Decay Formula</h3>
            </div>
            <div className="text-xs font-bold text-blue-700 bg-blue-50 p-3 border border-blue-100 mb-4 tracking-wider text-center">
              U = S × (1 + T/12) × Z + R + W
            </div>
            <div className="space-y-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              <div className="flex justify-between"><span>S = Base Severity</span><span>(1–5)</span></div>
              <div className="flex justify-between"><span>T = Hours Unresolved</span><span></span></div>
              <div className="flex justify-between"><span>Z = Zone Density</span><span>(1.0–2.0)</span></div>
              <div className="flex justify-between"><span>R = Repeat Bonus</span><span></span></div>
              <div className="flex justify-between"><span>W = Weather Risk</span><span>(+0.5–1.5)</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
