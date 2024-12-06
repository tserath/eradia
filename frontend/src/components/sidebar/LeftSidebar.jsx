import React, { useState, useCallback, useEffect, useRef } from 'react';
import { PlusCircle, Calendar as CalendarIcon, FolderOpen, Settings, ChevronLeft, ChevronDown, BookOpen } from 'lucide-react';
import ContextMenu, { ContextMenuItem } from './ContextMenu';
import SettingsModal from '../settings/Settings';
import { format } from 'date-fns';
import Calendar from '../calendar/Calendar';
import FileTree from './FileTree';
import WritingsTree from './WritingsTree';

const viewOptions = [
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { id: 'files', label: 'Entries', icon: FolderOpen },
  { id: 'writings', label: 'Writings', icon: BookOpen },
  { id: 'settings', label: 'Settings', icon: Settings }
];

const LeftSidebar = ({ entries, onCreateEntry, onSelectEntry, selectedEntry, onOpenEntry, onRenameEntry, onDeleteEntry }) => {
  console.log('LeftSidebar onCreateEntry:', onCreateEntry);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedView, setSelectedView] = useState('calendar');
  const [showSettings, setShowSettings] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [yearPickerBaseYear, setYearPickerBaseYear] = useState(2020);
  const [contextMenu, setContextMenu] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const sidebarRef = useRef(null);
  const writingsTreeRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setShowMonthPicker(false);
        setShowYearPicker(false);
        setDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleDateChange = useCallback((date) => {
    if (!date) return;
    setSelectedDate(date);
  }, []);

  const handleMonthSelect = (monthIndex) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(monthIndex);
    setSelectedDate(newDate);
    setShowMonthPicker(false);
  };

  const handleYearSelect = (year) => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(year);
    setSelectedDate(newDate);
    setShowYearPicker(false);
  };

  const changeYearRange = (delta) => {
    setYearPickerBaseYear(prev => prev + (delta * 12));
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    const rect = sidebarRef.current.getBoundingClientRect();
    setContextMenu({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleCreateEntry = () => {
    onCreateEntry(selectedDate);
    setContextMenu(null);
  };

  const handleViewChange = (view) => {
    if (view === 'settings') {
      setShowSettings(true);
    } else {
      setSelectedView(view);
    }
    setDropdownOpen(false);
  };

  const renderContent = () => {
    switch (selectedView) {
      case 'calendar':
        return (
          <div className="h-full flex flex-col">
            <Calendar
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
              entries={entries}
              showMonthPicker={showMonthPicker}
              showYearPicker={showYearPicker}
              setShowMonthPicker={setShowMonthPicker}
              setShowYearPicker={setShowYearPicker}
              yearPickerBaseYear={yearPickerBaseYear}
              onYearRangeChange={changeYearRange}
              onMonthSelect={handleMonthSelect}
              onYearSelect={handleYearSelect}
              selectedEntry={selectedEntry}
              onSelectEntry={onSelectEntry}
              onOpenEntry={onOpenEntry}
              onRenameEntry={onRenameEntry}
              onDeleteEntry={onDeleteEntry}
              onCreateEntry={(date) => {
                console.log('Calendar onCreateEntry called with date:', date);
                onCreateEntry(date);
              }}
            />
          </div>
        );
      case 'files':
        return (
          <div className="h-full overflow-y-auto">
            <FileTree
              entries={entries}
              onOpenEntry={onOpenEntry}
              onRenameEntry={onRenameEntry}
              onDeleteEntry={onDeleteEntry}
            />
          </div>
        );
      case 'writings':
        return (
          <div className="h-full overflow-y-auto">
            <WritingsTree
              ref={writingsTreeRef}
              onOpenEntry={onOpenEntry}
              onRenameEntry={onRenameEntry}
              onDeleteEntry={onDeleteEntry}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      ref={sidebarRef}
      onContextMenu={handleContextMenu}
      className={`h-full bg-primary dark:bg-primary-dark border-r border-border dark:border-border-dark flex flex-col transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-80'}`}
    >
      <div className="flex items-center p-4 border-b border-border dark:border-border-dark">
        {!isCollapsed ? (
          <>
            <button
              onClick={() => setIsCollapsed(true)}
              className="mr-2 p-1.5 hover:bg-secondary/50 dark:hover:bg-secondary-dark/50 rounded-lg bg-secondary/20 dark:bg-secondary-dark/20"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="relative flex-1">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium bg-secondary/20 dark:bg-secondary-dark/20 hover:bg-secondary/50 dark:hover:bg-secondary-dark/50 rounded-lg transition-smooth"
              >
                <div className="flex items-center gap-2">
                  {viewOptions.find(opt => opt.id === selectedView)?.icon && 
                    React.createElement(viewOptions.find(opt => opt.id === selectedView).icon, { className: "w-4 h-4" })}
                  <span>{viewOptions.find(opt => opt.id === selectedView)?.label}</span>
                </div>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {dropdownOpen && (
                <div className="absolute top-full left-0 w-full mt-1 py-1 bg-primary dark:bg-primary-dark border border-border dark:border-border-dark rounded-lg shadow-lg z-50">
                  {viewOptions.map(option => (
                    <button
                      key={option.id}
                      onClick={() => handleViewChange(option.id)}
                      className={`flex items-center gap-2 w-full px-3 py-2 text-sm ${
                        selectedView === option.id
                          ? 'bg-secondary/50 dark:bg-secondary-dark/50'
                          : 'hover:bg-secondary/20 dark:hover:bg-secondary-dark/20'
                      }`}
                    >
                      {React.createElement(option.icon, { className: "w-4 h-4" })}
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-full p-1.5 hover:bg-secondary/50 dark:hover:bg-secondary-dark/50 rounded-lg bg-secondary/20 dark:bg-secondary-dark/20"
            title="Expand Sidebar"
          >
            <ChevronLeft className="w-5 h-5 rotate-180" />
          </button>
        )}
      </div>

      {!isCollapsed && (
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        >
          <ContextMenuItem
            icon={PlusCircle}
            onClick={handleCreateEntry}
          >
            Create entry for {format(selectedDate, 'MMM d, yyyy')}
          </ContextMenuItem>
        </ContextMenu>
      )}

      {showSettings && (
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

export default LeftSidebar;