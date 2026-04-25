import React from 'react';
import { 
  Box, 
  IconButton, 
  Typography, 
  Avatar, 
  Badge, 
  Drawer, 
  alpha,
  Stack,
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  Bell, 
  Search, 
  LayoutDashboard, 
  Map as MapIcon, 
  Users, 
  UsersRound, 
  ShieldAlert, 
  ShieldCheck,
  Settings, 
  LogOut,
  ChevronRight,
  TrendingUp,
  MessageSquare,
  AlertTriangle,
  Server,
  Globe,
  Sparkles,
  Zap,
  Activity,
  Send,
  Loader2,
  X as CloseIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { chatWithAssistant } from '../../services/geminiService';

interface Message {
  role: 'user' | 'model';
  content: string;
}

interface ShellProps {
  children: React.ReactNode;
  role: UserRole;
}

const SIDEBAR_WIDTH = 260;

export default function Shell({ children, role }: ShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = React.useState(false);
  const [chatMessage, setChatMessage] = React.useState('');
  const [chatHistory, setChatHistory] = React.useState<Message[]>([
    { role: 'model', content: "Namaste! Seva AI Sahayak online hai. Main aaj aapki sahayta kaise kar sakta hoon?" }
  ]);
  const [isTyping, setIsTyping] = React.useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    if (aiDrawerOpen) {
      scrollToBottom();
    }
  }, [chatHistory, aiDrawerOpen]);

  const handleSendChat = async () => {
    if (!chatMessage.trim() || isTyping) return;

    const userMessage = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      // Convert history to Gemini format
      const geminiHistory = chatHistory.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      const response = await chatWithAssistant(userMessage, geminiHistory);
      setChatHistory(prev => [...prev, { role: 'model', content: response }]);
    } catch (error) {
      console.error("AI Assistant Error:", error);
      setChatHistory(prev => [...prev, { role: 'model', content: "Error establishing tactical uplink. Please retry." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const menuItems = React.useMemo(() => {
    const common = [
      { text: 'Niyantran Kendra', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
      { text: 'Public Portal', icon: <Globe size={20} />, path: '/' },
      { text: 'Settings', icon: <Settings size={20} />, path: '/settings' },
    ];

    switch (role) {
      case 'NGO_ADMIN':
        return [
          { text: 'Niyantran Kendra', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
          { text: 'Aapda Map', icon: <MapIcon size={20} />, path: '/heatmap' },
          { text: 'Aapda Signals', icon: <AlertTriangle size={20} />, path: '/cases' },
          { text: 'Seva Sathis', icon: <Users size={20} />, path: '/volunteers' },
          { text: 'Team Samuh', icon: <UsersRound size={20} />, path: '/teams' },
          { text: 'Pradarshan', icon: <TrendingUp size={20} />, path: '/analytics' },
          { text: 'Sanchalan Config', icon: <Settings size={20} />, path: '/settings' },
        ];
      case 'VOLUNTEER':
        return [
          { text: 'Seva Deck', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
          { text: 'Active Abhiyan', icon: <ShieldAlert size={20} />, path: '/tasks' },
          { text: 'Samagri List', icon: <Server size={20} />, path: '/inventory' },
          ...common,
        ];
      case 'GOVERNMENT':
        return [
          { text: 'Rashtriya Oversight', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
          { text: 'Desh Ka Heatmap', icon: <Globe size={20} />, path: '/heatmap' },
          { text: 'Niti Kendra', icon: <Settings size={20} />, path: '/policy' },
          { text: 'Niti Review', icon: <TrendingUp size={20} />, path: '/reports' },
          ...common,
        ];
      case 'REPORTER':
        return [
          { text: 'Suchna Terminal', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
          { text: 'Active Reports', icon: <AlertTriangle size={20} />, path: '/my-reports' },
          ...common,
        ];
      case 'SUPER_ADMIN':
        return [
          { text: 'Mukhya Control', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
          { text: 'Sadasya Mesh', icon: <Users size={20} />, path: '/users' },
          { text: 'System Logs', icon: <Activity size={20} />, path: '/logs' },
          ...common,
        ];
      default:
        return common;
    }
  }, [role]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const Sidebar = () => (
    <div className="h-full flex flex-col bg-[#050505] border-r border-white/5 pt-8">
      <div className="px-8 mb-10 flex items-center gap-3">
        <div className="w-8 h-8 bg-secondary-container rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,186,199,0.3)]">
          <ShieldCheck size={18} className="text-black" />
        </div>
        <div className="font-display font-black uppercase tracking-tighter text-xl text-white">Seva AI</div>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        <div className="px-4 mb-4 text-[10px] font-display font-bold uppercase tracking-[0.2em] text-white/20">Sanchalan Control</div>
        {menuItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.text}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-display text-[11px] tracking-widest font-bold uppercase transition-all group ${
                active 
                  ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className={`${active ? 'text-black' : 'text-current opacity-40 group-hover:opacity-100'}`}>
                {item.icon}
              </span>
              {item.text}
              {active && <motion.div layoutId="nav-dot" className="ml-auto w-1.5 h-1.5 rounded-full bg-black" />}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="p-4 rounded-xl bg-white/5 border border-white/5 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <Activity size={14} className="text-secondary-container" />
            <span className="text-[10px] font-display font-bold uppercase tracking-widest text-secondary-container">System Live</span>
          </div>
          <div className="text-[10px] text-white/40 font-mono text-[9px]">LATENCY: 14MS</div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-xl font-display text-[11px] tracking-widest font-bold uppercase text-red-500/60 hover:text-red-500 hover:bg-red-500/5 transition-all"
        >
          <LogOut size={20} />
          Terminate
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#000000] text-on-background flex overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[260px] flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile Drawer */}
      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{ className: "w-[260px] !bg-transparent" }}
      >
        <Sidebar />
      </Drawer>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-6 md:px-10 z-30 bg-[#000000]/80 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <IconButton 
              onClick={() => setMobileOpen(true)}
              className="lg:!hidden !text-white"
            >
              <MenuIcon />
            </IconButton>
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/5">
              <Search size={16} className="text-white/30" />
              <input 
                type="text" 
                placeholder="SYSTEM KHOJEIN..." 
                className="bg-transparent border-none outline-none text-[11px] font-display tracking-widest font-bold uppercase w-48 text-white placeholder:text-white/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-4 mr-4">
              <Badge variant="dot" color="error">
                <Bell size={20} className="text-white/40 hover:text-white cursor-pointer transition-colors" />
              </Badge>
              <MessageSquare 
                size={20} 
                className={`cursor-pointer transition-colors ${aiDrawerOpen ? 'text-secondary-container' : 'text-white/40 hover:text-white'}`} 
                onClick={() => setAiDrawerOpen(!aiDrawerOpen)}
              />
            </div>
            
            <div className="flex items-center gap-4 pl-4 border-l border-white/10">
              <div className="text-right hidden sm:block">
                <div className="text-[11px] font-display font-black uppercase tracking-tighter">{user?.displayName || 'OPERATOR'}</div>
                <div className="text-[9px] font-display font-bold uppercase tracking-widest text-white/30">{role.replace('_', ' ')}</div>
              </div>
              <Avatar 
                src={user?.photoURL || ""} 
                className="!w-9 !h-9 !rounded-lg border border-white/10"
              />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto relative scrollbar-hide">
          <div className="absolute inset-0 grid-pattern opacity-10 pointer-events-none"></div>
          <div className="p-6 md:p-10 relative z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* AI Assistant Drawer */}
        <AnimatePresence>
          {aiDrawerOpen && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 bottom-0 w-full sm:w-[400px] bg-[#0A0A0A] border-l border-white/10 z-50 flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary-container/10 rounded-lg text-secondary-container">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <div className="text-[11px] font-display font-black uppercase tracking-widest">Seva AI Sahayak</div>
                    <div className="text-[8px] font-mono text-white/30 uppercase">Suraksha Uplink Active</div>
                  </div>
                </div>
                <IconButton onClick={() => setAiDrawerOpen(false)} className="!text-white/40 hover:!text-white">
                  <CloseIcon size={20} />
                </IconButton>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-[12px] font-sans leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-white text-black' 
                        : 'bg-white/5 text-white/80 border border-white/5'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 p-4 rounded-2xl flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-white/40" />
                      <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Vishleshan (AI)...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-6 bg-[#050505] border-t border-white/5">
                <div className="relative">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                    placeholder="SANDESH BHEJEIN..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 pr-12 text-[11px] font-display font-bold uppercase tracking-widest text-white placeholder:text-white/20 focus:border-white/30 transition-all outline-none"
                  />
                  <button 
                    onClick={handleSendChat}
                    disabled={isTyping}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-white/40 hover:text-white transition-colors"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
