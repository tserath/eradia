// src/index.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { AppearanceProvider } from './components/theme/AppearanceContext';
import { CalendarSettingsProvider } from './components/calendar/CalendarSettingsContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppearanceProvider>
      <CalendarSettingsProvider>
        <App />
      </CalendarSettingsProvider>
    </AppearanceProvider>
  </React.StrictMode>
);
