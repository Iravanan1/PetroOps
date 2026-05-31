import React, { useState } from 'react';
import { MessageSquare, X, Send, Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';

export default function ConversationalAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    { role: 'assistant', text: 'Welcome back! I am your PumpAI co-pilot. Ask me anything about your stations, fuel variances, and fraud alerts.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInput('');
    setLoading(true);

    setTimeout(() => {
      let reply = "I've analyzed the current active shifts records. All nozzle meters reconciliation scores look stable, and cash collections are aligned.";
      
      const query = userText.toLowerCase();
      if (query.includes('shortage') || query.includes('cash') || query.includes('mismatch')) {
        reply = "Looking at the Metro Fuel shift logs on 2026-05-18, the audit systems flagged a Cash shortage of INR 4,700 due to card receipt mismatch. You should audit the operator's card slips ledger in the Review tab.";
      } else if (query.includes('alert') || query.includes('fraud') || query.includes('tamper')) {
        reply = "Yes, there is 1 HIGH severity alert flagged: Nozzle MS (MS-01) recorded a duplicate meter reading entry with high physical tank variance. Audit reviews are recommended.";
      } else if (query.includes('stock') || query.includes('inventory') || query.includes('tank')) {
        reply = "Current inventory forecast: HSD stock will last for approximately 11 more days based on moving sales rate. MS stock is robust, predicted to last 16 days.";
      }

      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      setLoading(false);
    }, 1000);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    // Submit suggestion directly
    setTimeout(() => {
      if (input.trim() === suggestion) {
        handleSend();
      }
    }, 50);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Action Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all transform hover:scale-110 flex items-center justify-center border border-blue-400/20 group"
        >
          <MessageSquare className="w-6 h-6 transition-transform group-hover:rotate-12" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
        </button>
      )}

      {/* Expanded Obsidian Glass Chat Box */}
      {isOpen && (
        <div className="w-96 h-[500px] bg-[#0d1527]/90 border border-slate-800/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden glass-panel animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="p-5 border-b border-slate-800/60 bg-[#0d1527]/40 flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.15)]">
                <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-white">PumpAI Assistant</h3>
                <span className="text-[9px] font-bold text-emerald-400 tracking-wider uppercase block">System Co-Pilot</span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-slate-850 rounded-xl text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 scrollbar-thin">
            {messages.map((msg, idx) => (
              <div 
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}
              >
                <div 
                  className={`max-w-[80%] p-4 rounded-2xl text-xs leading-relaxed font-light ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none shadow-[0_4px_12px_rgba(59,130,246,0.2)]' 
                      : 'bg-slate-900/80 border border-slate-850 text-slate-300 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-900/80 border border-slate-850 text-slate-400 p-4 rounded-2xl rounded-bl-none text-xs flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
          </div>

          {/* Prompt Suggestions */}
          {messages.length === 1 && (
            <div className="px-5 py-2.5 bg-slate-950/20 border-t border-slate-800/40 flex flex-wrap gap-2">
              <button 
                onClick={() => handleSuggestionClick("Check station shortages")}
                className="text-[10px] bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 font-medium"
              >
                Audit Shortages <ArrowRight className="w-3 h-3 text-blue-400" />
              </button>
              <button 
                onClick={() => handleSuggestionClick("Any critical security alerts?")}
                className="text-[10px] bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 font-medium"
              >
                Security Alerts <AlertTriangle className="w-3 h-3 text-rose-400" />
              </button>
            </div>
          )}

          {/* Form Input */}
          <form onSubmit={handleSend} className="p-4 border-t border-slate-800/60 bg-[#0d1527]/30 flex gap-2">
            <input 
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask co-pilot..."
              className="flex-1 bg-slate-950/50 border border-slate-850 focus:border-blue-500/50 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-slate-655 focus:outline-none transition-all"
            />
            <button 
              type="submit"
              disabled={loading || !input.trim()}
              className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition-colors flex items-center justify-center shadow-lg disabled:opacity-50 disabled:hover:bg-blue-600"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
