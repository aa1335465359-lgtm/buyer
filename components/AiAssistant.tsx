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
  
  // Use a ref for the scrollable container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedSessions = localStorage.getItem('temu_chat_sessions');
    if (savedSessions) setSessions(JSON.parse(savedSessions));
  }, []);
  
  useEffect(() => { 
      // Always persist sessions when they change, but handle empty array correctly (clear vs init)
      if (sessions.length > 0 || localStorage.getItem('temu_chat_sessions')) {
          localStorage.setItem('temu_chat_sessions', JSON.stringify(sessions)); 
      }
  }, [sessions]);
  
  // Optimized scroll logic: Instant jump to bottom to prevent layout shift ("flying up")
  useEffect(() => { 
    if (scrollContainerRef.current) {
        // Use requestAnimationFrame to ensure DOM is updated before scrolling
        requestAnimationFrame(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
            }
        });
    }
  }, [messages, isLoading]); // Also trigger when loading state changes (bubble appears)

  const startNewChat = () => {
    setMessages([{ role: 'model', text: '你好呀！我是小番茄。选品、定向、怼商家，今天咱先整哪个？' }]);
    setCurrentSessionId(null);
    setShowHistory(false);
    setInput('');
    setImagePreviews([]); 
    setSelectedImages([]);
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const newSessions = sessions.filter(s => s.id !== id);
      setSessions(newSessions);
      if (currentSessionId === id) {
          startNewChat();
      }
  };

  const handleSelectSession = (session: ChatSession) => {
      setCurrentSessionId(session.id);
      setMessages(session.messages);
      setShowHistory(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];
          setSelectedImages([file]);
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) {
                  setImagePreviews([ev.target.result as string]);
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const clearImages = () => {
      setSelectedImages([]);
      setImagePreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if ((!input.trim() && selectedImages.length === 0) || isLoading) return;
    const currentText = input;
    const currentImages = [...selectedImages];
    const currentPreviews = [...imagePreviews];

    // Optimistically update UI
    const newUserMsg: Message = { 
        role: 'user', 
        text: currentText,
        images: currentPreviews.length > 0 ? currentPreviews : undefined 
    };
    
    const newMessages = [...messages, newUserMsg];
    setMessages(newMessages);
    
    setInput('');
    clearImages();
    setIsLoading(true);

    try {
        // Prepare history for API
        const apiHistory = newMessages.map(m => ({
            role: m.role,
            parts: [
                ...(m.text ? [{ text: m.text }] : []),
                ...(m.images ? m.images.map(img => ({ inline_data: { mime_type: 'image/jpeg', data: img.split(',')[1] } })) : [])
            ]
        }));
        
        const responseText = await chatWithBuyerAI(apiHistory, currentText, currentImages);
        
        const assistantMsg: Message = { role: 'model', text: responseText };
        const finalMessages = [...newMessages, assistantMsg];
        setMessages(finalMessages);

        // Update Sessions
        const sessionId = currentSessionId || Date.now().toString();
        const newSession: ChatSession = {
            id: sessionId,
            title: currentText.slice(0, 20) || '新对话',
            timestamp: Date.now(),
            messages: finalMessages
        };

        setSessions(prev => {
            const exists = prev.find(s => s.id === sessionId);
            if (exists) {
                return prev.map(s => s.id === sessionId ? newSession : s);
            } else {
                return [newSession, ...prev];
            }
        });
        
        if (!currentSessionId) setCurrentSessionId(sessionId);

    } catch (error) {
        console.error(error);
        setMessages(prev => [...prev, { role: 'model', text: '抱歉，网络开小差了，请重试一下。' }]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full bg-theme-panel text-theme-text overflow-hidden relative">
      {/* Sidebar */}
      <div className={`absolute md:relative z-20 h-full w-64 bg-theme-sidebar border-r border-theme-border flex flex-col transition-transform duration-300 ${showHistory ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
         <div className="p-4 border-b border-theme-border flex items-center justify-between">
             <button onClick={startNewChat} className="flex-1 flex items-center gap-2 bg-theme-accent text-white px-4 py-2 rounded-theme-sm text-sm font-medium hover:opacity-90 transition-opacity shadow-sm">
                 <Plus size={16} /> 新对话
             </button>
             <button onClick={() => setShowHistory(false)} className="md:hidden p-2 text-theme-subtext hover:bg-theme-input rounded"><X size={18} /></button>
         </div>
         <div className="flex-1 overflow-y-auto p-2 space-y-1">
             {sessions.map(session => (
                 <div key={session.id} onClick={() => handleSelectSession(session)} className={`group relative p-3 rounded-theme-sm cursor-pointer transition-colors ${currentSessionId === session.id ? 'bg-theme-input' : 'hover:bg-theme-input/50'}`}>
                     <div className="text-sm font-medium text-theme-text truncate pr-6">{session.title}</div>
                     <div className="text-[10px] text-theme-subtext mt-1">{new Date(session.timestamp).toLocaleDateString()}</div>
                     <button onClick={(e) => handleDeleteSession(e, session.id)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-theme-subtext opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-theme-card rounded transition-all">
                         <Trash2 size={14} />
                     </button>
                 </div>
             ))}
             {sessions.length === 0 && (
                 <div className="text-center py-10 text-theme-subtext text-xs opacity-60">
                     <History size={24} className="mx-auto mb-2 opacity-50" />
                     暂无历史记录
                 </div>
             )}
         </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0 bg-theme-panel relative">
         {/* Mobile Header */}
         <div className="md:hidden h-14 border-b border-theme-border flex items-center justify-between px-4 bg-theme-panel/80 backdrop-blur-sm z-10 absolute top-0 left-0 right-0">
             <button onClick={() => setShowHistory(true)} className="p-2 -ml-2 text-theme-subtext"><History size={20} /></button>
             <span className="font-semibold text-sm">小番茄</span>
             <div className="w-8"></div>
         </div>

         {/* Messages Area */}
         <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth pt-16 md:pt-6" ref={scrollContainerRef}>
            {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-4 mb-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm ${msg.role === 'model' ? 'bg-theme-accent-bg text-theme-accent' : 'bg-slate-200 text-slate-600'}`}>
                        {msg.role === 'model' ? <Bot size={18} /> : <User size={18} />}
                    </div>
                    <div className={`max-w-[85%] md:max-w-[70%] space-y-2`}>
                        {msg.images && msg.images.map((img, i) => (
                            <img key={i} src={img} alt="upload" className="max-w-[200px] max-h-[200px] rounded-lg border border-theme-border object-cover" />
                        ))}
                        {msg.text && (
                            <div className={`p-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                                msg.role === 'user' 
                                ? 'bg-theme-accent text-white rounded-tr-none' 
                                : 'bg-theme-card border border-theme-border text-theme-text rounded-tl-none'
                            }`}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                                    p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2" {...props} />,
                                    ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2" {...props} />,
                                    a: ({node, ...props}) => <a className="underline opacity-80 hover:opacity-100" target="_blank" {...props} />,
                                    code: ({className, children, ...props}: any) => {
                                        const match = /language-(\w+)/.exec(className || '')
                                        return !match ? (
                                          <code className="bg-black/10 px-1 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>
                                        ) : (
                                          <div className="bg-black/80 text-white p-2 rounded-md my-2 text-xs font-mono overflow-x-auto">
                                            {children}
                                          </div>
                                        )
                                    }
                                }}>
                                    {msg.text}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                </div>
            ))}
            {isLoading && (
                <div className="flex gap-4 mb-6">
                    <div className="w-8 h-8 rounded-full bg-theme-accent-bg text-theme-accent flex items-center justify-center shrink-0 shadow-sm"><Bot size={18} /></div>
                    <div className="bg-theme-card border border-theme-border px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2 text-theme-subtext text-sm">
                        <Loader2 size={16} className="animate-spin" />
                        正在思考...
                    </div>
                </div>
            )}
         </div>

         {/* Input Area */}
         <div className="p-4 border-t border-theme-border bg-theme-panel/80 backdrop-blur-md">
             <div className="max-w-4xl mx-auto relative bg-theme-input border border-theme-border rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-theme-accent/20 transition-all">
                 {imagePreviews.length > 0 && (
                     <div className="px-3 pt-3 flex gap-2 overflow-x-auto">
                         {imagePreviews.map((src, i) => (
                             <div key={i} className="relative group w-16 h-16 shrink-0">
                                 <img src={src} className="w-full h-full object-cover rounded-lg border border-theme-border" />
                                 <button onClick={clearImages} className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white rounded-full p-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                             </div>
                         ))}
                     </div>
                 )}
                 <div className="flex items-end gap-2 p-2">
                     <button onClick={() => fileInputRef.current?.click()} className="p-2 text-theme-subtext hover:bg-theme-card hover:text-theme-accent rounded-xl transition-colors shrink-0">
                         <ImageIcon size={20} />
                     </button>
                     <input type="file" ref={fileInputRef} onChange={handleImageSelect} className="hidden" accept="image/*" />
                     
                     <textarea 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="想问点什么？（支持Shift+Enter换行）"
                        className="flex-1 bg-transparent border-none outline-none max-h-32 py-2.5 text-[15px] resize-none text-theme-text placeholder:text-theme-subtext"
                        rows={1}
                        style={{ minHeight: '44px' }}
                     />
                     <button 
                        onClick={handleSend}
                        disabled={!input.trim() && selectedImages.length === 0}
                        className={`p-2 rounded-xl shrink-0 transition-all ${
                            input.trim() || selectedImages.length > 0 
                            ? 'bg-theme-accent text-white shadow-md hover:opacity-90 active:scale-95' 
                            : 'bg-theme-card text-theme-subtext opacity-50 cursor-not-allowed'
                        }`}
                     >
                         <Send size={18} />
                     </button>
                 </div>
             </div>
             <p className="text-center text-[10px] text-theme-subtext mt-2 opacity-60">内容由 AI 生成，可能存在误差，请核实后使用。</p>
         </div>
      </div>
    </div>
  );
};

export default AiAssistant;