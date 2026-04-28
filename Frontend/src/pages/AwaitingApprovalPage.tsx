import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Clock, Mail, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AwaitingApprovalPage() {
  const { user, approved, signOut } = useAuth();
  const navigate = useNavigate();

  // If somehow they got approved, push to dashboard
  React.useEffect(() => {
    if (approved) navigate('/dashboard');
  }, [approved, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white border border-gray-200 p-10 shadow-sm relative">
        <div className="absolute top-0 inset-x-0 h-1 bg-amber-400" />

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <img src="/seva-ai-logo.png" alt="Seva AI Logo" className="w-10 h-10 object-contain" />
            <div className="text-xl font-bold tracking-tight text-blue-600">SEVA AI</div>
          </div>

          <div className="w-16 h-16 bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-6">
            <Clock size={32} className="text-amber-500" />
          </div>

          <h1 className="text-2xl font-bold uppercase tracking-wide mb-3 text-gray-900">
            Awaiting Approval
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed font-medium">
            Your account request has been received. An administrator will review and approve your access shortly.
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail size={16} className="text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-700">Account Details</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Email</span>
              <span className="text-xs font-semibold text-gray-700">{user?.email || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Name</span>
              <span className="text-xs font-semibold text-gray-700">{user?.displayName || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Status</span>
              <span className="px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
                Pending Review
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-colors"
          >
            Check Approval Status
          </button>
          <button
            onClick={async () => { await signOut(); navigate('/login'); }}
            className="w-full py-3 border border-gray-300 text-xs font-bold uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft size={14} />
            Back to Login
          </button>
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-6 font-medium">
          Need urgent access? Contact your NGO admin directly.
        </p>
      </div>
    </div>
  );
}
