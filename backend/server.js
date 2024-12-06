import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || '/data';
const JOURNAL_DIR = path.join(DATA_DIR, 'journal');
const WRITINGS_DIR = path.join(DATA_DIR, 'writings');
const CONFIG_DIR = process.env.CONFIG_DIR || '/config';

// Middleware to ensure directories exist
async function ensureDirectories() {
  try {
    await fs.mkdir(JOURNAL_DIR, { recursive: true });
    await fs.mkdir(WRITINGS_DIR, { recursive: true });
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating directories:', error);
  }
}

ensureDirectories();

// Get directory tree structure
async function getDirectoryTree(dirPath) {
  const stats = await fs.stat(dirPath);
  const name = path.basename(dirPath);

  if (!stats.isDirectory()) {
    return {
      name,
      type: 'file',
      size: stats.size,
      modified: stats.mtime
    };
  }

  const children = await fs.readdir(dirPath);
  const childNodes = await Promise.all(
    children.map(async child => {
      const childPath = path.join(dirPath, child);
      return await getDirectoryTree(childPath);
    })
  );

  return {
    name,
    type: 'directory',
    children: childNodes.sort((a, b) => {
      // Directories first, then alphabetically
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    })
  };
}

// Writings endpoints
app.get('/api/writings', async (req, res) => {
  try {
    const tree = await getDirectoryTree(WRITINGS_DIR);
    res.json(tree);
  } catch (error) {
    console.error('Error getting writings tree:', error);
    res.status(500).json({ error: 'Failed to get writings tree' });
  }
});

// Create directory endpoint - must be before the wildcard route
app.post('/api/writings/directory', async (req, res) => {
  try {
    const { path: dirPath } = req.body;
    if (!dirPath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    const fullPath = path.join(WRITINGS_DIR, dirPath);
    
    // Ensure the path doesn't try to escape the writings directory
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(WRITINGS_DIR)) {
      return res.status(403).json({ error: 'Invalid directory path' });
    }

    await fs.mkdir(normalizedPath, { recursive: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Error creating directory:', error);
    res.status(500).json({ error: 'Failed to create directory' });
  }
});

// Wildcard route for getting writing content - must be after specific routes
app.get('/api/writings/*', async (req, res) => {
  try {
    const filePath = path.join(WRITINGS_DIR, req.params[0]);
    const content = await fs.readFile(filePath, 'utf8');
    res.json({ content });
  } catch (error) {
    console.error('Error reading writing:', error);
    res.status(500).json({ error: 'Failed to read writing' });
  }
});

// Journal entry endpoints
app.get('/api/entries', async (req, res) => {
  try {
    const entries = [];
    console.log('Loading entries from:', JOURNAL_DIR);
    
    // Recursively walk through the journal directory
    async function walkDir(dir) {
      try {
        console.log('Walking directory:', dir);
        const files = await fs.readdir(dir);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.isDirectory()) {
            await walkDir(filePath);
          } else if (file.endsWith('.json')) {
            try {
              const content = await fs.readFile(filePath, 'utf8');
              const entry = JSON.parse(content);
              entries.push([entry.id, entry]);
            } catch (error) {
              console.error(`Error reading entry ${filePath}:`, error);
            }
          }
        }
      } catch (error) {
        console.error(`Error walking directory ${dir}:`, error);
      }
    }
    
    await walkDir(JOURNAL_DIR);
    console.log(`Found ${entries.length} entries`);
    res.json(entries);
  } catch (error) {
    console.error('Error loading entries:', error);
    res.status(500).json({ error: error.message });
  }
});

function getJournalPath(date) {
  // Convert to local time
  const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  const year = localDate.getFullYear();
  const month = (localDate.getMonth() + 1).toString().padStart(2, '0');
  const day = localDate.getDate().toString().padStart(2, '0');
  return path.join(JOURNAL_DIR, year.toString(), month, day);
}

