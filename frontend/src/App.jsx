// src/App.jsx
import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { debounce } from 'lodash';
import { format, parseISO } from 'date-fns';
import { ThemeProvider } from './components/theme/ThemeContext';
import { AppearanceProvider } from './components/theme/AppearanceContext';
import { CalendarSettingsProvider } from './components/calendar/CalendarSettingsContext';
import { AppSettingsProvider } from './components/settings/AppSettingsContext';
import { useApi, generateUUID } from './api/api';
import { createWindowState } from './config/windowDefaults';
import path from 'path';

// Lazy load components to prevent initialization issues
const LeftSidebar = lazy(() => import('./components/sidebar/LeftSidebar'));
const RightSidebar = lazy(() => import('./components/sidebar/RightSidebar'));
const MainContent = lazy(() => import('./components/MainContent'));
const MobileLayout = lazy(() => import('./components/mobile/MobileLayout'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center w-full h-full">
    <div className="text-lg">Loading...</div>
  </div>
);

const AppContent = () => {
  const [availableEntries, setAvailableEntries] = useState(new Map());
  const [openEntries, setOpenEntries] = useState(new Map());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [viewMode, setViewMode] = useState('mdi');
  const [showSource, setShowSource] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showNewWritingModal, setShowNewWritingModal] = useState(false);
  const [newWritingName, setNewWritingName] = useState('');
  const [newWritingError, setNewWritingError] = useState('');

  const api = useApi();
  const initRef = useRef(false);
  const mdiViewRef = useRef(null);
  const editorRef = useRef(null);
  const writingsTreeRef = useRef(null);

  // Define handleOpenEntry first since other functions depend on it
  const handleOpenEntry = useCallback((entry) => {
    if (!entry?.id && !entry?.path) return;

    // Clean the path and ensure it doesn't have .md extension for ID
    const cleanPath = (entry.id || entry.path)
      .replace(/\.md$/, '')
      .replace(/^root\//, '')  // Remove root/ prefix if present
      .replace(/^\/+|\/+$/g, ''); // Remove leading/trailing slashes
    
    const id = cleanPath;

    // First check for an existing window with this path
    const existingEntry = Array.from(openEntries.values()).find(e => {
      const entryPath = (e.path || e.id || '')
        .replace(/\.md$/, '')
        .replace(/^root\//, '')
        .replace(/^\/+|\/+$/g, '');
      return entryPath === cleanPath;
    });

    if (existingEntry) {
      // Update z-index to bring window to front
      const maxZ = Math.max(...Array.from(openEntries.values()).map(e => e.windowState?.zIndex || 0));
      setOpenEntries(prev => {
        const next = new Map(prev);
        next.set(existingEntry.id, {
          ...existingEntry,
          windowState: {
            ...existingEntry.windowState,
            zIndex: maxZ + 1
          }
        });
        return next;
      });
      return;
    }

    // For writings, ensure we have the .md extension in the path
    const filePath = cleanPath + '.md';

    // Create window state
    const windowState = createWindowState({
      existingZIndices: Array.from(openEntries.values()).map(e => e.windowState?.zIndex || 0),
      offsetIndex: openEntries.size
    });

    // For writings, load content before opening
    if (entry.type === 'writing') {
      api.loadWritingContent(filePath)
        .then(response => {
          const newEntry = {
            ...entry,
            id: cleanPath,
            path: filePath,
            title: entry.title || filePath.split('/').pop().replace(/\.md$/, ''),
            content: response.content || '',
            windowState
          };

          setOpenEntries(prev => {
            // Double check we haven't created a window while loading
            if (Array.from(prev.values()).some(e => {
              const entryPath = (e.path || e.id || '')
                .replace(/\.md$/, '')
                .replace(/^root\//, '')
                .replace(/^\/+|\/+$/g, '');
              return entryPath === cleanPath;
            })) {
              return prev;
            }
            return new Map(prev).set(cleanPath, newEntry);
          });
        })
        .catch(error => {
          console.error('Error loading writing content:', error);
          alert('Error loading file content. Please try again.');
        });
      return;
    }

    // For non-writing entries
    const newEntry = {
      ...entry,
      id: cleanPath,
      path: filePath,
      title: entry.title || filePath.split('/').pop().replace(/\.md$/, ''),
      content: entry.content || '',
      windowState
    };

    setOpenEntries(prev => new Map(prev).set(cleanPath, newEntry));
  }, [openEntries, api]);

  // Create debounced save functions
  const debouncedSaveConfig = useCallback(
    debounce(async (openWindows) => {
      try {
        await api.saveConfig({ openWindows });
      } catch (error) {
        console.error('Error saving config:', error);
      }
    }, 1000),
    [api]
  );

  const debouncedSaveEntry = useCallback(
    debounce(async (id, entry) => {
      try {
        await api.saveEntry(id, entry);
      } catch (error) {
        console.error('Error saving entry:', error);
      }
    }, 1000),
    [api]
  );

  const debouncedSaveWritingContent = useCallback(
    debounce(async (id, content) => {
      try {
        await api.saveWritingContent(id, { content });
      } catch (error) {
        console.error('Error saving writing content:', error);
      }
    }, 2000),
    [api]
  );

  const handleNewEntry = useCallback((date = new Date()) => {
    console.log('handleNewEntry called with date:', date);
    // Ensure we're using local time
    const now = new Date();
    const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    
    if (date) {
      // If a date is provided, use that date but with current time
      localDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    }
    console.log('Using localDate:', localDate);

    const id = generateUUID();
    const newEntry = {
      id,
      title: localDate.toLocaleDateString('en-US', { 
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      content: ' ',
      date: localDate.toISOString(),  // This is what the backend uses for file paths
      created: localDate.toISOString(),
      modified: localDate.toISOString(),
      tags: [],
      windowState: createWindowState({
        existingZIndices: Array.from(openEntries.values()).map(e => e.windowState?.zIndex || 0)
      })
    };

    // Let the backend handle the path, we'll get it back in the response
    const entryForSave = { ...newEntry };
    delete entryForSave.windowState;

    console.log('Saving new entry:', entryForSave);

    // Save to backend
    api.saveEntry(id, entryForSave)
      .then(response => {
        console.log('Entry saved successfully:', response);
        // Add to available entries
        setAvailableEntries(prev => {
          const next = new Map(prev);
          next.set(id, { ...newEntry, ...response });
          return next;
        });

        // Open the entry
        setOpenEntries(prev => {
          const next = new Map(prev);
          next.set(id, { ...newEntry, ...response });
          return next;
        });
      })
      .catch(error => {
        console.error('Error saving entry:', error);
      });
  }, [openEntries, api, setAvailableEntries, setOpenEntries]);

  const handleUpdateEntry = useCallback(async (id, updates) => {
    const currentEntry = openEntries.get(id) || availableEntries.get(id);
    if (!currentEntry) return;

    const updatedEntry = {
      ...currentEntry,
      ...updates,
      modified: new Date().toISOString()
    };

    setOpenEntries(prev => {
      const next = new Map(prev);
      if (prev.has(id)) {
        next.set(id, updatedEntry);
      }
      return next;
    });

    // Only update availableEntries for journal entries
    if (!id.includes('/') && (!currentEntry.type || currentEntry.type !== 'writing')) {
      setAvailableEntries(prev => {
        const next = new Map(prev);
        next.set(id, updatedEntry);
        return next;
      });

      const entryForSave = { ...updatedEntry };
      delete entryForSave.windowState;
      debouncedSaveEntry(id, entryForSave);
    } else {
      // For writings, just save the content
      debouncedSaveWritingContent(id, updatedEntry.content);
    }
  }, [openEntries, availableEntries, debouncedSaveEntry, debouncedSaveWritingContent]);

  const handleCloseEntry = useCallback((id) => {
    setOpenEntries(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });

    // Also remove from config when closing
    const openWindows = JSON.parse(localStorage.getItem('eradia_window_config') || '{"openWindows":{}}');
    delete openWindows.openWindows[id];
    localStorage.setItem('eradia_window_config', JSON.stringify(openWindows));
    api.saveConfig(openWindows).catch(error => {
      console.error('Error saving config after close:', error);
    });
  }, [api]);

  const handleCloseAll = useCallback(() => {
    // Clear all open entries
    setOpenEntries(new Map());

    // Clear window config
    const openWindows = { openWindows: {} };
    localStorage.setItem('eradia_window_config', JSON.stringify(openWindows));
    api.saveConfig(openWindows).catch(error => {
      console.error('Error saving config after closing all:', error);
    });
  }, [api]);

  const handleDateSelect = useCallback((date) => {
    setSelectedDate(date);
  }, []);

  const handleRenameEntry = useCallback((oldPath, newPath) => {
    // Clean paths by removing .md extension for comparison
    const cleanOldPath = oldPath.replace(/\.md$/, '');
    const cleanNewPath = newPath.replace(/\.md$/, '');
    
    // Update any open entries that match the old path
    setOpenEntries(prev => {
      const next = new Map(prev);
      let found = false;
      
      // First try to find by exact path match
      for (const [id, entry] of prev.entries()) {
        const entryPath = entry.path?.replace(/\.md$/, '');
        if (entry.type === 'writing' && entryPath === cleanOldPath) {
          found = true;
          const newEntry = {
            ...entry,
            id: cleanNewPath,
            path: cleanNewPath + '.md',
            title: cleanNewPath.split('/').pop()
          };
          next.delete(id);
          next.set(cleanNewPath, newEntry);
          break; // Stop after finding the first match
        }
      }
      
      // If no match found, try matching by ID
      if (!found) {
        for (const [id, entry] of prev.entries()) {
          if (entry.type === 'writing' && id === cleanOldPath) {
            const newEntry = {
              ...entry,
              id: cleanNewPath,
              path: cleanNewPath + '.md',
              title: cleanNewPath.split('/').pop()
            };
            next.delete(id);
            next.set(cleanNewPath, newEntry);
            break;
          }
        }
      }
      
      return next;
    });

    // Also update available entries
    setAvailableEntries(prev => {
      const next = new Map(prev);
      for (const [id, entry] of prev.entries()) {
        const entryPath = entry.path?.replace(/\.md$/, '');
        if (entry.type === 'writing' && (entryPath === cleanOldPath || id === cleanOldPath)) {
          const newEntry = {
            ...entry,
            id: cleanNewPath,
            path: cleanNewPath + '.md',
            title: cleanNewPath.split('/').pop()
          };
          next.delete(id);
          next.set(cleanNewPath, newEntry);
        }
      }
      return next;
    });
  }, []);

  const handleDeleteEntry = useCallback(async (id) => {
    try {
      const entry = openEntries.get(id) || availableEntries.get(id);
      if (!entry) {
        console.warn('No entry found for deletion:', id);
        return;
      }

      let deleteResult;
      // Use deleteWriting for writings, deleteEntry for journal entries
      if (entry.type === 'writing') {
        const writingId = id.endsWith('.md') ? id : `${id}.md`;
        deleteResult = await api.deleteWriting(writingId);
        
        // Clean up localStorage
        localStorage.removeItem(`eradia_content_${writingId}`);
        
        // Clean up window config
        const openWindows = JSON.parse(localStorage.getItem('eradia_window_config') || '{"openWindows":{}}');
        const cleanId = writingId.replace(/\.md$/, '');
        delete openWindows.openWindows[cleanId];
        delete openWindows.openWindows[writingId];
        localStorage.setItem('eradia_window_config', JSON.stringify(openWindows));
        
        // Save updated config to backend
        await api.saveConfig(openWindows);
      } else {
        deleteResult = await api.deleteEntry(id);
      }

      if (deleteResult) {
        // Remove from open entries
        setOpenEntries(prev => {
          const next = new Map(prev);
          next.delete(id);
          if (entry.type === 'writing') {
            // Also try without .md extension
            next.delete(id.replace(/\.md$/, ''));
          }
          return next;
        });

        // Remove from available entries
        setAvailableEntries(prev => {
          const next = new Map(prev);
          next.delete(id);
          if (entry.type === 'writing') {
            // Also try without .md extension
            next.delete(id.replace(/\.md$/, ''));
          }
          return next;
        });
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  }, [openEntries, availableEntries, api]);

  const handleRestoreEntry = useCallback(async (id, windowState) => {
    try {
      const entriesMap = new Map(availableEntries);
      const openWindowsMap = new Map(openEntries);

      if (windowState.type === 'writing') {
        // For writings, ensure we have the correct path format
        const writingId = id.endsWith('.md') ? id : `${id}.md`;
        console.log('Looking for writing:', writingId);
        
        // Look in both processed writings and localStorage
        const writingEntry = writingsTreeRef.current?.children?.find(w => 
          w.id === writingId || w.path === writingId || 
          w.id === writingId.replace(/\.md$/, '') || 
          w.path === writingId.replace(/\.md$/, '')
        ) || {
          id: writingId.replace(/\.md$/, ''),
          path: writingId,
          title: writingId.split('/').pop().replace(/\.md$/, ''),
          type: 'writing'
        };
        
        console.log('Found/created writing entry:', writingEntry);
        
        // Try to load content from localStorage first
        const localContent = localStorage.getItem(`eradia_content_${writingId}`);
        if (localContent) {
          console.log('Using cached content for:', writingId);
          const entryId = writingId.replace(/\.md$/, '');
          openWindowsMap.set(entryId, {
            ...writingEntry,
            id: entryId,
            path: writingId,
            content: localContent,
            type: 'writing',
            windowState: {
              ...windowState,
              type: 'writing',
              x: typeof windowState.x === 'number' ? windowState.x : 20,
              y: typeof windowState.y === 'number' ? windowState.y : 20,
              width: typeof windowState.width === 'number' ? windowState.width : 589,
              height: typeof windowState.height === 'number' ? windowState.height : 442,
              zIndex: typeof windowState.zIndex === 'number' ? windowState.zIndex : 1000,
              isMaximized: !!windowState.isMaximized,
              showSource: windowState.showSource
            }
          });
        } else {
          // Try to load from API if not in localStorage
          try {
            const content = await api.loadWritingContent(writingId);
            if (content) {
              console.log('Got content from API for:', writingId);
              const entryId = writingId.replace(/\.md$/, '');
              openWindowsMap.set(entryId, {
                ...writingEntry,
                id: entryId,
                path: writingId,
                content: content.content || '',
                type: 'writing',
                windowState: {
                  ...windowState,
                  type: 'writing',
                  x: typeof windowState.x === 'number' ? windowState.x : 20,
                  y: typeof windowState.y === 'number' ? windowState.y : 20,
                  width: typeof windowState.width === 'number' ? windowState.width : 589,
                  height: typeof windowState.height === 'number' ? windowState.height : 442,
                  zIndex: typeof windowState.zIndex === 'number' ? windowState.zIndex : 1000,
                  isMaximized: !!windowState.isMaximized,
                  showSource: windowState.showSource
                }
              });
            }
          } catch (error) {
            console.error(`Error loading writing content for ${writingId}:`, error);
          }
        }
      } else {
        // Handle journal entries exactly as before
        const entry = entriesMap.get(id);
        if (entry) {
          openWindowsMap.set(id, {
            ...entry,
            content: entry.content || '',
            windowState: {
              ...windowState,
              x: typeof windowState.x === 'number' ? windowState.x : 20,
              y: typeof windowState.y === 'number' ? windowState.y : 20,
              width: typeof windowState.width === 'number' ? windowState.width : 589,
              height: typeof windowState.height === 'number' ? windowState.height : 442,
              zIndex: typeof windowState.zIndex === 'number' ? windowState.zIndex : 1000,
              isMaximized: !!windowState.isMaximized
            }
          });
        }
      }

      setOpenEntries(openWindowsMap);
    } catch (error) {
      console.error(`Error restoring window for ${id}:`, error);
    }
  }, [api, availableEntries, openEntries]);

  const handleUpdateState = useCallback((id, updates) => {
    setOpenEntries(prev => {
      const next = new Map(prev);
      const entry = next.get(id);
      if (entry) {
        next.set(id, {
          ...entry,
          windowState: {
            ...entry.windowState,
            ...updates
          }
        });
      }
      return next;
    });
  }, []);

  const handleMinimize = useCallback((id) => {
    handleUpdateState(id, { isMinimized: true });
  }, [handleUpdateState]);

  const handleRestore = useCallback((id) => {
    handleUpdateState(id, { isMinimized: false });
  }, [handleUpdateState]);

  const handleActivate = useCallback((id) => {
    setOpenEntries(prev => {
      const maxZ = Math.max(...Array.from(prev.values()).map(e => e.windowState?.zIndex || 0));
      const next = new Map(prev);
      const entry = next.get(id);
      if (entry) {
        next.set(id, {
          ...entry,
          windowState: {
            ...entry.windowState,
            zIndex: maxZ + 1
          }
        });
      }
      return next;
    });
  }, []);

  // Save window state when it changes
  useEffect(() => {
    const saveWindowState = async () => {
      const openWindows = {};
      openEntries.forEach((entry, id) => {
        if (entry.windowState) {
          // For writings, ensure we save with .md extension
          const windowId = entry.type === 'writing' ? `${id}.md` : id;
          openWindows[windowId] = {
            ...entry.windowState,
            type: entry.type,
            showSource: entry.type === 'writing' ? showSource : undefined
          };
        }
      });

      const config = { openWindows };
      
      // Save to localStorage and backend
      if (typeof window !== 'undefined') {
        localStorage.setItem('eradia_window_config', JSON.stringify(config));
      }
      try {
        await api.saveConfig(config);
      } catch (error) {
        console.error('Error saving window config:', error);
      }
    };

    // Debounce to avoid too many saves
    const debouncedSave = debounce(saveWindowState, 1000);
    debouncedSave();

    return () => debouncedSave.cancel();
  }, [openEntries, api, showSource]);

  const handleNewWriting = useCallback(async () => {
    setNewWritingName('');
    setNewWritingError('');
    setShowNewWritingModal(true);
  }, []);

  const handleCreateWriting = useCallback(async () => {
    if (!newWritingName.trim()) {
      setNewWritingError('Filename is required');
      return;
    }

    // Clean the name and ensure it has .md extension
    const baseName = newWritingName
      .trim()
      .replace(/\.md$/, '');  // Remove .md extension if present

    try {
      const newWriting = {
        name: baseName,
        title: baseName,
        type: 'writing',
        content: '',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        path: `${baseName}.md` // Ensure .md extension for the path
      };

      await api.saveWritingContent(`${baseName}.md`, { content: '' });
      handleOpenEntry({ ...newWriting, id: baseName });
      // Refresh the writings tree after creation
      if (writingsTreeRef.current?.refreshTree) {
        await writingsTreeRef.current.refreshTree();
      }
      setShowNewWritingModal(false);
      setNewWritingName('');
    } catch (error) {
      setNewWritingError(error.message);
    }
  }, [api, handleOpenEntry, newWritingName]);

  // Initial data load
  useEffect(() => {
    const initializeData = async () => {
      if (initRef.current) return;
      initRef.current = true;

      let initialConfig = { openWindows: {} };
      let loadedWritings = null;

      try {
        // Load config and entries in parallel
        const [config, allEntries] = await Promise.all([
          api.loadConfig().catch(error => {
            console.error('Error loading config:', error);
            return initialConfig;
          }),
          api.loadAllEntries(false).catch(error => {
            console.error('Error loading entries:', error);
            return [];
          })
        ]);

        // Process entries and update window states
        const entriesMap = new Map();
        if (Array.isArray(allEntries)) {
          allEntries.forEach(([id, entry]) => {
            if (id && entry) {
              entriesMap.set(id, entry);
            }
          });
        }
        setAvailableEntries(entriesMap);

        // Load writings separately to ensure we have them for restoration
        const writings = await api.loadWritings().catch(error => {
          console.error('Error loading writings:', error);
          // Try to get from localStorage if API fails
          const cachedWritings = localStorage.getItem('eradia_writings_backup');
          return cachedWritings ? JSON.parse(cachedWritings) : null;
        });

        // Store writings reference and ensure it has the proper structure
        if (writings) {
          // Ensure writings has the proper structure with children array
          const processedWritings = {
            ...writings,
            children: writings.children || []
          };
          
          // Add any temporary writings that might be in localStorage
          const tempWritings = Object.keys(localStorage)
            .filter(key => key.startsWith('eradia_content_'))
            .map(key => {
              const path = key.replace('eradia_content_', '');
              return {
                id: path.replace(/\.md$/, ''),
                path: path,
                title: path.split('/').pop().replace(/\.md$/, ''),
                type: 'writing'
              };
            });
          
          processedWritings.children = [...processedWritings.children, ...tempWritings];
          writingsTreeRef.current = processedWritings;
          console.log('Processed writings:', processedWritings);
        }

        // Only update open entries if we don't already have them from localStorage
        if (config.openWindows) {
          const openWindowsMap = new Map(openEntries); // Preserve existing entries
          
          for (const [id, windowState] of Object.entries(config.openWindows)) {
            console.log('Processing window:', id, windowState);
            try {
              if (windowState.type === 'writing') {
                // For writings, ensure we have the correct path format
                const writingId = id.endsWith('.md') ? id : `${id}.md`;
                console.log('Looking for writing:', writingId);
                
                // Look in both processed writings and localStorage
                const writingEntry = writingsTreeRef.current?.children?.find(w => 
                  w.id === writingId || w.path === writingId || 
                  w.id === writingId.replace(/\.md$/, '') || 
                  w.path === writingId.replace(/\.md$/, '')
                ) || {
                  id: writingId.replace(/\.md$/, ''),
                  path: writingId,
                  title: writingId.split('/').pop().replace(/\.md$/, ''),
                  type: 'writing'
                };
                
                console.log('Found/created writing entry:', writingEntry);
                
                // Try to load content from localStorage first
                const localContent = localStorage.getItem(`eradia_content_${writingId}`);
                if (localContent) {
                  console.log('Using cached content for:', writingId);
                  const entryId = writingId.replace(/\.md$/, '');
                  openWindowsMap.set(entryId, {
                    ...writingEntry,
                    id: entryId,
                    path: writingId,
                    content: localContent,
                    type: 'writing',
                    windowState: {
                      ...windowState,
                      type: 'writing',
                      x: typeof windowState.x === 'number' ? windowState.x : 20,
                      y: typeof windowState.y === 'number' ? windowState.y : 20,
                      width: typeof windowState.width === 'number' ? windowState.width : 589,
                      height: typeof windowState.height === 'number' ? windowState.height : 442,
                      zIndex: typeof windowState.zIndex === 'number' ? windowState.zIndex : 1000,
                      isMaximized: !!windowState.isMaximized
                    }
                  });
                } else {
                  // Try to load from API if not in localStorage
                  try {
                    const content = await api.loadWritingContent(writingId);
                    if (content) {
                      console.log('Got content from API for:', writingId);
                      const entryId = writingId.replace(/\.md$/, '');
                      openWindowsMap.set(entryId, {
                        ...writingEntry,
                        id: entryId,
                        path: writingId,
                        content: content.content || '',
                        type: 'writing',
                        windowState: {
                          ...windowState,
                          type: 'writing',
                          x: typeof windowState.x === 'number' ? windowState.x : 20,
                          y: typeof windowState.y === 'number' ? windowState.y : 20,
                          width: typeof windowState.width === 'number' ? windowState.width : 589,
                          height: typeof windowState.height === 'number' ? windowState.height : 442,
                          zIndex: typeof windowState.zIndex === 'number' ? windowState.zIndex : 1000,
                          isMaximized: !!windowState.isMaximized
                        }
                      });
                    }
                  } catch (error) {
                    console.error(`Error loading writing content for ${writingId}:`, error);
                  }
                }
              } else {
                // Handle journal entries exactly as before
                const entry = entriesMap.get(id);
                if (entry) {
                  openWindowsMap.set(id, {
                    ...entry,
                    content: entry.content || '',
                    windowState: {
                      ...windowState,
                      x: typeof windowState.x === 'number' ? windowState.x : 20,
                      y: typeof windowState.y === 'number' ? windowState.y : 20,
                      width: typeof windowState.width === 'number' ? windowState.width : 589,
                      height: typeof windowState.height === 'number' ? windowState.height : 442,
                      zIndex: typeof windowState.zIndex === 'number' ? windowState.zIndex : 1000,
                      isMaximized: !!windowState.isMaximized
                    }
                  });
                }
              }
            } catch (error) {
              console.error(`Error restoring window for ${id}:`, error);
            }
          }
          
          console.log('Setting open entries:', Array.from(openWindowsMap.entries()));
          setOpenEntries(openWindowsMap);
        }

        // Save window config to localStorage
        if (config.openWindows && Object.keys(config.openWindows).length > 0) {
          localStorage.setItem('eradia_window_config', JSON.stringify(config));
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Error during initialization:', error);
        setIsInitialized(true);
      }
    };

    initializeData();
  }, [api]);

  // Add window focus handler to check for content changes
  useEffect(() => {
    const handleFocus = async () => {
      // Check if we need to reload any content from the server
      openEntries.forEach(async (entry, id) => {
        try {
          if (id.includes('/')) {
            const response = await api.loadWritingContent(id);
            const serverContent = response.content;
            const localTimestamp = localStorage.getItem(`eradia_content_${id}_timestamp`);
            const serverTimestamp = new Date(response.modified || 0).getTime();

            // Only update if server content is newer than local
            if (!localTimestamp || serverTimestamp > parseInt(localTimestamp, 10)) {
              handleUpdateEntry(id, { content: serverContent, modified: response.modified });
            }
          }
        } catch (error) {
          console.error('Error checking content updates:', error);
        }
      });
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [api, openEntries, handleUpdateEntry]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isInitialized) {
    return <LoadingFallback />;
  }

  const renderSidebar = () => (
    <LeftSidebar
      selectedDate={selectedDate}
      onDateSelect={handleDateSelect}
      onCreateEntry={handleNewEntry}
      entries={Array.from(availableEntries.values())}
      onOpenEntry={handleOpenEntry}
      onRenameEntry={handleRenameEntry}
      onDeleteEntry={handleDeleteEntry}
      writingsTreeRef={writingsTreeRef}
      onNewWriting={handleNewWriting}
    />
  );

  return isMobile ? (
    <Suspense fallback={<LoadingFallback />}>
      <MobileLayout
        availableEntries={availableEntries}
        selectedDate={selectedDate}
        onDateChange={handleDateSelect}
        onEntrySelect={handleOpenEntry}
        onUpdateEntry={handleUpdateEntry}
        onSearch={() => {/* TODO: Implement search */}}
        getEntriesForDate={(date) => Array.from(availableEntries.values()).filter(entry => 
          entry.date && format(parseISO(entry.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        )}
        formatDate={(date) => format(parseISO(date), 'MMMM d, yyyy')}
      />
    </Suspense>
  ) : (
    <Suspense fallback={<LoadingFallback />}>
      <div className="flex h-screen bg-primary dark:bg-primary-dark text-content dark:text-content-dark">
        {renderSidebar()}
        
        <div className="flex-1 flex flex-col">
          <MainContent
            entries={openEntries}
            onUpdateEntry={handleUpdateEntry}
            onCloseEntry={handleCloseEntry}
            onCloseAll={handleCloseAll}
            onNewEntry={() => handleNewEntry(selectedDate)}
            onNewWriting={handleNewWriting}
            editorRef={editorRef}
            mdiViewRef={mdiViewRef}
            viewMode={viewMode}
            setViewMode={setViewMode}
            showSource={showSource}
            setShowSource={setShowSource}
          />
        </div>

        <RightSidebar
          entries={availableEntries}
          openEntries={openEntries}
          onOpenEntry={handleOpenEntry}
          onUpdateEntry={handleUpdateEntry}
          api={api}
        />
      </div>
      {/* New Writing Modal */}
      {showNewWritingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-primary dark:bg-primary-dark rounded-lg shadow-lg p-6 w-96 space-y-4">
            <h2 className="text-lg font-medium">New Writing</h2>
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Filename
                <input
                  type="text"
                  value={newWritingName}
                  onChange={(e) => setNewWritingName(e.target.value)}
                  placeholder="my-writing"
                  className="mt-1 block w-full rounded-md border border-border dark:border-border-dark 
                           bg-white dark:bg-primary-dark px-3 py-2"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateWriting();
                    }
                  }}
                />
                <span className="text-sm text-text-muted dark:text-text-muted-dark mt-1 block">
                  .md will be added automatically
                </span>
              </label>
              {newWritingError && (
                <p className="text-sm text-red-500">{newWritingError}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewWritingModal(false)}
                className="px-4 py-2 rounded hover:bg-secondary dark:hover:bg-secondary-dark"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWriting}
                className="px-4 py-2 rounded bg-accent dark:bg-accent-dark hover:bg-accent/80 dark:hover:bg-accent-dark/80 text-white"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </Suspense>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <AppearanceProvider>
        <CalendarSettingsProvider>
          <AppSettingsProvider>
            <Suspense fallback={<LoadingFallback />}>
              <AppContent />
            </Suspense>
          </AppSettingsProvider>
        </CalendarSettingsProvider>
      </AppearanceProvider>
    </ThemeProvider>
  );
};

export default App;