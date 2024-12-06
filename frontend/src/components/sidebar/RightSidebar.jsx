// src/components/sidebar/RightSidebar.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, Tag, ChevronLeft, ChevronRight, ChevronDown, Settings, Folder, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import SearchTab from './SearchTab';
import TagsTab from './TagsTab';
import WordsTab from './WordsTab';

const viewOptions = [
  { id: 'tags', label: 'Tags', icon: Tag },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'projects', label: 'Projects', icon: Folder },
  { id: 'words', label: 'Words', icon: BookOpen },
  { id: 'properties', label: 'Properties', icon: Settings },
];

const RightSidebar = ({ entries, openEntries, onOpenEntry, onUpdateEntry, api }) => {
  const [currentView, setCurrentView] = useState('tags');
  const [activeDocument, setActiveDocument] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const activeEntry = Array.from(openEntries.values()).reduce((highest, current) => {
      if (!highest) return current;
      const highestZ = highest.windowState?.zIndex || 0;
      const currentZ = current.windowState?.zIndex || 0;
      return currentZ > highestZ ? current : highest;
    }, null);

    setActiveDocument(activeEntry);
  }, [openEntries]);

  const renderMetadata = (entry) => {
    if (!entry) return null;

    // Extract filename from path
    const filename = entry.path ? entry.path.split('/').pop() : null;
    
    // Debug log
    console.log('Entry data:', {
      entry,
      filename,
      path: entry.path,
      fullPath: entry.fullPath,
      filepath: entry.filepath
    });

    return (
      <div className="space-y-4">
        <div>
          <h4 className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Name</h4>
          <p className="text-sm">{entry.title || entry.name || entry.path?.split('/').pop()?.replace(/\.md$/, '') || 'Untitled'}</p>
        </div>
        {(filename || entry.filename || entry.path?.split('/').pop() || entry.fullPath?.split('/').pop()) && (
          <div>
            <h4 className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Filename</h4>
            <p className="text-sm font-mono text-gray-600 dark:text-gray-300">
              {entry.filename || entry.path?.split('/').pop() || entry.fullPath?.split('/').pop()}
            </p>
          </div>
        )}
        {entry.created && (
          <div>
            <h4 className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Created</h4>
            <p className="text-sm">
              {format(new Date(entry.created), 'PPpp')}
            </p>
          </div>
        )}
        {entry.modified && (
          <div>
            <h4 className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Modified</h4>
            <p className="text-sm">
              {format(new Date(entry.modified || entry.created), 'PPpp')}
            </p>
          </div>
        )}
        <div>
          <h4 className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Type</h4>
          <p className="text-sm capitalize">{entry.type || 'Unknown'}</p>
        </div>
        {entry.type === 'journal' && (
          <>
            {entry.id && (
              <div>
                <h4 className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">UUID</h4>
                <p className="text-sm font-mono break-all text-gray-600 dark:text-gray-300">{entry.id}</p>
              </div>
            )}
            <div>
              <h4 className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Path</h4>
              <p className="text-sm font-mono break-all text-gray-600 dark:text-gray-300">
                {entry.filepath || (entry.created ? 
                  `journal/${format(new Date(entry.created), 'yyyy/MM')}/${format(new Date(entry.created), 'dd')}-001.md` 
                  : 'Unknown path')}
              </p>
            </div>
          </>
        )}
        {entry.type === 'writing' && entry.path && (
          <div>
            <h4 className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Path</h4>
            <p className="text-sm font-mono break-all text-gray-600 dark:text-gray-300">writings/{entry.path}</p>
          </div>
        )}
        {entry.wordCount !== undefined && (
          <div>
            <h4 className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Word Count</h4>
            <p className="text-sm">{entry.wordCount.toLocaleString()}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`relative flex flex-col bg-primary dark:bg-primary-dark border-l border-border dark:border-border-dark transition-all duration-300 ease-in-out ${isCollapsed ? 'w-12' : 'w-80'}`}>
      <div className="flex items-center p-4 border-b border-border dark:border-border-dark">
        {!isCollapsed ? (
          <>
            <div className="relative flex-1">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium bg-secondary/20 dark:bg-secondary-dark/20 hover:bg-secondary/50 dark:hover:bg-secondary-dark/50 rounded-lg transition-smooth"
              >
                <div className="flex items-center gap-2">
                  {viewOptions.find(opt => opt.id === currentView)?.icon && 
                    React.createElement(viewOptions.find(opt => opt.id === currentView).icon, { size: 16 })}
                  <span>{viewOptions.find(opt => opt.id === currentView)?.label}</span>
                </div>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {dropdownOpen && (
                <div className="absolute top-full left-0 w-full mt-1 py-1 bg-white dark:bg-gray-800 border border-border dark:border-border-dark rounded-lg shadow-lg z-10">
                  {viewOptions.map(option => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setCurrentView(option.id);
                        setDropdownOpen(false);
                      }}
                      className={`flex items-center gap-2 w-full px-3 py-2 text-sm ${
                        currentView === option.id
                          ? 'bg-secondary/50 dark:bg-secondary-dark/50'
                          : 'hover:bg-secondary/20 dark:hover:bg-secondary-dark/20'
                      }`}
                    >
                      {React.createElement(option.icon, { size: 16 })}
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setIsCollapsed(true)}
              className="ml-2 p-1.5 hover:bg-secondary/50 dark:hover:bg-secondary-dark/50 rounded-lg bg-secondary/20 dark:bg-secondary-dark/20"
              title="Collapse Sidebar"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-full p-1.5 hover:bg-secondary/50 dark:hover:bg-secondary-dark/50 rounded-lg bg-secondary/20 dark:bg-secondary-dark/20"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
        )}
      </div>

      {!isCollapsed && (
        <div className="flex-1 overflow-auto">
          {currentView === 'tags' && (
            <TagsTab
              activeDocument={activeDocument}
              entries={entries}
              onUpdateEntry={onUpdateEntry}
            />
          )}
          {currentView === 'search' && (
            <SearchTab
              entries={entries}
              onOpenEntry={onOpenEntry}
              api={api}
            />
          )}
          {currentView === 'projects' && (
            <div className="p-4">
              <h3 className="text-sm font-medium mb-4">Projects</h3>
              {/* Projects content will go here */}
            </div>
          )}
          {currentView === 'words' && (
            <WordsTab
              entries={entries}
              onOpenEntry={onOpenEntry}
              api={api}
            />
          )}
          {currentView === 'properties' && (
            <div className="p-4">
              <h3 className="text-sm font-medium mb-4">Properties</h3>
              {activeDocument ? (
                renderMetadata(activeDocument)
              ) : (
                <p className="text-sm text-gray-500">No document selected</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RightSidebar;