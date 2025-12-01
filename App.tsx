import React, { useState, useEffect, useMemo } from 'react';
import { Todo, Priority } from './types';
import TaskInput from './components/TaskInput';
import TodoItem from './components/TodoItem';
import ImageEditor from './components/ImageEditor';
import ScriptMatcher from './components/ScriptMatcher';
import AiAssistant from './components/AiAssistant';
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
  Filter
} from 'lucide-react';

const FASHION_QUOTES = [
  "“忙完这个 P0，就去买杯奶茶续命吧。”",
  "“商家的‘明天发货’，听听就好，别当真。”",
  "“今天的精致是装的，想下班是真的。”",
  "“只要我不看退货率，心情就是美好的。”",
  "“爆款就像爱情，总是在你放弃的时候突然出现。”",
  "“别催了，我的耐心和库存一样，快见底了。”",
  "“拿着卖白菜的钱，操着卖白粉的心。”",
  "“老板画的饼，比大码模特的脸还圆。”",
  "“谁说买手光鲜亮丽？你来看看我几万行的 Excel。”",
  "“周五不提 P0，我们还能做朋友。”",
  "“商家：核价又没过！我：怪我咯？”",
  "“人生苦短，不如摸鱼。”",
  "“每一个爆款背后，都有一个头秃的买手。”",
  "“今天的快乐是外卖给的，痛苦是销量给的。”",
  "“不要问我为什么还没睡，因为时差还在倒，款还在选。”",
  "“选品靠玄学，运营靠运气，只有胖是对我最忠诚的。”",
  "“做买手最怕的不是没款，是款爆了，工厂说布料没了。”",
  "“每天就在‘核价不过’和‘审版失败’的弹窗里渡劫。”",
  "“没有什么是一顿火锅解决不了的，如果有，那就再加个爆款。”",
  "“下班是不可能下班的，这辈子都不可能早下班的。”",
  "“每天起床第一句，先给自己打个气（然后继续当牛马）。”",
  "“比起恋爱，我更想谈几个 S 级的大商家。”",
  "“我的黑眼圈，是这个季度最流行的烟熏妆。”",
  "“别跟我谈理想，我的理想就是不上班还能有钱拿。”",
  "“听说你今天又遇到奇葩商家了？来，握个手。”",
  "“精神状态：在大润发杀了十年的鱼，心已经像板房的石头一样冷了。”",
  "“已读乱回，是面对商家无数个‘为什么核价不过’的最佳保护色。”",
  "“商家问我为什么不回消息，因为我在帮他想怎么过核价。”",
  "“任何不能转化为GMV的沟通，都是对生命的浪费。”",
  "“做大码买手，心要硬，刀要快，催款要狠。”",
  "“又到了这个时候，看着屏幕上的丑衣服，怀疑人类的审美。”",
  "“与其内耗自己，不如发疯外耗商家。”",
  "“这个款能爆？除非我明天就退休。”",
  "“建议把‘耐心’列入买手的高危职业病。”",
  "“今天也是被商家气笑的一天呢，哈哈。”",
  "“我的脑子：下班。我的手：催图，催款，催发货。”",
  "“不要问我P几，问就是P0，全家都是P0。”",
  "“商家：这价格做不了！我：那你倒是别报那么高啊。”",
  "“核价就像抽奖，商家永远觉得自己能中，但系统永远说谢谢惠顾。”",
  "“商家审版不过来找我哭，核价不过来找我闹，我是买手还是保姆？”",
  "“不用算提成，反正没有，心如止水。”"
];

