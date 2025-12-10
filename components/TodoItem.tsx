
import React, { useState, useEffect, useRef } from 'react';
import { Todo, Priority, TodoStatus } from '../types';
import { Copy, Check, Calendar, Clock, Edit3, X, Zap, Coffee, Moon, Sun, ChevronRight, MoreHorizontal, ArrowRight, PlayCircle, AlertCircle, Circle, Anchor, Sparkles, Loader2 } from 'lucide-react';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Todo>) => void;
  focusedTodoId: string | null;
  setFocusedTodoId: (id: string | null) => void;
}

// Updated Softer/Flatter Priority Colors (Opacity 20-40% feel)
const PRIORITY_CONFIG = {
  [Priority.P0]: { label: 'P0', color: 'bg-rose-50 text-rose-600 border-rose-100', desc: '紧急' },
  [Priority.P1]: { label: 'P1', color: 'bg-orange-50 text-orange-600 border-orange-100', desc: '重要' },
  [Priority.P2]: { label: 'P2', color: 'bg-blue-50 text-blue-600 border-blue-100', desc: '正常' },
  [Priority.P3]: { label: 'P3', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', desc: '稍缓' },
  [Priority.P4]: { label: 'P4', color: 'bg-slate-100 text-slate-500 border-slate-200', desc: '待定' },
};

// Focus Mode Colors (Unchanged mostly, just ensure compatibility)
const FOCUS_THEME = {
  [Priority.P0]: {
    bg: 'bg-[#2a0a0e]', 
    bar: 'from-rose-600 to-red-500',
    shadow: 'shadow-[2px_0_20px_rgba(244,63,94,0.6)]',
    textTag: 'bg-red-950/60 border-rose-500/30',
    timerBorder: 'border-rose-500/20 text-rose-100',
    timerIcon: 'text-rose-400'
  },
  [Priority.P1]: {
    bg: 'bg-[#2a1205]', 
    bar: 'from-orange-500 to-amber-500',
    shadow: 'shadow-[2px_0_20px_rgba(249,115,22,0.6)]',
    textTag: 'bg-orange-950/60 border-orange-500/30',
    timerBorder: 'border-orange-500/20 text-orange-100',
    timerIcon: 'text-orange-400'
  },
  [Priority.P2]: {
    bg: 'bg-[#050a2a]', 
    bar: 'from-blue-500 to-indigo-500',
    shadow: 'shadow-[2px_0_20px_rgba(59,130,246,0.6)]',
    textTag: 'bg-blue-950/60 border-blue-500/30',
    timerBorder: 'border-blue-500/20 text-blue-100',
    timerIcon: 'text-blue-400'
  },
  [Priority.P3]: {
    bg: 'bg-[#052a14]', 
    bar: 'from-emerald-500 to-green-500',
    shadow: 'shadow-[2px_0_20px_rgba(16,185,129,0.6)]',
    textTag: 'bg-emerald-950/60 border-emerald-500/30',
    timerBorder: 'border-emerald-500/20 text-emerald-100',
    timerIcon: 'text-emerald-400'
  },
  [Priority.P4]: {
    bg: 'bg-[#1a1a1a]', 
    bar: 'from-slate-500 to-gray-400',
    shadow: 'shadow-[2px_0_20px_rgba(148,163,184,0.6)]',
    textTag: 'bg-slate-800/60 border-slate-500/30',
    timerBorder: 'border-slate-500/20 text-slate-100',
    timerIcon: 'text-slate-400'
  },
};

const TodoItem: React.FC<TodoItemProps> = ({ 
  todo, onToggle, onDelete, onUpdate, focusedTodoId, setFocusedTodoId 
}) => {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isOverdue, setIsOverdue] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isJustAdded, setIsJustAdded] = useState(false);
  
  // Edit State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(todo.title);
  
  // Focus Mode Logic (Derived from parent)
  const isFocusMode = focusedTodoId === todo.id;
  const isDimmed = focusedTodoId !== null && focusedTodoId !== todo.id;

  const [focusProgress, setFocusProgress] = useState(0); // 0-100
  const [focusTimeLeft, setFocusTimeLeft] = useState(15 * 60); // 15 mins in seconds
  const [isHoveringCheck, setIsHoveringCheck] = useState(false);
  
  // Menus State
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showDateMenu, setShowDateMenu] = useState(false);
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  const priorityMenuRef = useRef<HTMLDivElement>(null);
  const dateMenuRef = useRef<HTMLDivElement>(null);

  const isDone = todo.status === 'done';
  const isAiProcessing = todo.aiStatus === 'processing';

  useEffect(() => {
    // Check if task was created in last 10 seconds
    if (Date.now() - todo.createdAt < 10000) {
        setIsJustAdded(true);
        const timer = setTimeout(() => setIsJustAdded(false), 10000);
        return () => clearTimeout(timer);
    }
  }, [todo.createdAt]);

  useEffect(() => {
    // Sync title update if AI updates it in background
    setEditTitleValue(todo.title);
  }, [todo.title]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (priorityMenuRef.current && !priorityMenuRef.current.contains(event.target as Node)) {
        setShowPriorityMenu(false);
      }
      if (dateMenuRef.current && !dateMenuRef.current.contains(event.target as Node)) {
        setShowDateMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditingTitle]);

  // Standard Deadline Timer
  useEffect(() => {
    if (!todo.deadline || isDone) {
      setTimeLeft(null);
      setIsOverdue(false);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diff = todo.deadline! - now;

      if (diff <= 0) {
        setTimeLeft("已截止");
        setIsOverdue(true);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
            setTimeLeft(`${days}天 ${hours}小时`);
        } else if (hours > 0) {
             setTimeLeft(`${hours}h ${minutes}m`);
        } else {
             setTimeLeft(`${minutes}m`);
        }
        setIsOverdue(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [todo.deadline, isDone]);

  // Focus Mode Timer (15 Minutes)
  useEffect(() => {
    let interval: any;
    if (isFocusMode && !isDone) {
      if (focusTimeLeft > 0) {
        interval = setInterval(() => {
            setFocusTimeLeft(prev => {
                const newVal = prev - 1;
                const totalSeconds = 15 * 60;
                const elapsed = totalSeconds - newVal;
                setFocusProgress(Math.min(100, (elapsed / totalSeconds) * 100));
                return newVal;
            });
        }, 1000);
      } else {
        setFocusProgress(100);
      }
    }
    return () => clearInterval(interval);
  }, [isFocusMode, focusTimeLeft, isDone]);

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (todo.shopId) {
        const cleanId = todo.shopId.replace(/[【】\[\]]/g, '');
        navigator.clipboard.writeText(cleanId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTitleSave = () => {
    if (editTitleValue.trim() !== todo.title) {
        onUpdate(todo.id, { title: editTitleValue });
    }
    setIsEditingTitle(false);
  };

  const handleQuickDate = (type: '30m' | '1h' | 'today' | 'tomorrow' | 'afterTomorrow' | 'eod' | 'permanent') => {
      const now = new Date();
      let timestamp = 0;

      switch (type) {
        case '30m':
          timestamp = now.getTime() + 30 * 60 * 1000;
          break;
        case '1h':
          timestamp = now.getTime() + 60 * 60 * 1000;
          break;
        case 'eod':
          // End of day -> 23:00
          now.setHours(23, 0, 0, 0);
          timestamp = now.getTime();
          break;
        case 'today':
            // Today -> 23:00 (End of day logic)
            now.setHours(23, 0, 0, 0);
            timestamp = now.getTime();
            break;
        case 'tomorrow':
          // Tomorrow -> 23:00
          const tmr = new Date();
          tmr.setDate(tmr.getDate() + 1);
          tmr.setHours(23, 0, 0, 0);
          timestamp = tmr.getTime();
          break;
        case 'afterTomorrow':
          // After Tomorrow -> 23:00
          const after = new Date();
          after.setDate(after.getDate() + 2);
          after.setHours(23, 0, 0, 0);
          timestamp = after.getTime();
          break;
        case 'permanent':
           // Clear deadline and actionTime
           onUpdate(todo.id, { deadline: undefined, actionTime: undefined });
           setShowDateMenu(false);
           return;
      }
      
      // Auto-set status to in_progress if setting a deadline
      const updates: Partial<Todo> = { deadline: timestamp };
      if (todo.status === 'todo') {
          updates.status = 'in_progress';
      }
      onUpdate(todo.id, updates);
      setShowDateMenu(false);
  };

  const enterFocusMode = () => {
      if (!isDone && !isFocusMode) {
        setFocusedTodoId(todo.id);
        // Reset timer state when entering
        setFocusTimeLeft(15 * 60);
        setFocusProgress(0);
        // Auto set to in_progress if it was todo
        if (todo.status === 'todo') {
            onUpdate(todo.id, { status: 'in_progress' });
        }
      }
  };

  const exitFocusMode = () => {
      setFocusedTodoId(null);
  };

  // Cycle Status: Todo -> InProgress -> Done -> Todo
  const cycleStatus = (e: React.MouseEvent) => {
      e.stopPropagation();
      let next: TodoStatus = 'todo';
      if (todo.status === 'todo') next = 'in_progress';
      else if (todo.status === 'in_progress') next = 'done';
      else next = 'todo';
      onUpdate(todo.id, { status: next });
  };

  // Safe fallback for priority
  const currentPriority = PRIORITY_CONFIG[todo.priority] ? todo.priority : Priority.P2;
  const pConfig = PRIORITY_CONFIG[currentPriority];
  const focusConfig = FOCUS_THEME[currentPriority] || FOCUS_THEME[Priority.P2];
  
  // Calculate if any menu is open to boost z-index
  const isMenuOpen = showPriorityMenu || showDateMenu;

  // Determine Status Appearance
  const getStatusBadge = () => {
    // 1. Done
    if (todo.status === 'done') {
        return { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100', icon: Check, label: '已完成' };
    }
    // 2. Delayed (Risk)
    if (isOverdue) {
        return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100', icon: AlertCircle, label: '已延期' };
    }
    // 3. In Progress
    if (todo.status === 'in_progress') {
        return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', icon: PlayCircle, label: '进行中' };
    }
    // 4. Todo (Default)
    return { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-100', icon: Circle, label: '未开始' };
  };

  const statusStyle = getStatusBadge();
  const StatusIcon = statusStyle.icon;

  if (isAiProcessing) {
      return (
        <div className="relative rounded-xl border border-indigo-100 bg-white/80 backdrop-blur-md p-3.5 flex items-center justify-center min-h-[56px] shadow-sm transition-all my-1">
             <div className="flex items-center gap-2.5 text-indigo-600/80 font-medium text-sm">
                <span className="text-lg animate-bounce">🍅</span>
                <span className="animate-pulse tracking-wide">小番茄正在看你发了什么...</span>
            </div>
        </div>
      );
  }

  return (
    <>
    <style>{`
        @keyframes bubbleScroll {
            from { background-position: 0 0; }
            to { background-position: -800px 0; }
        }
        
        @keyframes breathe {
            0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); border-color: rgba(165, 180, 252, 0.2); }
            50% { box-shadow: 0 0 15px rgba(99, 102, 241, 0.25); border-color: rgba(99, 102, 241, 0.6); background-color: rgba(238, 242, 255, 0.4); }
            100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); border-color: rgba(165, 180, 252, 0.2); }
        }
        .card-just-added {
            animation: breathe 3s infinite ease-in-out;
            z-index: 5;
        }

        .bubbles-layer-1 {
            background-image: 
                radial-gradient(circle at 10% 20%, rgba(255,255,255,0.15) 35px, transparent 36px),
                radial-gradient(circle at 90% 80%, rgba(255,255,255,0.15) 45px, transparent 46px),
                radial-gradient(circle at 50% 50%, rgba(255,255,255,0.12) 25px, transparent 26px),
                radial-gradient(circle at 30% 10%, rgba(255,255,255,0.15) 30px, transparent 31px),
                radial-gradient(circle at 70% 60%, rgba(255,255,255,0.12) 40px, transparent 41px);
            background-size: 800px 100%;
            animation: bubbleScroll 40s linear infinite;
        }

        .bubbles-layer-2 {
            background-image: 
                radial-gradient(circle at 25% 60%, rgba(255,255,255,0.2) 15px, transparent 16px),
                radial-gradient(circle at 75% 30%, rgba(255,255,255,0.2) 20px, transparent 21px),
                radial-gradient(circle at 40% 90%, rgba(255,255,255,0.18) 12px, transparent 13px),
                radial-gradient(circle at 10% 40%, rgba(255,255,255,0.2) 18px, transparent 19px),
                radial-gradient(circle at 60% 10%, rgba(255,255,255,0.18) 14px, transparent 15px),
                radial-gradient(circle at 90% 50%, rgba(255,255,255,0.2) 16px, transparent 17px);
            background-size: 600px 100%;
            animation: bubbleScroll 25s linear infinite;
        }

        .bubbles-layer-3 {
            background-image: 
                radial-gradient(circle at 15% 85%, rgba(255,255,255,0.25) 8px, transparent 9px),
                radial-gradient(circle at 85% 15%, rgba(255,255,255,0.25) 10px, transparent 11px),
                radial-gradient(circle at 55% 10%, rgba(255,255,255,0.25) 7px, transparent 8px),
                radial-gradient(circle at 35% 45%, rgba(255,255,255,0.25) 6px, transparent 7px),
                radial-gradient(circle at 65% 65%, rgba(255,255,255,0.25) 9px, transparent 10px),
                radial-gradient(circle at 5% 5%, rgba(255,255,255,0.25) 8px, transparent 9px),
                radial-gradient(circle at 45% 95%, rgba(255,255,255,0.25) 7px, transparent 8px),
                radial-gradient(circle at 95% 45%, rgba(255,255,255,0.25) 9px, transparent 10px),
                radial-gradient(circle at 25% 25%, rgba(255,255,255,0.25) 6px, transparent 7px);
            background-size: 400px 100%;
            animation: bubbleScroll 15s linear infinite;
        }
        
        @keyframes fluidStripes {
            0% { background-position: 40px 0; }
            100% { background-position: 0 0; }
        }

        .animate-fluid-stripes {
            background-image: linear-gradient(
                45deg, 
                rgba(255, 255, 255, 0.15) 25%, 
                transparent 25%, 
                transparent 50%, 
                rgba(255, 255, 255, 0.15) 50%, 
                rgba(255, 255, 255, 0.15) 75%, 
                transparent 75%, 
                transparent
            );
            background-size: 30px 30px;
            animation: fluidStripes 0.8s linear infinite;
        }
    `}</style>

    <div 
        onDoubleClick={enterFocusMode}
        className={`
            group relative rounded-xl transition-all duration-500 border ease-in-out
            ${isDimmed 
                ? 'opacity-20 grayscale blur-[1px] scale-95 pointer-events-none bg-transparent border-transparent' 
                : (isFocusMode 
                    ? 'h-20 shadow-2xl bg-transparent border-white/10 overflow-hidden z-20 scale-[1.02] ring-4 ring-white/30 my-4' 
                    : (isDone 
                        ? 'opacity-60 grayscale-[0.5] bg-slate-50/50 border-transparent overflow-visible' 
                        : 'bg-white/60 hover:bg-white/90 border-transparent hover:border-white shadow-sm hover:shadow-md backdrop-blur-sm overflow-visible'
                      )
                  )
            }
            ${!isFocusMode && isMenuOpen ? 'z-50' : ''}
            ${isJustAdded ? 'card-just-added' : ''}
        `}
    >
        {isFocusMode ? (
            // === FOCUS MODE LAYOUT ===
            <div className={`relative w-full h-full flex items-center overflow-hidden ${focusConfig.bg}`}>
                
                {/* Parallax Bubble Layers (Dark Background) */}
                <div className="absolute inset-0 bubbles-layer-1 opacity-100 mix-blend-screen pointer-events-none z-0"></div>
                <div className="absolute inset-0 bubbles-layer-2 opacity-100 mix-blend-screen pointer-events-none z-0"></div>
                <div className="absolute inset-0 bubbles-layer-3 opacity-100 mix-blend-screen pointer-events-none z-0"></div>

                {/* Liquid Progress Bar */}
                <div 
                    className={`absolute top-0 left-0 h-full bg-gradient-to-r ${focusConfig.bar} ${focusConfig.shadow} z-10 transition-[width] duration-[1000ms] ease-linear animate-fluid-stripes overflow-hidden`}
                    style={{ width: `${focusProgress}%` }}
                >
                    <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-white/50 shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
                    {/* Bubbles inside the progress bar too, for continuity */}
                    <div className="absolute inset-0 bubbles-layer-1 opacity-50 mix-blend-overlay"></div>
                    <div className="absolute inset-0 bubbles-layer-2 opacity-50 mix-blend-overlay"></div>
                </div>

                {/* Content Layer */}
                <div className="relative z-20 w-full h-full flex items-center px-5 gap-5">
                    
                    {/* Left: Progress/Check Box */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onToggle(todo.id); exitFocusMode(); }}
                        onMouseEnter={() => setIsHoveringCheck(true)}
                        onMouseLeave={() => setIsHoveringCheck(false)}
                        className="shrink-0 w-12 h-12 rounded-xl bg-black/20 backdrop-blur-none border border-white/40 flex items-center justify-center text-white shadow-lg transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
                    >
                        {isHoveringCheck ? (
                            <Check size={26} strokeWidth={3.5} className="animate-in zoom-in duration-200" />
                        ) : (
                            <span className="text-sm font-bold tracking-tight filter drop-shadow-md">{Math.round(focusProgress)}%</span>
                        )}
                    </button>

                    {/* Middle: Text Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h3 className="text-lg font-bold text-white truncate drop-shadow-lg tracking-wide">
                            {todo.title}
                        </h3>
                        <div className="flex items-center gap-2.5 mt-1.5 opacity-90">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] text-white font-medium shadow-sm border ${focusConfig.textTag}`}>
                                专注模式 · {currentPriority}
                            </span>
                            {todo.shopId && (
                                <span className="flex items-center gap-1 text-[11px] text-white/90 font-mono tracking-tight drop-shadow-md">
                                    <Copy size={11} className="opacity-70" /> {todo.shopId}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Right: Timer & Actions */}
                    <div className="shrink-0 flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <div className={`flex items-center gap-1.5 font-mono text-base font-bold bg-black/30 px-3 py-1.5 rounded-lg border shadow-inner ${focusConfig.timerBorder}`}>
                                <Clock size={14} className={`animate-pulse ${focusConfig.timerIcon}`} />
                                {Math.floor(focusTimeLeft / 60)}:{(focusTimeLeft % 60).toString().padStart(2, '0')}
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
                                className="p-2.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <Edit3 size={18} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); exitFocusMode(); }}
                                className="p-2.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                </div>

            </div>
        ) : (
            // === NORMAL MODE LAYOUT ===
            <div className="relative p-3.5 flex items-center gap-3 w-full min-h-[56px]">
                {/* Priority / Checkbox */}
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button 
                        onClick={() => !isDone && setShowPriorityMenu(!showPriorityMenu)}
                        className={`
                            flex flex-col items-center justify-center w-8 h-8 rounded-lg border text-[10px] font-bold shadow-sm transition-transform active:scale-95
                            ${pConfig.color}
                            ${isDone ? 'cursor-default opacity-50' : 'cursor-pointer hover:scale-105'}
                        `}
                    >
                        <span>{pConfig.label}</span>
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                     {isEditingTitle ? (
                         <div className="flex items-center">
                             <input 
                                 ref={titleInputRef}
                                 value={editTitleValue}
                                 onChange={(e) => setEditTitleValue(e.target.value)}
                                 onBlur={handleTitleSave}
                                 onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                                 className="w-full bg-white/50 border border-blue-400/50 rounded px-2 py-1 text-[15px] font-medium text-slate-900 outline-none"
                             />
                         </div>
                     ) : (
                        <div className="flex items-center gap-2">
                             <span className={`text-[15px] font-semibold truncate leading-tight text-slate-800 ${isDone ? 'line-through text-slate-400' : ''}`}>
                                 {todo.title}
                             </span>
                        </div>
                     )}

                     {/* Badges Row */}
                     <div className="flex items-center gap-2 mt-1.5">
                        
                        {/* Status Switcher (3 States) */}
                        <div 
                           onClick={cycleStatus}
                           className={`
                             flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border cursor-pointer hover:opacity-80 transition-all select-none
                             ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}
                        `}>
                            <StatusIcon size={10} strokeWidth={3} />
                            {statusStyle.label}
                        </div>

                        {todo.shopId && (
                            <div 
                                onClick={handleCopyId}
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium border bg-slate-50 text-slate-500 border-slate-100 cursor-pointer hover:bg-slate-100 active:scale-95 transition-colors"
                            >
                                {copied ? <Check size={10} className="text-green-500"/> : <Copy size={10} />}
                                <span className="font-mono tracking-tight">{todo.shopId.replace(/[【】]/g, '')}</span>
                            </div>
                        )}
                        
                        {todo.quantity && (
                             <span className="px-1.5 py-0.5 rounded-md text-[11px] font-medium border bg-indigo-50 text-indigo-600 border-indigo-100">
                                {todo.quantity}款
                             </span>
                        )}

                        {/* Just Added Indicator was here, now removed in favor of card effect */}
                     </div>
                </div>

                {/* Right Actions */}
                <div className="shrink-0 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {/* Edit/Delete Actions - Visible on Hover */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="编辑"
                        >
                            <Edit3 size={14} />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(todo.id); }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="删除"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* DDL Button */}
                   <button 
                       onClick={(e) => { e.stopPropagation(); setShowDateMenu(!showDateMenu); }}
                       className={`
                           flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors border shadow-sm relative z-10
                           ${isOverdue && !isDone
                                ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' 
                                : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                           }
                       `}
                   >
                       <Clock size={13} className={isOverdue && !isDone ? "text-red-500" : "text-slate-400"} />
                       <span>{timeLeft || (todo.actionTime ? todo.actionTime : "暂无DDL")}</span>
                   </button>
                </div>
            </div>
        )}

        {/* --- MENUS (Normal Mode) --- */}
        {!isFocusMode && showPriorityMenu && (
            <div ref={priorityMenuRef} className="absolute top-10 left-0 z-50 w-32 bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-xl shadow-2xl p-1 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/5">
                {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => (
                <button
                    key={p}
                    onClick={(e) => { e.stopPropagation(); onUpdate(todo.id, { priority: p }); setShowPriorityMenu(false); }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2 hover:bg-slate-100 transition-colors ${p === currentPriority ? 'bg-slate-50' : ''}`}
                >
                    <span className={`w-2 h-2 rounded-full ${PRIORITY_CONFIG[p].color.split(' ')[0]}`}></span>
                    <span className="text-slate-700">{p} - {PRIORITY_CONFIG[p].desc}</span>
                </button>
                ))}
            </div>
        )}

        {!isFocusMode && showDateMenu && (
            <div ref={dateMenuRef} className="absolute top-full right-0 mt-2 w-48 bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right ring-1 ring-black/5">
                <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider mb-0.5">快速设定</div>
                
                <button onClick={(e) => { e.stopPropagation(); handleQuickDate('today'); }} className="w-full text-left px-2 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100/80 flex items-center gap-2 transition-colors">
                    <Sun size={14} className="text-orange-500" /> 今天 (23:00)
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleQuickDate('tomorrow'); }} className="w-full text-left px-2 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100/80 flex items-center gap-2 transition-colors">
                    <ArrowRight size={14} className="text-blue-500" /> 明天 (23:00)
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleQuickDate('afterTomorrow'); }} className="w-full text-left px-2 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100/80 flex items-center gap-2 transition-colors">
                    <Calendar size={14} className="text-purple-500" /> 后天 (23:00)
                </button>
                
                <div className="h-px bg-slate-100 my-1"></div>

                <button onClick={(e) => { e.stopPropagation(); handleQuickDate('30m'); }} className="w-full text-left px-2 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100/80 flex items-center gap-2 transition-colors">
                    <Zap size={14} className="text-amber-500" /> 30 分钟后
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleQuickDate('1h'); }} className="w-full text-left px-2 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100/80 flex items-center gap-2 transition-colors">
                    <Coffee size={14} className="text-amber-600" /> 1 小时后
                </button>
                
                <div className="h-px bg-slate-100 my-1"></div>
                
                {/* Permanent Task Option (Replaces Custom Date Picker) */}
                <button onClick={(e) => { e.stopPropagation(); handleQuickDate('permanent'); }} className="w-full text-left px-2 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100/80 flex items-center justify-between transition-colors group/custom">
                    <div className="flex items-center gap-2">
                        <Anchor size={14} className="text-slate-400 group-hover/custom:text-indigo-500" /> 常驻任务
                    </div>
                    <span className="text-[10px] text-slate-400">无截止</span>
                </button>
            </div>
        )}
    </div>
    </>
  );
};

export default TodoItem;
