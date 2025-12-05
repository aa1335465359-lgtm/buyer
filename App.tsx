
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Todo, Priority, TodoStatus } from './types';
import TaskInput from './components/TaskInput';
import TodoItem from './components/TodoItem';
import ImageEditor from './components/ImageEditor';
import ScriptMatcher from './components/ScriptMatcher';
import AiAssistant from './components/AiAssistant';
import CalendarView from './components/CalendarView';
import { 
  Inbox, 
  CheckCircle2, 
  Layout, 
  Zap,
  Search,
  Quote,
  Palette,
  ShoppingBag,
  MessageSquare,
  ExternalLink,
  Bot,
  ArrowUpDown,
  Clock,
  Calendar,
  Filter,
  CalendarRange,
  ChevronDown,
  LayoutList,
  FileText
} from 'lucide-react';

const FASHION_QUOTES = [
  "“忙完这个 P0，就去买杯奶茶续命吧。”",
  "“今天的精致是装的，想下班是真的。”",
  "“只要我不看退货率，心情就是美好的。”",
  "“不用算提成，反正没有，心如止水。”",
  "“咖啡是续命水，KPI是催命符，我是中间那个冤种。”",
  "“凌晨三点的夜色很美，主要因为那时候商家终于睡了。”",
  "“别问为什么还没下班，问就是公司是我家，我在守家。”",
  "“我的耐心就像月底的余额，看着挺多，一扣就没。”",
  "“比起搞对象，我更想搞定那个只会发‘在吗’的商家。”",
  "“已老实，求放过，只要能加站，我什么都愿意做。”",
  "“建议把‘耐心’列入买手的高危职业病。”",
  "“与其内耗自己，不如发疯外耗商家。”",
  "“任何不能转化为GMV的沟通，都是对生命的浪费。”",
  "“在大润发杀了十年的鱼，心已经像板房的石头一样冷了。”",
  "“谁说买手光鲜亮丽？你来看看我几万行的 Excel。”",
  "“周五不提 P0，我们还能做朋友。”",
  "“审版不过多找找自己的原因，不要什么都跟我抱怨，我是买手还是保姆？”",
  "“与其提升自己，不如埋怨环境，比如怪商家是真的蠢。”",
  "“上班暂停，我想去楼下当一会儿流浪猫。”",
  "“每天起床第一句，先给自己打个气（然后继续当牛马）。”",
  "“已读乱回，读读读读读了也不回~”",
  "“本高雅人士正在为您挑选下一季的爆款，请勿打扰~ ૮( 🌸UwU)ა”",
  "“今天也是努力搬砖的一天，为了罐罐！🐱”",
  "“虽然很累，但想到这一单能让胖MM穿得漂亮，突然觉得自己有点棒呢✨”",
  "“小番茄能量加载中... 99%... 叮！满血复活！🍅”",
  "“今日心情：多云转晴，因为发现了一个超好看的款！🌈”",
  "“不管生活多苦，奶茶要选全糖！🧋”",
  "“我是小番茄，跌倒了不仅要爬起来，还要把自己像皮球一样弹得更高！🏀”",
  "“允许自己做一只偶尔摆烂的小海獭，晒晒太阳就好~ 🦦”",
  "“今天也要做一个情绪稳定的成年人... 除非商家说他不做了。🙃”",
  "“工作是老板的，但快乐是自己的，摸鱼半小时也是爱自己！💖”",
  "“加油小番茄！只要干不死，就往死里干！(开玩笑的，保命要紧)”",
  "“今日份的好运正在派送中，请查收~ 📦✨”",
  "“虽然是小番茄，也有大大的梦想呀！🍅💭”",
  "“把压力都变成动力... 或者变成好吃的零食！🍪”",
  "“做一个快乐的选款机器，莫得感情（才怪）~ 🤖❤️”",
  "“正在向宇宙发射爆款信号，哔哔哔... 📡”",
  "“今天也是想在成堆的款里挖到宝藏的一天呢！💎”",
  "“小番茄冲鸭！滚得越圆，跑得越快！🍅💨”",
  "“电量不足，请求投喂下午茶... 🔋🍰”",
  "“工作再忙，也要记得抬头看看云彩呀 ☁️”",
  "“不仅要选出好款，还要选出好心情！🎵”",
  "“遇到困难睡大觉，醒来又是好汉一条！💤”",
  "“生活不仅有KPI，还有楼下的便利店和晚风。🍃”",
  "“把自己照顾好，也是工作的一部分哦！🥗”",
  "“不要急，最好的爆款都在路上啦~ 🚌”",
  "“保持可爱，偶尔发呆，经常快乐！🎈”"
];

