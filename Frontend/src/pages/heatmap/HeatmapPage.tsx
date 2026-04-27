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
  CRITICAL: '#EF4444',
  HIGH:     '#F97316',
  MODERATE: '#F59E0B',
  LOW:      '#22C55E',
  RESOLVED: '#3B82F6',
};

function ZoneBadge({ label, count }: { label: string; count: number }) {
  const color = ZONE_COLORS[label as keyof typeof ZONE_COLORS] || '#fff';
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/5 group hover:border-white/10 transition-all">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[10px] font-display font-bold uppercase tracking-widest text-white/60">{label}</span>
      </div>
      <span className="text-sm font-mono font-black tracking-tighter" style={{ color }}>
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
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-red-400">
              Live Urgency Intelligence
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black uppercase tracking-tighter">
            Khatra Heatmap
          </h1>
          <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest mt-1">
            {reports.length} active signals • Auto-updates every 15 min
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-5 py-3 rounded-xl glass-panel border-white/5 flex items-center gap-3">
            <Layers size={14} className="text-secondary-container" />
            <span className="text-[10px] font-display font-bold uppercase tracking-widest">
              Urgency Decay Engine: <span className="text-secondary-container">ACTIVE</span>
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
        <div className="flex flex-col gap-4">
          {/* Zone Counts */}
          <div className="glass-panel p-6 rounded-[2rem] border border-white/10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-sm font-black uppercase tracking-tighter">Zone Status</h3>
              <Eye size={14} className="text-white/20" />
            </div>
            <div className="space-y-2">
              {(Object.entries(zones) as [string, number][]).map(([label, count]) => (
                <ZoneBadge key={label} label={label} count={count} />
              ))}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="glass-panel p-6 rounded-[2rem] border border-white/10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-sm font-black uppercase tracking-tighter">System Metrics</h3>
              <Activity size={14} className="text-secondary-container" />
            </div>
            <div className="space-y-4">
              {[
                { label: 'Total Signals', value: loading ? '...' : String(reports.length), color: 'text-white' },
                { label: 'Avg Urgency Score', value: loading ? '...' : avgScore, color: 'text-secondary-container' },
                { label: 'Critical Zones', value: loading ? '...' : String(zones.CRITICAL), color: 'text-red-400' },
                { label: 'Resource Gaps', value: loading ? '...' : String(reports.filter(r => r.resourceGap).length), color: 'text-amber-400' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-[10px] font-display font-bold uppercase tracking-widest text-white/30">{item.label}</span>
                  <span className={`text-base font-mono font-black tracking-tighter ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Critical Incidents */}
          <div className="glass-panel p-6 rounded-[2rem] border border-red-500/20 bg-red-500/5 flex-1">
            <div className="flex items-center gap-3 mb-5">
              <ShieldAlert size={14} className="text-red-400" />
              <h3 className="font-display text-sm font-black uppercase tracking-tighter text-red-400">
                Priority Queue
              </h3>
            </div>
            {topCritical.length === 0 ? (
              <div className="text-[10px] font-mono text-white/20 uppercase text-center py-6 tracking-widest">
                {loading ? 'Scanning...' : 'No critical zones active'}
              </div>
            ) : (
              <div className="space-y-3">
                {topCritical.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex gap-3 group cursor-pointer"
                  >
                    <div className="w-0.5 rounded-full bg-red-500/30 group-hover:bg-red-400 transition-colors shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[9px] font-display font-bold uppercase tracking-widest text-red-400 mb-0.5">
                        Score: {r.urgencyScore?.toFixed(1)}
                      </div>
                      <div className="text-[10px] font-mono text-white/50 truncate">
                        {r.summary || r.text || 'No details'}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Urgency Formula Legend */}
          <div className="glass-panel p-6 rounded-[2rem] border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <Zap size={14} className="text-secondary-container" />
              <h3 className="font-display text-[11px] font-black uppercase tracking-tighter">Decay Formula</h3>
            </div>
            <div className="text-[11px] font-mono text-secondary-container/80 leading-relaxed">
              U = S × (1 + T/12) × Z + R + W
            </div>
            <div className="mt-3 space-y-1.5 text-[9px] font-mono text-white/30 uppercase tracking-widest">
              <div>S = Base Severity (1–5)</div>
              <div>T = Hours Unresolved</div>
              <div>Z = Zone Density (1.0–2.0)</div>
              <div>R = Repeat Report Bonus</div>
              <div>W = Weather Risk (+0.5–1.5)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
