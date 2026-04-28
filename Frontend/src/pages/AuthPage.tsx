import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowRight, User, Building2, Zap, Shield, Users, AlertCircle } from 'lucide-react';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';

type Tab = 'login' | 'signup';

export default function AuthPage({ initialTab = 'login' }: { initialTab?: Tab }) {
  const { signInWithEmail, signInWithGoogle, signInAsDemo, user, role, approved, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>(initialTab);

  // ── Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // ── Signup state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupRole, setSignupRole] = useState<UserRole>('NGO_ADMIN');
  const [signupOrg, setSignupOrg] = useState('');
  const [signupSkills, setSignupSkills] = useState<string[]>([]);
  const [showSignupPw, setShowSignupPw] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);

  const { signUpWithEmail } = useAuth();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (!loading && user) {
      if (!approved) {
        navigate('/awaiting-approval');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, approved, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      await signInWithEmail(loginEmail, loginPassword);
    } catch (err: any) {
      const code = err?.code || '';
      if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) {
        setLoginError('Invalid email or password.');
      } else if (code.includes('too-many-requests')) {
        setLoginError('Too many attempts. Try again later.');
      } else {
        setLoginError('Sign in failed. Please check your credentials.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoginError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setLoginError('Google sign-in failed. Please try again.');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');
    if (!signupName.trim()) { setSignupError('Full name is required.'); return; }
    if (signupPassword.length < 6) { setSignupError('Password must be at least 6 characters.'); return; }
    setSignupLoading(true);
    try {
      await signUpWithEmail(signupEmail, signupPassword, signupName, signupRole, signupOrg, signupSkills);
      navigate('/awaiting-approval');
    } catch (err: any) {
      const code = err?.code || '';
      if (code.includes('email-already-in-use')) {
        setSignupError('This email is already registered. Please sign in.');
      } else {
        setSignupError('Sign up failed. Please try again.');
      }
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-stretch font-sans">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-[480px] bg-gray-900 flex-col justify-between p-12 relative overflow-hidden shrink-0">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full"
            style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, #3b82f6 0%, transparent 60%), radial-gradient(circle at 80% 80%, #1d4ed8 0%, transparent 50%)' }}
          />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <img src="/seva-ai-logo.png" alt="Seva AI Logo" className="w-10 h-10 object-contain" />
            <div className="text-2xl font-bold tracking-tight text-white">SEVA AI</div>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-6 uppercase tracking-tight">
            Relief Operations<br />Command System
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed font-medium">
            Real-time disaster relief coordination powered by Gemma AI, the Hungarian Algorithm, and live Firestore intelligence.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            { icon: <Zap size={16} />, text: 'AI urgency scoring on every report' },
            { icon: <Shield size={16} />, text: 'Role-based access with admin approval' },
            { icon: <Users size={16} />, text: 'Hungarian Algorithm volunteer matching' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 text-gray-400">
              <div className="text-blue-400">{item.icon}</div>
              <span className="text-xs font-semibold uppercase tracking-wider">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel — Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          {/* Logo (mobile only) */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <img src="/seva-ai-logo.png" alt="Seva AI Logo" className="w-10 h-10 object-contain" />
            <div className="text-2xl font-bold tracking-tight text-gray-900">SEVA AI</div>
          </div>

          {/* Tabs */}
          <div className="flex border border-gray-200 mb-8 bg-white">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${tab === 'login' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setTab('signup')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${tab === 'signup' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Sign Up
            </button>
          </div>

          {/* ─── LOGIN TAB ─────────────────────────────────────────── */}
          {tab === 'login' && (
            <div className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-white border border-gray-200 pl-11 pr-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showLoginPw ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white border border-gray-200 pl-11 pr-12 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
                    />
                    <button type="button" onClick={() => setShowLoginPw(!showLoginPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showLoginPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {loginError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600">
                    <AlertCircle size={14} />
                    <span className="text-xs font-semibold">{loginError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3 bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
                >
                  {loginLoading ? 'Signing in...' : <><span>Sign In</span><ArrowRight size={16} /></>}
                </button>
              </form>

              <div className="relative flex items-center">
                <div className="flex-1 border-t border-gray-200" />
                <span className="px-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">or</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              <button
                onClick={handleGoogleSignIn}
                className="w-full bg-white border border-gray-300 text-gray-700 py-3 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors shadow-sm"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                Sign In with Google
              </button>

              {/* Demo Logins for Judges */}
              <div className="border-t border-gray-200 pt-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4 text-center">Demo Access (for Judges)</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => signInAsDemo('NGO_ADMIN')}
                    className="py-3 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold uppercase tracking-wider hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Shield size={14} />
                    NGO Admin
                  </button>
                  <button
                    onClick={() => signInAsDemo('VOLUNTEER')}
                    className="py-3 bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold uppercase tracking-wider hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Users size={14} />
                    Volunteer
                  </button>
                </div>
              </div>

              {/* Reporter link */}
              <div className="text-center border-t border-gray-200 pt-6">
                <p className="text-xs text-gray-500 font-medium mb-2">Field worker? No login needed.</p>
                <Link to="/report" className="text-xs font-bold text-blue-600 uppercase tracking-wider hover:text-blue-800 flex items-center justify-center gap-2">
                  <Zap size={14} />
                  Submit Emergency Report →
                </Link>
              </div>
            </div>
          )}

          {/* ─── SIGNUP TAB ─────────────────────────────────────────── */}
          {tab === 'signup' && (
            <div className="space-y-5">
              <div className="p-4 bg-amber-50 border border-amber-200 flex items-start gap-3">
                <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs font-semibold text-amber-700 leading-relaxed">
                  New accounts require admin approval before access is granted. You'll be notified once approved.
                </p>
              </div>

              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Full Name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={signupName}
                      onChange={e => setSignupName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full bg-white border border-gray-200 pl-11 pr-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={signupEmail}
                      onChange={e => setSignupEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-white border border-gray-200 pl-11 pr-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showSignupPw ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={signupPassword}
                      onChange={e => setSignupPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full bg-white border border-gray-200 pl-11 pr-12 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
                    />
                    <button type="button" onClick={() => setShowSignupPw(!showSignupPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showSignupPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Your Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { value: 'NGO_ADMIN', label: 'NGO Admin', desc: 'Manage relief ops', icon: <Shield size={18} /> },
                      { value: 'VOLUNTEER', label: 'Volunteer', desc: 'Field deployment', icon: <Users size={18} /> },
                    ] as { value: UserRole; label: string; desc: string; icon: React.ReactNode }[]).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSignupRole(opt.value)}
                        className={`p-4 border text-left transition-all ${signupRole === opt.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                      >
                        <div className={`mb-2 ${signupRole === opt.value ? 'text-blue-600' : 'text-gray-400'}`}>{opt.icon}</div>
                        <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${signupRole === opt.value ? 'text-blue-700' : 'text-gray-700'}`}>{opt.label}</div>
                        <div className="text-[10px] text-gray-500 font-medium">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {signupRole === 'NGO_ADMIN' && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Organization Name</label>
                    <div className="relative">
                      <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={signupOrg}
                        onChange={e => setSignupOrg(e.target.value)}
                        placeholder="Your NGO / organization"
                        className="w-full bg-white border border-gray-200 pl-11 pr-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                {signupRole === 'VOLUNTEER' && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Your Skills <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Medical', 'Rescue', 'Logistics', 'Shelter', 'Food', 'Water', 'Communication', 'Search'].map(skill => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => setSignupSkills(prev =>
                            prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
                          )}
                          className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border transition-all text-left ${
                            signupSkills.includes(skill)
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                    {signupSkills.length === 0 && (
                      <p className="text-[10px] text-red-500 font-semibold mt-1">Select at least one skill</p>
                    )}
                  </div>
                )}

                {signupError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600">
                    <AlertCircle size={14} />
                    <span className="text-xs font-semibold">{signupError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={signupLoading}
                  className="w-full py-3 bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
                >
                  {signupLoading ? 'Creating Account...' : <><span>Request Access</span><ArrowRight size={16} /></>}
                </button>
              </form>

              <div className="relative flex items-center">
                <div className="flex-1 border-t border-gray-200" />
                <span className="px-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">or</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              <button
                onClick={handleGoogleSignIn}
                className="w-full bg-white border border-gray-300 text-gray-700 py-3 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors shadow-sm"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                Sign Up with Google
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
