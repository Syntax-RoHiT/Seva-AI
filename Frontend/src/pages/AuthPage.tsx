import React from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  MenuItem, 
  Container, 
  Stack, 
  alpha,
  InputAdornment
} from '@mui/material';
import { Mail, Lock, ShieldCheck, MailQuestion, ArrowRight, Zap, Target, Users, MapPin, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { role, setRole, signInWithGoogle, signInAsDemo, user } = useAuth();
  const [isLogin, setIsLogin] = React.useState(true);
  const [email, setEmail] = React.useState('koustubh@sevaai.com');
  const [password, setPassword] = React.useState('password');
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      if (role === 'REPORTER') navigate('/report');
      else navigate('/dashboard');
    }
  }, [user, role, navigate]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="bg-black text-on-background min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-body-md selection:bg-secondary-container selection:text-on-secondary-container">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0 opacity-10 bg-[radial-gradient(#00eefc_1px,transparent_1px)] [background-size:20px_20px]"></div>
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-secondary-container/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-error/5 rounded-full blur-[150px] pointer-events-none text-error/20"></div>

      <Container maxWidth="sm" className="relative z-10">
        <motion.div
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8 }}
        >
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-6 cursor-pointer" onClick={() => navigate('/')}>
              <motion.div 
                 whileHover={{ scale: 1.1, rotate: 5 }}
                 className="w-12 h-12 bg-white text-black rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(0,238,252,0.3)]"
              >
                <ShieldCheck size={24} className="text-secondary-container" />
              </motion.div>
              <div className="text-3xl font-h1 font-black uppercase tracking-tighter text-white">SEVA AI</div>
            </div>
            <h1 className="font-h2 text-4xl font-black uppercase tracking-tighter mb-2 text-white">Suraksha Kendra Pravesh</h1>
            <p className="font-mono-data text-white/40 uppercase text-[9px] tracking-[0.3em] font-bold">Suraksha Authorization Required</p>
          </div>

          <div className="glass-panel border border-white/10 bg-white/[0.02] backdrop-blur-xl rounded-2xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
            {/* Minimalist Tab Switcher */}
            <div className="flex gap-8 mb-10 border-b border-white/5">
              <button 
                onClick={() => setIsLogin(true)}
                className={`pb-4 font-label-caps text-[10px] tracking-widest font-bold uppercase transition-all ${isLogin ? 'text-secondary-container border-b-2 border-secondary-container shadow-[0_4px_12px_rgba(0,238,252,0.2)]' : 'text-white/40'}`}
              >
                Pehchan (Login)
              </button>
              <button 
                onClick={() => setIsLogin(false)}
                className={`pb-4 font-label-caps text-[10px] tracking-widest font-bold uppercase transition-all ${!isLogin ? 'text-secondary-container border-b-2 border-secondary-container shadow-[0_4px_12px_rgba(0,238,252,0.2)]' : 'text-white/40'}`}
              >
                Naya Operator
              </button>
            </div>

            <Stack spacing={4}>
              <div className="space-y-6">
                <TextField
                  fullWidth
                  variant="standard"
                  label="OPERATOR EMAIL ID"
                  value={email || ''}
                  onChange={(e) => setEmail(e.target.value)}
                  InputLabelProps={{ shrink: true, className: '!text-secondary-container !font-h1 !text-[10px] !tracking-widest !font-bold !uppercase' }}
                  sx={{ 
                    '& .MuiInput-root': { color: 'white', '&:before': { borderColor: 'rgba(255,255,255,0.1)' }, '&:hover:not(.Mui-disabled):before': { borderColor: 'rgba(255,255,255,0.3)' }, '&:after': { borderColor: '#00eefc' } },
                    '& .MuiInput-input': { py: 1.5, fontSize: '14px', fontFamily: '"JetBrains Mono", monospace' }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Mail size={16} className="text-white/30 mr-2" />
                      </InputAdornment>
                    ),
                  }}
                />
                
                <TextField
                  fullWidth
                  variant="standard"
                  label="SURAKSHA KEY"
                  type="password"
                  value={password || ''}
                  onChange={(e) => setPassword(e.target.value)}
                  InputLabelProps={{ shrink: true, className: '!text-secondary-container !font-h1 !text-[10px] !tracking-widest !font-bold !uppercase' }}
                  sx={{ 
                    '& .MuiInput-root': { color: 'white', '&:before': { borderColor: 'rgba(255,255,255,0.1)' }, '&:hover:not(.Mui-disabled):before': { borderColor: 'rgba(255,255,255,0.3)' }, '&:after': { borderColor: '#00eefc' } },
                    '& .MuiInput-input': { py: 1.5, fontSize: '14px', fontFamily: '"JetBrains Mono", monospace' }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock size={16} className="text-white/30 mr-2" />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  select
                  fullWidth
                  variant="standard"
                  label="SANCHALAN PAD (ROLE)"
                  value={role || 'NGO_ADMIN'}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  InputLabelProps={{ shrink: true, className: '!text-secondary-container !font-h1 !text-[10px] !tracking-widest !font-bold !uppercase' }}
                  sx={{ 
                    '& .MuiInput-root': { color: 'white', '&:before': { borderColor: 'rgba(255,255,255,0.1)' }, '&:after': { borderColor: '#00eefc' } },
                    '& .MuiInput-input': { py: 1.5, fontSize: '13px', fontFamily: 'Outfit, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em' }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <ShieldCheck size={16} className="text-white/30 mr-2" />
                      </InputAdornment>
                    ),
                  }}
                >
                  <MenuItem value="NGO_ADMIN" className="!font-h1 !text-[11px] !uppercase !tracking-wider">NGO Prabandhak</MenuItem>
                  <MenuItem value="VOLUNTEER" className="!font-h1 !text-[11px] !uppercase !tracking-wider">Seva Sathi</MenuItem>
                  <MenuItem value="REPORTER" className="!font-h1 !text-[11px] !uppercase !tracking-wider">Jan Reporter</MenuItem>
                  <MenuItem value="GOVERNMENT" className="!font-h1 !text-[11px] !uppercase !tracking-wider">Sarkar Adhikari</MenuItem>
                  <MenuItem value="SUPER_ADMIN" className="!font-h1 !text-[11px] !uppercase !tracking-wider">Mukhya Admin</MenuItem>
                </TextField>
              </div>

              <div className="flex flex-col gap-4 mt-4">
                <button 
                  onClick={handleGoogleSignIn}
                  className="w-full bg-white text-black py-4 rounded-xl font-h1 text-[11px] tracking-widest font-black uppercase flex items-center justify-center gap-3 hover:bg-secondary-container transition-all active:scale-95 group shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(0,238,252,0.3)]"
                >
                  Cloud Se Login Karein
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
                
                <p className="font-mono-data text-[10px] text-white/30 text-center uppercase tracking-[0.2em]">
                  Secure Layer Enabled • 256-bit AES
                </p>

                <div className="mt-8 pt-8 border-t border-white/5">
                  <div className="text-[9px] font-h1 font-black text-secondary-container uppercase tracking-[0.3em] mb-6 text-center opacity-80">Judge Terminal // Rapid Deployment Protocol</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[ 
                      { label: 'NGO Admin', role: 'NGO_ADMIN' as UserRole, icon: <Target size={14} /> },
                      { label: 'Volunteer', role: 'VOLUNTEER' as UserRole, icon: <Users size={14} /> },
                      { label: 'Government', role: 'GOVERNMENT' as UserRole, icon: <Globe size={14} /> },
                      { label: 'Reporter', role: 'REPORTER' as UserRole, icon: <MapPin size={14} /> },
                    ].map((demo) => (
                      <button
                        key={demo.role}
                        onClick={() => signInAsDemo(demo.role)}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-secondary-container/30 hover:bg-white/10 transition-all group scale-100 active:scale-95"
                      >
                        <div className="text-white/40 group-hover:text-secondary-container transition-colors">{demo.icon}</div>
                        <div className="text-[8px] font-h1 font-bold uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">{demo.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Stack>
          </div>
        </motion.div>
      </Container>
    </div>
  );
}
