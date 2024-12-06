// src/components/sidebar/SearchTab.jsx
import React, { useState } from 'react';
import { Search, Book, Calendar } from 'lucide-react';

const SearchTab = ({ entries, onOpenEntry, api }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await api.search(searchQuery.trim(), searchType);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsSearching(false);
    }
  };

  // Get the appropriate icon for the result type
  const getTypeIcon = (type) => {
    switch (type) {
      case 'journal':
        return <Calendar className="w-4 h-4" />;
      case 'writing':
        return <Book className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-4">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search entries..."
            className="flex-1 px-3 py-2 bg-secondary/20 dark:bg-secondary-dark/20 
                     rounded-lg border border-border dark:border-border-dark 
                     focus:outline-none focus:ring-2 focus:ring-accent dark:focus:ring-accent-dark"
          />
          <button
            onClick={handleSearch}
            className="px-3 py-2 bg-accent dark:bg-accent-dark text-white rounded-lg
                     hover:bg-accent/80 dark:hover:bg-accent-dark/80
                     focus:outline-none focus:ring-2 focus:ring-accent dark:focus:ring-accent-dark"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value)}
          className="px-3 py-2 bg-secondary/20 dark:bg-secondary-dark/20 
                   rounded-lg border border-border dark:border-border-dark 
                   focus:outline-none focus:ring-2 focus:ring-accent dark:focus:ring-accent-dark"
        >
          <option value="all">All</option>
          <option value="journal">Journal Entries</option>
          <option value="writings">Writings</option>
          <option value="tags">Tags</option>
        </select>

        <div className="mt-4">
          {isSearching ? (
            <div className="text-center text-text-muted dark:text-text-muted-dark">
              Searching...
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  onClick={() => onOpenEntry(result)}
                  className="p-3 rounded-lg cursor-pointer
                           bg-secondary/10 dark:bg-secondary-dark/10
                           hover:bg-secondary/20 dark:hover:bg-secondary-dark/20
                           border border-border dark:border-border-dark"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {getTypeIcon(result.type)}
                    <span className="font-medium">{result.title || 'Untitled'}</span>
                  </div>
                  {result.tags && result.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {result.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 text-sm rounded-full
                                   bg-accent/10 dark:bg-accent-dark/10
                                   text-accent dark:text-accent-dark"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : searchQuery ? (
            <div className="text-center text-text-muted dark:text-text-muted-dark">
              No results found
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SearchTab;