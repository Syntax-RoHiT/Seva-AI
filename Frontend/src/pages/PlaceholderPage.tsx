import React from 'react';
import { Settings } from 'lucide-react';

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="h-full font-sans text-gray-900 bg-gray-50 flex flex-col gap-6 p-0 md:p-0">
      {/* Header Area */}
      <div className="flex-shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-gray-900">{title}</h1>
        </div>
      </div>
      <div className="flex-1 bg-white border border-gray-200 flex flex-col items-center justify-center p-12 text-center">
        <div className="w-16 h-16 bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 mb-6">
          <Settings className="animate-[spin_4s_linear_infinite]" size={32} />
        </div>
        <h2 className="text-xl font-bold uppercase tracking-tight text-gray-900 mb-2">Module Offline</h2>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">This module is currently undergoing system integration.</p>
      </div>
    </div>
  );
}
