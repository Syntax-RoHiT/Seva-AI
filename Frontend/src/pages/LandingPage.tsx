import React from 'react';
import { motion } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Bell, 
  Network, 
  ShieldAlert, 
  Route, 
  Hourglass, 
  EyeOff, 
  Smartphone, 
  Pointer, 
  MapPin, 
  Users, 
  Navigation, 
  Cloud, 
  Map, 
  Brain, 
  Lock,
  Zap,
  ChevronRight,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isScrolled, setIsScrolled] = React.useState(false);
  const mouseX = React.useRef(0);
  const mouseY = React.useRef(0);
  const [gradientPos, setGradientPos] = React.useState({ x: 0, y: 0 });

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.current = e.clientX;
      mouseY.current = e.clientY;
      setGradientPos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="bg-black text-on-surface font-body-md selection:bg-secondary-container selection:text-on-secondary-container overflow-x-hidden min-h-screen relative">
      {/* Mouse Follow Glow */}
      <div 
        className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-1000"
        style={{
          background: `radial-gradient(circle 400px at ${gradientPos.x}px ${gradientPos.y}px, rgba(0, 238, 252, 0.07), transparent 80%)`,
        }}
      />
      {/* TopAppBar */}
      <header 
        className={`fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-in-out flex justify-between items-center px-4 sm:px-10 py-3 sm:py-4 ${
          isScrolled 
            ? 'top-0 w-full max-w-full rounded-none border-b border-white/10 bg-black/80 backdrop-blur-3xl shadow-xl' 
            : 'top-4 md:top-6 w-[92%] max-w-6xl rounded-full border border-white/10 bg-black/60 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.8)]'
        }`}
      >
        <div className="text-xl sm:text-2xl font-black tracking-tighter text-white font-h1 cursor-pointer" onClick={() => navigate('/')}>SEVA AI</div>
        <nav className="hidden md:flex items-center gap-4 lg:gap-6 xl:gap-8">
          <Link to="/heatmap" className="font-h1 uppercase tracking-widest text-[8px] lg:text-[9px] xl:text-[10px] font-semibold text-white/40 hover:text-white transition-all duration-300">Suraksha Mesh</Link>
          <Link to="/dashboard" className="font-h1 uppercase tracking-widest text-[8px] lg:text-[9px] xl:text-[10px] font-semibold text-white/40 hover:text-white transition-all duration-300">Mukhya Ikai</Link>
          <Link to="/heatmap" className="font-h1 uppercase tracking-widest text-[8px] lg:text-[9px] xl:text-[10px] font-semibold text-white/40 hover:text-white transition-all duration-300">Aapda Atlas</Link>
          <Link to="/analytics" className="font-h1 uppercase tracking-widest text-[8px] lg:text-[9px] xl:text-[10px] font-semibold text-white/40 hover:text-white transition-all duration-300">Niti Kendra</Link>
        </nav>
        <div className="flex items-center gap-3 sm:gap-6">
          <button 
            onClick={() => navigate('/report')}
            className="hidden lg:flex items-center gap-2 bg-error/10 text-error px-4 py-2 rounded-full font-label-caps text-[10px] font-bold border border-error/20 hover:bg-error hover:text-white transition-all duration-300"
          >
            <AlertTriangle size={12} />
            REPORT INCIDENT
          </button>
          <div className="hidden sm:flex gap-4">
            <Bell size={18} className="text-white/40 hover:text-white cursor-pointer" />
            <Network size={18} className="text-white/40 hover:text-white cursor-pointer" />
          </div>
          <button 
            onClick={() => navigate(user ? '/dashboard' : '/login')}
            className="bg-white text-black px-4 sm:px-6 py-2 rounded-full font-label-caps text-[10px] sm:text-xs font-bold hover:bg-secondary-container transition-colors duration-300 whitespace-nowrap"
          >
            {user ? 'Kendra Control' : 'Niyantran Login'}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[100svh] w-full flex items-center justify-center overflow-hidden pt-20">
      {/* Video Hero background */}
      <video 
        autoPlay 
        muted 
        playsInline 
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-60 scale-110"
      >
        <source src="/119843-719443761.mp4" type="video/mp4" />
      </video>
      
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20 pointer-events-none z-10"></div>

        <div className="relative z-20 text-center px-6 max-w-5xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 mb-6 px-3 sm:px-4 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md"
          >
            <span className="w-2 h-2 rounded-full bg-secondary-container pulse-cyan relative">
              <span className="absolute inset-0 rounded-full bg-secondary-container animate-ping opacity-75"></span>
            </span>
            <span className="font-mono-data text-[8px] sm:text-[10px] uppercase tracking-[0.2em] text-secondary-container">System Status: Active Monitoring</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="font-h1 text-white text-5xl sm:text-7xl md:text-8xl lg:text-9xl mb-4 tracking-tighter uppercase font-black"
          >
            SEVA AI
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="font-h2 text-white/60 text-lg sm:text-xl md:text-3xl mb-10 font-light"
          >
            Cognitive Command for Crisis Response
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <button 
              onClick={() => navigate('/login')}
              className="bg-white text-black px-8 sm:px-10 py-3 sm:py-4 rounded-lg font-label-caps text-xs sm:text-sm font-bold hover:bg-secondary-container transition-all duration-300 scale-100 active:scale-95"
            >
              Sahayta Alert
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="bg-transparent border border-white/20 text-white px-8 sm:px-10 py-3 sm:py-4 rounded-lg font-label-caps text-xs sm:text-sm font-bold hover:border-white/60 transition-all duration-300"
            >
              Niti Manual
            </button>
          </motion.div>
        </div>
      </section>

      {/* Real Problem Section */}
      <section className="py-20 sm:py-24 px-6 sm:px-12 bg-black relative">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 sm:mb-16">
            <h2 className="font-h2 text-white text-3xl sm:text-4xl mb-4 uppercase font-bold leading-tight">Jab aapda aati hai, <br className="sm:hidden" /><span className="text-error">deri se jaan jaati hai.</span></h2>
            <div className="w-20 sm:w-24 h-1 bg-error/40"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Problem Card 1 */}
            <div className="glass-panel p-6 sm:p-8 group hover:border-error/40 transition-all duration-500 rounded-xl bg-white/[0.02]">
              <ShieldAlert className="text-error mb-4 block w-8 h-8 sm:w-10 h-10" />
              <h3 className="font-h3 text-white mb-2 uppercase font-bold text-base sm:text-lg">Suchna Ka Abhav</h3>
              <p className="font-body-md text-white/40 text-xs sm:text-sm">Aapda ke samay fragments mein suchna milne se mukhya data kho jata hai.</p>
            </div>
            {/* Problem Card 2 */}
            <div className="glass-panel p-6 sm:p-8 group hover:border-error/40 transition-all duration-500 rounded-xl bg-white/[0.02]">
              <Route className="text-error mb-4 block w-8 h-8 sm:w-10 h-10" />
              <h3 className="font-h3 text-white mb-2 uppercase font-bold text-base sm:text-lg">No Real-time Coordination</h3>
              <p className="font-body-md text-white/40 text-xs sm:text-sm">Purane maps aur reporting se responders ko sahi sthiti ka pata nahi chalta.</p>
            </div>
            {/* Problem Card 3 */}
            <div className="glass-panel p-6 sm:p-8 group hover:border-error/40 transition-all duration-500 rounded-xl bg-white/[0.02]">
              <Hourglass className="text-error mb-4 block w-8 h-8 sm:w-10 h-10" />
              <h3 className="font-h3 text-white mb-2 uppercase font-bold text-base sm:text-lg">Slow Manual Allocation</h3>
              <p className="font-body-md text-white/40 text-xs sm:text-sm">Human errors aur deri se har second mein survival ka khatra badhta hai.</p>
            </div>
            {/* Problem Card 4 */}
            <div className="glass-panel p-6 sm:p-8 group hover:border-error/40 transition-all duration-500 rounded-xl bg-white/[0.02]">
              <EyeOff className="text-error mb-4 block w-8 h-8 sm:w-10 h-10" />
              <h3 className="font-h3 text-white mb-2 uppercase font-bold text-base sm:text-lg">Lack of Visibility</h3>
              <p className="font-body-md text-white/40 text-xs sm:text-sm">Sahi distribution na hone se kuch jagah zyada sahayta jaati hai aur kuch reh jaati hain.</p>
            </div>
          </div>
          <div className="mt-20 sm:mt-24 text-center">
            <p className="font-h1 text-white text-4xl sm:text-6xl md:text-8xl uppercase tracking-tighter font-black opacity-30">SEVA AI Badalti Hai Yeh.</p>
          </div>
        </div>
      </section>

      {/* User Flow Section */}
      <section className="py-20 sm:py-24 px-6 sm:px-12 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-h2 text-white text-center text-3xl sm:text-4xl mb-16 sm:mb-24 uppercase font-bold">The Lifecycle of a Rescue</h2>
          <div className="relative">
            {/* Vertical Line for desktop */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/5 hidden md:block"></div>
            <div className="space-y-12 sm:space-y-16">
              {/* Step 1 */}
              <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-12">
                <div className="md:w-1/2 md:text-right text-center">
                  <h3 className="font-h3 text-white text-lg sm:text-xl uppercase font-bold">App Kholein</h3>
                  <p className="text-white/40 text-[13px] sm:text-sm">Kam bandwidth mein bhi turant loading.</p>
                </div>
                <div className="relative z-10 w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-black border border-white/20 flex items-center justify-center shrink-0">
                  <Smartphone className="text-secondary-container w-5 sm:w-6 h-5 sm:h-6" />
                </div>
                <div className="md:w-1/2"></div>
              </div>
              {/* Step 2 */}
              <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-12">
                <div className="md:w-1/2 md:order-1 order-2"></div>
                <div className="relative z-10 w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-black border border-white/20 flex items-center justify-center shrink-0 md:order-2 order-1">
                  <Pointer className="text-secondary-container w-5 sm:w-6 h-5 sm:h-6" />
                </div>
                <div className="md:w-1/2 text-left text-center md:text-left md:order-3 order-3">
                  <h3 className="font-h3 text-white text-lg sm:text-xl uppercase font-bold">Sahayta Alert Dabayein</h3>
                  <p className="text-white/40 text-[13px] sm:text-sm">Emergency trigger jo har koi dekh sake.</p>
                </div>
              </div>
              {/* Step 3 */}
              <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-12">
                <div className="md:w-1/2 md:text-right text-center">
                  <h3 className="font-h3 text-white text-lg sm:text-xl uppercase font-bold">Location Share Karein</h3>
                  <p className="text-white/40 text-[13px] sm:text-sm">Offline mode mein bhi sahi GPS pinning.</p>
                </div>
                <div className="relative z-10 w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-black border border-white/20 flex items-center justify-center shrink-0">
                  <MapPin className="text-secondary-container w-5 sm:w-6 h-5 sm:h-6" />
                </div>
                <div className="md:w-1/2"></div>
              </div>
              {/* Step 4 */}
              <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-12">
                <div className="md:w-1/2 md:order-1 order-2"></div>
                <div className="relative z-10 w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-black border border-white/20 flex items-center justify-center shrink-0 md:order-2 order-1">
                  <Users className="text-secondary-container w-5 sm:w-6 h-5 sm:h-6" />
                </div>
                <div className="md:w-1/2 text-left text-center md:text-left md:order-3 order-3">
                  <h3 className="font-h3 text-white text-lg sm:text-xl uppercase font-bold">Sankhya Batayein</h3>
                  <p className="text-white/40 text-[13px] sm:text-sm">Kitne logon ko sahayta chahiye, isse priority taya hoti hai.</p>
                </div>
              </div>
              {/* Step 5 */}
              <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-12">
                <div className="md:w-1/2 md:text-right text-center">
                  <h3 className="font-h3 text-white text-lg sm:text-xl uppercase font-bold">Submit & Track</h3>
                  <p className="text-white/40 text-[13px] sm:text-sm">Rescue team ka real-time ETA aur update.</p>
                </div>
                <div className="relative z-10 w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-black border border-white/20 flex items-center justify-center shrink-0">
                  <Navigation className="text-secondary-container w-5 sm:w-6 h-5 sm:h-6" />
                </div>
                <div className="md:w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* User Personas Section */}
      <section className="py-20 sm:py-24 px-6 sm:px-12 bg-black">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-label-caps text-white/40 mb-10 sm:mb-12 text-center tracking-[0.2em] sm:tracking-[0.3em] font-bold text-sm">SANCHALAN SAMAGRI (STAKEHOLDERS)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Persona 1 */}
            <div className="bg-[#0A0A0A] border border-white/5 p-8 rounded-xl flex flex-col items-center text-center group hover:border-secondary-container/20 transition-all">
              <div className="w-16 h-16 rounded-full overflow-hidden mb-4 border border-white/10">
                <img 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" 
                  alt="Citizen" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDrCrCq5EjU0ZwrrXQgz-zbvR7f5oGY0p0sX_hC3O_arhW9hDgq8Grwjs1tZ1xLweVIy7Pa7F45IWw2Olsty7BXp0Px9gCRgKMiynZ1DpxYdk-gK60BdT7Uk_N_Pt-jmc45WtGvd2_WgCN9W3sXSszx5S38fz1Kc3_xZ_9sMmqkSmoU6L-NGwXxGcAdm9pWdl6SuVzGaj1yGYVVlNXZBHHb_gyu5TDUOE9_fin98K9iurFfOskngXJsOWziM0dCw14d5gqWTFDdv-Qs" 
                />
              </div>
              <h4 className="font-h3 text-white uppercase font-bold text-lg">Jan Reporter</h4>
              <p className="text-[10px] text-secondary-container uppercase mb-3 font-mono">End User</p>
              <p className="text-white/40 text-xs">Help ke liye empowered aur har update se su-sajjit.</p>
            </div>
            {/* Persona 2 */}
            <div className="bg-[#0A0A0A] border border-white/5 p-8 rounded-xl flex flex-col items-center text-center group hover:border-secondary-container/20 transition-all">
              <div className="w-16 h-16 rounded-full overflow-hidden mb-4 border border-white/10">
                <img 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" 
                  alt="NGO" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDX_kyggJ60via3HE8VA_P-SHh9E6h979phguJ1eQPOmITR4M2tZybbqxcAdRCPx2RUofeRmyWuBF7H0V_58XmnxHkWOtdGUWoqmOG1KdNl8KAw5vu138t0FAwhDZ40AdQOp-LssfgWHqPxp3Ponud4-s1KRXgdDcj0HMqZsXRdPitXQOWC_nAQHVNh7u7jXeGxslEIk1dkYB0smJWRCyUGI4PlyAtdAMw9-Fd5MPyJDORkm68xFRKfpX3OQAQLgPwk-Ch0uYsD-RTD" 
                />
              </div>
              <h4 className="font-h3 text-white uppercase font-bold text-lg">NGO Prabandhak</h4>
              <p className="text-[10px] text-secondary-container uppercase mb-3 font-mono">Coordinators</p>
              <p className="text-white/40 text-xs">AI support ke saath logistics ko handle karte hue.</p>
            </div>
            {/* Persona 3 */}
            <div className="bg-[#0A0A0A] border border-white/5 p-8 rounded-xl flex flex-col items-center text-center group hover:border-secondary-container/20 transition-all">
              <div className="w-16 h-16 rounded-full overflow-hidden mb-4 border border-white/10">
                <img 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" 
                  alt="Volunteer" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBAsfUMi2Iy97SJeFrSgwh-vs1OUV98GEFD7DVDruLPzi22SXJY1g1dwi7W8f3P_Mnzpl9s4xUyE_6czvzNtgEOSZVK4H1y4n79C6MvDBiZRtwopWSdLkbCtJ80qKjt3U7vBZz6n4P9QfmYTP4gUBk-OPm_-Gtj4RkqpBGFTYcM_BLQWrdZiL3GD0wNqr8mPzK9scNLgLYJynb3bVIaKgqhbGppw52k7aRxeWF7MqosmvTnMPXVezlVBS-4iEgDK_oKeGA8kGhdIaeZ" 
                />
              </div>
              <h4 className="font-h3 text-white uppercase font-bold text-lg">Seva Sathi</h4>
              <p className="text-[10px] text-secondary-container uppercase mb-3 font-mono">The Frontline</p>
              <p className="text-white/40 text-xs">Sahi jagah pe direct deployment, kam deri aur zyada seva.</p>
            </div>
            {/* Persona 4 */}
            <div className="bg-[#0A0A0A] border border-white/5 p-8 rounded-xl flex flex-col items-center text-center group hover:border-secondary-container/20 transition-all">
              <div className="w-16 h-16 rounded-full overflow-hidden mb-4 border border-white/10">
                <img 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" 
                  alt="Govt" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA1QJWwYFuaCR-DEF0dWwLYM7VJndaCdmYNW-MpyMRVBRv3t6yeiTP9RqbjF4d_SVo9AKXqznkeeujzOdLmXlOi3pnIin7sFrz9hJZP3mzQ2bCG1LivgcMm_Snlt0tR144JNDRG6UVqrf82ogBT2ssMA3bwdelC9leE7QzRLSVKJ9-bUFZjFOP3SO9FtJkuu2IWz2k_wMUKQimlObvB3Wweqwj0FNE1WM2QRs8obEG65kl4OlfkexoJyxi7H61bT1RZegLqkF5giVYc" 
                />
              </div>
              <h4 className="font-h3 text-white uppercase font-bold text-lg">Sarkar Adhikari</h4>
              <p className="text-[10px] text-secondary-container uppercase mb-3 font-mono">Policy & Command</p>
              <p className="text-white/40 text-xs">National level metrics par nazar aur resources ka badlav.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Technology */}
      <section className="py-20 sm:py-24 px-6 sm:px-12 bg-surface-container-lowest overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-12 lg:gap-20 items-center">
          <div className="lg:order-1 order-2 lg:w-1/2">
            <h2 className="font-h2 text-white text-3xl sm:text-4xl mb-8 uppercase font-bold">NGOs ke liye. <br className="sm:hidden" />Aapda se bachav ke liye.</h2>
            <p className="font-body-lg text-white/60 mb-10 text-base sm:text-lg">Hamara stack zero-latency aur 99.9% uptime ke liye design kiya gaya hai. Hum sirf software nahi, mission-critical infrastructure banate hain.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                  <Cloud className="text-white" size={20} />
                </div>
                <span className="font-mono-data text-xs uppercase tracking-widest text-white/60">Firebase Cloud</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                  <Map className="text-white" size={20} />
                </div>
                <span className="font-mono-data text-xs uppercase tracking-widest text-white/60">Google Maps SDK</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                  <Brain className="text-white" size={20} />
                </div>
                <span className="font-mono-data text-xs uppercase tracking-widest text-white/60">AI Engine V4</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                  <Lock className="text-white" size={20} />
                </div>
                <span className="font-mono-data text-xs uppercase tracking-widest text-white/60">AES-256 Command</span>
              </div>
            </div>
          </div>
          <div className="lg:order-2 order-1 lg:w-1/2 relative w-full mb-12 lg:mb-0">
            <div className="absolute inset-0 bg-secondary-container/10 blur-3xl rounded-full"></div>
            <div className="relative glass-panel rounded-2xl p-6 sm:p-8 border-white/20 bg-white/[0.03]">
              <div className="flex justify-between items-center mb-6">
                <span className="font-label-caps text-secondary-container text-[10px] sm:text-xs font-bold uppercase tracking-widest">Real-time Infrastructure</span>
                <span className="text-[10px] text-white/30 font-mono">PING: 14MS</span>
              </div>
              <div className="space-y-4">
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '75%' }} transition={{ duration: 2 }} className="h-full bg-secondary-container shadow-[0_0_10px_rgba(0,238,252,0.5)]"></motion.div>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '50%' }} transition={{ duration: 2, delay: 0.5 }} className="h-full bg-secondary-container shadow-[0_0_10px_rgba(0,238,252,0.5)]"></motion.div>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '83.33%' }} transition={{ duration: 2, delay: 1 }} className="h-full bg-secondary-container shadow-[0_0_10px_rgba(0,238,252,0.5)]"></motion.div>
                </div>
              </div>
              <div className="mt-8 grid grid-cols-3 gap-4">
                <div className="h-16 sm:h-20 bg-white/5 rounded border border-white/10 flex flex-col items-center justify-center gap-1 group/item">
                  <div className="text-[8px] font-mono text-white/20 uppercase">Core</div>
                  <div className="text-[10px] font-display font-black text-secondary-container uppercase">Online</div>
                </div>
                <div className="h-16 sm:h-20 bg-white/5 rounded border border-white/10 flex flex-col items-center justify-center gap-1">
                  <div className="text-[8px] font-mono text-white/20 uppercase">Mesh</div>
                  <div className="text-[10px] font-display font-black text-secondary-container uppercase">Sync</div>
                </div>
                <div className="h-16 sm:h-20 bg-white/5 rounded border border-white/10 flex flex-col items-center justify-center gap-1">
                  <div className="text-[8px] font-mono text-white/20 uppercase">Auth</div>
                  <div className="text-[10px] font-display font-black text-secondary-container uppercase">Valid</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 pt-16 sm:pt-20 pb-10 bg-black">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 flex flex-col md:flex-row justify-between items-center md:items-end gap-10">
          <div className="w-full md:w-auto text-center md:text-left">
            <div className="text-2xl font-bold text-white font-h1 mb-4 flex items-center justify-center md:justify-start gap-2">
              <Zap size={24} className="text-secondary-container" />
              SEVA AI
            </div>
            <nav className="flex flex-wrap justify-center md:justify-start gap-6 mb-8">
              <a className="font-h1 text-[10px] tracking-tight uppercase text-white/30 hover:text-white transition-colors" href="#">About</a>
              <a className="font-h1 text-[10px] tracking-tight uppercase text-white/30 hover:text-white transition-colors" href="#">Contact</a>
              <a className="font-h1 text-[10px] tracking-tight uppercase text-white/30 hover:text-white transition-colors" href="#">Docs</a>
              <a className="font-h1 text-[10px] tracking-tight uppercase text-white/30 hover:text-white transition-colors" href="#">Careers</a>
            </nav>
            <div className="text-[10px] tracking-tight uppercase text-white/30 font-h1">
              © 2026 SEVA AI. ALL SYSTEMS OPERATIONAL.
            </div>
          </div>
          <div className="flex flex-col items-center md:items-end gap-2 shrink-0">
            <div className="flex gap-4 items-center">
              <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse"></span>
              <span className="text-[10px] font-mono text-white/40 uppercase">Global Node Active: INDIA_KENDRA</span>
            </div>
            <div className="text-[10px] font-mono text-white/20">LATENCY: 12ms / THREAT: LOW</div>
          </div>
        </div>
      </footer>
    </div>
  );
}


