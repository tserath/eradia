import React from 'react';
import { IoArrowBack } from 'react-icons/io5';
import { Monitor, Sun, Moon } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';

const MobileSettings = ({ onClose }) => {
  const { theme, setTheme } = useTheme();

  const themes = [
    { id: 'system', icon: Monitor, label: 'Use System Theme' },
    { id: 'light', icon: Sun, label: 'Light Theme' },
    { id: 'dark', icon: Moon, label: 'Dark Theme' }
  ];

  return (
    <div className="flex flex-col h-full bg-primary dark:bg-primary-dark">
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
          Settings
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4 text-text dark:text-text-dark">Appearance</h3>
            <div className="space-y-2">
              {themes.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setTheme(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-smooth
                    ${theme === id ? 
                      'bg-secondary dark:bg-secondary-dark text-text dark:text-text-dark' : 
                      'text-text-muted dark:text-text-muted-dark hover:bg-secondary/50 dark:hover:bg-secondary-dark/50'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileSettings;