const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem('buyer_todos');
    const parsed = saved ? JSON.parse(saved) : [];
    
    // Migration: ensure status exists
    return parsed.map((t: any) => ({
      ...t,
      status: t.status || (t.isCompleted ? 'done' : 'todo')
    }));
  });
  
  // Navigation State
  const [currentView, setCurrentView] = useState<'todos' | 'image-editor' | 'indie-chi' | 'script-matcher' | 'bot' | 'tomato-pdf'>('todos');
  const [filter, setFilter] = useState<'all' | 'p0' | 'completed'>('all');
  
  // Sorting & View Mode State
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [sortMode, setSortMode] = useState<'priority' | 'deadline' | 'created'>('priority');
  const [isGroupedByDay, setIsGroupedByDay] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [quote, setQuote] = useState('');

  // Global Focus State
  const [focusedTodoId, setFocusedTodoId] = useState<string | null>(null);

  // Initial Quote
  useEffect(() => {
    const randomQuote = FASHION_QUOTES[Math.floor(Math.random() * FASHION_QUOTES.length)];
    setQuote(randomQuote);
  }, []);

  // Persistence
  useEffect(() => {
    localStorage.setItem('buyer_todos', JSON.stringify(todos));
  }, [todos]);

  // Click outside for sort menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddTodos = (newTodos: Todo[]) => {
    setTodos(prev => [...newTodos, ...prev]);
  };

  const handleToggleTodo = (id: string) => {
    // Legacy support: toggle between done and todo
    setTodos(prev => prev.map(t => {
      if (t.id !== id) return t;
      // If done, go to todo. If not done, go to done.
      const newStatus = t.status === 'done' ? 'todo' : 'done';
      return { 
        ...t, 
        status: newStatus, 
        isCompleted: newStatus === 'done',
        completedAt: newStatus === 'done' ? Date.now() : undefined
      };
    }));
    // If we complete the currently focused item, exit focus mode
    if (focusedTodoId === id) {
      setFocusedTodoId(null);
    }
  };
  
  const handleUpdateTodo = (id: string, updates: Partial<Todo>) => {
    setTodos(prev => prev.map(t => {
       if (t.id !== id) return t;
       
       const updated = { ...t, ...updates };
       
       // Handle completedAt logic based on status
       if (updates.status !== undefined) {
           updated.isCompleted = updates.status === 'done';
           
           if (updates.status === 'done') {
               // Only update completedAt if it doesn't exist, to preserve original completion time
               if (!updated.completedAt) {
                   updated.completedAt = Date.now();
               }
           } else {
               // If moving out of done, clear completedAt
               updated.completedAt = undefined;
           }
       }
       return updated;
    }));
  };

  const handleDeleteTodo = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
    if (focusedTodoId === id) {
      setFocusedTodoId(null);
    }
  };

  // Sorting Logic
  const sortedTodos = useMemo(() => {
    const priorityOrder = { [Priority.P0]: 0, [Priority.P1]: 1, [Priority.P2]: 2, [Priority.P3]: 3, [Priority.P4]: 4 };
    
    const getScore = (p: string) => {
        if (p === 'HIGH') return 0;
        if (p === 'MEDIUM') return 2;
        if (p === 'LOW') return 3;
        return priorityOrder[p as Priority] ?? 5;
    };

    return [...todos].sort((a, b) => {
        // 1. Completion status (Done last)
        const aDone = a.status === 'done';
        const bDone = b.status === 'done';
        if (aDone !== bDone) return aDone ? 1 : -1;
        
        // 2. Sorting Mode
        if (sortMode === 'priority') {
            const scoreA = getScore(a.priority);
            const scoreB = getScore(b.priority);
            if (scoreA !== scoreB) return scoreA - scoreB;
            
            // Secondary: Deadline
            if (a.deadline && b.deadline) return a.deadline - b.deadline;
            if (a.deadline) return -1;
            if (b.deadline) return 1;
        } else if (sortMode === 'deadline') {
            // Nearest deadline first
            if (a.deadline && b.deadline) return a.deadline - b.deadline;
            if (a.deadline && !b.deadline) return -1;
            if (!a.deadline && b.deadline) return 1;
            
            // Fallback: Priority
            const scoreA = getScore(a.priority);
            const scoreB = getScore(b.priority);
            if (scoreA !== scoreB) return scoreA - scoreB;
        } else if (sortMode === 'created') {
            return b.createdAt - a.createdAt;
        }

        return b.createdAt - a.createdAt;
    });
  }, [todos, sortMode]);

  const filteredTodos = sortedTodos.filter(todo => {
    // Search logic
    if (searchQuery) {
       const query = searchQuery.toLowerCase();
       const matches = todo.title.toLowerCase().includes(query) || 
                       todo.shopId?.includes(query) ||
                       todo.description?.toLowerCase().includes(query);
       if (!matches) return false;
    }

    if (filter === 'completed') return todo.status === 'done';
    
    // For 'all' or 'p0', we exclude 'done'
    if (todo.status === 'done') return false;

    if (filter === 'p0') {
        return todo.priority === Priority.P0 || (todo.priority as string) === 'HIGH';
    }
    
    return true;
  });

  // Grouping Logic
  const groupedTodos = useMemo(() => {
    if (!isGroupedByDay) return [];

    const groups: { [key: string]: Todo[] } = {};

    filteredTodos.forEach(todo => {
        const d = new Date(todo.createdAt);
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const todoTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        
        let key = '';
        if (todoTime === todayStart) {
            key = '今天';
        } else if (todoTime === todayStart - 86400000) {
            key = '昨天';
        } else if (todoTime === todayStart - 86400000 * 2) {
            key = '前天';
        } else {
            key = `${d.getMonth() + 1}月${d.getDate()}日`;
        }
        
        if (!groups[key]) groups[key] = [];
        groups[key].push(todo);
    });

    const sortedGroups: { title: string, tasks: Todo[] }[] = [];
    
    if (groups['今天']) sortedGroups.push({ title: '今天', tasks: groups['今天'] });
    if (groups['昨天']) sortedGroups.push({ title: '昨天', tasks: groups['昨天'] });
    if (groups['前天']) sortedGroups.push({ title: '前天', tasks: groups['前天'] });
    
    const dateKeys = Object.keys(groups).filter(k => !['今天', '昨天', '前天'].includes(k));
    
    dateKeys.sort((a, b) => {
        const taskA = groups[a][0];
        const taskB = groups[b][0];
        return taskB.createdAt - taskA.createdAt;
    });
    
    dateKeys.forEach(k => sortedGroups.push({ title: k, tasks: groups[k] }));
    
    return sortedGroups;
  }, [filteredTodos, isGroupedByDay]);

  const activeCount = todos.filter(t => t.status !== 'done').length;
  const p0Count = todos.filter(t => t.status !== 'done' && (t.priority === Priority.P0 || (t.priority as string) === 'HIGH')).length;

  const getCurrentSortLabel = () => {
    if (isGroupedByDay) return '日维度';
    if (sortMode === 'priority') return '优先级';
    if (sortMode === 'deadline') return '截止时间';
    if (sortMode === 'created') return '创建时间';
    return '优先级';
  };

  return (
    <div className="h-screen w-full flex items-center justify-center p-4 sm:p-8">
      {/* Main Window Container */}
      <div className="w-full max-w-6xl h-full max-h-[900px] glass-panel rounded-2xl flex overflow-hidden shadow-2xl">
        
        {/* Sidebar */}
        <div className="w-64 bg-mac-sidebar border-r border-mac-border flex flex-col pt-6 pb-4 hidden md:flex shrink-0">
          <div className="px-6 mb-8">
            <h1 className="text-sm font-bold tracking-wider text-slate-500 uppercase">Buyer Mate</h1>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">v2.4.2</p>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            <SidebarItem 
              icon={<Inbox size={18} />} 
              label="全部待办" 
              count={activeCount}
              active={currentView === 'todos' && filter === 'all'} 
              onClick={() => { setCurrentView('todos'); setFilter('all'); }} 
            />
            <SidebarItem 
              icon={<Zap size={18} />} 
              label="紧急事项 (P0)" 
              active={currentView === 'todos' && filter === 'p0'} 
              count={p0Count}
              onClick={() => { setCurrentView('todos'); setFilter('p0'); }} 
            />
             <SidebarItem 
              icon={<CheckCircle2 size={18} />} 
              label="已归档" 
              active={currentView === 'todos' && filter === 'completed'} 
              onClick={() => { setCurrentView('todos'); setFilter('completed'); }} 
            />

            <div className="pt-6 mt-2">
               <p className="px-3 mb-3 text-[10px] font-bold text-slate-400/80 uppercase tracking-widest">工具箱</p>
               <SidebarItem 
                  icon={<Bot size={18} />} 
                  label="小番茄" 
                  active={currentView === 'bot'} 
                  onClick={() => setCurrentView('bot')} 
                />
               <SidebarItem 
                  icon={<Palette size={18} />} 
                  label="智能改图" 
                  active={currentView === 'image-editor'} 
                  onClick={() => setCurrentView('image-editor')} 
                />
               <SidebarItem 
                  icon={<MessageSquare size={18} />} 
                  label="话术推荐" 
                  active={currentView === 'script-matcher'} 
                  onClick={() => setCurrentView('script-matcher')} 
                />
               <SidebarItem 
                  icon={<ShoppingBag size={18} />} 
                  label="Indie Chi 选款" 
                  active={currentView === 'indie-chi'} 
                  onClick={() => setCurrentView('indie-chi')} 
                />
               <SidebarItem 
                  icon={<FileText size={18} />} 
                  label="番茄PDF" 
                  active={currentView === 'tomato-pdf'} 
                  onClick={() => setCurrentView('tomato-pdf')} 
                />
            </div>
          </nav>

          <div className="px-6 mt-auto mb-4">
             <div className="p-4 bg-white/40 rounded-xl border border-white/40 shadow-sm relative overflow-hidden group hover:bg-white/60 transition-colors">
                <Quote className="absolute -top-1 -left-1 text-slate-200 w-8 h-8 opacity-50" />
                <p className="text-[11px] text-slate-500 font-medium italic relative z-10 leading-relaxed">
                   {quote}
                </p>
             </div>
          </div>
        </div>

        {/* Main Content Area - Keeping components alive */}
        <div className="flex-1 flex flex-col bg-white/40 relative backdrop-blur-3xl min-w-0">
            
            {/* View 1: Todos (Dashboard) */}
            <div className={`flex flex-col h-full ${currentView === 'todos' ? 'flex' : 'hidden'}`}>
                {/* Top Bar */}
                <div className="h-16 border-b border-mac-border flex items-center justify-between px-8 bg-white/40 backdrop-blur-md sticky top-0 z-10 shrink-0">
                  <div className="flex flex-col">
                      <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-lg">
                      {filter === 'all' && '工作台'}
                      {filter === 'p0' && '紧急事项 (P0)'}
                      {filter === 'completed' && '历史归档'}
                      </h2>
                      <span className="text-[10px] text-slate-500 font-medium">
                          {new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </span>
                  </div>
                  
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="搜索..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-white/50 border border-slate-200/50 focus:bg-white focus:border-blue-400/50 rounded-lg text-sm outline-none transition-all w-48 focus:w-64 placeholder-slate-400 shadow-sm"
                    />
                  </div>
                </div>

                {/* Sorting & View Toggle Toolbar */}
                <div className="px-8 py-2 border-b border-mac-border/50 flex items-center justify-between bg-white/20 backdrop-blur-sm shrink-0 z-20">
                    {/* Left: Sort Menu (Only for List View) */}
                    <div className="relative" ref={sortMenuRef}>
                      {viewMode === 'list' && (
                        <>
                        <button 
                            onClick={() => setShowSortMenu(!showSortMenu)}
                            className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-white/50 hover:bg-white px-3 py-1.5 rounded-lg border border-slate-200/50 hover:border-slate-300 transition-all shadow-sm group"
                        >
                            <span className="text-slate-500 group-hover:text-slate-600 transition-colors">排序:</span>
                            <span className="font-semibold text-slate-800">{getCurrentSortLabel()}</span>
                            <ChevronDown size={12} className={`text-slate-400 transition-transform duration-200 ${showSortMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showSortMenu && (
                            <div className="absolute top-full left-0 mt-1 w-36 bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-xl shadow-xl p-1 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/5 z-50">
                                <button 
                                    onClick={() => { setSortMode('priority'); setIsGroupedByDay(false); setShowSortMenu(false); }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors ${!isGroupedByDay && sortMode === 'priority' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <ArrowUpDown size={13} className={!isGroupedByDay && sortMode === 'priority' ? 'text-slate-900' : 'text-slate-400'} />
                                    优先级
                                </button>

                                <button 
                                    onClick={() => { setSortMode('deadline'); setIsGroupedByDay(false); setShowSortMenu(false); }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors ${!isGroupedByDay && sortMode === 'deadline' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <Clock size={13} className={!isGroupedByDay && sortMode === 'deadline' ? 'text-slate-900' : 'text-slate-400'} />
                                    截止时间
                                </button>

                                <button 
                                    onClick={() => { setSortMode('created'); setIsGroupedByDay(false); setShowSortMenu(false); }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors ${!isGroupedByDay && sortMode === 'created' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <Calendar size={13} className={!isGroupedByDay && sortMode === 'created' ? 'text-slate-900' : 'text-slate-400'} />
                                    创建时间
                                </button>

                                <div className="h-px bg-slate-100 my-1 mx-1"></div>

                                <button 
                                    onClick={() => { setIsGroupedByDay(true); setShowSortMenu(false); }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors ${isGroupedByDay ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <CalendarRange size={13} className={isGroupedByDay ? 'text-slate-900' : 'text-slate-400'} />
                                    日维度
                                </button>
                            </div>
                        )}
                        </>
                      )}
                    </div>
                    
                    {/* Right: View Switcher */}
                    <div className="flex bg-slate-100/50 p-1 rounded-lg border border-slate-200/50 ml-auto">
                        <button 
                            onClick={() => setViewMode('list')} 
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                            title="列表视图"
                        >
                            <LayoutList size={16} />
                        </button>
                        <button 
                            onClick={() => setViewMode('calendar')} 
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                            title="日历视图"
                        >
                            <Calendar size={16} />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                {viewMode === 'list' ? (
                  // === LIST VIEW ===
                  <>
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth">
                      {filteredTodos.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <Layout className="w-16 h-16 mb-4 opacity-10" />
                            <p className="text-sm font-medium opacity-50">暂无任务，享受当下</p>
                        </div>
                      ) : (
                        <>
                        {!isGroupedByDay ? (
                            <div className="space-y-3 pb-24 relative">
                              {filteredTodos.map(todo => (
                                <TodoItem 
                                  key={todo.id} 
                                  todo={todo} 
                                  onToggle={handleToggleTodo} 
                                  onDelete={handleDeleteTodo}
                                  onUpdate={handleUpdateTodo}
                                  focusedTodoId={focusedTodoId}
                                  setFocusedTodoId={setFocusedTodoId}
                                />
                              ))}
                            </div>
                        ) : (
                            <div className="space-y-8 pb-24 relative">
                              {groupedTodos.map((group) => (
                                <div key={group.title}>
                                    <div className="flex items-center gap-2 mb-3 px-1">
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{group.title}</h3>
                                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full font-mono">{group.tasks.length}</span>
                                    </div>
                                    <div className="space-y-3">
                                        {group.tasks.map(todo => (
                                            <TodoItem 
                                              key={todo.id} 
                                              todo={todo} 
                                              onToggle={handleToggleTodo} 
                                              onDelete={handleDeleteTodo}
                                              onUpdate={handleUpdateTodo}
                                              focusedTodoId={focusedTodoId}
                                              setFocusedTodoId={setFocusedTodoId}
                                            />
                                        ))}
                                    </div>
                                </div>
                              ))}
                            </div>
                        )}
                        </>
                      )}
                    </div>
                    {/* Bottom Input Area (Only in List View for now, or maybe always?) */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-50/90 via-slate-50/80 to-transparent pt-12 z-20">
                      <div className="max-w-3xl mx-auto">
                          <TaskInput onAddTodos={handleAddTodos} />
                      </div>
                    </div>
                  </>
                ) : (
                  // === CALENDAR VIEW ===
                  <div className="flex-1 p-6 overflow-hidden">
                      <CalendarView 
                        todos={todos} // Pass FULL todos regardless of filter, so calendar shows everything
                        onToggle={handleToggleTodo}
                        onDelete={handleDeleteTodo}
                        onUpdate={handleUpdateTodo}
                        focusedTodoId={focusedTodoId}
                        setFocusedTodoId={setFocusedTodoId}
                      />
                  </div>
                )}
            </div>

            {/* View 2: Image Editor */}
            <div className={`h-full w-full ${currentView === 'image-editor' ? 'block' : 'hidden'}`}>
                <ImageEditor />
            </div>

            {/* View 3: Script Matcher */}
            <div className={`h-full w-full ${currentView === 'script-matcher' ? 'block' : 'hidden'}`}>
                <ScriptMatcher />
            </div>

            {/* View 4: AI Assistant */}
            <div className={`h-full w-full ${currentView === 'bot' ? 'block' : 'hidden'}`}>
                <AiAssistant />
            </div>

            {/* View 5: Indie Chi */}
            <div className={`h-full w-full flex flex-col bg-white ${currentView === 'indie-chi' ? 'flex' : 'hidden'}`}>
                <div className="h-12 border-b border-slate-200 flex items-center justify-between px-6 bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                    <h2 className="font-semibold text-slate-700 text-sm">Indie Chi 选款</h2>
                    </div>
                    <a href="https://indie-chi.vercel.app/" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-md transition-colors">
                    <ExternalLink size={12} /> 在新窗口打开
                    </a>
                </div>
                {/* Always render iframe but hide it to preserve state (if browser allows) */}
                <iframe 
                    src="https://indie-chi.vercel.app/" 
                    className="flex-1 w-full border-none bg-white" 
                    title="Indie Chi"
                />
            </div>

            {/* View 6: Tomato PDF */}
            <div className={`h-full w-full flex flex-col bg-white ${currentView === 'tomato-pdf' ? 'flex' : 'hidden'}`}>
                <div className="h-12 border-b border-slate-200 flex items-center justify-between px-6 bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                    <h2 className="font-semibold text-slate-700 text-sm">番茄PDF</h2>
                    </div>
                    <a href="https://share-pdf-beta.vercel.app/" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-md transition-colors">
                    <ExternalLink size={12} /> 在新窗口打开
                    </a>
                </div>
                {/* Always render iframe but hide it to preserve state (if browser allows) */}
                <iframe 
                    src="https://share-pdf-beta.vercel.app/" 
                    className="flex-1 w-full border-none bg-white" 
                    title="Tomato PDF"
                />
            </div>

        </div>
      </div>
    </div>
  );
};

// Sub-component for sidebar items
const SidebarItem = ({ icon, label, count, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
      active 
        ? 'bg-black/5 text-slate-900' 
        : 'text-slate-500 hover:bg-black/5 hover:text-slate-700'
    }`}
  >
    <div className={`flex items-center gap-3 ${active ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'}`}>
      {React.cloneElement(icon, { size: 18, strokeWidth: active ? 2.5 : 2, className: 'transition-all' })}
      <span>{label}</span>
    </div>
    {count !== undefined && count > 0 && (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${active ? 'bg-white shadow-sm text-slate-700' : 'bg-transparent text-slate-400 group-hover:bg-slate-200/50'}`}>
        {count}
      </span>
    )}
  </button>
);

export default App;
