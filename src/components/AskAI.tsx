import React, { useState, useEffect, useRef } from "react";
import { GoogleGenAI } from "@google/genai";
import { Send, Bot, WifiOff, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { billApi, productApi, dueApi, cashSaleApi } from "../lib/api";
import { Bill, Product, CustomerDue, CashSale } from "../types";
import { motion } from "motion/react";

const RATE_LIMIT_DURATION_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_DURATION = 5;

export default function AskAI() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: 'Hello! I am your Chayanika AI assistant. I have real-time access to your stock, dues, and sales records. Ask me anything!' }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Real-time data streams
  const [bills, setBills] = useState<Bill[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dues, setDues] = useState<CustomerDue[]>([]);
  const [cashSales, setCashSales] = useState<CashSale[]>([]);

  useEffect(() => {
    const unsubBills = billApi.getAll(setBills);
    const unsubProducts = productApi.getAll(setProducts);
    const unsubDues = dueApi.getAll(setDues);
    const unsubCash = cashSaleApi.getAll(setCashSales);
    return () => {
      unsubBills();
      unsubProducts();
      unsubDues();
      unsubCash();
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkRateLimit = () => {
    const now = Date.now();
    const historyJson = localStorage.getItem("ai_request_history");
    let history: number[] = historyJson ? JSON.parse(historyJson) : [];
    
    // Filter out requests older than the duration
    history = history.filter(time => now - time < RATE_LIMIT_DURATION_MS);
    
    if (history.length >= MAX_REQUESTS_PER_DURATION) {
      return false; // Rate limit exceeded
    }
    
    history.push(now);
    localStorage.setItem("ai_request_history", JSON.stringify(history));
    return true;
  };

  const getDynamicContext = () => {
    const totalDues = dues.reduce((sum, d) => sum + d.amount, 0);
    const totalStockVal = products.reduce((sum, p) => sum + (p.stock * p.mrp), 0);
    const today = new Date().toDateString();
    
    const todayCreditSales = bills.filter(b => new Date(b.date).toDateString() === today).reduce((sum, b) => sum + b.subtotal, 0);
    const todayCashSales = cashSales.filter(s => new Date(s.date).toDateString() === today).reduce((sum, s) => sum + s.amount, 0);
    const todaySales = todayCreditSales + todayCashSales;

    const baseContext = `
This is 'Chayanika' (sub-brand 'Kalindi') Business Management App.
Real-Time Shop Status:
- Total Sales Today: ₹${todaySales} (Cash: ₹${todayCashSales}, Credit: ₹${todayCreditSales})
- Total Dues Pending: ₹${totalDues}
- Total Stock Value (MRP): ₹${totalStockVal}
- Number of unique products: ${products.length}
- Number of customers with dues: ${dues.length}

Detailed Stock List:
${products.map(p => `- ${p.name}: ${p.stock} in stock at ₹${p.mrp} MRP (Wholesale: ₹${p.wholesaleRate})`).join('\n')}

Detailed Dues List:
${dues.map(d => `- ${d.customerName}: Owes ₹${d.amount}`).join('\n')}

Always provide polite, concise answers. If asked about stock, dues, or sales, use the Real-Time Shop Status provided above.
`;
    return baseContext;
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    
    if (!isOnline) {
      toast.error("You are offline. AI features require an internet connection.");
      return;
    }

    if (!checkRateLimit()) {
      toast.error(`Rate limit exceeded! Please wait a moment before sending more messages. (Max ${MAX_REQUESTS_PER_DURATION} per min)`);
      return;
    }

    const userText = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const dynamicContext = getDynamicContext();
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
           { role: "user", parts: [{ text: dynamicContext + "\n\nUser Question: " + userText }] }
        ]
      });

      const modelText = response.text || "Sorry, I couldn't understand that.";
      setMessages(prev => [...prev, { role: 'model', text: modelText }]);
    } catch (err: any) {
      console.error("AI Error:", err);
      toast.error("Failed to get a response from AI.");
      setMessages(prev => [...prev, { role: 'model', text: '(Error: Failed to fetch AI response)' }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOnline) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-surface border border-accent/10 rounded-2xl p-8 shadow-xl text-center">
        <WifiOff size={64} className="text-muted mb-6" />
        <h2 className="text-2xl font-display font-bold text-accent mb-2">Intelligence Gateway Offline</h2>
        <p className="text-muted max-w-md">
          Real-time AI analysis and business intelligence services require a stable network connection to contextually process requests. 
          All core features, including inventory management, billing, and offline data persistence, remain fully functional. 
          Please restore your connection to resume AI-powered insights.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[75vh] bg-surface border border-accent/10 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-accent/10 bg-primary/40 flex items-center gap-3 backdrop-blur-md">
        <div className="p-2.5 bg-accent/10 rounded-xl text-accent shadow-sm">
          <Bot size={24} />
        </div>
        <div>
          <h3 className="text-lg font-display font-bold text-text tracking-tight">Ask AI</h3>
          <p className="text-xs text-accent font-medium uppercase tracking-wider">Business Intelligence</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-accent text-primary rounded-tr-sm' 
                : 'bg-surface border border-accent/10 text-text rounded-tl-sm'
            }`}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-surface border border-accent/10 text-muted rounded-2xl rounded-tl-sm px-5 py-5 flex items-center shadow-sm">
              <div className="flex gap-1.5 items-center">
                <motion.div className="w-2 h-2 bg-accent/60 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                <motion.div className="w-2 h-2 bg-accent/60 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
                <motion.div className="w-2 h-2 bg-accent/60 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-accent/10 bg-primary/40 backdrop-blur-md">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Ask about revenue, low stock, or dues..."
            className="w-full bg-surface border border-accent/20 rounded-xl pl-4 pr-12 py-3.5 text-text focus:border-accent focus:ring-1 focus:ring-accent/50 outline-none transition-all shadow-sm"
            disabled={isTyping}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-2 p-2.5 bg-accent text-primary rounded-lg hover:opacity-90 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
