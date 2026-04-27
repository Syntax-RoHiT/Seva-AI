import React from 'react';
import { 
  TextField, 
  MenuItem, 
  Container, 
  Stack, 
  InputAdornment
} from '@mui/material';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import googleLogo from '../assets/google-logo.svg';

export default function AuthPage() {
  const { role, setRole, signInWithGoogle, user } = useAuth();
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
    <div className="bg-gray-50 text-gray-900 min-h-screen flex items-center justify-center p-4 relative font-sans">
      <Container maxWidth="xs" className="relative z-10">
        <div>
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-6 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-12 h-12 bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <ShieldCheck size={24} />
              </div>
              <div className="text-3xl font-bold tracking-tight text-blue-600">SEVA AI</div>
            </div>
            <h1 className="text-2xl font-bold mb-2 text-gray-900">System Authentication</h1>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">Authorized Access Only</p>
          </div>

          <div className="bg-white border border-gray-200 p-8 shadow-sm relative">
            <Stack spacing={4}>
              <div className="space-y-6">
                <TextField
                  select
                  fullWidth
                  variant="outlined"
                  label="Select Role"
                  value={role || 'NGO_ADMIN'}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  InputLabelProps={{ shrink: true, className: '!text-gray-600 !font-semibold !text-xs !uppercase !tracking-wider' }}
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 0,
                      '& fieldset': { borderColor: '#e5e7eb' },
                      '&:hover fieldset': { borderColor: '#3b82f6' },
                      '&.Mui-focused fieldset': { borderColor: '#2563eb' }
                    },
                    '& .MuiInputBase-input': { py: 1.5, fontSize: '14px', fontWeight: 500 }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <ShieldCheck size={18} className="text-gray-400 mr-2" />
                      </InputAdornment>
                    ),
                  }}
                >
                  <MenuItem value="NGO_ADMIN" className="!text-sm !font-medium">NGO Administrator</MenuItem>
                  <MenuItem value="VOLUNTEER" className="!text-sm !font-medium">Field Volunteer</MenuItem>
                  <MenuItem value="REPORTER" className="!text-sm !font-medium">Public Reporter</MenuItem>
                  <MenuItem value="GOVERNMENT" className="!text-sm !font-medium">Government Official</MenuItem>
                </TextField>
              </div>

              <div className="flex flex-col gap-4 mt-2">
                <button 
                  onClick={handleGoogleSignIn}
                  className="w-full bg-white border border-gray-300 text-gray-700 py-3 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  Sign In with Google
                </button>
                
                <p className="text-xs text-gray-500 text-center mt-2 font-medium">
                  Secure connection via Firebase Authentication
                </p>
              </div>
            </Stack>
          </div>
        </div>
      </Container>
    </div>
  );
}
