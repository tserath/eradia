import React, { createContext, useContext, useState, useCallback } from 'react';

const AppSettingsContext = createContext();

const STORAGE_KEY = 'eradia-app-settings';

export const AppSettingsProvider = ({ children }) => {
  const [showWritingsInFileList, setShowWritingsInFileList] = useState(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (savedSettings) {
        const { showWritingsInFileList } = JSON.parse(savedSettings);
        return showWritingsInFileList ?? false; // Default to false if not set
      }
    } catch (err) {
      console.warn('Error loading app settings:', err);
    }
    return false; // Default to false
  });

  const handleSetShowWritingsInFileList = useCallback((show) => {
    setShowWritingsInFileList(show);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ showWritingsInFileList: show }));
    } catch (err) {
      console.warn('Error saving app settings:', err);
    }
  }, []);

  return (
    <AppSettingsContext.Provider
      value={{
        showWritingsInFileList,
        setShowWritingsInFileList: handleSetShowWritingsInFileList
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettings = () => {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
};
