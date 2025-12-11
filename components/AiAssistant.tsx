
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Image as ImageIcon, X, History, Plus, MessageSquare, Trash2 } from 'lucide-react';
import { chatWithBuyerAI, fileToGenerativePart } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message { role: 'user' | 'model'; text: string; images?: string[]; image?: string; }
interface ChatSession { id: string; title: string; timestamp: number; messages: Message[]; }

const AiAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([{ role: 'model', text: '你好呀！我是小番茄。选品、定向、怼商家，今天咱先整哪个？' }]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedSessions = localStorage.getItem('temu_chat_sessions');
    if (savedSessions) setSessions(JSON.parse(savedSessions));
  }, []);
  useEffect(() => { if (sessions.length > 0) localStorage.setItem('temu_chat_sessions', JSON.stringify(sessions)); }, [sessions]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const startNewChat = () => {
    setMessages([{ role: 'model', text: '你好呀！我是小番茄。' }]);
    setCurrentSessionId(null);
    setShowHistory(false);
    setInput('');
    setImagePreviews([]); setSelectedImages([]);
  };

  const handleSend = async () => {
    if ((!input.trim() && selectedImages.length === 0) || isLoading) return;
    const currentText = input;
    const optimisticMsg: Message = { role: 'user', text: currentText, images: imagePreviews };
    setMessages(prev => [...prev, optimisticMsg]);
    setInput(''); setSelectedImages([]); setImagePreviews([]);
    setIsLoading(true);

    try {
      const historyForApi = messages.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }));
      const responseText = await chatWithBuyerAI(historyForApi, currentText);
      const newMessages = [...messages, optimisticMsg, { role: 'model', text: responseText } as Message];
      setMessages(newMessages);
      
      const title = currentText.slice(0, 15) || '新对话';
      const timestamp = Date.now();
      if (currentSessionId) {
          setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: newMessages, timestamp } : s));
      } else {
          const newId = Date.now().toString();
          setSessions(prev => [{ id: newId, title, timestamp, messages: newMessages }, ...prev]);
          setCurrentSessionId(newId);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: '小番茄开小差了，请重试一下。' }]);
    } finally { setIsLoading(false); }
  };

  const handleImageSelect = (files: FileList) => {
      const file = files[0];
      if (file) {
          setSelectedImages([file]);
          const reader = new FileReader();
          reader.onload = (e) => setImagePreviews([e.target?.result as string]);
          reader.readAsDataURL(file);
      }
  }

  return (
    <div className="flex h-full relative overflow-hidden bg-theme-panel/30">
       {/* Sidebar Overlay */}
       <div className={`absolute top-0 right-0 h-full w-72 bg-theme-panel shadow-theme z-20 transition-transform duration-300 border-l border-theme-border ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-4 border-b border-theme-border flex items-center justify-between bg-theme-input">
             <h3 className="font-semibold text-theme-text flex items-center gap-2"><History size={18} /> 历史对话</h3>
             <button onClick={() => setShowHistory(false)} className="p-1.5 hover:bg-black/5 rounded-theme-sm text-theme-subtext"><X size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
               {sessions.map(s => (
                 <div key={s.id} onClick={() => { setMessages(s.messages); setCurrentSessionId(s.id); setShowHistory(false); }} className={`p-3 rounded-theme-sm cursor-pointer border border-transparent hover:bg-theme-input ${currentSessionId === s.id ? 'bg-theme-input border-theme-border' : ''}`}>
                    <p className="text-sm font-medium text-theme-text truncate">{s.title}</p>
                    <p className="text-[10px] text-theme-subtext">{new Date(s.timestamp).toLocaleString()}</p>
                 </div>
               ))}
          </div>
       </div>

       {/* Main Chat */}
       <div className="flex-1 flex flex-col h-full backdrop-blur-md min-w-0">
          <div className="px-6 py-4 border-b border-theme-border flex items-center justify-between bg-theme-panel/50 shrink-0">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white shadow-md"><Bot size={24} /></div>
                <div><h2 className="font-bold text-theme-text">小番茄</h2><p className="text-xs text-theme-subtext">懂选品 • 懂运营</p></div>
             </div>
             <div className="flex items-center gap-2">
                <button onClick={startNewChat} className="px-3 py-1.5 bg-theme-card hover:bg-theme-card-hover text-theme-text rounded-theme-sm text-xs font-medium border border-theme-border shadow-sm"><Plus size={14} className="inline mr-1"/>新对话</button>
                <button onClick={() => setShowHistory(!showHistory)} className="p-2 bg-theme-card hover:bg-theme-card-hover text-theme-text rounded-theme-sm border border-theme-border"><History size={18} /></button>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
             {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-theme-accent text-white' : 'bg-red-500 text-white'}`}>{msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}</div>
                   <div className={`flex flex-col gap-2 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      {msg.images?.map((img, i) => <img key={i} src={img} className="w-32 h-32 object-cover rounded-theme border border-theme-border" />)}
                      <div className={`px-4 py-2.5 rounded-theme text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-theme-accent text-white' : 'bg-theme-card text-theme-text border border-theme-border'}`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                      </div>
                   </div>
                </div>
             ))}
             {isLoading && <div className="flex gap-4"><div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center"><Bot size={16} className="text-white"/></div><div className="bg-theme-card px-4 py-3 rounded-theme border border-theme-border flex items-center gap-2"><Loader2 size={16} className="animate-spin text-theme-accent"/><span className="text-xs text-theme-subtext">思考中...</span></div></div>}
             <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-theme-panel/60 border-t border-theme-border backdrop-blur-md shrink-0">
             <div className="relative bg-theme-input border border-theme-border rounded-theme shadow-sm flex items-center pr-2 overflow-hidden">
                <button onClick={() => fileInputRef.current?.click()} className="p-3 text-theme-subtext hover:text-theme-accent"><ImageIcon size={20} /></button>
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="输入消息..." className="flex-1 py-3 px-2 outline-none text-theme-text placeholder:text-theme-subtext bg-transparent text-sm" />
                <button onClick={handleSend} disabled={isLoading} className="p-2 rounded-theme-sm bg-theme-accent text-white hover:opacity-90"><Send size={18} /></button>
             </div>
             <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && handleImageSelect(e.target.files)} className="hidden" accept="image/*" />
          </div>
       </div>
    </div>
  );
};

export default AiAssistant;
