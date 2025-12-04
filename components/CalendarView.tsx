
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Todo, WorkSummary } from '../types';
import TodoItem from './TodoItem';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Sparkles, ChevronDown, X, Loader2, PieChart, Target, Lightbulb, Bot } from 'lucide-react';
import { generateWorkSummary, generateDailyReport } from '../services/geminiService';

interface CalendarViewProps {
  todos: Todo[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Todo>) => void;
  focusedTodoId: string | null;
  setFocusedTodoId: (id: string | null) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  todos,
  onToggle,
  onDelete,
  onUpdate,
  focusedTodoId,
  setFocusedTodoId
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // --- Summary State (Monthly/Weekly) ---
  const [showSummaryMenu, setShowSummaryMenu] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<WorkSummary | null>(null);
  
  // --- Daily AI Summary State ---
  const [dailySummary, setDailySummary] = useState<string | null>(null);
  const [isGeneratingDaily, setIsGeneratingDaily] = useState(false);
  
  const summaryMenuRef = useRef<HTMLDivElement>(null);

  // --- Date Helpers (Native JS) ---
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay(); // 0 = Sunday

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  // Close summary menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (summaryMenuRef.current && !summaryMenuRef.current.contains(event.target as Node)) {
        setShowSummaryMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset daily summary when selected date changes
  useEffect(() => {
    setDailySummary(null);
  }, [selectedDate]);

  // --- Task Mapping ---
  const getTaskDate = (todo: Todo): Date => {
    // If completed, prioritize completedAt
    if (todo.status === 'done' && todo.completedAt) {
        return new Date(todo.completedAt);
    }
    // For active tasks or legacy completed tasks without timestamp
    // Prioritize deadline if exists, otherwise creation date
    if (todo.deadline) return new Date(todo.deadline);
    return new Date(todo.createdAt);
  };

  const tasksByDate = useMemo(() => {
    const map: { [key: string]: Todo[] } = {};
    todos.forEach(todo => {
        const date = getTaskDate(todo);
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        if (!map[key]) map[key] = [];
        map[key].push(todo);
    });
    return map;
  }, [todos]);

  const selectedDateKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;
  const selectedTasks = tasksByDate[selectedDateKey] || [];

  const sortedSelectedTasks = [...selectedTasks].sort((a, b) => {
     if (a.status === 'done' && b.status !== 'done') return 1;
     if (a.status !== 'done' && b.status === 'done') return -1;
     if (a.deadline && b.deadline) return a.deadline - b.deadline;
     return 0;
  });

  // --- Generate Daily Summary ---
  const handleGenerateDailyReport = async () => {
    if (selectedTasks.length === 0) return;
    
    setIsGeneratingDaily(true);
    try {
        const dateLabel = `${selectedDate.getFullYear()}年${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日`;
        // Pass all tasks for the day (completed and incomplete) to the AI
        const text = await generateDailyReport(selectedTasks, dateLabel);
        setDailySummary(text);
    } catch (e) {
        console.error(e);
    } finally {
        setIsGeneratingDaily(false);
    }
  };