async function getNextFileNumber(dirPath) {
  try {
    const monthDir = path.dirname(dirPath);
    const day = path.basename(dirPath);
    
    console.log('\n==================================================');
    console.log('DEBUG: STARTING getNextFileNumber');
    console.log('==================================================');
    console.log('INPUT:');
    console.log('  dirPath:', dirPath);
    console.log('  monthDir:', monthDir);
    console.log('  day:', day);
    console.log('--------------------------------------------------');
    
    // Get all files in the month directory
    const files = await fs.readdir(monthDir);
    console.log('FILES IN MONTH DIRECTORY:');
    for (const file of files) {
      console.log('  -', file);
    }
    console.log('--------------------------------------------------');
    
    // Get all JSON files for this day (e.g., "28-001.json", "28-002.json")
    const paddedDay = day.padStart(2, '0');
    const dayPattern = new RegExp(`^${paddedDay}-\\d{3}\\.json$`);
    console.log('SEARCHING FOR FILES:');
    console.log('  Day (padded):', paddedDay);
    console.log('  Pattern:', dayPattern);
    console.log('--------------------------------------------------');
    
    const dayFiles = [];
    console.log('TESTING EACH FILE:');
    for (const file of files) {
      const matches = dayPattern.test(file);
      console.log(`  ${file}: ${matches ? 'MATCHES' : 'NO MATCH'}`);
      if (matches) {
        dayFiles.push(file);
      }
    }
    console.log('--------------------------------------------------');
    
    console.log('MATCHING FILES:');
    for (const file of dayFiles) {
      console.log('  -', file);
    }
    console.log('--------------------------------------------------');
    
    // If no files exist for this day, start at 1
    if (dayFiles.length === 0) {
      console.log('NO FILES FOUND FOR THIS DAY');
      console.log('RETURNING: 001');
      console.log('==================================================\n');
      return '001';
    }
    
    // Get the highest number used
    let maxNumber = 0;
    console.log('FINDING HIGHEST NUMBER:');
    for (const file of dayFiles) {
      console.log('  Processing:', file);
      const match = file.match(/-(\d{3})\./);
      if (match) {
        const numberPart = parseInt(match[1], 10);
        console.log('    Number found:', numberPart);
        if (numberPart > maxNumber) {
          console.log('    New max! (was', maxNumber, 'now', numberPart, ')');
          maxNumber = numberPart;
        } else {
          console.log('    Not higher than current max:', maxNumber);
        }
      } else {
        console.log('    No number found in filename');
      }
    }
    
    console.log('--------------------------------------------------');
    console.log('HIGHEST NUMBER FOUND:', maxNumber);
    const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
    console.log('NEXT NUMBER WILL BE:', nextNumber);
    console.log('==================================================\n');
    return nextNumber;
  } catch (error) {
    console.error('\nERROR IN getNextFileNumber:', error);
    console.error('Returning default 001');
    console.error('==================================================\n');
    return '001';
  }
}

async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error('Error creating directory:', error);
    throw error;
  }
}

