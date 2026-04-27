import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Settings as SettingsIcon, ShieldCheck } from 'lucide-react';

export default function SettingsPage() {
  const { user, role } = useAuth();

  return (
    <div className="h-full bg-gray-50 flex flex-col gap-6 font-sans">
      <div className="bg-white p-6 border border-gray-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-gray-900">System Settings</h1>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mt-1">Configuration & Identity</p>
        </div>
      </div>

      <div className="px-4 md:px-0">
        <div className="bg-white border border-gray-200 shadow-sm p-8 max-w-2xl">
          <div className="flex items-center gap-4 mb-8 border-b border-gray-200 pb-6">
            <div className="w-16 h-16 bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-200">
              <ShieldCheck size={32} />
            </div>
            <div>
              <div className="text-xl font-bold uppercase text-gray-900 tracking-tight">{user?.displayName || 'Operator'}</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-1">{role.replace('_', ' ')}</div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Email Address</label>
              <div className="p-3 bg-gray-50 border border-gray-200 text-sm font-medium text-gray-700">{user?.email}</div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">User ID (UID)</label>
              <div className="p-3 bg-gray-50 border border-gray-200 text-sm font-medium text-gray-700">{user?.uid}</div>
            </div>
            
            <button className="mt-4 px-6 py-3 bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-colors">
              Update Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
