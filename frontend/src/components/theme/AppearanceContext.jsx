// src/components/theme/AppearanceContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const FONT_STORAGE_KEY = 'documentFont';
const FONT_SIZE_STORAGE_KEY = 'documentFontSize';
const UI_SIZE_STORAGE_KEY = 'uiSize';

const DEFAULT_FONT = 'Inter';
const DEFAULT_FONT_SIZE = '16px';
const DEFAULT_UI_SIZE = '14px';

export const AVAILABLE_FONTS = [
  'Inter',
  'Arial',
  'Times New Roman',
  'Georgia',
  'Verdana',
  'Courier New',
  'Consolas',
  'Monaco'
];

export const AVAILABLE_FONT_SIZES = [
  '12px',
  '14px',
  '16px',
  '18px',
  '20px',
  '22px',
  '24px',
  '26px',
  '28px',
  '32px',
  '36px',
  '42px',
  '48px'
];

export const AVAILABLE_UI_SIZES = [
  '12px',
  '14px',
  '16px',
  '18px',
  '20px',
  '22px',
  '24px',
  '26px',
  '28px',
  '32px'
];

const AppearanceContext = createContext(null);

const getInitialState = () => {
  return {
    documentFont: localStorage.getItem(FONT_STORAGE_KEY) || DEFAULT_FONT,
    documentFontSize: localStorage.getItem(FONT_SIZE_STORAGE_KEY) || DEFAULT_FONT_SIZE,
    uiSize: localStorage.getItem(UI_SIZE_STORAGE_KEY) || DEFAULT_UI_SIZE
  };
};

export const AppearanceProvider = ({ children }) => {
  const [state, setState] = useState(getInitialState);

  const setDocumentFont = (font) => {
    setState(prev => ({ ...prev, documentFont: font }));
    localStorage.setItem(FONT_STORAGE_KEY, font);
  };

  const setDocumentFontSize = (size) => {
    // Ensure size includes 'px' suffix
    const sizeWithUnit = size.endsWith('px') ? size : `${size}px`;
    setState(prev => ({ ...prev, documentFontSize: sizeWithUnit }));
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, sizeWithUnit);
  };

  const setUISize = (size) => {
    // Ensure size includes 'px' suffix
    const sizeWithUnit = size.endsWith('px') ? size : `${size}px`;
    setState(prev => ({ ...prev, uiSize: sizeWithUnit }));
    localStorage.setItem(UI_SIZE_STORAGE_KEY, sizeWithUnit);
    // Set the base font size for UI elements
    document.documentElement.style.setProperty('--ui-size', sizeWithUnit);
  };

  useEffect(() => {
    // Set initial UI size
    const uiSize = state.uiSize.endsWith('px') ? state.uiSize : `${state.uiSize}px`;
    document.documentElement.style.setProperty('--ui-size', uiSize);
  }, []);

  const value = {
    ...state,
    setDocumentFont,
    setDocumentFontSize,
    setUISize,
    AVAILABLE_FONTS,
    AVAILABLE_FONT_SIZES,
    AVAILABLE_UI_SIZES,
  };

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
};

export const useAppearance = () => {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error('useAppearance must be used within an AppearanceProvider');
  }
  return context;
};
