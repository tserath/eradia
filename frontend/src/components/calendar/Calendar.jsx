import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import MonthPicker from './MonthPicker';
import YearPicker from './YearPicker';
import { useCalendarSettings } from './CalendarSettingsContext';
import { useAppSettings } from '../settings/AppSettingsContext';
import FileList from '../sidebar/FileList';

const Calendar = ({
  selectedDate,
  onDateChange,
  entries,
  showMonthPicker,
  showYearPicker,
  setShowMonthPicker,
  setShowYearPicker,
  yearPickerBaseYear,
  onYearRangeChange,
  onMonthSelect,
  onYearSelect,
  onOpenEntry,
  onRenameEntry,
  onDeleteEntry,
  onCreateEntry,
  selectedEntry,
  onSelectEntry,
  showCalendar = true,
  showWritings = false
}) => {
  const { entryColor } = useCalendarSettings();
  const { showWritingsInFileList, theme } = useAppSettings();
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .calendar-container .rdp-day_today {
        font-weight: 1000 !important;
      }
      html:not(.dark) .calendar-container .rdp-day_today {
        background-color: white !important;
      }
      html.dark .calendar-container .rdp-day_today {
        background-color: #1a1b1e !important;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Create a memoized map of dates to entry counts
  const dateEntryMap = useMemo(() => {
    if (!entries?.length) return new Map();
    
    const map = new Map();
    entries.forEach(entry => {
      if (!entry?.created) return;
      if (entry.type === 'writing' && !showWritings) return;
      const entryDate = typeof entry.created === 'string' ? parseISO(entry.created) : entry.created;
      const dateStr = format(entryDate, 'yyyy-MM-dd');
      map.set(dateStr, (map.get(dateStr) || 0) + 1);
    });
    return map;
  }, [entries?.length, showWritings]); // Only recompute when entries are added/removed or showWritings changes

  // Memoize the hasEntriesOnDate function
  const hasEntriesOnDate = useCallback((date) => {
    if (!date || !dateEntryMap.size) return false;
    const tileDateStr = format(date, 'yyyy-MM-dd');
    return dateEntryMap.has(tileDateStr);
  }, [dateEntryMap]);

  const handleContextMenu = useCallback((e, date) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Context menu opened for date:', date);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      date: date
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    console.log('Context menu closing');
    setContextMenu(null);
  }, []);

  const handleCreateEntry = useCallback((date) => {
    console.log('handleCreateEntry called with date:', date);
    if (onCreateEntry) {
      const now = new Date();
      const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
      localDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      console.log('Calling onCreateEntry with localDate:', localDate);
      onCreateEntry(localDate);
    } else {
      console.error('onCreateEntry is not defined!');
    }
    handleCloseContextMenu();
  }, [onCreateEntry, handleCloseContextMenu]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenu) {
        // Don't close if clicking inside the context menu
        const contextMenuElement = document.querySelector('.calendar-context-menu');
        if (contextMenuElement && contextMenuElement.contains(event.target)) {
          return;
        }
        handleCloseContextMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu, handleCloseContextMenu]);

  const formatCaption = (date) => {
    const month = format(date, 'MMMM');
    const year = format(date, 'yyyy');
    return (
      <div className="flex flex-col items-center justify-center w-full relative z-10">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setShowMonthPicker(!showMonthPicker);
            if (!showMonthPicker) {
              setShowYearPicker(false); // Close year picker if opening month picker
            }
          }}
          className="text-lg font-medium leading-none mb-1 hover:bg-secondary dark:hover:bg-secondary-dark px-3 py-1 rounded transition-colors"
        >
          {month}
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setShowYearPicker(!showYearPicker);
            if (!showYearPicker) {
              setShowMonthPicker(false); // Close month picker if opening year picker
            }
          }}
          className="text-sm text-text-muted dark:text-text-muted-dark leading-none hover:bg-secondary dark:hover:bg-secondary-dark px-3 py-1 rounded transition-colors"
        >
          {year}
        </button>
        {showMonthPicker && (
          <MonthPicker
            date={date}
            isOpen={showMonthPicker}
            onClose={() => setShowMonthPicker(false)}
            onSelect={onMonthSelect}
          />
        )}
        {showYearPicker && (
          <YearPicker
            date={date}
            isOpen={showYearPicker}
            onClose={() => setShowYearPicker(false)}
            onSelect={onYearSelect}
            baseYear={yearPickerBaseYear}
            onChangeRange={onYearRangeChange}
          />
        )}
      </div>
    );
  };

  const renderEntries = () => {
    if (!entries?.length) return null;

    return (
      <FileList
        date={selectedDate}
        entries={entries}
        onOpenEntry={onOpenEntry}
        onRenameEntry={onRenameEntry}
        onDeleteEntry={onDeleteEntry}
        selectedEntry={selectedEntry}
        onSelectEntry={onSelectEntry}
      />
    );
  };

  return (
    <div className="flex flex-col h-full" onClick={handleCloseContextMenu}>
      {showCalendar && (
        <div className="calendar-container w-full" style={{ '--entry-color': entryColor }}>
        <DayPicker
          mode="single"
          selected={selectedDate}
          month={selectedDate}
          onSelect={onDateChange}
          onMonthChange={onDateChange}
          className="w-full bg-primary dark:bg-primary-dark border-none font-normal text-text dark:text-text-dark mx-auto"
          showOutsideDays={true}
          fixedWeeks={true}
          styles={{
            day_selected: { backgroundColor: 'transparent' },
            root: { margin: '0 auto' },
            table: { width: '100%' },
            cell: { width: '14.285714%' },
            day: { 
              width: '100%',
              margin: 0,
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }
          }}
          modifiers={{
            hasEntry: (date) => {
              if (!date || !dateEntryMap.size) return false;
              const tileDateStr = format(date, 'yyyy-MM-dd');
              return dateEntryMap.has(tileDateStr);
            },
            selected: (date) => selectedDate && format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'),
            today: (date) => format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
          }}
          modifiersClassNames={{
            hasEntry: 'after:content-[""] after:absolute after:inset-0 after:bg-[var(--entry-color)] after:opacity-10 after:rounded-lg font-medium',
            selected: 'after:content-[""] after:absolute after:inset-0 after:bg-[var(--entry-color)] after:opacity-20 after:rounded-lg font-medium'
          }}
          modifiersStyles={{
            today: {
              backgroundColor: theme === 'dark' ? '#1a1b1e' : 'white'
            }
          }}
          formatters={{ formatCaption }}
          classNames={{
            root: 'w-full',
            months: 'w-full',
            month: 'w-full',
            caption: 'relative flex justify-center items-center h-14',
            caption_label: 'text-lg font-medium',
            nav: 'absolute flex w-full justify-between px-4',
            nav_button: 'p-2 rounded-lg hover:bg-secondary dark:hover:bg-secondary-dark transition-colors',
            nav_button_previous: 'absolute left-0',
            nav_button_next: 'absolute right-0',
            table: 'w-full border-collapse',
            head_row: 'flex w-full justify-between mb-2',
            head_cell: 'text-sm font-medium text-text-muted dark:text-text-muted-dark w-10 text-center',
            row: 'flex w-full justify-between mb-2',
            cell: 'text-center p-0',
            day: 'w-10 h-10 text-sm font-normal rounded-lg transition-colors hover:bg-secondary dark:hover:bg-secondary-dark relative flex items-center justify-center cursor-pointer',
            day_outside: '!text-gray-500/30 dark:!text-gray-600/30'
          }}
          components={{
            Day: ({ date, displayMonth, selected, disabled, hidden, onClick, modifiers = {}, ...props }) => {
              const isSelected = selectedDate && format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
              const isOutsideMonth = date.getMonth() !== selectedDate.getMonth();
              const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              // Get the current theme by checking the HTML class
              const isDarkMode = document.documentElement.classList.contains('dark');
              
              return (
                <div
                  {...props}
                  onClick={(e) => {
                    if (onClick) onClick(e);
                    if (onDateChange) onDateChange(date);
                  }}
                  onContextMenu={(e) => handleContextMenu(e, date)}
                  className={`w-10 h-10 text-sm rounded-lg transition-colors hover:bg-secondary dark:hover:bg-secondary-dark relative flex items-center justify-center cursor-pointer
                    ${isSelected ? 'font-medium border-2 border-[var(--entry-color)] rounded-lg' : ''}
                    ${hasEntriesOnDate(date) ? 'after:content-[""] after:absolute after:inset-0 after:bg-[var(--entry-color)] after:opacity-10 after:rounded-lg font-medium' : ''}
                    ${isToday ? '!font-black !text-base' : 'font-normal'}
                    ${isOutsideMonth ? '!opacity-20' : ''}
                  `}
                  style={{
                    backgroundColor: isToday ? (isDarkMode ? '#1a1b1e' : 'white') : undefined,
                    fontWeight: isToday ? 1000 : undefined,
                    transform: isToday ? 'scale(1.1)' : undefined,
                  }}
                >
                  {format(date, 'd')}
                </div>
              );
            }
          }}
        />
        {contextMenu && (
          <div
            className="calendar-context-menu fixed z-50 bg-primary dark:bg-primary-dark shadow-lg rounded-lg py-1 min-w-[120px]"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`
            }}
            onClick={(e) => {
              // Prevent event from bubbling up and triggering the click outside handler
              e.stopPropagation();
            }}
          >
            <button
              className="w-full px-4 py-2 text-left hover:bg-secondary dark:hover:bg-secondary-dark transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                console.log('Create Entry button clicked, date:', contextMenu.date);
                handleCreateEntry(contextMenu.date);
              }}
            >
              Create Entry
            </button>
          </div>
        )}
      </div>
      )}
      <div className={`flex-1 overflow-y-auto ${showCalendar ? 'mt-4' : ''}`}>
        {renderEntries()}
      </div>
    </div>
  );
};

export default Calendar;
