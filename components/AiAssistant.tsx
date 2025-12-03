import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Image as ImageIcon, X, History, Plus, MessageSquare, Trash2 } from 'lucide-react';
import { chatWithBuyerAI, fileToGenerativePart } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'model';
  text: string;
  images?: string[]; // base64 strings (or blob URLs temporarily)
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
  const [imagePreviews, setImagePreviews] = useState<string[]>([]); // Now stores Blob URLs
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Track active object URLs to revoke them on unmount
  const activeObjectUrls = useRef<Set<string>>(new Set());

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

  // Cleanup Object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      activeObjectUrls.current.forEach(url => URL.revokeObjectURL(url));
      activeObjectUrls.current.clear();
    };
  }, []);

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

  // Optimized Image Selection using URL.createObjectURL
  const handleImageSelect = (files: FileList | File[]) => {
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB Limit
    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    let hasLargeFile = false;

    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) return;
        
        if (file.size > MAX_SIZE) {
            hasLargeFile = true;
            return;
        }

        newFiles.push(file);
        const url = URL.createObjectURL(file);
        newPreviews.push(url);
        activeObjectUrls.current.add(url);
    });

    if (hasLargeFile) {
        alert("图片太大啦（超过5MB），请压缩后再试～");
    }

    if (newFiles.length === 0) return;

    // Check limits (Max 5 images total)
    const currentCount = selectedImages.length;
    if (currentCount + newFiles.length > 5) {
        alert("最多只能上传 5 张图片");
        // Cleanup generated URLs if we reject them
        newPreviews.forEach(url => {
            URL.revokeObjectURL(url);
            activeObjectUrls.current.delete(url);
        });
        return;
    }

    // Update State
    setSelectedImages(prev => [...prev, ...newFiles]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
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
    // Revoke current preview URLs to free memory
    imagePreviews.forEach(url => {
        URL.revokeObjectURL(url);
        activeObjectUrls.current.delete(url);
    });
    setSelectedImages([]);
    setImagePreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    const urlToRemove = imagePreviews[index];
    if (urlToRemove) {
        URL.revokeObjectURL(urlToRemove);
        activeObjectUrls.current.delete(urlToRemove);
    }

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

    // 1. Capture current input data
    const currentText = input;
    const currentFiles = [...selectedImages];
    const currentBlobUrls = [...imagePreviews];

    // 2. Create optimistic message with Blob URLs (Immediate UI update)
    // IMPORTANT: We use the Blob URLs for display initially so there is NO delay
    const optimisticMessage: Message = {
      role: 'user',
      text: currentText,
      images: currentBlobUrls.length > 0 ? currentBlobUrls : undefined
    };

    const msgsWithOptimistic = [...messages, optimisticMessage];
    setMessages(msgsWithOptimistic);
    
    // 3. Reset Input State
    // Note: We do NOT revoke blob URLs here yet, because they are currently being displayed
    setInput('');
    setSelectedImages([]);
    setImagePreviews([]); // Clear from preview area
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    setIsLoading(true);
    setIsProcessingImages(true);

    try {
      // 4. Process images to Base64 (async) for API and Persistence
      // This moves the heavy lifting out of the render loop/input phase
      let base64Images: string[] = [];
      let historyParts: any[] = [];
      
      if (currentFiles.length > 0) {
          // Convert files to Base64 in background
          const processedParts = await Promise.all(
              currentFiles.map(file => fileToGenerativePart(file))
          );
          
          base64Images = processedParts.map(p => `data:${p.mime_type};base64,${p.data}`);
          
          // Prepare API parts
          processedParts.forEach(p => {
              historyParts.push({ inline_data: { mime_type: p.mime_type, data: p.data } });
          });
      }

      if (currentText) {
          historyParts.push({ text: currentText });
      }

      // 5. Create Finalized User Message (with Base64 for persistence)
      const finalizedUserMessage: Message = {
          role: 'user',
          text: currentText,
          images: base64Images.length > 0 ? base64Images : undefined
      };

      // 6. Update Messages State: Replace optimistic (Blob) with finalized (Base64)
      // This ensures that if we save to localStorage, we have the persistent data
      const msgsWithFinalizedUser = [...messages, finalizedUserMessage];
      setMessages(msgsWithFinalizedUser);
      saveCurrentSession(msgsWithFinalizedUser);

      // 7. Revoke the temporary Blob URLs to free memory
      // Now safe to revoke as we have replaced the blobs with base64 strings in the state
      currentBlobUrls.forEach(url => {
          URL.revokeObjectURL(url);
          activeObjectUrls.current.delete(url);
      });

      // 8. Construct History for API
      // We need to map the previous messages to API format
      const historyForApi = msgsWithFinalizedUser.map(msg => {
         const parts = [];
         
         if (msg.images && msg.images.length > 0) {
             msg.images.forEach(imgStr => {
                 // Simple check if it's base64 (contains comma)
                 const commaIndex = imgStr.indexOf(',');
                 if (commaIndex > -1) {
                    const base64Data = imgStr.substring(commaIndex + 1);
                    parts.push({ inline_data: { mime_type: 'image/jpeg', data: base64Data } });
                 }
             });
         }
         else if (msg.image) {
             const commaIndex = msg.image.indexOf(',');
             if (commaIndex > -1) {
                const base64Data = msg.image.substring(commaIndex + 1);
                parts.push({ inline_data: { mime_type: 'image/jpeg', data: base64Data } });
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

      // 9. Call API
      // We pass empty files array because we've already embedded them in historyForApi
      // Using chatWithBuyerAI which handles the history array
      const responseText = await chatWithBuyerAI(historyForApi, currentText, []);
      
      const finalMessages = [...msgsWithFinalizedUser, { role: 'model', text: responseText } as Message];
      setMessages(finalMessages);
      saveCurrentSession(finalMessages);

    } catch (error) {
      console.error(error);
      const errorMessages = [...msgsWithOptimistic, { role: 'model', text: '抱歉，助理稍微开了个小差，请重试一下。' } as Message];
      setMessages(errorMessages);
    } finally {
      setIsLoading(false);
      setIsProcessingImages(false);
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
                          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm overflow-hidden ${
                              msg.role === 'user' 
                                ? 'bg-slate-800 text-white rounded-tr-sm' 
                                : 'bg-white text-slate-800 rounded-tl-sm border border-white/50'
                          }`}>
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                  ul: ({node, ...props}) => <ul className="list-disc list-inside my-1" {...props} />,
                                  ol: ({node, ...props}) => <ol className="list-decimal list-inside my-1" {...props} />,
                                  a: ({node, ...props}) => <a className="text-blue-500 underline" target="_blank" {...props} />,
                                  table: ({node, ...props}) => <div className="overflow-x-auto my-2 rounded-lg border border-slate-200"><table className="w-full text-left text-xs border-collapse" {...props} /></div>,
                                  th: ({node, ...props}) => <th className={`p-2 font-semibold border-b ${msg.role === 'user' ? 'border-slate-600 bg-slate-700' : 'border-slate-100 bg-slate-50'}`} {...props} />,
                                  td: ({node, ...props}) => <td className={`p-2 border-b last:border-0 ${msg.role === 'user' ? 'border-slate-700' : 'border-slate-50'}`} {...props} />,
                                  p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} />,
                                  code: ({node, ...props}) => <code className={`px-1 py-0.5 rounded font-mono text-xs ${msg.role === 'user' ? 'bg-slate-700' : 'bg-slate-100 text-pink-500'}`} {...props} />,
                                  pre: ({node, ...props}) => <pre className={`p-2 rounded-lg overflow-x-auto my-2 ${msg.role === 'user' ? 'bg-slate-900' : 'bg-slate-50'}`} {...props} />
                              }}
                            >
                               {msg.text}
                            </ReactMarkdown>
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
                            <img src={preview} alt="Preview" className="h-16 w-16 object-cover rounded-md border border-slate-200 shadow-sm" />
                            <button 
                               onClick={() => removeImage(idx)}
                               className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-800 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 shadow-md"
                            >
                               <X size={12} />
                            </button>
                         </div>
                     ))}
                  </div>
                )}

                <div className="flex items-center pr-2">
                    <button 
                       onClick={() => fileInputRef.current?.click()}
                       className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
                       title="上传图片"
                    >
                       <ImageIcon size={20} />
                    </button>
                    
                    <input 
                      type="text" 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      onPaste={handlePaste}
                      placeholder={selectedImages.length > 0 ? "输入消息一起发送..." : "输入消息，或 Ctrl+V 粘贴截图..."}
                      className="flex-1 py-3 px-2 outline-none text-slate-700 placeholder:text-slate-400 text-sm bg-transparent"
                    />
                    
                    <button 
                       onClick={handleSend}
                       disabled={isLoading || (!input.trim() && selectedImages.length === 0)}
                       className={`
                         p-2 rounded-lg transition-all duration-200 flex items-center gap-2 px-4
                         ${isLoading || (!input.trim() && selectedImages.length === 0) 
                            ? 'bg-slate-100 text-slate-300' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md active:scale-95'
                         }
                       `}
                    >
                       {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                </div>
             </div>
             <p className="text-[10px] text-center text-slate-400 mt-2">
                小番茄由 阿巴阿巴偷妈头生成 • 内容仅供参考
             </p>
             
             {/* Hidden File Input */}
             <input 
                type="file" 
                ref={fileInputRef} 
                onChange={onFileInputChange} 
                className="hidden" 
                accept="image/*"
                multiple
             />
          </div>
       </div>
    </div>
  );
};

export default AiAssistant;