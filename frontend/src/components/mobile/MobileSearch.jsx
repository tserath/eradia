import React, { useState } from 'react';
import { IoArrowBack, IoSearch } from 'react-icons/io5';
import { format, parseISO } from 'date-fns';

const MobileSearch = ({ entries, onEntrySelect, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const formatDate = (dateString) => {
    try {
      if (!dateString) return format(new Date(), 'PPP');
      const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
      return format(date, 'PPP');
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid date';
    }
  };

  const filteredEntries = Array.from(entries.values()).filter(entry => {
    const searchLower = searchQuery.toLowerCase();
    return (
      entry.title?.toLowerCase().includes(searchLower) ||
      entry.content?.toLowerCase().includes(searchLower) ||
      entry.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="flex flex-col h-full bg-primary dark:bg-primary-dark">
      {/* Header */}
      <div className="flex items-center px-4 py-3 bg-secondary dark:bg-secondary-dark border-b border-border dark:border-border-dark">
        <button
          onClick={onClose}
          className="flex items-center text-text-muted dark:text-text-muted-dark hover:text-text dark:hover:text-text-dark"
        >
          <IoArrowBack className="w-6 h-6 mr-2" />
          Back
        </button>
        <div className="ml-4 flex-1">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-10 pr-4 py-2 bg-primary dark:bg-primary-dark text-text dark:text-text-dark placeholder-text-muted dark:placeholder-text-muted-dark border border-border dark:border-border-dark rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2C2E33] dark:focus:ring-[#2C2E33]"
            />
            <IoSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted dark:text-text-muted-dark" />
          </div>
        </div>
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-8 text-text-muted dark:text-text-muted-dark">
            {searchQuery ? 'No matching entries found' : 'Start typing to search'}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEntries.map(entry => (
              <div
                key={entry.id}
                onClick={() => {
                  onEntrySelect(entry);
                  onClose();
                }}
                className="p-4 bg-secondary dark:bg-secondary-dark rounded-lg cursor-pointer hover:bg-secondary/80 dark:hover:bg-secondary-dark/80 transition-smooth"
              >
                <h3 className="text-lg font-semibold mb-2 text-text dark:text-text-dark">
                  {entry.title || formatDate(entry.created)}
                </h3>
                {entry.content && (
                  <p className="text-text-muted dark:text-text-muted-dark line-clamp-2">
                    {entry.content}
                  </p>
                )}
                {entry.tags?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {entry.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-sm rounded-full bg-accent/10 dark:bg-[#2C2E33]/10 text-accent dark:text-[#2C2E33]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileSearch;