  // --- Generate Work Summary (Modal) ---
  const handleGenerateSummary = async (range: '7d' | '15d' | '30d' | 'month') => {
    setShowSummaryMenu(false);
    setShowSummaryModal(true);
    setIsGeneratingSummary(true);
    setSummaryData(null);

    try {
      const now = new Date();
      let startTime = 0;
      let label = '';

      if (range === 'month') {
        // Current Calendar View Month
        startTime = new Date(year, month, 1).getTime();
        label = `${year}年${month + 1}月`;
      } else {
        const days = parseInt(range.replace('d', ''));
        startTime = now.getTime() - (days * 24 * 60 * 60 * 1000);
        label = `近 ${days} 天`;
      }

      // Filter tasks in range matching the calendar logic
      const rangeTasks = todos.filter(t => {
        let tTime;
        if (t.status === 'done' && t.completedAt) {
            tTime = t.completedAt;
        } else {
            tTime = t.deadline || t.createdAt;
        }
        return tTime >= startTime && tTime <= Date.now();
      });

      // Calculate stats
      const total = rangeTasks.length;
      const completed = rangeTasks.filter(t => t.status === 'done').length;
      // Simple overdue check: not done and deadline < now
      const overdue = rangeTasks.filter(t => t.status !== 'done' && t.deadline && t.deadline < Date.now()).length;
      
      const completionRate = total > 0 ? `${Math.round((completed / total) * 100)}%` : '0%';

      const result = await generateWorkSummary(rangeTasks, { total, completed, completionRate, overdue }, label);
      setSummaryData(result);

    } catch (error) {
      console.error(error);
      alert("生成失败，请稍后重试");
      setShowSummaryModal(false);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // --- Render Grid ---
  const renderCalendarDays = () => {
    const days = [];
    const totalSlots = Math.ceil((daysInMonth + firstDay) / 7) * 7;

    for (let i = 0; i < totalSlots; i++) {
      const dayNum = i - firstDay + 1;
      const isValidDay = dayNum > 0 && dayNum <= daysInMonth;
      
      if (!isValidDay) {
        days.push(<div key={`empty-${i}`} className="h-28 bg-slate-50/20 border border-slate-100/30"></div>);
        continue;
      }

      const thisDate = new Date(year, month, dayNum);
      const dateKey = `${year}-${month}-${dayNum}`;
      const dayTasks = tasksByDate[dateKey] || [];
      
      const total = dayTasks.length;
      const completed = dayTasks.filter(t => t.status === 'done').length;
      const progressPercent = total > 0 ? (completed / total) * 100 : 0;
      const hasOverdue = dayTasks.some(t => t.status !== 'done' && t.deadline && t.deadline < Date.now());
      
      const isSelected = isSameDay(thisDate, selectedDate);
      const isToday = isSameDay(thisDate, new Date());

      days.push(
        <div 
          key={dateKey}
          onClick={() => setSelectedDate(thisDate)}
          className={`
            h-24 rounded-xl border transition-all flex flex-col items-center justify-center relative overflow-hidden group mx-0.5 my-0.5
            ${isSelected 
              ? 'bg-indigo-50 border-indigo-200 shadow-sm z-10 ring-1 ring-indigo-200' 
              : 'bg-white/60 border-slate-100/50 hover:bg-white/80 hover:border-slate-200'
            }
          `}
        >
           {/* Date Number */}
           <div className={`
              text-xl font-bold tracking-tight transition-colors select-none
              ${isToday ? 'text-red-500' : (isSelected ? 'text-indigo-700' : 'text-slate-700')}
           `}>
             {dayNum}
           </div>

           {/* Overdue Indicator (Small Red Dot) */}
           {hasOverdue && (
             <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-400 rounded-full" />
           )}

           {/* Progress Bar (Bottom) - No text */}
           {total > 0 && (
              <div className="absolute bottom-3 w-10 h-1 bg-slate-200/80 rounded-full overflow-hidden">
                   <div 
                     className={`h-full rounded-full transition-all duration-500 ${total === completed ? 'bg-emerald-500' : 'bg-green-500'}`} 
                     style={{ width: `${progressPercent}%` }}
                   />
              </div>
           )}
           
           {/* Completed Count (Small Number) */}
           {completed > 0 && (
             <div className="absolute bottom-3 right-3 text-[10px] font-bold text-slate-400">
               {completed}
             </div>
           )}
        </div>
      );
    }
    return days;
  };

  return (
    <div className="flex flex-col h-full bg-white/40 rounded-2xl overflow-hidden shadow-inner relative">
      
      {/* 1. Header & Calendar Grid */}
      <div className="flex-1 flex flex-col min-h-0">
          {/* Controls */}
          <div className="flex items-center justify-between px-6 py-4 bg-white/50 backdrop-blur-sm border-b border-slate-200/50 shrink-0 z-20">
             <div className="flex items-center gap-4">
                 <h2 className="text-xl font-bold text-slate-800">
                     {year}年 {month + 1}月
                 </h2>
                 <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                     <button onClick={prevMonth} className="p-1.5 hover:bg-slate-50 text-slate-600"><ChevronLeft size={16} /></button>
                     <div className="w-px h-4 bg-slate-200"></div>
                     <button onClick={nextMonth} className="p-1.5 hover:bg-slate-50 text-slate-600"><ChevronRight size={16} /></button>
                 </div>
                 <button onClick={goToToday} className="text-xs font-medium px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors">
                     回到今天
                 </button>
             </div>
             
             {/* AI Summary Dropdown (For Monthly/Weekly Review) */}
             <div className="relative" ref={summaryMenuRef}>
                 <button 
                   onClick={() => setShowSummaryMenu(!showSummaryMenu)}
                   className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-all border border-indigo-200 shadow-sm"
                 >
                    <Sparkles size={14} />
                    <span>阶段复盘</span>
                    <ChevronDown size={12} className={`transition-transform ${showSummaryMenu ? 'rotate-180' : ''}`} />
                 </button>

                 {showSummaryMenu && (
                    <div className="absolute top-full right-0 mt-2 w-32 bg-white rounded-xl shadow-xl border border-slate-100 p-1 animate-in fade-in zoom-in-95 z-50">
                       <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">选择范围</div>
                       <button onClick={() => handleGenerateSummary('7d')} className="w-full text-left px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg">近 7 天</button>
                       <button onClick={() => handleGenerateSummary('15d')} className="w-full text-left px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg">近 15 天</button>
                       <button onClick={() => handleGenerateSummary('30d')} className="w-full text-left px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg">近 30 天</button>
                       <div className="h-px bg-slate-100 my-1"></div>
                       <button onClick={() => handleGenerateSummary('month')} className="w-full text-left px-2 py-1.5 text-xs text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg">本月概览</button>
                    </div>
                 )}
             </div>
          </div>

          {/* Month Grid */}
          <div className="flex-1 overflow-y-auto min-h-[300px]">
             {/* Weekday Header */}
             <div className="grid grid-cols-7 border-b border-slate-200/50 bg-slate-50/50 sticky top-0 z-10">
                 {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                     <div key={d} className="py-2 text-center text-xs font-medium text-slate-400">{d}</div>
                 ))}
             </div>
             {/* Days Grid */}
             <div className="grid grid-cols-7 p-2 gap-1">
                 {renderCalendarDays()}
             </div>
          </div>
      </div>

      {/* 2. Selected Day Tasks (Panel) */}
      <div className="h-[45%] min-h-[280px] border-t border-slate-200/80 bg-white/60 backdrop-blur-md flex flex-col shadow-[0_-5px_20px_rgba(0,0,0,0.03)] z-30">
         {/* Title Bar */}
         <div className="px-6 py-3 border-b border-white/50 flex items-center justify-between shrink-0 bg-white/40">
             <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-indigo-600" />
                <span className="font-semibold text-slate-800">
                    {selectedDate.getDate()}日待办
                </span>
                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-xs font-medium">
                    {selectedTasks.length}
                </span>
             </div>
         </div>

         <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* AI Daily Summary Bar (Mac Style, Lightweight) */}
            {selectedTasks.length > 0 && (
                <div className="mb-2">
                   {!dailySummary ? (
                       <div className="flex items-center justify-between bg-slate-50/80 backdrop-blur-sm rounded-xl px-4 py-3 transition-all group">
                           <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                               <Sparkles size={14} className="text-indigo-400" />
                               <span>今日总结（点击生成）</span>
                           </div>
                           <button 
                             onClick={handleGenerateDailyReport}
                             disabled={isGeneratingDaily}
                             className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                           >
                             {isGeneratingDaily ? "生成中..." : "生成"}
                           </button>
                       </div>
                   ) : (
                       <div className="bg-slate-50/80 backdrop-blur-sm rounded-xl px-4 py-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 group relative">
                           <div className="flex items-start gap-3">
                               <div className="mt-0.5 shrink-0">
                                   <Sparkles size={14} className="text-indigo-500" />
                               </div>
                               <div className="flex-1 text-sm text-slate-700 leading-relaxed text-justify">
                                   {dailySummary}
                               </div>
                           </div>
                           <div className="flex justify-end">
                               <button 
                                 onClick={handleGenerateDailyReport}
                                 disabled={isGeneratingDaily}
                                 className="text-[10px] text-slate-400 hover:text-blue-600 font-medium transition-colors"
                               >
                                 {isGeneratingDaily ? "..." : "重新生成"}
                               </button>
                           </div>
                       </div>
                   )}
                </div>
            )}

