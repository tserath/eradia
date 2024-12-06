import React from 'react';
import Calendar from 'react-calendar';
import { IoArrowBack } from 'react-icons/io5';
import { format } from 'date-fns';

const MobileCalendar = ({ selectedDate, onDateChange, onClose, availableEntries }) => {
  const handleDateChange = (date) => {
    onDateChange(date);
    onClose(); // Close the calendar view after date selection
  };

  const hasEntriesOnDate = (date) => {
    return Array.from(availableEntries.values()).some(entry => {
      const entryDate = new Date(entry.created);
      return entryDate.toDateString() === date.toDateString();
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center px-4 py-3 bg-secondary dark:bg-secondary-dark border-b border-border dark:border-border-dark">
        <button
          onClick={onClose}
          className="flex items-center text-text-muted dark:text-text-muted-dark hover:text-text dark:hover:text-text-dark"
        >
          <IoArrowBack className="w-6 h-6 mr-2" />
          Back
        </button>
        <div className="ml-4 text-lg font-semibold text-text dark:text-text-dark">
          {format(selectedDate, 'MMMM yyyy')}
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 p-4 bg-primary dark:bg-primary-dark [&_.react-calendar]:w-full [&_.react-calendar]:bg-transparent [&_.react-calendar]:border-none
                      [&_.react-calendar__navigation]:mb-4
                      [&_.react-calendar__navigation__label]:text-text [&_.react-calendar__navigation__label]:dark:text-text-dark [&_.react-calendar__navigation__label]:font-medium
                      [&_.react-calendar__navigation__arrow]:text-text-muted [&_.react-calendar__navigation__arrow]:dark:text-text-muted-dark [&_.react-calendar__navigation__arrow]:hover:text-text [&_.react-calendar__navigation__arrow]:dark:hover:text-text-dark
                      [&_.react-calendar__month-view__weekdays]:mb-2 [&_.react-calendar__month-view__weekdays__weekday]:text-text-muted [&_.react-calendar__month-view__weekdays__weekday]:dark:text-text-muted-dark [&_.react-calendar__month-view__weekdays__weekday]:font-medium
                      [&_.react-calendar__tile]:p-2 [&_.react-calendar__tile]:text-text [&_.react-calendar__tile]:dark:text-text-dark [&_.react-calendar__tile]:rounded-md
                      [&_.react-calendar__tile:enabled:hover]:bg-secondary [&_.react-calendar__tile:enabled:hover]:dark:bg-secondary-dark
                      [&_.react-calendar__tile--active]:bg-accent [&_.react-calendar__tile--active]:dark:bg-accent-dark [&_.react-calendar__tile--active]:text-white
                      [&_.react-calendar__tile--hasEntries]:relative [&_.react-calendar__tile--hasEntries]:after:content-[''] [&_.react-calendar__tile--hasEntries]:after:absolute [&_.react-calendar__tile--hasEntries]:after:bottom-1 [&_.react-calendar__tile--hasEntries]:after:left-1/2 [&_.react-calendar__tile--hasEntries]:after:-translate-x-1/2 [&_.react-calendar__tile--hasEntries]:after:w-1 [&_.react-calendar__tile--hasEntries]:after:h-1 [&_.react-calendar__tile--hasEntries]:after:bg-accent [&_.react-calendar__tile--hasEntries]:after:dark:bg-accent-dark [&_.react-calendar__tile--hasEntries]:after:rounded-full">
        <Calendar
          onChange={handleDateChange}
          value={selectedDate}
          formatDay={(locale, date) => format(date, 'd')}
          minDetail="month"
          maxDetail="month"
          navigationLabel={({ date }) => format(date, 'MMMM yyyy')}
          showNeighboringMonth={false}
          next2Label={null}
          prev2Label={null}
          locale="en-US"
          tileClassName={({ date }) => 
            hasEntriesOnDate(date) ? 'react-calendar__tile--hasEntries' : null
          }
        />
      </div>
    </div>
  );
};

export default MobileCalendar;
