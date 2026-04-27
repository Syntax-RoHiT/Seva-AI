import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { TrendingUp, Activity, Target } from 'lucide-react';
import { Grid } from '@mui/material';

export default function AnalyticsPage() {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'reports'), (snapshot) => {
      setReports(snapshot.docs.map(doc => doc.data()));
    });
    return () => unsub();
  }, []);

  const total = reports.length;
  const resolved = reports.filter(r => r.status === 'RESOLVED').length;
  const critical = reports.filter(r => (r.urgencyScore || 0) >= 8).length;

  return (
    <div className="h-full bg-gray-50 flex flex-col gap-6 font-sans">
      <div className="bg-white p-6 border border-gray-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-gray-900">System Analytics</h1>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mt-1">Real-time Performance Metrics</p>
        </div>
      </div>

      <div className="px-4 md:px-0">
        <Grid container spacing={4}>
          <Grid item xs={12} sm={4}>
            <div className="bg-white p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4 text-blue-600">
                <Target size={24} />
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Total Reports</span>
              </div>
              <div className="text-4xl font-bold text-gray-900">{total}</div>
            </div>
          </Grid>
          <Grid item xs={12} sm={4}>
            <div className="bg-white p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4 text-green-600">
                <Activity size={24} />
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Resolved Cases</span>
              </div>
              <div className="text-4xl font-bold text-gray-900">{resolved}</div>
            </div>
          </Grid>
          <Grid item xs={12} sm={4}>
            <div className="bg-white p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4 text-red-600">
                <TrendingUp size={24} />
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Critical Threats</span>
              </div>
              <div className="text-4xl font-bold text-gray-900">{critical}</div>
            </div>
          </Grid>
        </Grid>
      </div>
      
      <div className="flex-1 bg-white border border-gray-200 mx-4 md:mx-0 p-8 flex flex-col items-center justify-center text-gray-400">
        <TrendingUp size={48} className="mb-4 opacity-50" />
        <p className="text-xs font-bold uppercase tracking-widest">More detailed historical charts will be populated here.</p>
      </div>
    </div>
  );
}
