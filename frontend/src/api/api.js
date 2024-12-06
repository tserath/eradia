const API_URL = import.meta.env.VITE_API_URL || '/api';

const handleResponse = async (response) => {
  if (!response.ok) {
    let errorMessage;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || `HTTP error! status: ${response.status}`;
    } catch {
      errorMessage = `HTTP error! status: ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const deduplicateEntries = (entries) => {
  const uniqueEntries = new Map();
  entries.forEach(([id, entry]) => {
    const existingEntry = uniqueEntries.get(id);
    if (!existingEntry || 
        new Date(entry.modified) > new Date(existingEntry[1].modified)) {
      uniqueEntries.set(id, [id, entry]);
    }
  });
  return Array.from(uniqueEntries.values());
};

// Retry helper function
const withRetry = async (fn, retries = 3, delay = 1000) => {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  throw lastError;
};

const defaultFetchOptions = {
  credentials: 'include',  // Include credentials in the request
  headers: {
    'Content-Type': 'application/json',
  },
};

const useApi = () => {
  // Load configuration settings
  const loadConfig = async () => {
    try {
      return await withRetry(async () => {
        const response = await fetch(`${API_URL}/config`, defaultFetchOptions);
        return await handleResponse(response);
      });
    } catch (e) {
      console.error('Load Config Error:', e);
      // Return default config if network fails
      return { openWindows: {} };
    }
  };

  // Load all entries with retry and localStorage fallback
  const loadAllEntries = async (includeContent = false) => {
    try {
      return await withRetry(async () => {
        // Load both journal entries and writings
        const [journalResponse, writings] = await Promise.all([
          fetch(`${API_URL}/entries`, defaultFetchOptions).then(handleResponse),
          loadWritings()
        ]);

        // Process journal entries
        const journalEntries = journalResponse || [];

        // Combine entries, ensuring journal entries have proper structure
        const processedJournalEntries = journalEntries.map(entry => {
          if (Array.isArray(entry) && entry.length === 2) {
            const [id, entryData] = entry;
            const created = entryData.created || new Date().toISOString();
            const date = new Date(created);
            const path = entryData.path || id; // Use the path from the backend if available
            
            return [id, {
              ...entryData,
              id,
              type: 'journal',
              path,
              created,
              modified: entryData.modified || created,
              tags: Array.isArray(entryData.tags) ? entryData.tags : []
            }];
          }
          const id = entry.id || entry.path; // Use the path as ID if no ID is provided
          const created = entry.created || new Date().toISOString();
          const date = new Date(created);
          const path = entry.path || id; // Use the path from the backend if available
            
          return [id, {
            ...entry,
            id,
            type: 'journal',
            path,
            created,
            modified: entry.modified || created,
            tags: Array.isArray(entry.tags) ? entry.tags : []
          }];
        });

        // Convert writings tree to flat entries with content
        const writingEntries = [];
        const flattenWritings = async (node, parentPath = '') => {
          if (node.type === 'file') {
            const path = parentPath ? `${parentPath}/${node.name}` : node.name;
            let content = '';
            
            // Try to get content from localStorage first
            if (typeof window !== 'undefined') {
              const storedContent = localStorage.getItem(`eradia_content_${path}`);
              if (storedContent) {
                content = storedContent;
              }
            }
            
            writingEntries.push([path, {
              ...node,
              id: path,
              type: 'writing',
              path,
              content,
              created: node.created || new Date().toISOString(),
              modified: node.modified || new Date().toISOString(),
              title: node.name.replace(/\.md$/, '') // Remove .md extension for title
            }]);
          } else if (node.children) {
            const newPath = parentPath ? `${parentPath}/${node.name}` : node.name;
            for (const child of node.children) {
              await flattenWritings(child, newPath);
            }
          }
        };

        if (writings.children) {
          await Promise.all(writings.children.map(child => flattenWritings(child)));
        }

        // Combine and deduplicate entries
        const allEntries = deduplicateEntries([...processedJournalEntries, ...writingEntries]);

        // If content is requested, load it for each entry
        if (includeContent) {
          for (const [path, entry] of allEntries) {
            try {
              if (entry.type === 'writing') {
                const content = await loadWritingContent(path);
                const entryIndex = allEntries.findIndex(([p]) => p === path);
                if (entryIndex !== -1) {
                  allEntries[entryIndex][1].content = content.content;
                }
              }
            } catch (error) {
              console.error(`Error loading content for ${path}:`, error);
            }
          }
        }
        
        // Store entries in localStorage as backup
        if (typeof window !== 'undefined') {
          localStorage.setItem('eradia_entries_backup', JSON.stringify(allEntries));
        }
        
        return allEntries;
      });
    } catch (e) {
      console.error('Load All Entries Error:', e);
      
      // Try to load from localStorage if network fails
      if (typeof window !== 'undefined') {
        const backupEntries = localStorage.getItem('eradia_entries_backup');
        if (backupEntries) {
          try {
            return JSON.parse(backupEntries);
          } catch (parseError) {
            console.error('Error parsing backup entries:', parseError);
          }
        }
      }
      
      return []; // Return empty array if all else fails
    }
  };

  // Load writings with retry and localStorage fallback
  const loadWritings = async () => {
    try {
      // Try network request
      return await withRetry(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        try {
          const response = await fetch(`${API_URL}/writings`, {
            signal: controller.signal,
            ...defaultFetchOptions
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const writings = await handleResponse(response);
          
          // Update cache
          if (typeof window !== 'undefined' && writings) {
            localStorage.setItem('eradia_writings_backup', JSON.stringify(writings));
            localStorage.setItem('eradia_writings_timestamp', Date.now().toString());
          }
          
          return writings;
        } catch (e) {
          clearTimeout(timeoutId);
          throw e;
        }
      }, 1); // Only retry once
    } catch (e) {
      console.error('Load Writings Error:', e);
      
      // Last resort - try to load from localStorage regardless of age
      if (typeof window !== 'undefined') {
        const backupWritings = localStorage.getItem('eradia_writings_backup');
        if (backupWritings) {
          try {
            return JSON.parse(backupWritings);
          } catch (parseError) {
            console.error('Error parsing backup writings:', parseError);
          }
        }
      }
      
      // Return empty structure if all else fails
      return { files: [], directories: {}, children: [] };
    }
  };

  // Load writing content with retry and localStorage fallback
  const loadWritingContent = async (path) => {
    try {
      return await withRetry(async () => {
        // Ensure path has .md extension
        const filePath = path.endsWith('.md') ? path : path + '.md';
        const response = await fetch(`${API_URL}/writings/content?path=${encodeURIComponent(filePath)}`, defaultFetchOptions);
        const result = await handleResponse(response);
        
        // Store content in localStorage
        if (typeof window !== 'undefined' && result.content) {
          localStorage.setItem(`eradia_content_${path}`, result.content);
          localStorage.setItem(`eradia_content_${path}_timestamp`, Date.now().toString());
        }
        
        return result;
      });
    } catch (e) {
      console.error('Load Writing Content Error:', e);
      
      // Try to load from localStorage if network fails
      if (typeof window !== 'undefined') {
        const storedContent = localStorage.getItem(`eradia_content_${path}`);
        const storedTimestamp = localStorage.getItem(`eradia_content_${path}_timestamp`);
        
        if (storedContent && storedTimestamp) {
          return {
            content: storedContent,
            modified: new Date(parseInt(storedTimestamp, 10)).toISOString()
          };
        }
      }
      
      throw new Error(`Failed to load writing content: ${e.message}`);
    }
  };

  // Load a single journal entry
  const loadEntry = async (id) => {
    try {
      return await withRetry(async () => {
        const response = await fetch(`${API_URL}/entries/${id}`, defaultFetchOptions);
        const entry = await handleResponse(response);
        if (!entry) return null;

        // Ensure entry has proper structure
        return {
          ...entry,
          id,
          type: 'journal',
          created: entry.created || new Date().toISOString(),
          modified: entry.modified || entry.created || new Date().toISOString(),
          tags: Array.isArray(entry.tags) ? entry.tags : []
        };
      });
    } catch (e) {
      console.error('Load Entry Error:', e);
      throw e;
    }
  };

  // Save configuration settings
  const saveConfig = async (config) => {
    try {
      const response = await fetch(`${API_URL}/config`, {
        method: 'POST',
        ...defaultFetchOptions,
        body: JSON.stringify(config),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error saving config:', error);
      throw error;
    }
  };

  // Save a journal entry with content
  const saveEntry = async (id, entry) => {
    try {
      if (!id || typeof id !== 'string' || !entry || typeof entry !== 'object') {
        throw new Error('Invalid entry provided');
      }

      const response = await fetch(`${API_URL}/entries/${id}`, {
        method: 'POST',
        ...defaultFetchOptions,
        body: JSON.stringify(entry), // Send just the entry, ID is in the URL
      });
      return await handleResponse(response);
    } catch (e) {
      console.error('Save Entry Error:', e);
      throw new Error(`Failed to save entry: ${e.message}`);
    }
  };

  // Delete a journal entry by ID
  const deleteEntry = async (id) => {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid ID provided');
      }

      return await withRetry(async () => {
        console.log('Attempting to delete entry:', id);
        const response = await fetch(`${API_URL}/entries/${id}`, {
          method: 'DELETE',
          ...defaultFetchOptions,
        });

        // Log the response for debugging
        console.log('Delete response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Delete error response:', errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await handleResponse(response);
      });
    } catch (e) {
      console.error('Delete Entry Error:', e);
      throw new Error(`Failed to delete entry: ${e.message}`);
    }
  };

  // Delete a writing by path
  const deleteWriting = async (path) => {
    try {
      if (!path || typeof path !== 'string') {
        throw new Error('Invalid path provided');
      }

      return await withRetry(async () => {
        console.log('Attempting to delete:', path);
        const response = await fetch(`${API_URL}/writings/content?path=${encodeURIComponent(path)}`, {
          method: 'DELETE',
          ...defaultFetchOptions,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Clear the writings cache on successful deletion
        if (typeof window !== 'undefined') {
          localStorage.removeItem('eradia_writings_backup');
          localStorage.removeItem('eradia_writings_timestamp');
        }

        return await handleResponse(response);
      });
    } catch (e) {
      console.error('Delete Writing Error:', e);
      throw e;
    }
  };

  // Move/rename a writing
  const moveEntry = async (oldPath, newPath, overwrite = false) => {
    try {
      if (!oldPath || !newPath) {
        throw new Error('Both old and new paths are required');
      }

      // Clean up paths - remove any .md or .json extensions
      const cleanOldPath = oldPath.replace(/\.(md|json)$/, '');
      const cleanNewPath = newPath.replace(/\.(md|json)$/, '');
      
      // Remove any writings/ prefix and handle root/ prefix
      const baseOldPath = cleanOldPath
        .replace(/^writings\//, '')
        .replace(/^root\//, '');
      const baseNewPath = cleanNewPath
        .replace(/^writings\//, '')
        .replace(/^root\//, '');

      console.log('Moving file from', baseOldPath, 'to', baseNewPath); // Debug log

      const response = await fetch(`${API_URL}/writings/move`, {
        method: 'POST',
        ...defaultFetchOptions,
        body: JSON.stringify({
          oldPath: baseOldPath,
          newPath: baseNewPath,
          overwrite
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.code === 'FILE_EXISTS') {
          const err = new Error('File already exists');
          err.code = 'FILE_EXISTS';
          throw err;
        }
        throw new Error(error.error || 'Failed to move writing');
      }

      // Clear the writings cache to ensure we see the changes
      if (typeof window !== 'undefined') {
        localStorage.removeItem('eradia_writings_backup');
        localStorage.removeItem('eradia_writings_timestamp');
      }

      return await response.json();
    } catch (e) {
      console.error('Move Writing Error:', e);
      throw e; // Preserve the original error
    }
  };

  // Save writing content
  const saveWritingContent = async (path, { content }) => {
    if (content === undefined) {
      throw new Error('Writing content is required');
    }

    try {
      return await withRetry(async () => {
        const response = await fetch(`${API_URL}/writings/content`, {
          method: 'POST',
          ...defaultFetchOptions,
          body: JSON.stringify({ path, content }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to save writing');
        }

        // Store content in localStorage as backup
        if (typeof window !== 'undefined') {
          localStorage.setItem(`eradia_content_${path}`, content);
          localStorage.setItem(`eradia_content_${path}_timestamp`, Date.now().toString());
        }

        return await response.json();
      });
    } catch (error) {
      console.error('Save Writing Error:', error);
      throw error;
    }
  };

  // Create a new writing
  const createNewWriting = async (path = '') => {
    try {
      const response = await fetch(`${API_URL}/writings`, {
        method: 'POST',
        ...defaultFetchOptions,
        body: JSON.stringify({ path }),
      });
      const result = await handleResponse(response);

      // Clear the writings cache to ensure we see the new file
      if (typeof window !== 'undefined') {
        localStorage.removeItem('eradia_writings_backup');
        localStorage.removeItem('eradia_writings_timestamp');
      }

      return result;
    } catch (e) {
      console.error('Create Writing Error:', e);
      throw new Error(`Failed to create writing: ${e.message}`);
    }
  };

  // Create a new directory
  const createDirectory = async (path) => {
    try {
      const response = await fetch(`${API_URL}/writings/directory`, {
        method: 'POST',
        ...defaultFetchOptions,
        body: JSON.stringify({ path }),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error creating directory:', error);
      throw error;
    }
  };

  // Rename a journal entry
  const renameEntry = async (id, newTitle) => {
    try {
      if (!id || typeof id !== 'string' || !newTitle || typeof newTitle !== 'string') {
        throw new Error('Invalid ID or title provided');
      }

      const response = await fetch(`${API_URL}/entries/rename`, {
        method: 'POST',
        ...defaultFetchOptions,
        body: JSON.stringify({ id, newTitle }),
      });

      // First try to get the error message from the response
      let errorMessage;
      try {
        const data = await response.json();
        errorMessage = data.error;
      } catch {
        errorMessage = 'Failed to rename entry';
      }

      if (!response.ok) {
        throw new Error(errorMessage);
      }

      return { success: true };
    } catch (e) {
      console.error('Rename Entry Error:', e);
      throw e; // Preserve the original error
    }
  };

  // Search entries and writings
  const search = async (query, type = 'all') => {
    try {
      const response = await fetch(`${API_URL}/search?query=${encodeURIComponent(query)}&type=${type}`, defaultFetchOptions);
      return await handleResponse(response);
    } catch (e) {
      console.error('Search Error:', e);
      throw new Error(`Failed to search: ${e.message}`);
    }
  };

  return {
    loadConfig,
    saveConfig,
    loadAllEntries,
    loadWritings,
    loadWritingContent,
    loadEntry,
    saveWritingContent,
    moveEntry,
    deleteWriting,
    deleteEntry,
    createDirectory,
    saveEntry,
    renameEntry,
    search
  };
};

// Utility function for generating unique IDs for new entries
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

export { useApi, generateUUID };
