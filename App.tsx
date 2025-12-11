
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Todo, Priority } from './types';
import TaskInput from './components/TaskInput';
import TodoItem from './components/TodoItem';
import ImageEditor from './components/ImageEditor';
import ScriptMatcher from './components/ScriptMatcher';
import AiAssistant from './components/AiAssistant';
import CalendarView from './components/CalendarView';
import ThemeBackground from './components/ThemeBackground';
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
  CalendarRange,
  ChevronDown,
  LayoutList,
  FileText
} from 'lucide-react';

// Quotes (Kept unchanged)
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

const THEME_OPTIONS = [
  { id: 'glass', name: '默认 (玻璃)', color: '#a5b4fc' },
  { id: 'pixel', name: '复古像素', color: '#86efac' },
  { id: 'kawaii', name: '糖果甜心', color: '#f9a8d4' },
  { id: 'wooden', name: '温暖木质', color: '#d4a373' },
  { id: 'watercolor', name: '水彩画布', color: '#93c5fd' },
  { id: 'paper', name: '极简纸张', color: '#cbd5e1' },
];

const App: React.FC = () => {
  // --- STATE ---
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem('buyer_todos');
    const parsed = saved ? JSON.parse(saved) : [];
    return parsed.map((t: any) => ({
      ...t,
      status: t.status || (t.isCompleted ? 'done' : 'todo')
    }));
  });
  
  const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'glass');
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const [currentView, setCurrentView] = useState<'todos' | 'image-editor' | 'indie-chi' | 'script-matcher' | 'bot' | 'tomato-pdf'>('todos');
  const [filter, setFilter] = useState<'all' | 'p0' | 'completed'>('all');
  
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [sortMode, setSortMode] = useState<'priority' | 'deadline' | 'created'>('priority');
  const [isGroupedByDay, setIsGroupedByDay] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [quote, setQuote] = useState('');

  const [focusedTodoId, setFocusedTodoId] = useState<string | null>(null);

  // --- REFS ---
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // --- EFFECTS ---
  useEffect(() => {
    const randomQuote = FASHION_QUOTES[Math.floor(Math.random() * FASHION_QUOTES.length)];
    setQuote(randomQuote);
  }, []);

  useEffect(() => { localStorage.setItem('buyer_todos', JSON.stringify(todos)); }, [todos]);
  useEffect(() => { localStorage.setItem('app_theme', theme); }, [theme]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) setShowSortMenu(false);
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) setShowThemeMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- HANDLERS ---
  const handleAddTodos = (newTodos: Todo[]) => setTodos(prev => [...newTodos, ...prev]);
  
  const handleToggleTodo = (id: string) => {
    setTodos(prev => prev.map(t => {
      if (t.id !== id) return t;
      const newStatus = t.status === 'done' ? 'todo' : 'done';
      return { ...t, status: newStatus, isCompleted: newStatus === 'done', completedAt: newStatus === 'done' ? Date.now() : undefined };
    }));
    if (focusedTodoId === id) setFocusedTodoId(null);
  };
  
  const handleUpdateTodo = (id: string, updates: Partial<Todo>) => {
    setTodos(prev => prev.map(t => {
       if (t.id !== id) return t;
       const updated = { ...t, ...updates };
       if (updates.status !== undefined) {
           updated.isCompleted = updates.status === 'done';
           if (updates.status === 'done' && !updated.completedAt) updated.completedAt = Date.now();
           else if (updates.status !== 'done') updated.completedAt = undefined;
       }
       return updated;
    }));
  };

  const handleDeleteTodo = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
    if (focusedTodoId === id) setFocusedTodoId(null);
  };

  // --- DERIVED STATE ---
  const sortedTodos = useMemo(() => {
    const priorityOrder = { [Priority.P0]: 0, [Priority.P1]: 1, [Priority.P2]: 2, [Priority.P3]: 3, [Priority.P4]: 4 };
    const getScore = (p: string) => {
        if (p === 'HIGH') return 0;
        if (p === 'MEDIUM') return 2;
        if (p === 'LOW') return 3;
        return priorityOrder[p as Priority] ?? 5;
    };
    return [...todos].sort((a, b) => {
        const aDone = a.status === 'done';
        const bDone = b.status === 'done';
        if (aDone !== bDone) return aDone ? 1 : -1;
        
        if (sortMode === 'priority') {
            const scoreA = getScore(a.priority);
            const scoreB = getScore(b.priority);
            if (scoreA !== scoreB) return scoreA - scoreB;
            if (a.deadline && b.deadline) return a.deadline - b.deadline;
            if (a.deadline) return -1;
            if (b.deadline) return 1;
        } else if (sortMode === 'deadline') {
            if (a.deadline && b.deadline) return a.deadline - b.deadline;
            if (a.deadline && !b.deadline) return -1;
            if (!a.deadline && b.deadline) return 1;
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
    if (searchQuery) {
       const query = searchQuery.toLowerCase();
       const matches = todo.title.toLowerCase().includes(query) || 
                       todo.shopId?.includes(query) ||
                       todo.description?.toLowerCase().includes(query);
       if (!matches) return false;
    }
    if (filter === 'completed') return todo.status === 'done';
    if (todo.status === 'done') return false;
    if (filter === 'p0') return todo.priority === Priority.P0 || (todo.priority as string) === 'HIGH';
    return true;
  });

  const groupedTodos = useMemo(() => {
    if (!isGroupedByDay) return [];
    const groups: { [key: string]: Todo[] } = {};
    filteredTodos.forEach(todo => {
        const d = new Date(todo.createdAt);
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const todoTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        let key = '';
        if (todoTime === todayStart) key = '今天';
        else if (todoTime === todayStart - 86400000) key = '昨天';
        else if (todoTime === todayStart - 86400000 * 2) key = '前天';
        else key = `${d.getMonth() + 1}月${d.getDate()}日`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(todo);
    });
    const sortedGroups: { title: string, tasks: Todo[] }[] = [];
    ['今天', '昨天', '前天'].forEach(k => { if (groups[k]) sortedGroups.push({ title: k, tasks: groups[k] }); });
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

  return (
    <div className="h-screen w-full flex items-center justify-center p-4 sm:p-8" data-theme={theme}>
      <ThemeBackground theme={theme} />
      
      {/* Main Container */}
      <div className="w-full max-w-6xl h-full max-h-[900px] bg-theme-panel rounded-theme-lg flex overflow-hidden shadow-theme transition-all duration-300 border-theme border-theme-width backdrop-blur-md">
        
        {/* Sidebar */}
        <div className="w-64 bg-theme-sidebar border-r border-theme-border border-theme-width flex flex-col pt-6 pb-4 hidden md:flex shrink-0 transition-colors">
          
          {/* Theme Entry Point */}
          <div className="px-6 mb-8 relative" ref={themeMenuRef}>
            <div 
              className="cursor-pointer group select-none"
              onClick={() => setShowThemeMenu(!showThemeMenu)}
            >
              <h1 className="text-sm font-bold tracking-wider text-theme-subtext uppercase group-hover:text-theme-accent transition-colors flex items-center gap-1">
                BUYER MATE <ChevronDown size={12} className={`transition-transform ${showThemeMenu ? 'rotate-180' : ''}`} />
              </h1>
              <p className="text-xs text-theme-subtext mt-1 opacity-60 font-mono">v3.0.0</p>
            </div>
            
            {showThemeMenu && (
              <div className="absolute top-full left-6 mt-2 w-48 bg-theme-card border border-theme-border border-theme-width rounded-theme shadow-theme p-1 z-50 animate-in fade-in slide-in-from-top-2">
                {THEME_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setTheme(opt.id); setShowThemeMenu(false); }}
                    className={`w-full text-left px-3 py-2 rounded-theme-sm text-xs font-medium flex items-center gap-2 transition-colors ${theme === opt.id ? 'bg-theme-accent-bg text-theme-accent' : 'text-theme-subtext hover:bg-theme-input'}`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: opt.color }}></div>
                    {opt.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Navigation */}
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
               <p className="px-3 mb-3 text-[10px] font-bold text-theme-subtext opacity-70 uppercase tracking-widest">工具箱</p>
               <SidebarItem icon={<Bot size={18} />} label="小番茄" active={currentView === 'bot'} onClick={() => setCurrentView('bot')} />
               <SidebarItem icon={<Palette size={18} />} label="智能改图" active={currentView === 'image-editor'} onClick={() => setCurrentView('image-editor')} />
               <SidebarItem icon={<MessageSquare size={18} />} label="话术推荐" active={currentView === 'script-matcher'} onClick={() => setCurrentView('script-matcher')} />
               <SidebarItem icon={<ShoppingBag size={18} />} label="Indie Chi 选款" active={currentView === 'indie-chi'} onClick={() => setCurrentView('indie-chi')} />
               <SidebarItem icon={<FileText size={18} />} label="番茄PDF" active={currentView === 'tomato-pdf'} onClick={() => setCurrentView('tomato-pdf')} />
            </div>
          </nav>

          <div className="px-6 mt-auto mb-4 space-y-3">
             <div className="p-4 bg-theme-card rounded-theme border border-theme-border border-theme-width shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <Quote className="absolute -top-1 -left-1 text-theme-subtext w-8 h-8 opacity-20" />
                <p className="text-[11px] text-theme-subtext font-medium italic relative z-10 leading-relaxed">
                   {quote}
                </p>
             </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col bg-transparent relative min-w-0">
            {currentView === 'todos' && (
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="h-16 border-b border-theme-border border-theme-width flex items-center justify-between px-8 bg-theme-panel/50 backdrop-blur-md sticky top-0 z-10 shrink-0">
                  <div className="flex flex-col">
                      <h2 className="font-semibold text-theme-text flex items-center gap-2 text-lg">
                      {filter === 'all' && '工作台'}
                      {filter === 'p0' && '紧急事项 (P0)'}
                      {filter === 'completed' && '历史归档'}
                      </h2>
                      <span className="text-[10px] text-theme-subtext font-medium">
                          {new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </span>
                  </div>
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-subtext opacity-50" />
                    <input 
                        type="text" 
                        placeholder="搜索..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-theme-input border border-theme-border border-theme-width focus:bg-theme-card rounded-theme text-sm outline-none transition-all w-48 focus:w-64 placeholder-theme-subtext/50 shadow-sm text-theme-text"
                    />
                  </div>
                </div>

                {/* Toolbar */}
                <div className="px-8 py-2 border-b border-theme-border border-theme-width flex items-center justify-between bg-theme-panel/20 backdrop-blur-sm shrink-0 z-20">
                    <div className="relative" ref={sortMenuRef}>
                      {viewMode === 'list' && (
                        <>
                        <button 
                            onClick={() => setShowSortMenu(!showSortMenu)}
                            className="flex items-center gap-2 text-xs font-medium text-theme-text bg-theme-input hover:bg-theme-card px-3 py-1.5 rounded-theme border border-theme-border border-theme-width shadow-sm transition-all"
                        >
                            <span className="text-theme-subtext">排序:</span>
                            <span className="font-semibold">{isGroupedByDay ? '日维度' : (sortMode === 'priority' ? '优先级' : sortMode === 'deadline' ? '截止时间' : '创建时间')}</span>
                            <ChevronDown size={12} className={`text-theme-subtext transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
                        </button>
                        {showSortMenu && (
                            <div className="absolute top-full left-0 mt-1 w-36 bg-theme-card border border-theme-border border-theme-width rounded-theme shadow-theme p-1 z-50 animate-in fade-in zoom-in-95">
                                <button onClick={() => { setSortMode('priority'); setIsGroupedByDay(false); setShowSortMenu(false); }} className="w-full text-left px-3 py-2 rounded-theme-sm text-xs font-medium flex items-center gap-2 hover:bg-theme-input text-theme-text"><ArrowUpDown size={13} /> 优先级</button>
                                <button onClick={() => { setSortMode('deadline'); setIsGroupedByDay(false); setShowSortMenu(false); }} className="w-full text-left px-3 py-2 rounded-theme-sm text-xs font-medium flex items-center gap-2 hover:bg-theme-input text-theme-text"><Clock size={13} /> 截止时间</button>
                                <button onClick={() => { setSortMode('created'); setIsGroupedByDay(false); setShowSortMenu(false); }} className="w-full text-left px-3 py-2 rounded-theme-sm text-xs font-medium flex items-center gap-2 hover:bg-theme-input text-theme-text"><Calendar size={13} /> 创建时间</button>
                                <div className="h-[1px] bg-theme-border my-1 mx-1"></div>
                                <button onClick={() => { setIsGroupedByDay(true); setShowSortMenu(false); }} className="w-full text-left px-3 py-2 rounded-theme-sm text-xs font-medium flex items-center gap-2 hover:bg-theme-input text-theme-text"><CalendarRange size={13} /> 日维度</button>
                            </div>
                        )}
                        </>
                      )}
                    </div>
                    
                    <div className="flex bg-theme-input p-1 rounded-theme border border-theme-border border-theme-width ml-auto">
                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-theme-sm transition-all ${viewMode === 'list' ? 'bg-theme-card shadow-sm text-theme-accent' : 'text-theme-subtext hover:text-theme-text'}`}><LayoutList size={16} /></button>
                        <button onClick={() => setViewMode('calendar')} className={`p-1.5 rounded-theme-sm transition-all ${viewMode === 'calendar' ? 'bg-theme-card shadow-sm text-theme-accent' : 'text-theme-subtext hover:text-theme-text'}`}><Calendar size={16} /></button>
                    </div>
                </div>

                {viewMode === 'list' ? (
                  <>
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth">
                      {filteredTodos.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-theme-subtext">
                            <Layout className="w-16 h-16 mb-4 opacity-10" />
                            <p className="text-sm font-medium opacity-50">暂无任务</p>
                        </div>
                      ) : (
                        <div className="space-y-3 pb-24">
                           {isGroupedByDay ? groupedTodos.map(group => (
                             <div key={group.title} className="space-y-3">
                               <div className="flex items-center gap-2 px-1"><h3 className="text-xs font-bold text-theme-subtext opacity-70 uppercase tracking-wider">{group.title}</h3></div>
                               {group.tasks.map(todo => <TodoItem key={todo.id} todo={todo} onToggle={handleToggleTodo} onDelete={handleDeleteTodo} onUpdate={handleUpdateTodo} focusedTodoId={focusedTodoId} setFocusedTodoId={setFocusedTodoId} />)}
                             </div>
                           )) : filteredTodos.map(todo => <TodoItem key={todo.id} todo={todo} onToggle={handleToggleTodo} onDelete={handleDeleteTodo} onUpdate={handleUpdateTodo} focusedTodoId={focusedTodoId} setFocusedTodoId={setFocusedTodoId} />)}
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-theme-panel via-theme-panel/80 to-transparent pt-12 z-20">
                      <div className="max-w-3xl mx-auto"><TaskInput onAddTodos={handleAddTodos} onUpdateTodo={handleUpdateTodo} onDeleteTodo={handleDeleteTodo} /></div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 p-6 overflow-hidden"><CalendarView todos={todos} onToggle={handleToggleTodo} onDelete={handleDeleteTodo} onUpdate={handleUpdateTodo} focusedTodoId={focusedTodoId} setFocusedTodoId={setFocusedTodoId} /></div>
                )}
              </div>
            )}

            {/* IFRAMES / OTHER VIEWS */}
            {currentView === 'image-editor' && <div className="h-full w-full"><ImageEditor /></div>}
            {currentView === 'script-matcher' && <div className="h-full w-full"><ScriptMatcher /></div>}
            {currentView === 'bot' && <div className="h-full w-full"><AiAssistant /></div>}
            
            {(currentView === 'indie-chi' || currentView === 'tomato-pdf') && (
              <div className="h-full w-full flex flex-col bg-white">
                 <div className="h-12 border-b border-theme-border border-theme-width flex items-center justify-between px-6 bg-theme-panel/50 shrink-0">
                    <div className="flex items-center gap-2"><h2 className="font-semibold text-theme-text text-sm">{currentView === 'indie-chi' ? 'Indie Chi 选款' : '番茄PDF'}</h2></div>
                    <a href={currentView === 'indie-chi' ? "https://fake-indie.vercel.app/" : "https://share-pdf-beta.vercel.app/"} target="_blank" className="flex items-center gap-1.5 text-xs text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md"><ExternalLink size={12} /> 新窗口打开</a>
                 </div>
                 <iframe src={currentView === 'indie-chi' ? "https://fake-indie.vercel.app/" : "https://share-pdf-beta.vercel.app/"} className="flex-1 w-full border-none bg-white" />
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

const SidebarItem = ({ icon, label, count, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-2 rounded-theme-sm text-sm font-medium transition-all duration-200 group ${
      active 
        ? 'bg-theme-accent-bg text-theme-accent' 
        : 'text-theme-subtext hover:bg-theme-input hover:text-theme-text'
    }`}
  >
    <div className={`flex items-center gap-3 ${active ? 'text-theme-accent' : 'text-theme-subtext group-hover:text-theme-text'}`}>
      {React.cloneElement(icon, { size: 18, strokeWidth: active ? 2.5 : 2 })}
      <span>{label}</span>
    </div>
    {count !== undefined && count > 0 && (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${active ? 'bg-theme-card text-theme-accent' : 'bg-transparent text-theme-subtext group-hover:bg-theme-input'}`}>
        {count}
      </span>
    )}
  </button>
);

export default App;
