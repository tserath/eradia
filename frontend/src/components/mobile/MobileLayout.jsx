import React, { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format, parseISO } from 'date-fns';
import { Search, Settings as SettingsIcon, PlusCircle, Calendar, Settings2, Monitor, Sun, Moon } from 'lucide-react';
import RichTextEditor from '../editor/RichTextEditor';
import { useAppearance } from '../theme/AppearanceContext';
import { useTheme } from '../theme/ThemeContext';
import MobileEditor from './MobileEditor';
import FileList from '../sidebar/FileList';
import { generateUUID } from '../../api/api';

const MobileLayout = ({
  availableEntries,
  selectedDate,
  onDateChange,
  onEntrySelect,
  onUpdateEntry,
  onSearch,
  onOpenSettings
}) => {
  const [activeTab, setActiveTab] = useState('calendar');
  const [searchQuery, setSearchQuery] = useState('');
  const { uiSize } = useAppearance();
  const { theme, setTheme } = useTheme();
  const [currentEntry, setCurrentEntry] = useState(null);
  const [month, setMonth] = useState(new Date());

  // Increase text sizes for better mobile readability
  const baseTextClass = "text-xl"; // Base text size for general content
  const headerTextClass = "text-3xl font-medium"; // Larger headers
  const buttonTextClass = "text-xl"; // Larger button text

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .rdp-day_today:not(.rdp-day_selected) {
        font-weight: 1000 !important;
      }
      html:not(.dark) .rdp-day_today:not(.rdp-day_selected) {
        background-color: white !important;
      }
      html.dark .rdp-day_today:not(.rdp-day_selected) {
        background-color: #1a1b1e !important;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const formatDate = (date) => {
    if (!date) return '';
    try {
      const parsedDate = typeof date === 'string' ? parseISO(date) : date;
      return format(parsedDate, 'MMMM d, yyyy');
    } catch (e) {
      console.error('Error formatting date:', e);
      return '';
    }
  };

  const getEntriesForDate = (date) => {
    if (!date || !availableEntries) return [];
    const entries = Array.from(availableEntries.values());
    try {
      const targetDate = format(date, 'yyyy-MM-dd');
      return entries.filter(entry => {
        if (!entry) return false;
        try {
          let entryDate;
          if (entry.created) {
            entryDate = typeof entry.created === 'string' ? parseISO(entry.created) : entry.created;
          } else if (entry.date) {
            entryDate = typeof entry.date === 'string' ? parseISO(entry.date) : entry.date;
          } else {
            return false;
          }
          return format(entryDate, 'yyyy-MM-dd') === targetDate;
        } catch (e) {
          console.error('Error comparing entry date:', e, entry);
          return false;
        }
      });
    } catch (e) {
      console.error('Error formatting target date:', e);
      return [];
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim()) {
      onSearch(query);
    }
  };

  const handleEntryOpen = (entry) => {
    setCurrentEntry(entry);
    onEntrySelect(entry);
  };

  const handleEntrySave = (updatedEntry) => {
    onUpdateEntry(updatedEntry.id, updatedEntry);
  };

  return (
    <div className="h-screen flex flex-col fixed inset-0 bg-primary dark:bg-primary-dark text-content dark:text-content-dark">
      {currentEntry ? (
        <MobileEditor
          entry={currentEntry}
          onSave={handleEntrySave}
          onClose={() => setCurrentEntry(null)}
        />
      ) : (
        <>
          <div className="flex-1 overflow-y-auto pb-16">
            {activeTab === 'calendar' && (
              <div className="flex flex-col h-full p-4 space-y-4">
                <div className={`${headerTextClass} text-content dark:text-content-dark`}>Calendar</div>
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={onDateChange}
                  month={month}
                  onMonthChange={setMonth}
                  showOutsideDays={true}
                  className={`${baseTextClass} w-full bg-primary dark:bg-primary-dark text-content dark:text-content-dark rounded-lg shadow-lg`}
                  modifiers={{
                    hasEntry: (date) => {
                      if (!date) return false;
                      try {
                        const entries = getEntriesForDate(date);
                        return entries && entries.length > 0;
                      } catch (e) {
                        console.error('Error checking entries for date:', e);
                        return false;
                      }
                    }
                  }}
                  modifiersStyles={{
                    hasEntry: { 
                      backgroundColor: 'rgb(59, 130, 246, 0.15)'
                    }
                  }}
                  components={{
                    Caption: ({ displayMonth }) => (
                      <div className="flex items-center justify-between w-full px-4 py-2">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            const newDate = new Date(month);
                            newDate.setMonth(month.getMonth() - 1);
                            setMonth(newDate);
                          }}
                          className="hover:bg-secondary dark:hover:bg-secondary-dark p-2 rounded-lg"
                        >
                          &lt;
                        </button>
                        <span className="text-lg font-medium">
                          {format(displayMonth, 'MMMM yyyy')}
                        </span>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            const newDate = new Date(month);
                            newDate.setMonth(month.getMonth() + 1);
                            setMonth(newDate);
                          }}
                          className="hover:bg-secondary dark:hover:bg-secondary-dark p-2 rounded-lg"
                        >
                          &gt;
                        </button>
                      </div>
                    )
                  }}
                  classNames={{
                    root: 'w-full max-w-[100vw] overflow-x-hidden',
                    months: 'w-full flex justify-center',
                    month: 'w-full',
                    caption: 'flex justify-center items-center mb-4 relative',
                    nav: 'hidden',
                    table: 'w-full table-fixed',
                    head_row: 'grid grid-cols-7 w-full mb-2',
                    head_cell: 'text-sm font-medium text-gray-500 dark:text-gray-400 text-center',
                    row: 'grid grid-cols-7 w-full mb-2',
                    cell: 'aspect-square p-0',
                    day: 'w-full h-full flex items-center justify-center text-lg',
                    button: 'w-full h-full flex items-center justify-center hover:bg-secondary dark:hover:bg-secondary-dark rounded-lg',
                    day_selected: 'bg-accent dark:bg-accent-dark text-white'
                  }}
                />
                <div className="flex-1 overflow-y-auto">
                  <div className={`${headerTextClass} mb-4 text-content dark:text-content-dark`}>Entries</div>
                  <FileList
                    date={selectedDate}
                    entries={Array.from(availableEntries.values())}
                    onOpenEntry={handleEntryOpen}
                    isMobile={true}
                  />
                </div>
              </div>
            )}
            {activeTab === 'search' && (
              <div className="flex flex-col h-full p-4 space-y-4">
                <div className={`${headerTextClass} text-content dark:text-content-dark`}>Search</div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search entries..."
                  className={`${baseTextClass} w-full p-4 bg-secondary dark:bg-secondary-dark text-content dark:text-content-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-accent dark:focus:ring-accent-dark`}
                />
                <div className="flex-1 overflow-y-auto">
                  {Array.from(availableEntries.values())
                    .filter(entry => 
                      entry.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      entry.content?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map(entry => (
                      <button
                        key={entry.id}
                        onClick={() => handleEntryOpen(entry)}
                        className={`${buttonTextClass} w-full text-left p-4 mb-2 bg-secondary dark:bg-secondary-dark rounded-lg hover:bg-opacity-80`}
                      >
                        <div className="font-medium">{entry.title || formatDate(entry.date)}</div>
                        <div className="text-sm opacity-70 mt-1">
                          {formatDate(entry.date)}
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}
            {activeTab === 'settings' && (
              <div className="flex flex-col h-full p-4 space-y-4">
                <div className={`${headerTextClass} text-content dark:text-content-dark`}>Theme</div>
                <div className="space-y-4">
                  {[
                    { id: 'system', icon: Monitor, label: 'System Theme' },
                    { id: 'light', icon: Sun, label: 'Light Theme' },
                    { id: 'dark', icon: Moon, label: 'Dark Theme' }
                  ].map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      onClick={() => setTheme(id)}
                      className={`${buttonTextClass} w-full flex items-center gap-4 p-4 rounded-lg transition-colors
                        ${theme === id ? 
                          'bg-accent dark:bg-accent-dark text-white' : 
                          'bg-secondary dark:bg-secondary-dark hover:bg-opacity-80'
                        }`}
                    >
                      <Icon className="w-8 h-8" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="fixed bottom-0 left-0 right-0 flex justify-around items-center p-4 bg-secondary dark:bg-secondary-dark border-t border-accent/10">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`${buttonTextClass} p-4 rounded-lg ${activeTab === 'calendar' ? 'bg-accent dark:bg-accent-dark text-white' : ''}`}
            >
              <Calendar className="w-8 h-8" />
            </button>
            <button
              onClick={() => {
                const now = new Date();
                const entry = {
                  id: generateUUID(),
                  title: format(selectedDate || now, 'MMMM d, yyyy'),
                  content: '',
                  date: selectedDate || now,
                  created: now.toISOString(),
                  modified: now.toISOString(),
                  tags: []
                };
                handleEntryOpen(entry);
              }}
              className={`${buttonTextClass} p-4 rounded-lg hover:bg-accent/80 dark:hover:bg-accent-dark/80`}
            >
              <PlusCircle className="w-8 h-8" />
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`${buttonTextClass} p-4 rounded-lg ${activeTab === 'search' ? 'bg-accent dark:bg-accent-dark text-white' : ''}`}
            >
              <Search className="w-8 h-8" />
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`${buttonTextClass} p-4 rounded-lg ${activeTab === 'settings' ? 'bg-accent dark:bg-accent-dark text-white' : ''}`}
            >
              <Settings2 className="w-8 h-8" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MobileLayout;
