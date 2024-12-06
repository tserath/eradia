import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const YearPicker = ({ 
  date,
  isOpen,
  onClose,
  onSelect,
  baseYear,
  onChangeRange
}) => {
  const handleYearSelect = (year) => {
    onSelect(year);
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
                p-4 w-72 z-50"
    >
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => onChangeRange(-1)}
          className="p-2 rounded-lg bg-secondary/20 dark:bg-secondary-dark/20 
                    hover:bg-secondary/30 dark:hover:bg-secondary-dark/30
                    transition-all duration-200"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-text-muted dark:text-text-muted-dark">
          {baseYear} - {baseYear + 11}
        </span>
        <button
          onClick={() => onChangeRange(1)}
          className="p-2 rounded-lg bg-secondary/20 dark:bg-secondary-dark/20 
                    hover:bg-secondary/30 dark:hover:bg-secondary-dark/30
                    transition-all duration-200"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 12 }, (_, i) => (
          <button
            key={i}
            onClick={() => handleYearSelect(baseYear + i)}
            className={`px-3 py-2.5 rounded-lg text-sm font-medium
                      transition-all duration-200
                      ${date.getFullYear() === baseYear + i 
                        ? 'bg-accent dark:bg-accent-dark text-white' 
                        : 'bg-secondary/20 dark:bg-secondary-dark/20 hover:bg-secondary/30 dark:hover:bg-secondary-dark/30'}`}
          >
            {baseYear + i}
          </button>
        ))}
      </div>
    </div>
  );
};

export default YearPicker;
