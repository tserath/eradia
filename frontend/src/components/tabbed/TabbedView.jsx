import React, { useState } from 'react';
import { X } from 'lucide-react';
import RichTextEditor from '../editor/RichTextEditor';

const TabbedView = ({ entries, onUpdateEntry, onCloseEntry, showSource }) => {
  const [activeTabId, setActiveTabId] = useState(null);

  // Ensure entries is a Map
  const entriesMap = entries instanceof Map ? entries : new Map();

  // Set first entry as active if none is active
  if (entriesMap.size > 0 && !activeTabId) {
    setActiveTabId(Array.from(entriesMap.keys())[0]);
  }

  const activeEntry = entriesMap.get(activeTabId);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap border-b border-border dark:border-border-dark bg-primary dark:bg-primary-dark flex-none">
        {Array.from(entriesMap.entries()).map(([id, entry]) => (
          <div
            key={id}
            className={`group flex items-center gap-2 px-4 py-2 border-r border-border dark:border-border-dark cursor-pointer
                      ${activeTabId === id ? 
                        'bg-secondary dark:bg-secondary-dark' : 
                        'hover:bg-secondary/50 dark:hover:bg-secondary-dark/50'}`}
            onClick={() => setActiveTabId(id)}
          >
            <span className="text-sm truncate">{entry.title || 'Untitled'}</span>
            <button
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-primary dark:hover:bg-primary-dark"
              onClick={(e) => {
                e.stopPropagation();
                onCloseEntry(id);
                // If we're closing the active tab, activate the next available one
                if (activeTabId === id) {
                  const remainingIds = Array.from(entriesMap.keys()).filter(tid => tid !== id);
                  if (remainingIds.length > 0) {
                    setActiveTabId(remainingIds[0]);
                  } else {
                    setActiveTabId(null);
                  }
                }
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {activeEntry && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <RichTextEditor
            content={activeEntry.content || ''}
            onChange={(content) => onUpdateEntry(activeTabId, { content })}
            showSource={showSource}
          />
        </div>
      )}
    </div>
  );
};

export default TabbedView;