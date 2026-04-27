import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Send, X, Terminal, Sparkles, MessageSquareQuote } from 'lucide-react';
import { chatWithAssistant } from '../../services/geminiService';

export default function TacticalAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: 'SevaAI Tactical Link Established. Waiting for instructions.' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      // Prepare history for Gemini
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await chatWithAssistant(userMsg, history);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: 'Error: Signal interrupted. Retrying...' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="mb-4 w-96 h-[500px] glass-panel border border-white/20 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary-container/20 flex items-center justify-center text-secondary-container">
                  <Bot size={16} />
                </div>
                <div>
                  <div className="text-[10px] font-display font-black uppercase tracking-widest">SevaAI Tactical</div>
                  <div className="text-[8px] font-mono text-secondary-container uppercase">Operational • 99.8% Efficiency</div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-[11px] font-mono uppercase tracking-tight leading-relaxed ${
                    msg.role === 'user' 
                    ? 'bg-white text-black rounded-tr-none' 
                    : 'bg-white/5 border border-white/5 text-white/80 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/5 p-3 rounded-2xl flex gap-1">
                    <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce"></span>
                    <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10 bg-white/5">
              <div className="relative">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Enter command..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-mono uppercase tracking-widest focus:outline-none focus:border-secondary-container transition-colors"
                />
                <button 
                  onClick={handleSend}
                  className="absolute right-2 top-2 p-1.5 bg-secondary-container rounded-lg text-black hover:bg-white transition-all"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl transition-all ${
          isOpen ? 'bg-white text-black' : 'bg-secondary-container text-black'
        }`}
      >
        {isOpen ? <X size={24} /> : <Bot size={24} />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-black animate-pulse"></span>
        )}
      </motion.button>
    </div>
  );
}
