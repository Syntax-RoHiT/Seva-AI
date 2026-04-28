import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  Map, 
  Users, 
  Brain, 
  ShieldAlert,
  ArrowRight,
  Database,
  Cloud,
  Cpu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="bg-white text-gray-900 font-sans min-h-screen relative selection:bg-blue-100 selection:text-blue-900">
      
      {/* Header */}
      <header 
        className={`fixed top-0 w-full z-50 transition-all duration-300 flex justify-between items-center px-6 py-4 border-b ${
          isScrolled ? 'bg-white/95 backdrop-blur-sm border-gray-200 shadow-sm' : 'bg-white border-transparent'
        }`}
      >
        <div 
          className="text-2xl font-bold tracking-tight text-blue-600 cursor-pointer flex items-center gap-2" 
          onClick={() => navigate('/')}
        >
          <img src="/seva-ai-logo.png" alt="Seva AI Logo" className="w-8 h-8 object-contain" />
          SEVA AI
        </div>
        

        <div className="flex items-center gap-4">
          
          {user ? (
            <div className="flex items-center gap-3">
               <div className="hidden sm:block text-right">
                 <div className="text-xs font-bold text-gray-900 leading-tight">{user.displayName || 'User'}</div>
                 <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Active Session</div>
               </div>
               {user.photoURL && (
                 <img src={user.photoURL} alt="Profile" className="w-8 h-8 border border-gray-200 bg-gray-50 object-cover" />
               )}
               <button 
                onClick={() => navigate('/dashboard')}
                className="bg-blue-600 text-white px-5 py-2 font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-sm ml-2"
               >
                 Back to Dashboard
               </button>
            </div>
          ) : (
            <button 
              onClick={() => navigate('/login')}
              className="bg-blue-600 text-white px-6 py-2 font-medium text-sm border border-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
            >
              Login
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 space-y-8">
          <div className="inline-block bg-blue-50 text-blue-700 px-3 py-1 text-xs font-semibold uppercase tracking-wider border border-blue-100">
            Emergency Coordination System
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight text-gray-900">
            Intelligent Disaster Response & Recovery
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed max-w-2xl">
            Seva AI uses advanced Agentic Reasoning and Edge AI to process field reports offline, 
            predict crisis hotspots, and instantly match volunteers to critical tasks in real-time.
          </p>
          
          <div className="flex flex-wrap gap-4 pt-4">
            <button 
              onClick={() => navigate('/report')}
              className="bg-red-600 text-white px-8 py-3 font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              Report Emergency <ArrowRight size={18} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 relative w-full">
          <div className="aspect-[4/3] flex items-center justify-center overflow-hidden relative">
             <img 
               src="https://static.vecteezy.com/system/resources/thumbnails/001/875/313/small/social-support-activities-free-vector.jpg" 
               alt="Social Support Activities" 
               className="w-full h-full object-cover"
             />
          </div>
        </div>
      </section>

      {/* Powered By Section */}
      <section className="py-12 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-8">Powered By Google Cloud Services</p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-70 hover:opacity-100 transition-opacity duration-300">
            <div className="flex items-center gap-3 font-bold text-gray-600">
              <Database className="text-amber-500" size={24} /> Firebase
            </div>
            <div className="flex items-center gap-3 font-bold text-gray-600">
              <Cloud className="text-blue-500" size={24} /> Google Cloud Run
            </div>
            <div className="flex items-center gap-3 font-bold text-gray-600">
              <Cpu className="text-purple-500" size={24} /> Vertex AI
            </div>
            <div className="flex items-center gap-3 font-bold text-gray-600">
              <Brain className="text-green-500" size={24} /> Gemma Edge AI
            </div>
          </div>
        </div>
      </section>

      {/* User Flows Section */}
      <section id="how-it-works" className="py-24 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-block bg-blue-50 text-blue-700 px-3 py-1 text-xs font-semibold uppercase tracking-wider border border-blue-100 mb-4">Detailed Guide Flow</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">A System Built for Every Role</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Seamless coordination from the field to the command center.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Field Worker */}
            <div className="bg-white p-8 border border-gray-200 hover:border-blue-300 transition-colors">
              <div className="bg-blue-50 w-12 h-12 flex items-center justify-center mb-6">
                <AlertTriangle size={24} className="text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Field Workers</h3>
              <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                Log reports offline using Edge AI. Take photos or voice notes in low-bandwidth areas, and our on-device model extracts the core needs instantly.
              </p>
              <Link to="/report" className="text-blue-600 font-semibold text-sm flex items-center gap-1 hover:gap-2 transition-all">
                Try Reporter App <ArrowRight size={16} />
              </Link>
            </div>

            {/* NGO Admin */}
            <div className="bg-white p-8 border border-gray-200 hover:border-red-300 transition-colors">
              <div className="bg-red-50 w-12 h-12 flex items-center justify-center mb-6">
                <Map size={24} className="text-red-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">NGO Admins</h3>
              <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                Oversee the entire city. View a live predictive heatmap of critical zones and use Agentic Reasoning to strategize deployment dynamically.
              </p>
              <Link to="/dashboard" className="text-red-600 font-semibold text-sm flex items-center gap-1 hover:gap-2 transition-all">
                Access Dashboard <ArrowRight size={16} />
              </Link>
            </div>

            {/* Volunteer */}
            <div className="bg-white p-8 border border-gray-200 hover:border-green-300 transition-colors">
              <div className="bg-green-50 w-12 h-12 flex items-center justify-center mb-6">
                <Users size={24} className="text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Volunteers</h3>
              <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                Get matched to tasks optimally. Our backend algorithm pairs you with the most urgent needs within your 2km radius.
              </p>
              <Link to="/login" className="text-green-600 font-semibold text-sm flex items-center gap-1 hover:gap-2 transition-all">
                Join as Volunteer <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-gray-900 font-bold">
            <img src="/seva-ai-logo.png" alt="Seva AI Logo" className="w-6 h-6 object-contain" />
            SEVA AI
          </div>
          <p className="text-sm text-gray-500">
            Built for Google Solution Challenge 2026.
          </p>
        </div>
      </footer>
    </div>
  );
}