const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem('buyer_todos');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Navigation State
  const [currentView, setCurrentView] = useState<'todos' | 'image-editor' | 'indie-chi' | 'script-matcher' | 'bot'>('todos');
  const [filter, setFilter] = useState<'all' | 'p0' | 'completed'>('all');
  
  // Sorting State
  const [sortMode, setSortMode] = useState<'priority' | 'deadline' | 'created'>('priority');

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

  const handleAddTodos = (newTodos: Todo[]) => {
    setTodos(prev => [...newTodos, ...prev]);
  };

  const handleToggleTodo = (id: string) => {
    setTodos(prev => prev.map(t => 
      t.id === id ? { ...t, isCompleted: !t.isCompleted } : t
    ));
    // If we complete the currently focused item, exit focus mode
    if (focusedTodoId === id) {
      setFocusedTodoId(null);
    }
  };

  const handleDeleteTodo = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
    if (focusedTodoId === id) {
      setFocusedTodoId(null);
    }
  };

  const handleUpdateTodo = (id: string, updates: Partial<Todo>) => {
    setTodos(prev => prev.map(t => 
        t.id === id ? { ...t, ...updates } : t
    ));
  };

  // Sorting Logic: P0 -> P4, then by Deadline
  const sortedTodos = useMemo(() => {
    const priorityOrder = { [Priority.P0]: 0, [Priority.P1]: 1, [Priority.P2]: 2, [Priority.P3]: 3, [Priority.P4]: 4 };
    
    // Fallback for old data string priorities like "HIGH"
    const getScore = (p: string) => {
        if (p === 'HIGH') return 0;
        if (p === 'MEDIUM') return 2;
        if (p === 'LOW') return 3;
        return priorityOrder[p as Priority] ?? 5;
    };

    return [...todos].sort((a, b) => {
        // 1. Completion status (Active first)
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        
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
            // Items with deadline come first
            if (a.deadline && !b.deadline) return -1;
            if (!a.deadline && b.deadline) return 1;
            
            // Fallback: Priority
            const scoreA = getScore(a.priority);
            const scoreB = getScore(b.priority);
            if (scoreA !== scoreB) return scoreA - scoreB;
        } else if (sortMode === 'created') {
            // Newest created first
            return b.createdAt - a.createdAt;
        }

        // Ultimate Fallback: Creation Time
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

    if (filter === 'completed') return todo.isCompleted;
    if (todo.isCompleted) return false;

    if (filter === 'p0') {
        return todo.priority === Priority.P0 || (todo.priority as string) === 'HIGH';
    }
    
    return true;
  });

  const activeCount = todos.filter(t => !t.isCompleted).length;
  const p0Count = todos.filter(t => !t.isCompleted && (t.priority === Priority.P0 || (t.priority as string) === 'HIGH')).length;

  return (
    <div className="h-screen w-full flex items-center justify-center p-4 sm:p-8">
      {/* Main Window Container */}
      <div className="w-full max-w-6xl h-full max-h-[900px] glass-panel rounded-2xl flex overflow-hidden shadow-2xl">
        
        {/* Sidebar */}
        <div className="w-64 bg-mac-sidebar border-r border-mac-border flex flex-col pt-6 pb-4 hidden md:flex shrink-0">
          <div className="px-6 mb-8">
            <h1 className="text-sm font-bold tracking-wider text-slate-500 uppercase">Buyer Mate</h1>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">v2.4.0</p>
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

                {/* Sorting Toolbar */}
                <div className="px-8 py-2 border-b border-mac-border/50 flex items-center gap-2 bg-white/20 backdrop-blur-sm shrink-0">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1">
                        <Filter size={10} /> 排序方式
                    </span>
                    
                    <button 
                        onClick={() => setSortMode('priority')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            sortMode === 'priority' 
                            ? 'bg-slate-800 text-white shadow-sm' 
                            : 'bg-transparent text-slate-500 hover:bg-white/50 hover:text-slate-700'
                        }`}
                    >
                        <ArrowUpDown size={12} />
                        优先级
                    </button>

                    <button 
                        onClick={() => setSortMode('deadline')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            sortMode === 'deadline' 
                            ? 'bg-slate-800 text-white shadow-sm' 
                            : 'bg-transparent text-slate-500 hover:bg-white/50 hover:text-slate-700'
                        }`}
                    >
                        <Clock size={12} />
                        截止时间
                    </button>

                    <button 
                        onClick={() => setSortMode('created')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            sortMode === 'created' 
                            ? 'bg-slate-800 text-white shadow-sm' 
                            : 'bg-transparent text-slate-500 hover:bg-white/50 hover:text-slate-700'
                        }`}
                    >
                        <Calendar size={12} />
                        创建时间
                    </button>
                </div>

                {/* Todo List (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth">
                  {filteredTodos.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <Layout className="w-16 h-16 mb-4 opacity-10" />
                        <p className="text-sm font-medium opacity-50">暂无任务，享受当下</p>
                    </div>
                  ) : (
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
                  )}
                </div>

                {/* Bottom Input Area */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-50/90 via-slate-50/80 to-transparent pt-12 z-20">
                  <div className="max-w-3xl mx-auto">
                      <TaskInput onAddTodos={handleAddTodos} />
                  </div>
                </div>
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