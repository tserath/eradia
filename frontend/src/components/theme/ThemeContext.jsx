// src/components/theme/ThemeContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';

const THEME_STORAGE_KEY = 'theme';
const THEMES = ['light', 'dark', 'system'];

const getInitialTheme = () => {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (THEMES.includes(saved)) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'system' : 'light';
};

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const systemDark = mediaQuery.matches;
      const shouldBeDark = theme === 'system' ? systemDark : theme === 'dark';
      
      root.classList.toggle('dark', shouldBeDark);
      setIsDark(shouldBeDark);
    };

    applyTheme();
    localStorage.setItem(THEME_STORAGE_KEY, theme);

    const handleChange = () => {
      if (theme === 'system') applyTheme();
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const value = { theme, setTheme, isDark };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};