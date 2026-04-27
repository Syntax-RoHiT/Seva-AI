import React from 'react';
import { 
  IconButton, 
  Avatar, 
  Badge, 
  Drawer, 
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
  TrendingUp,
  MessageSquare,
  AlertTriangle,
  Server,
  Globe,
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

export default function Shell({ children, role }: ShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = React.useState(false);
  const [chatMessage, setChatMessage] = React.useState('');
  const [chatHistory, setChatHistory] = React.useState<Message[]>([
    { role: 'model', content: "Hello! Seva AI Assistant online. How can I assist you today?" }
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
      const geminiHistory = chatHistory.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      const response = await chatWithAssistant(userMessage, geminiHistory);
      setChatHistory(prev => [...prev, { role: 'model', content: response }]);
    } catch (error) {
      console.error("AI Assistant Error:", error);
      setChatHistory(prev => [...prev, { role: 'model', content: "Error establishing connection. Please retry." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const menuItems = React.useMemo(() => {
    const common = [
      { text: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
      { text: 'Public Portal', icon: <Globe size={20} />, path: '/' },
      { text: 'Settings', icon: <Settings size={20} />, path: '/settings' },
    ];

    switch (role) {
      case 'NGO_ADMIN':
        return [
          { text: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
          { text: 'Threat Map', icon: <MapIcon size={20} />, path: '/heatmap' },
          { text: 'Alerts', icon: <AlertTriangle size={20} />, path: '/cases' },
          { text: 'Volunteers', icon: <Users size={20} />, path: '/volunteers' },
          { text: 'Teams', icon: <UsersRound size={20} />, path: '/teams' },
          { text: 'Analytics', icon: <TrendingUp size={20} />, path: '/analytics' },
          { text: 'Settings', icon: <Settings size={20} />, path: '/settings' },
        ];
      case 'VOLUNTEER':
        return [
          { text: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
          { text: 'Active Tasks', icon: <ShieldAlert size={20} />, path: '/tasks' },
          { text: 'Inventory', icon: <Server size={20} />, path: '/inventory' },
          ...common,
        ];
      case 'GOVERNMENT':
        return [
          { text: 'National Overview', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
          { text: 'Global Heatmap', icon: <Globe size={20} />, path: '/heatmap' },
          { text: 'Policy Center', icon: <Settings size={20} />, path: '/policy' },
          { text: 'Review Reports', icon: <TrendingUp size={20} />, path: '/reports' },
          ...common,
        ];
      case 'REPORTER':
        return [
          { text: 'Report Center', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
          { text: 'My Reports', icon: <AlertTriangle size={20} />, path: '/my-reports' },
          ...common,
        ];
      case 'SUPER_ADMIN':
        return [
          { text: 'Main Control', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
          { text: 'User Network', icon: <Users size={20} />, path: '/users' },
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
    <div className="h-full flex flex-col bg-gray-50 border-r border-gray-200 pt-8">
      <div className="px-8 mb-10 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 text-white flex items-center justify-center shadow-sm">
          <ShieldCheck size={18} />
        </div>
        <div className="font-bold tracking-tight text-xl text-gray-900">SEVA AI</div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <div className="px-4 mb-4 text-xs font-bold uppercase tracking-widest text-gray-500">Navigation</div>
        {menuItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.text}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-4 px-4 py-3 font-semibold text-xs tracking-wider uppercase transition-colors group ${
                active 
                  ? 'bg-white text-blue-600 border border-gray-200 shadow-sm' 
                  : 'text-gray-600 hover:text-blue-600 hover:bg-white'
              }`}
            >
              <span className={`${active ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'}`}>
                {item.icon}
              </span>
              {item.text}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="p-4 bg-white border border-gray-200 shadow-sm mb-4">
          <div className="flex items-center gap-3 mb-2">
            <Activity size={14} className="text-green-600" />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-900">System Status</span>
          </div>
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Online • Latency: 14ms</div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-4 py-3 font-bold text-xs tracking-widest uppercase text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen bg-gray-100 text-gray-900 flex overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[260px] flex-shrink-0 bg-white">
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
        <header className="h-20 border-b border-gray-200 flex items-center justify-between px-6 md:px-10 z-30 bg-white shadow-sm">
          <div className="flex items-center gap-4">
            <IconButton 
              onClick={() => setMobileOpen(true)}
              className="lg:!hidden !text-gray-900"
            >
              <MenuIcon />
            </IconButton>
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-gray-50 border border-gray-200">
              <Search size={16} className="text-gray-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-transparent border-none outline-none text-xs font-semibold tracking-wider w-48 text-gray-900 placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-4 mr-4">
              <Badge variant="dot" color="error">
                <Bell size={20} className="text-gray-500 hover:text-blue-600 cursor-pointer transition-colors" />
              </Badge>
              <MessageSquare 
                size={20} 
                className={`cursor-pointer transition-colors ${aiDrawerOpen ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'}`} 
                onClick={() => setAiDrawerOpen(!aiDrawerOpen)}
              />
            </div>
            
            <div className="flex items-center gap-4 pl-4 border-l border-gray-200">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold uppercase tracking-tight text-gray-900">{user?.displayName || 'Operator'}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{role.replace('_', ' ')}</div>
              </div>
              <Avatar 
                src={user?.photoURL || ""} 
                className="!w-10 !h-10 !rounded-none border border-gray-200"
              />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto relative scrollbar-hide bg-gray-50 flex flex-col">
          <div className="p-6 md:p-10 relative z-10 flex-1 flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="h-full flex flex-col flex-1"
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
              className="absolute top-0 right-0 bottom-0 w-full sm:w-[400px] bg-white border-l border-gray-200 z-50 flex flex-col shadow-xl"
            >
              <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-gray-900">Seva AI Assistant</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase">Secure Connection</div>
                  </div>
                </div>
                <IconButton onClick={() => setAiDrawerOpen(false)} className="!text-gray-400 hover:!text-gray-900">
                  <CloseIcon size={20} />
                </IconButton>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 text-xs font-medium leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-l-xl rounded-br-xl' 
                        : 'bg-gray-100 text-gray-800 border border-gray-200 rounded-r-xl rounded-bl-xl'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 border border-gray-200 p-4 rounded-r-xl rounded-bl-xl flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-gray-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-200">
                <div className="relative">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                    placeholder="Send Message..."
                    className="w-full bg-white border border-gray-300 px-4 py-3 pr-12 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all outline-none shadow-sm"
                  />
                  <button 
                    onClick={handleSendChat}
                    disabled={isTyping}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    <Send size={16} />
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
