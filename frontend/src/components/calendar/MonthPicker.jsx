import React from 'react';
import { format } from 'date-fns';

const MonthPicker = ({ 
  date, 
  isOpen, 
  onClose, 
  onSelect 
}) => {
  const handleMonthSelect = (monthIndex) => {
    onSelect(monthIndex);
    onClose();
  };

  const handleClick = (e) => {
    e.stopPropagation();
  };

  if (!isOpen) return null;

  return (
    <div 
      onClick={handleClick}
      className="absolute top-14 left-1/2 transform -translate-x-1/2 
                bg-primary dark:bg-primary-dark shadow-xl rounded-xl 
                border border-border dark:border-border-dark 
                p-4 w-64 z-50"
    >
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 12 }, (_, i) => (
          <button
            key={i}
            onClick={() => handleMonthSelect(i)}
            className={`px-3 py-2.5 rounded-lg text-sm font-medium
                      transition-all duration-200
                      ${date.getMonth() === i 
                        ? 'bg-accent dark:bg-accent-dark text-white' 
                        : 'bg-secondary/20 dark:bg-secondary-dark/20 hover:bg-secondary/30 dark:hover:bg-secondary-dark/30'}`}
          >
            {format(new Date(2024, i, 1), 'MMM')}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MonthPicker;