            {/* Task List */}
            <div className="space-y-2">
                {sortedSelectedTasks.length > 0 ? (
                    sortedSelectedTasks.map(todo => (
                        <TodoItem 
                            key={todo.id} 
                            todo={todo} 
                            onToggle={onToggle} 
                            onDelete={onDelete}
                            onUpdate={onUpdate}
                            focusedTodoId={focusedTodoId}
                            setFocusedTodoId={setFocusedTodoId}
                        />
                    ))
                ) : (
                    <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                        <Clock size={32} className="opacity-20" />
                        <p className="text-sm">这一天没有安排任务</p>
                    </div>
                )}
            </div>
         </div>
      </div>

      {/* --- AI SUMMARY MODAL (Monthly/Weekly) --- */}
      {showSummaryModal && (
         <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-xl flex flex-col animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-slate-200/60 bg-white/50">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                     <Sparkles size={20} />
                  </div>
                  <div>
                     <h2 className="text-xl font-bold text-slate-800">阶段工作复盘</h2>
                     <p className="text-xs text-slate-500 font-medium">
                        {isGeneratingSummary ? 'AI 正在分析数据...' : `统计范围：${summaryData?.rangeLabel}`}
                     </p>
                  </div>
               </div>
               <button 
                 onClick={() => setShowSummaryModal(false)}
                 className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
               >
                  <X size={24} />
               </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8">
               {isGeneratingSummary ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-500">
                     <Loader2 size={48} className="animate-spin text-indigo-500" />
                     <p className="text-sm font-medium animate-pulse">正在回顾你的每一条待办...</p>
                  </div>
               ) : summaryData ? (
                  <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                     
                     {/* 1. Overview Cards */}
                     <div className="grid grid-cols-3 gap-6">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
                           <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">任务总数</span>
                           <span className="text-3xl font-bold text-slate-800">{summaryData.stats.total}</span>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
                           <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">完成率</span>
                           <div className="flex items-center gap-2">
                              <span className="text-3xl font-bold text-green-600">{summaryData.stats.completionRate}</span>
                              <PieChart size={16} className="text-green-500 opacity-50" />
                           </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
                           <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">延期/风险</span>
                           <span className="text-3xl font-bold text-red-500">{summaryData.stats.overdue}</span>
                        </div>
                     </div>

                     {/* 2. Main Themes */}
                     <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                           <Target size={20} className="text-indigo-600" />
                           主要工作方向
                        </h3>
                        {/* SAFEGUARD: Check if themes is an array before mapping */}
                        {Array.isArray(summaryData.themes) && summaryData.themes.length > 0 ? (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {summaryData.themes.map((theme, idx) => (
                                 <div key={idx} className="bg-white/60 border border-slate-200 rounded-xl p-5 hover:border-indigo-200 transition-colors">
                                    <h4 className="font-bold text-slate-800 mb-3">{theme.title}</h4>
                                    <ul className="space-y-2">
                                       {/* SAFEGUARD: Check if actions is an array */}
                                       {Array.isArray(theme.actions) && theme.actions.map((action, i) => (
                                          <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                             <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0"></span>
                                             {action}
                                          </li>
                                       ))}
                                    </ul>
                                 </div>
                              ))}
                           </div>
                        ) : (
                           <div className="text-center py-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">
                             ai卡了，重试一下吧
                           </div>
                        )}
                     </div>

                     {/* 3. Suggestions */}
                     <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                           <Lightbulb size={20} className="text-amber-500" />
                           下阶段建议
                        </h3>
                        {/* SAFEGUARD: Check if suggestions is an array */}
                        {Array.isArray(summaryData.suggestions) && summaryData.suggestions.length > 0 ? (
                            <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-6">
                               <div className="space-y-3">
                                  {summaryData.suggestions.map((sug, idx) => (
                                     <div key={idx} className="flex gap-3">
                                        <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0">
                                           {idx + 1}
                                        </span>
                                        <p className="text-sm text-slate-800 leading-relaxed pt-0.5 font-medium">{sug}</p>
                                     </div>
                                  ))}
                               </div>
                            </div>
                        ) : (
                           <div className="text-center py-6 bg-amber-50/30 rounded-xl border border-dashed border-amber-100 text-amber-400 text-sm">
                             ai卡了，重试一下吧
                           </div>
                        )}
                     </div>

                     <div className="text-center pt-8 pb-4">
                        <button 
                           onClick={() => setShowSummaryModal(false)}
                           className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-medium shadow-lg hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all"
                        >
                           阅毕，关闭报告
                        </button>
                     </div>

                  </div>
               ) : (
                  <div className="text-center text-red-500 mt-10">生成失败，请重试</div>
               )}
            </div>
         </div>
      )}
    </div>
  );
};

export default CalendarView;
