import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

const SEARCH_MODES = {
  thesaurus: {
    label: 'Thesaurus',
    refinements: [
      { id: 'synonyms', label: 'Synonyms', code: 'ml' },
      { id: 'antonyms', label: 'Antonyms', code: 'rel_ant' },
      { id: 'similar', label: 'Similar Meaning', code: 'rel_syn' },
      { id: 'sound', label: 'Similar Sound', code: 'sl' }
    ]
  },
  rhyme: {
    label: 'Rhyme',
    refinements: [
      { id: 'perfect', label: 'Perfect Rhyme', code: 'rel_rhy' },
      { id: 'near', label: 'Near Rhyme', code: 'rel_nry' },
      { id: 'approximate', label: 'Approximate', code: 'rel_cry' }
    ]
  },
  define: {
    label: 'Define',
    refinements: [
      { id: 'definition', label: 'Definition', code: 'md' }
    ]
  }
};

const WordsTab = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [mode, setMode] = useState('thesaurus');
  const [refinement, setRefinement] = useState('synonyms');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchDatamuse = async () => {
    if (!searchTerm) return;

    setLoading(true);
    setError(null);

    try {
      const currentMode = SEARCH_MODES[mode];
      const currentRefinement = currentMode.refinements.find(r => r.id === refinement);
      const code = currentRefinement.code;

      const url = `https://api.datamuse.com/words?${code}=${encodeURIComponent(searchTerm)}&md=d`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch results');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError('Error fetching results. Please try again.');
      console.error('Datamuse API error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update refinement when mode changes
  useEffect(() => {
    setRefinement(SEARCH_MODES[mode].refinements[0].id);
  }, [mode]);

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-4">
        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchDatamuse()}
            placeholder="Enter a word..."
            className="w-full px-3 py-2 pr-10 text-sm bg-secondary/20 dark:bg-secondary-dark/20 
                     border border-border dark:border-border-dark rounded-lg 
                     focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-primary-dark"
          />
          <button
            onClick={searchDatamuse}
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 
                     hover:bg-secondary/50 dark:hover:bg-secondary-dark/50 rounded-lg 
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        {/* Mode and refinement dropdowns */}
        <div className="flex gap-2">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="flex-1 px-3 py-2 text-sm bg-secondary/20 dark:bg-secondary-dark/20 
                     border border-border dark:border-border-dark rounded-lg 
                     focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-primary-dark"
          >
            {Object.entries(SEARCH_MODES).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select
            value={refinement}
            onChange={(e) => setRefinement(e.target.value)}
            className="flex-1 px-3 py-2 text-sm bg-secondary/20 dark:bg-secondary-dark/20 
                     border border-border dark:border-border-dark rounded-lg 
                     focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-primary-dark"
          >
            {SEARCH_MODES[mode].refinements.map(({ id, label }) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-2">
        {loading && (
          <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
        )}
        
        {error && (
          <div className="text-sm text-red-500 dark:text-red-400">{error}</div>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="space-y-2">
            {results.map((result, index) => (
              <div 
                key={index}
                className="p-2 bg-secondary/10 dark:bg-secondary-dark/10 rounded-lg"
              >
                <div className="font-medium">{result.word}</div>
                {result.defs && result.defs.length > 0 && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {result.defs[0]}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && !error && results.length === 0 && searchTerm && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            No results found
          </div>
        )}
      </div>
    </div>
  );
};

export default WordsTab;
