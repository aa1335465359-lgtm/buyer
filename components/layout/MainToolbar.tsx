import React from 'react';
import { ArrowUpDown, Calendar, CalendarRange, ChevronDown, Clock, Search } from 'lucide-react';
import ViewSwitcher from './ViewSwitcher';

interface MainToolbarProps {
  filter: 'all' | 'p0' | 'completed';
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortMenuRef: React.RefObject<HTMLDivElement>;
  showSortMenu: boolean;
  setShowSortMenu: (show: boolean) => void;
  viewMode: 'list' | 'calendar';
  setViewMode: (mode: 'list' | 'calendar') => void;
  sortMode: 'priority' | 'deadline' | 'created';
  setSortMode: (mode: 'priority' | 'deadline' | 'created') => void;
  isGroupedByDay: boolean;
  setIsGroupedByDay: (value: boolean) => void;
}

const MainToolbar: React.FC<MainToolbarProps> = ({
  filter,
  searchQuery,
  onSearchChange,
  sortMenuRef,
  showSortMenu,
  setShowSortMenu,
  viewMode,
  setViewMode,
  sortMode,
  setSortMode,
  isGroupedByDay,
  setIsGroupedByDay,
}) => {
  return (
    <>
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
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9 pr-4 py-2 bg-theme-input border border-theme-border border-theme-width focus:bg-theme-card rounded-theme text-sm outline-none transition-all w-48 focus:w-64 placeholder-theme-subtext/50 shadow-sm text-theme-text"
          />
        </div>
      </div>

      <div className="px-8 py-2 border-b border-theme-border border-theme-width flex items-center justify-between bg-theme-panel/20 backdrop-blur-sm shrink-0 z-20">
        <div className="relative" ref={sortMenuRef}>
          {viewMode === 'list' && (
            <>
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-2 text-xs font-medium text-theme-text bg-theme-input hover:bg-theme-card px-3 py-1.5 rounded-theme border border-theme-border border-theme-width shadow-sm transition-all"
              >
                <span className="text-theme-subtext">排序:</span>
                <span className="font-semibold">
                  {isGroupedByDay ? '日维度' : sortMode === 'priority' ? '优先级' : sortMode === 'deadline' ? '截止时间' : '创建时间'}
                </span>
                <ChevronDown size={12} className={`text-theme-subtext transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
              </button>
              {showSortMenu && (
                <div className="absolute top-full left-0 mt-1 w-36 bg-theme-menu border border-theme-border border-theme-width rounded-theme shadow-theme p-1 z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl">
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

        <ViewSwitcher viewMode={viewMode} onChange={setViewMode} />
      </div>
    </>
  );
};

export default MainToolbar;
