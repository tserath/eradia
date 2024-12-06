import React, { Fragment, useState, useRef, useEffect } from 'react';
import Modal from '../shared/Modal';
import { X, ChevronDown } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';
import { useAppearance } from '../theme/AppearanceContext';
import { useCalendarSettings } from '../calendar/CalendarSettingsContext';
import { useAppSettings } from './AppSettingsContext';
import { HexColorPicker } from 'react-colorful';

const ColorButton = ({ color, selectedColor, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(color)}
    className={`w-8 h-8 rounded-full cursor-pointer border border-border dark:border-border-dark
                transition-all duration-200 hover:scale-110
                ${color === selectedColor ? 'ring-2 ring-offset-2 ring-accent dark:ring-accent-dark' : ''}
                ${color === 'green' ? 'bg-green-500' : ''}
                ${color === 'blue' ? 'bg-blue-500' : ''}
                ${color === 'purple' ? 'bg-purple-500' : ''}
                ${color === 'orange' ? 'bg-orange-500' : ''}
                ${color === 'red' ? 'bg-red-500' : ''}`}
    aria-label={`Select ${color} color`}
  />
);

const CustomSelect = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const button = buttonRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const spaceBelow = windowHeight - button.bottom;
      const spaceAbove = button.top;
      const dropdownHeight = options.length * 40; // Approximate height of dropdown

      // If there's not enough space below, and more space above, show dropdown above
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        setDropdownStyle({
          position: 'fixed',
          bottom: windowHeight - button.top + 8,
          left: button.left,
          width: button.width,
          maxHeight: Math.min(spaceAbove - 8, 400),
          overflowY: 'auto'
        });
      } else {
        setDropdownStyle({
          position: 'fixed',
          top: button.bottom + 8,
          left: button.left,
          width: button.width,
          maxHeight: Math.min(spaceBelow - 8, 400),
          overflowY: 'auto'
        });
      }
    }
  }, [isOpen, options.length]);

  const selectedLabel = options.find(opt => opt.value === value)?.label || value;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg
                  bg-secondary/20 dark:bg-secondary-dark/20 
                  border border-border dark:border-border-dark
                  hover:bg-secondary/30 dark:hover:bg-secondary-dark/30 
                  focus:outline-none focus:ring-2 focus:ring-accent dark:focus:ring-accent-dark
                  transition-all duration-200"
      >
        <span className="text-sm">{selectedLabel}</span>
        <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div 
          style={dropdownStyle}
          className="z-[100] bg-primary dark:bg-primary-dark rounded-lg shadow-lg
                    border border-border dark:border-border-dark"
        >
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className="w-full px-4 py-2.5 text-left text-sm
                       hover:bg-secondary/30 dark:hover:bg-secondary-dark/30
                       transition-colors duration-200
                       first:rounded-t-lg last:rounded-b-lg"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ColorPicker = ({ color, onChange, onSave, savedColors }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg
                    bg-secondary/20 dark:bg-secondary-dark/20 
                    border border-border dark:border-border-dark
                    hover:bg-secondary/30 dark:hover:bg-secondary-dark/30 
                    focus:outline-none focus:ring-2 focus:ring-accent dark:focus:ring-accent-dark
                    transition-all duration-200"
        >
          <div 
            className="w-5 h-5 rounded-full border border-border dark:border-border-dark"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-mono">{color}</span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        <button
          onClick={() => onSave(color)}
          className="px-4 py-2.5 rounded-lg text-sm font-medium
                    bg-accent dark:bg-accent-dark
                    hover:bg-accent-hover dark:hover:bg-accent-hover-dark
                    text-white transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-accent dark:focus:ring-accent-dark"
        >
          Save Color
        </button>
      </div>
      {isOpen && (
        <div className="absolute z-50 mt-2 p-6 bg-primary dark:bg-primary-dark rounded-lg shadow-lg
                      border border-border dark:border-border-dark">
          <HexColorPicker color={color} onChange={onChange} />
          {savedColors?.length > 0 && (
            <div className="mt-6">
              <div className="text-sm font-medium text-text-muted dark:text-text-muted-dark mb-3">Saved Colors</div>
              <div className="flex flex-wrap gap-2">
                {savedColors.map((savedColor, index) => (
                  <button
                    key={index}
                    onClick={() => onChange(savedColor)}
                    className="w-8 h-8 rounded-lg border border-border dark:border-border-dark
                             hover:scale-110 transition-transform duration-200
                             focus:outline-none focus:ring-2 focus:ring-accent dark:focus:ring-accent-dark"
                    style={{ backgroundColor: savedColor }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Settings = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();
  const { 
    documentFont, 
    setDocumentFont,
    documentFontSize, 
    setDocumentFontSize,
    uiSize,
    setUISize,
    AVAILABLE_FONTS,
    AVAILABLE_FONT_SIZES,
    AVAILABLE_UI_SIZES
  } = useAppearance();
  const { entryColor, setEntryColor, savedColors, saveColor } = useCalendarSettings();
  const { showWritingsInFileList, setShowWritingsInFileList } = useAppSettings();

  const themeOptions = [
    { value: 'system', label: 'Use System Theme' },
    { value: 'light', label: 'Light Theme' },
    { value: 'dark', label: 'Dark Theme' }
  ];

  const fontOptions = AVAILABLE_FONTS.map(font => ({ value: font, label: font }));
  const fontSizeOptions = AVAILABLE_FONT_SIZES.map(size => ({ value: size, label: size }));
  const uiSizeOptions = AVAILABLE_UI_SIZES.map(size => ({ value: size, label: size }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      width="max-w-xl"
    >
      <div className="flex flex-col divide-y divide-border dark:divide-border-dark">
        {/* Appearance Settings */}
        <section className="flex flex-col gap-4 pb-8">
          <h3 className="text-lg font-semibold tracking-tight">Appearance</h3>
          <div className="grid grid-cols-[160px,1fr] items-center gap-6">
            <label className="text-sm font-medium text-text-muted dark:text-text-muted-dark">Theme</label>
            <CustomSelect
              value={theme}
              onChange={setTheme}
              options={themeOptions}
            />
          </div>
          <div className="grid grid-cols-[160px,1fr] items-center gap-6">
            <label className="text-sm font-medium text-text-muted dark:text-text-muted-dark">Calendar Color</label>
            <ColorPicker
              color={entryColor}
              onChange={setEntryColor}
              onSave={saveColor}
              savedColors={savedColors}
            />
          </div>
          <div className="grid grid-cols-[160px,1fr] items-center gap-6">
            <label className="text-sm font-medium text-text-muted dark:text-text-muted-dark">Document Font</label>
            <CustomSelect
              value={documentFont}
              onChange={setDocumentFont}
              options={fontOptions}
            />
          </div>
          <div className="grid grid-cols-[160px,1fr] items-center gap-6">
            <label className="text-sm font-medium text-text-muted dark:text-text-muted-dark">Font Size</label>
            <CustomSelect
              value={documentFontSize}
              onChange={setDocumentFontSize}
              options={fontSizeOptions}
            />
          </div>
          <div className="grid grid-cols-[160px,1fr] items-center gap-6">
            <label className="text-sm font-medium text-text-muted dark:text-text-muted-dark">UI Size</label>
            <CustomSelect
              value={uiSize}
              onChange={setUISize}
              options={uiSizeOptions}
            />
          </div>
        </section>

        {/* File List Settings */}
        <section className="flex flex-col gap-4 pt-8">
          <h3 className="text-lg font-semibold tracking-tight">File List</h3>
          <div className="grid grid-cols-[160px,1fr] items-center gap-6">
            <label className="text-sm font-medium text-text-muted dark:text-text-muted-dark">Show Writings</label>
            <label className="inline-flex items-center gap-3">
              <input
                type="checkbox"
                checked={showWritingsInFileList}
                onChange={(e) => setShowWritingsInFileList(e.target.checked)}
                className="w-5 h-5 rounded border-border dark:border-border-dark text-accent dark:text-accent-dark focus:ring-accent dark:focus:ring-accent-dark"
              />
              <span className="text-sm">Include writings in file list view</span>
            </label>
          </div>
        </section>
      </div>
    </Modal>
  );
};

export default Settings;