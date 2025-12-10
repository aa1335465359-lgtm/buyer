import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, X, Sparkles, Send } from 'lucide-react';
import { analyzeImageAndText } from '../services/geminiService';
import { Priority, Todo } from '../types';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

interface TaskInputProps {
  onAddTodos: (todos: Todo[]) => void;
  onUpdateTodo?: (id: string, updates: Partial<Todo>) => void;
  onDeleteTodo?: (id: string) => void;
}

const TaskInput: React.FC<TaskInputProps> = ({ onAddTodos, onUpdateTodo, onDeleteTodo }) => {
  const [text, setText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  
  // New Toggle State for "Smart Extraction"
  const [isSmartMode, setIsSmartMode] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target;
      if (target instanceof HTMLInputElement) return;
      if (target instanceof HTMLTextAreaElement && target !== textAreaRef.current) return;

      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          handleImageSelect(file);
          textAreaRef.current?.focus();
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    // Auto-enable smart mode if image is added
    setIsSmartMode(true);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageSelect(e.target.files[0]);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    // Optional: could turn off smart mode, but user might still want text extraction
  };

  const handleSubmit = async () => {
    if (!text.trim() && !selectedImage) return;

    const tempId = generateId();
    // Determine mode: Smart extraction is triggered by explicit toggle OR presence of image
    const needsAi = isSmartMode || !!selectedImage;

    // --- Fast Memo Mode (No AI) ---
    if (!needsAi) {
        const newTodo: Todo = {
            id: tempId,
            title: text,
            priority: Priority.P2,
            status: 'todo',
            isCompleted: false,
            createdAt: Date.now(),
            aiStatus: 'idle'
        };
        onAddTodos([newTodo]);
        setText('');
        return; // Exit immediate mode
    }

    // --- Smart Extraction Mode (AI) ---
    
    // 1. Calculate approximate item count for container card
    // Split by newlines, ignoring empty lines
    const textSegments = text.trim().split(/\n+/).filter(line => line.trim().length > 0).length;
    const imageCount = selectedImage ? 1 : 0;
    const estimatedCount = Math.max(1, textSegments + imageCount);

    // 2. Create Container Card
    const containerTodo: Todo = {
        id: tempId,
        title: `待整理记录（${estimatedCount} 项）`,
        description: '🍅 正在帮你拆分任务…',
        priority: Priority.P2,
        status: 'todo',
        isCompleted: false,
        createdAt: Date.now(),
        aiStatus: 'processing'
    };

    // 3. Optimistic Add of Container
    onAddTodos([containerTodo]);
    
    // Capture values for async process
    const payloadText = text;
    const payloadImage = selectedImage;

    // Clear UI Immediately
    setText('');
    clearImage();

    // 4. Background AI Process
    try {
        const aiResponse = await analyzeImageAndText(payloadText, payloadImage || undefined);
        
        if (aiResponse.tasks && aiResponse.tasks.length > 0) {
            // Map AI response to real Todo objects
            const realTodos = aiResponse.tasks.map(task => {
                let deadline = undefined;
                
                // Parse estimated minutes
                if (task.estimatedMinutes) {
                    deadline = Date.now() + (task.estimatedMinutes * 60 * 1000);
                }
                
                // Parse Action Time logic
                if (task.actionTime) {
                    const lower = task.actionTime.toLowerCase();
                    const now = new Date();
                    if (lower.includes('下班') || lower.includes('23:00') || lower.includes('今天')) {
                        now.setHours(23, 0, 0, 0);
                        deadline = now.getTime();
                    } else if (lower.includes('明天')) {
                        now.setDate(now.getDate() + 1);
                        now.setHours(23, 0, 0, 0);
                        deadline = now.getTime();
                    }
                }

                return {
                    id: generateId(), // New unique ID for each split task
                    title: task.title,
                    description: task.description,
                    priority: (task.priority as Priority) || Priority.P2,
                    status: deadline ? 'in_progress' : 'todo',
                    isCompleted: false,
                    createdAt: Date.now(),
                    deadline: deadline,
                    shopId: task.shopId,
                    quantity: task.quantity,
                    actionTime: task.actionTime,
                    aiStatus: 'done' // Mark as done for visual feedback
                } as Todo;
            });

            // 5. Replace Container with Real Tasks
            // First delete the container
            if (onDeleteTodo) {
                onDeleteTodo(tempId);
            }
            // Then insert the new tasks (App.tsx usually prepends, so they appear at top)
            onAddTodos(realTodos);

        } else {
            // AI returned nothing - Update container to reflect failure/empty but keep it
            if (onUpdateTodo) {
                onUpdateTodo(tempId, { 
                    aiStatus: 'done', 
                    title: payloadText || '未识别到任务',
                    description: 'AI 未提取到有效信息' 
                });
            }
        }
    } catch (error) {
        console.error("Background AI Failed", error);
        // Update container to error state
        if (onUpdateTodo) {
            onUpdateTodo(tempId, { 
                aiStatus: 'error', 
                title: payloadText || "任务识别失败",
                description: "AI 提炼遇到问题，请手动编辑。" 
            });
        }
    }
  };

  return (
    <div 
      className={`
        relative w-full rounded-2xl border transition-all duration-300 bg-white/80 backdrop-blur-xl shadow-lg
        ${isFocused ? 'ring-2 ring-blue-500/20 border-blue-400/60 shadow-xl scale-[1.01]' : 'border-slate-200/60 hover:border-slate-300'}
      `}
    >
      {/* Image Preview Banner */}
      {imagePreview && (
        <div className="px-4 pt-4 pb-2 flex items-start gap-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
          <div className="relative group shrink-0">
             <img src={imagePreview} alt="Upload" className="h-16 w-auto rounded-md border border-slate-200 shadow-sm" />
             <button onClick={clearImage} className="absolute -top-2 -right-2 bg-slate-800 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={12} />
             </button>
          </div>
          <div className="text-xs text-slate-500 py-1">
             <p className="font-medium text-slate-700">已添加截图</p>
             <p>AI将自动提取截图中的店铺ID和任务信息。</p>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2 p-3">
         <textarea
          ref={textAreaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={isSmartMode ? "✨ 智能提炼模式：粘贴文本或截图，AI 自动拆解..." : "普通备忘：回车快速添加..."}
          className="w-full bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 resize-none max-h-32 py-2.5 px-2"
          rows={1}
          style={{ minHeight: '44px' }} 
        />
        
        <div className="flex items-center gap-2 shrink-0 pb-1.5 pr-1">
           {/* Smart Mode Toggle */}
           <button
             onClick={() => setIsSmartMode(!isSmartMode)}
             className={`
                p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-medium border
                ${isSmartMode 
                    ? 'bg-indigo-50 text-indigo-600 border-indigo-200' 
                    : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-50'
                }
             `}
             title={isSmartMode ? "已开启智能提炼" : "点击开启智能提炼"}
           >
              <Sparkles size={16} className={isSmartMode ? "text-indigo-500" : "text-slate-400"} />
              {isSmartMode && <span className="hidden sm:inline">智能提炼</span>}
           </button>

           <button 
             onClick={() => fileInputRef.current?.click()}
             className={`p-2 rounded-xl transition-colors ${selectedImage ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-100'}`}
             title="上传图片"
           >
             <ImageIcon size={20} />
           </button>
           
           <button
            onClick={handleSubmit}
            disabled={!text && !selectedImage}
            className={`
              h-9 px-4 rounded-xl transition-all flex items-center justify-center font-medium text-sm
              ${(!text && !selectedImage)
                ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                : 'bg-slate-900 text-white hover:bg-slate-800 hover:scale-105 shadow-md active:scale-95'
              }
            `}
           >
            <Send size={18} />
           </button>
        </div>
      </div>
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileInputChange} 
        className="hidden" 
        accept="image/*"
      />
    </div>
  );
};

export default TaskInput;