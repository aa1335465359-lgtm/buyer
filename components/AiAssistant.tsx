import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Image as ImageIcon, X, History, Plus, MessageSquare, Trash2 } from 'lucide-react';
import { chatWithBuyerAI, fileToGenerativePart } from '../services/geminiService';

interface Message {
  role: 'user' | 'model';
  text: string;
  images?: string[]; // base64 strings
  // Legacy support for single image if needed
  image?: string; 
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: number;
  messages: Message[];
}

const AiAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: '你好呀！我是小番茄。选品、定向、怼商家，今天咱先整哪个？不管是想吐槽奇葩老板还是找爆款，我都奉陪到底！' }
  ]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  const [input, setInput] = useState('');
  // Multi-image support
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const savedSessions = localStorage.getItem('temu_chat_sessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
      } catch (e) {
        console.error("Failed to load chat history", e);
      }
    }
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('temu_chat_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, imagePreviews]);

  const startNewChat = () => {
    const initialMsg: Message = { role: 'model', text: '你好呀！我是小番茄。选品、定向、怼商家，今天咱先整哪个？不管是想吐槽奇葩老板还是找爆款，我都奉陪到底！' };
    setMessages([initialMsg]);
    setCurrentSessionId(null);
    setShowHistory(false);
    setInput('');
    clearImages();
  };

  const loadSession = (session: ChatSession) => {
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    setShowHistory(false);
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    localStorage.setItem('temu_chat_sessions', JSON.stringify(newSessions));
    
    if (currentSessionId === id) {
      startNewChat();
    }
  };

  const handleImageSelect = async (files: FileList | File[]) => {
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (newFiles.length === 0) return;

    // Check limits
    const currentCount = selectedImages.length;
    if (currentCount >= 5) {
        alert("最多只能上传 5 张图片");
        return;
    }

    const availableSlots = 5 - currentCount;
    const filesToProcess = newFiles.slice(0, availableSlots);
    if (filesToProcess.length === 0) return;

    // Update File state
    setSelectedImages(prev => [...prev, ...filesToProcess]);
    setIsProcessingImages(true);

    try {
        // Compress and generate previews using shared service logic
        const newPreviewsData = await Promise.all(filesToProcess.map(async (file) => {
            try {
                const result = await fileToGenerativePart(file);
                if (result && result.mime_type && result.data) {
                    return `data:${result.mime_type};base64,${result.data}`;
                }
                return null;
            } catch (e) {
                console.error("Failed to process image", e);
                return null;
            }
        }));

        const validPreviews = newPreviewsData.filter((p): p is string => typeof p === 'string' && p.length > 0);
        
        if (validPreviews.length > 0) {
            setImagePreviews(prev => [...prev, ...validPreviews]);
        }
    } catch (error) {
        console.error("Critical error during image processing", error);
        alert("图片处理出错，请重试");
    } finally {
        setIsProcessingImages(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files.length > 0) {
      handleImageSelect(e.clipboardData.files);
      e.preventDefault();
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImageSelect(e.target.files);
    }
  };

  const clearImages = () => {
    setSelectedImages([]);
    setImagePreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    const newFiles = [...selectedImages];
    newFiles.splice(index, 1);
    setSelectedImages(newFiles);
    
    const newPreviews = [...imagePreviews];
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
  };

  const saveCurrentSession = (updatedMessages: Message[]) => {
    const timestamp = Date.now();
    let title = '新对话';
    const firstUserMsg = updatedMessages.find(m => m.role === 'user');
    if (firstUserMsg) {
      title = firstUserMsg.text.slice(0, 15) || '[图片]';
    }

    if (currentSessionId) {
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId 
          ? { ...s, messages: updatedMessages, timestamp, title } 
          : s
      ));
    } else {
      const newId = Date.now().toString();
      const newSession: ChatSession = {
        id: newId,
        title,
        timestamp,
        messages: updatedMessages
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newId);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && selectedImages.length === 0) || isLoading || isProcessingImages) return;

    const userMessage: Message = {
      role: 'user',
      text: input,
      images: imagePreviews.length > 0 ? [...imagePreviews] : undefined
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    saveCurrentSession(newMessages);

    setInput('');
    const currentImages = [...selectedImages]; // Keep ref for service call if needed
    clearImages();
    setIsLoading(true);

    try {
      // Build history for the service.
      const historyForApi = newMessages.map(msg => {
         const parts = [];
         
         // Support multiple images
         if (msg.images && msg.images.length > 0) {
             msg.images.forEach(imgStr => {
                 try {
                     const base64Data = imgStr.split(',')[1];
                     if (base64Data) {
                         // Use snake_case for API compatibility
                         parts.push({ inline_data: { mime_type: 'image/jpeg', data: base64Data } });
                     }
                 } catch (e) {
                     console.error("Skipping malformed image history", e);
                 }
             });
         }
         // Fallback support for old single image format
         else if (msg.image) {
             try {
                 const base64Data = msg.image.split(',')[1];
                 if (base64Data) {
                    parts.push({ inline_data: { mime_type: 'image/jpeg', data: base64Data } });
                 }
             } catch (e) {
                 console.error("Skipping malformed legacy image", e);
             }
         }

         if (msg.text) {
             parts.push({ text: msg.text });
         }
         return {
             role: msg.role,
             parts: parts
         };
      });

      // Pass compressed history (images already embedded)
      const responseText = await chatWithBuyerAI(historyForApi, userMessage.text, currentImages);
      
      const finalMessages = [...newMessages, { role: 'model', text: responseText } as Message];
      setMessages(finalMessages);
      saveCurrentSession(finalMessages);

    } catch (error) {
      console.error(error);
      const errorMessages = [...newMessages, { role: 'model', text: '抱歉，助理稍微开了个小差，请重试一下。' } as Message];
      setMessages(errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full relative overflow-hidden">
       {/* Sidebar Overlay (History) */}
       <div 
         className={`
           absolute top-0 right-0 h-full w-72 bg-white shadow-2xl z-20 transition-transform duration-300 transform flex flex-col border-l border-slate-200
           ${showHistory ? 'translate-x-0' : 'translate-x-full'}
         `}
       >
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
             <h3 className="font-semibold text-slate-700 flex items-center gap-2">
               <History size={18} /> 历史对话
             </h3>
             <button 
               onClick={() => setShowHistory(false)}
               className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
             >
               <X size={18} />
             </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
             {sessions.length === 0 ? (
               <div className="text-center py-10 text-slate-400 text-sm">
                 暂无历史记录
               </div>
             ) : (
               sessions.map(session => (
                 <div 
                   key={session.id}
                   onClick={() => loadSession(session)}
                   className={`
                     group flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border
                     ${currentSessionId === session.id 
                        ? 'bg-indigo-50 border-indigo-100' 
                        : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'
                     }
                   `}
                 >
                    <div className="mt-1 text-indigo-500 shrink-0">
                       <MessageSquare size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className={`text-sm font-medium truncate ${currentSessionId === session.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                         {session.title}
                       </p>
                       <p className="text-[10px] text-slate-400 mt-1">
                         {new Date(session.timestamp).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                       </p>
                    </div>
                    <button 
                       onClick={(e) => deleteSession(e, session.id)}
                       className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                    >
                       <Trash2 size={14} />
                    </button>
                 </div>
               ))
             )}
          </div>
       </div>

       {/* Main Chat Area */}
       <div className="flex-1 flex flex-col h-full bg-white/40 backdrop-blur-md min-w-0">
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/30 flex items-center justify-between bg-white/30 shrink-0">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white shadow-md">
                   <Bot size={24} />
                </div>
                <div>
                   <h2 className="font-bold text-slate-800">小番茄</h2>
                   <p className="text-xs text-slate-500">24小时在线 • 懂选品 • 懂运营</p>
                </div>
             </div>
             
             <div className="flex items-center gap-2">
                <button 
                  onClick={startNewChat}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/50 hover:bg-white text-slate-600 rounded-lg text-xs font-medium border border-white/50 transition-all shadow-sm"
                  title="新对话"
                >
                  <Plus size={14} />
                  <span className="hidden sm:inline">新对话</span>
                </button>
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className={`
                    p-2 rounded-lg transition-all border
                    ${showHistory 
                      ? 'bg-indigo-100 text-indigo-600 border-indigo-200' 
                      : 'bg-white/50 hover:bg-white text-slate-600 border-white/50'
                    }
                  `}
                  title="历史记录"
                >
                  <History size={18} />
                </button>
             </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
             {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-700 text-white' : 'bg-red-500 text-white'}`}>
                      {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                   </div>
                   
                   <div className={`flex flex-col gap-2 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      {/* Render Images if any */}
                      {msg.images && msg.images.length > 0 && (
                          <div className={`flex flex-wrap gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              {msg.images.map((imgStr, i) => (
                                  <img key={i} src={imgStr} alt="Sent content" className="w-32 h-32 object-cover rounded-lg border border-white/50 shadow-sm bg-white" />
                              ))}
                          </div>
                      )}
                      {/* Fallback for old messages */}
                      {msg.image && !msg.images && (
                         <img src={msg.image} alt="Sent content" className="max-w-[240px] rounded-lg border border-white/50 shadow-sm bg-white" />
                      )}
                      
                      {msg.text && (
                          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                              msg.role === 'user' 
                                ? 'bg-slate-800 text-white rounded-tr-sm' 
                                : 'bg-white text-slate-800 rounded-tl-sm border border-white/50'
                          }`}>
                             {msg.text}
                          </div>
                      )}
                   </div>
                </div>
             ))}
             {isLoading && (
               <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                     <Bot size={16} className="text-white" />
                  </div>
                  <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-white/50 flex items-center gap-2">
                     <Loader2 size={16} className="animate-spin text-indigo-600" />
                     <span className="text-xs text-slate-500 font-medium">思考中...</span>
                  </div>
               </div>
             )}
             <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white/60 border-t border-white/30 backdrop-blur-md shrink-0">
             <div className="relative bg-white border border-slate-200 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all overflow-hidden">
                
                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="px-4 pt-3 pb-2 flex gap-3 bg-slate-50 border-b border-slate-100 overflow-x-auto">
                     {imagePreviews.map((preview, idx) => (
                         <div key={idx} className="relative group shrink-0">
                            <img src={preview} alt="Preview" className="h-16 w-16 object-cover rounded-md border border-slate-200" />
                            <button 
                              onClick={() => removeImage(idx)}
                              className="absolute -top-1.5 -right-1.5 bg-slate-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-500"
                            >
                               <X size={10} />
                            </button>
                         </div>
                     ))}
                     {selectedImages.length < 5 && !isProcessingImages && (
                         <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="h-16 w-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-md text-slate-400 hover:text-indigo-500 hover:border-indigo-300 transition-colors bg-white"
                         >
                            <Plus size={16} />
                            <span className="text-[10px] mt-1">加图</span>
                         </button>
                     )}
                     {isProcessingImages && (
                        <div className="h-16 w-16 flex flex-col items-center justify-center border border-slate-200 rounded-md bg-slate-50 text-slate-400">
                           <Loader2 size={16} className="animate-spin" />
                           <span className="text-[10px] mt-1">压缩中</span>
                        </div>
                     )}
                  </div>
                )}

                <div className="flex items-end gap-2 p-2">
                   <button 
                     onClick={() => fileInputRef.current?.click()}
                     className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors shrink-0"
                     title="上传图片"
                     disabled={isProcessingImages}
                   >
                      <ImageIcon size={20} />
                   </button>
                   
                   <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onPaste={handlePaste}
                      onKeyDown={(e) => {
                         if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                         }
                      }}
                      placeholder={imagePreviews.length > 0 ? "描述图片内容..." : "输入消息，支持 Ctrl+V 粘贴截图..."}
                      className="flex-1 max-h-32 min-h-[40px] py-2 bg-transparent border-none outline-none text-sm text-slate-800 placeholder:text-slate-400 resize-none"
                      rows={1}
                   />

                   <button
                      onClick={handleSend}
                      disabled={isLoading || isProcessingImages || (!input.trim() && selectedImages.length === 0)}
                      className={`
                         p-2 rounded-xl transition-all shrink-0
                         ${isLoading || isProcessingImages || (!input.trim() && selectedImages.length === 0)
                            ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md active:scale-95'
                         }
                      `}
                   >
                      <Send size={18} />
                   </button>
                </div>
             </div>
             <input type="file" ref={fileInputRef} onChange={onFileInputChange} accept="image/*" multiple className="hidden" />
          </div>
       </div>
    </div>
  );
};

export default AiAssistant;