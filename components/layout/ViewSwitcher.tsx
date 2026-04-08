import React from 'react';
import { Calendar, LayoutList } from 'lucide-react';

interface ViewSwitcherProps {
  viewMode: 'list' | 'calendar';
  onChange: (mode: 'list' | 'calendar') => void;
}

const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ viewMode, onChange }) => {
  return (
    <div className="flex bg-theme-input p-1 rounded-theme border border-theme-border border-theme-width ml-auto">
      <button
        onClick={() => onChange('list')}
        className={`p-1.5 rounded-theme-sm transition-all ${viewMode === 'list' ? 'bg-theme-card shadow-sm text-theme-accent' : 'text-theme-subtext hover:text-theme-text'}`}
      >
        <LayoutList size={16} />
      </button>
      <button
        onClick={() => onChange('calendar')}
        className={`p-1.5 rounded-theme-sm transition-all ${viewMode === 'calendar' ? 'bg-theme-card shadow-sm text-theme-accent' : 'text-theme-subtext hover:text-theme-text'}`}
      >
        <Calendar size={16} />
      </button>
    </div>
  );
};

export default ViewSwitcher;
