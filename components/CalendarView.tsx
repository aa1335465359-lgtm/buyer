
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Todo } from '../types';
import TodoItem from './TodoItem';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Sparkles, ChevronDown } from 'lucide-react';
import { generateDailyReport } from '../services/geminiService';

interface CalendarViewProps {
  todos: Todo[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Todo>) => void;
  focusedTodoId: string | null;
  setFocusedTodoId: (id: string | null) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ todos, onToggle, onDelete, onUpdate, focusedTodoId, setFocusedTodoId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailySummary, setDailySummary] = useState<string | null>(null);
  const [isGeneratingDaily, setIsGeneratingDaily] = useState(false);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => { const now = new Date(); setCurrentDate(now); setSelectedDate(now); };

  const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

  useEffect(() => { setDailySummary(null); }, [selectedDate]);

  const getTaskDate = (todo: Todo): Date => {
    if (todo.status === 'done' && todo.completedAt) return new Date(todo.completedAt);
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

  const handleGenerateDailyReport = async () => {
    if (selectedTasks.length === 0) return;
    setIsGeneratingDaily(true);
    try {
        const dateLabel = `${selectedDate.getFullYear()}年${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日`;
        const text = await generateDailyReport(selectedTasks, dateLabel);
        setDailySummary(text);
    } catch (e) { console.error(e); } finally { setIsGeneratingDaily(false); }
  };

  const renderCalendarDays = () => {
    const days = [];
    const totalSlots = Math.ceil((daysInMonth + firstDay) / 7) * 7;
    for (let i = 0; i < totalSlots; i++) {
      const dayNum = i - firstDay + 1;
      const isValidDay = dayNum > 0 && dayNum <= daysInMonth;
      if (!isValidDay) {
        days.push(<div key={`empty-${i}`} className="h-28 bg-black/5 border border-theme-border opacity-50"></div>);
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
            h-24 rounded-theme border-theme-width transition-all flex flex-col items-center justify-center relative overflow-hidden group mx-0.5 my-0.5
            ${isSelected 
              ? 'bg-theme-input shadow-sm z-10 border-theme-accent ring-1 ring-theme-accent' 
              : 'bg-theme-card hover:bg-theme-card-hover border-theme-border'
            }
          `}
        >
           <div className={`text-xl font-bold tracking-tight transition-colors select-none ${isToday ? 'text-red-500' : (isSelected ? 'text-theme-accent' : 'text-theme-text')}`}>{dayNum}</div>
           {hasOverdue && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-400 rounded-full" />}
           {total > 0 && (
              <div className="absolute bottom-3 w-10 h-1 bg-black/10 rounded-full overflow-hidden">
                   <div className={`h-full rounded-full transition-all duration-500 ${total === completed ? 'bg-emerald-500' : 'bg-theme-accent'}`} style={{ width: `${progressPercent}%` }} />
              </div>
           )}
           {completed > 0 && <div className="absolute bottom-3 right-3 text-[10px] font-bold text-theme-subtext opacity-50">{completed}</div>}
        </div>
      );
    }
    return days;
  };

  return (
    <div className="flex flex-col h-full bg-theme-panel/40 rounded-theme overflow-hidden shadow-inner relative border-theme-width border-theme-border">
      <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-6 py-4 bg-theme-panel backdrop-blur-sm border-b border-theme-border shrink-0 z-20">
             <div className="flex items-center gap-4">
                 <h2 className="text-xl font-bold text-theme-text">{year}年 {month + 1}月</h2>
                 <div className="flex items-center bg-theme-card rounded-theme border border-theme-border shadow-sm overflow-hidden">
                     <button onClick={prevMonth} className="p-1.5 hover:bg-theme-input text-theme-subtext"><ChevronLeft size={16} /></button>
                     <div className="w-[1px] h-4 bg-theme-border"></div>
                     <button onClick={nextMonth} className="p-1.5 hover:bg-theme-input text-theme-subtext"><ChevronRight size={16} /></button>
                 </div>
                 <button onClick={goToToday} className="text-xs font-medium px-3 py-1.5 bg-theme-card border border-theme-border rounded-theme text-theme-subtext hover:text-theme-accent transition-colors">回到今天</button>
             </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-[300px]">
             <div className="grid grid-cols-7 border-b border-theme-border bg-theme-input/50 sticky top-0 z-10">
                 {['日', '一', '二', '三', '四', '五', '六'].map(d => <div key={d} className="py-2 text-center text-xs font-medium text-theme-subtext">{d}</div>)}
             </div>
             <div className="grid grid-cols-7 p-2 gap-1">{renderCalendarDays()}</div>
          </div>
      </div>
      <div className="h-[45%] min-h-[280px] border-t border-theme-border bg-theme-panel backdrop-blur-md flex flex-col shadow-theme z-30">
         <div className="px-6 py-3 border-b border-theme-border flex items-center justify-between shrink-0 bg-theme-input/30">
             <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-theme-accent" />
                <span className="font-semibold text-theme-text">{selectedDate.getDate()}日待办</span>
                <span className="bg-theme-input text-theme-subtext px-2 py-0.5 rounded-full text-xs font-medium">{selectedTasks.length}</span>
             </div>
         </div>
         <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedTasks.length > 0 && (
                <div className="mb-2">
                   {!dailySummary ? (
                       <div className="flex items-center justify-between bg-theme-card rounded-theme px-4 py-3 transition-all group border border-theme-border">
                           <div className="flex items-center gap-2 text-sm text-theme-subtext font-medium"><Sparkles size={14} className="text-theme-accent opacity-50" /><span>今日总结（点击生成）</span></div>
                           <button onClick={handleGenerateDailyReport} disabled={isGeneratingDaily} className="text-xs font-semibold text-theme-accent hover:underline transition-colors">{isGeneratingDaily ? "生成中..." : "生成"}</button>
                       </div>
                   ) : (
                       <div className="bg-theme-card rounded-theme px-4 py-3 flex flex-col gap-2 border border-theme-border">
                           <div className="flex items-start gap-3"><div className="mt-0.5 shrink-0"><Sparkles size={14} className="text-theme-accent" /></div><div className="flex-1 text-sm text-theme-text leading-relaxed text-justify">{dailySummary}</div></div>
                       </div>
                   )}
                </div>
            )}
            <div className="space-y-2">
                {selectedTasks.length > 0 ? selectedTasks.map(todo => <TodoItem key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} focusedTodoId={focusedTodoId} setFocusedTodoId={setFocusedTodoId} />) : <div className="py-8 flex flex-col items-center justify-center text-theme-subtext gap-2 opacity-50"><Clock size={32} /><p className="text-sm">这一天没有安排任务</p></div>}
            </div>
         </div>
      </div>
    </div>
  );
};

export default CalendarView;