app.post('/api/entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const entry = req.body;
    
    if (!entry || !entry.date) {
      return res.status(400).json({ error: 'Invalid entry data' });
    }

    console.log('\n==================================================');
    console.log('DEBUG: STARTING POST /api/entries/:id');
    console.log('==================================================');
    console.log('INPUT:');
    console.log('  ID:', id);
    console.log('  Entry:', JSON.stringify(entry, null, 2));
    console.log('--------------------------------------------------');
    
    const date = new Date(entry.date);
    console.log('PARSED DATE:', date.toISOString());
    console.log('--------------------------------------------------');
    
    const dirPath = getJournalPath(date);
    console.log('PATHS:');
    console.log('  Journal path:', dirPath);
    
    // We only ensure the month directory exists since we store files there
    const monthDir = path.dirname(dirPath);
    console.log('  Month directory:', monthDir);
    await ensureDir(monthDir);
    console.log('  Month directory created/verified');
    console.log('--------------------------------------------------');

    // Get the day number
    const day = path.basename(dirPath);
    console.log('DAY:', day);
    console.log('--------------------------------------------------');
    
    // Get the next file number for this day
    const fileNumber = await getNextFileNumber(dirPath);
    console.log('FILE NUMBER:', fileNumber);
    console.log('--------------------------------------------------');
    
    // Make sure day is padded to 2 digits for consistent sorting
    const baseFilename = `${day.padStart(2, '0')}-${fileNumber}`;
    console.log('FILENAMES:');
    console.log('  Base:', baseFilename);
    
    // Create both files in the month directory
    const jsonPath = path.join(monthDir, `${baseFilename}.json`);
    const mdPath = path.join(monthDir, `${baseFilename}.md`);
    console.log('  JSON:', jsonPath);
    console.log('  MD:', mdPath);
    console.log('--------------------------------------------------');
    
    // Save the entry with its path info
    const entryToSave = {
      ...entry,
      path: path.join(path.basename(monthDir), baseFilename).replace(/\\/g, '/'),
      filename: baseFilename
    };
    
    console.log('SAVING FILES...');
    await fs.writeFile(jsonPath, JSON.stringify(entryToSave, null, 2));
    await fs.writeFile(mdPath, entry.content || '');
    console.log('Files saved successfully');
    console.log('==================================================\n');
    
    res.json({ success: true });
  } catch (error) {
    console.error('\nERROR saving entry:', error);
    console.error('==================================================\n');
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let entryFound = false;
    
    console.log('\n==================================================');
    console.log('DEBUG: STARTING DELETE /api/entries/:id');
    console.log('==================================================');
    console.log('INPUT:');
    console.log('  ID:', id);
    console.log('--------------------------------------------------');
    
    // Find all year directories
    const years = await fs.readdir(JOURNAL_DIR);
    console.log('YEARS:', years);
    
    // Search through each year/month
    for (const year of years) {
      const yearPath = path.join(JOURNAL_DIR, year);
      const yearStats = await fs.stat(yearPath);
      if (!yearStats.isDirectory()) continue;
      
      console.log('Searching year:', year);
      const months = await fs.readdir(yearPath);
      
      for (const month of months) {
        const monthPath = path.join(yearPath, month);
        const monthStats = await fs.stat(monthPath);
        if (!monthStats.isDirectory()) continue;
        
        console.log('Searching month:', month);
        const files = await fs.readdir(monthPath);
        console.log('Files in month:', files);
        
        // Look for matching JSON file
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          
          const filePath = path.join(monthPath, file);
          try {
            console.log('Reading file:', filePath);
            const content = await fs.readFile(filePath, 'utf8');
            const entry = JSON.parse(content);
            console.log('Entry ID:', entry.id);
            
            if (entry.id === id) {
              console.log('Found matching entry! Deleting files...');
              // Delete both .json and .md files
              const mdPath = filePath.replace('.json', '.md');
              console.log('Deleting files:', { jsonPath: filePath, mdPath });
              
              await fs.unlink(filePath);
              await fs.unlink(mdPath);
              entryFound = true;
              break;
            }
          } catch (error) {
            console.error('Error processing file:', filePath, error);
          }
        }
        
        if (entryFound) break;
      }
      
      if (entryFound) break;
    }
    
    if (!entryFound) {
      console.warn('Entry not found:', { id });
      res.status(404).json({ error: 'Entry not found' });
      return;
    }
    
    console.log('Successfully deleted entry:', id);
    console.log('==================================================\n');
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting entry:', error);
    console.error('==================================================\n');
    res.status(500).json({ error: error.message });
  }
});

// Config endpoints
app.get('/api/config', async (req, res) => {
  try {
    const configPath = path.join(CONFIG_DIR, 'config.json');
    try {
      const content = await fs.readFile(configPath, 'utf8');
      res.json(JSON.parse(content));
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.json({});
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error loading config:', error);
    res.status(500).json({ error: 'Failed to load config' });
  }
});

app.post('/api/config', async (req, res) => {
  try {
    const configPath = path.join(CONFIG_DIR, 'config.json');
    await fs.writeFile(configPath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving config:', error);
    res.status(500).json({ error: 'Failed to save config' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
