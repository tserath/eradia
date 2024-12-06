import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const CalendarSettingsContext = createContext();

const DEFAULT_COLORS = [
  '#22c55e', // green-500
  '#3b82f6', // blue-500
  '#a855f7', // purple-500
  '#f97316', // orange-500
  '#ef4444'  // red-500
];

const STORAGE_KEY = 'eradia-calendar-settings';

export const CalendarSettingsProvider = ({ children }) => {
  const [entryColor, setEntryColor] = useState(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (savedSettings) {
        const { entryColor } = JSON.parse(savedSettings);
        return entryColor || DEFAULT_COLORS[0];
      }
    } catch (err) {
      console.warn('Error loading calendar settings:', err);
    }
    return DEFAULT_COLORS[0];
  });

  const [savedColors, setSavedColors] = useState(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (savedSettings) {
        const { savedColors } = JSON.parse(savedSettings);
        return savedColors || DEFAULT_COLORS;
      }
    } catch (err) {
      console.warn('Error loading calendar settings:', err);
    }
    return DEFAULT_COLORS;
  });

  const handleSetEntryColor = useCallback((color) => {
    if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
      console.warn(`Invalid color format: ${color}. Using default color.`);
      setEntryColor(DEFAULT_COLORS[0]);
      return;
    }
    setEntryColor(color);
  }, []);

  const handleSaveColor = useCallback((color) => {
    if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
      console.warn(`Invalid color format: ${color}. Color not saved.`);
      return;
    }
    setSavedColors(prev => {
      if (prev.includes(color)) return prev;
      return [...prev, color].slice(-5); // Keep last 5 colors
    });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ entryColor, savedColors }));
    } catch (err) {
      console.warn('Error saving calendar settings:', err);
    }
  }, [entryColor, savedColors]);

  const value = {
    entryColor,
    setEntryColor: handleSetEntryColor,
    savedColors,
    saveColor: handleSaveColor
  };

  return (
    <CalendarSettingsContext.Provider value={value}>
      {children}
    </CalendarSettingsContext.Provider>
  );
};

export const useCalendarSettings = () => {
  const context = useContext(CalendarSettingsContext);
  if (!context) {
    throw new Error('useCalendarSettings must be used within a CalendarSettingsProvider');
  }
  return context;
};
