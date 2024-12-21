import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(express.json());

// Debug middleware - must be first
app.use((req, res, next) => {
  console.log('\n=== Incoming Request ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Original URL:', req.originalUrl);
  console.log('Path:', req.path);
  console.log('Query:', req.query);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', req.body);
  console.log('=====================\n');

  // Capture response
  const oldSend = res.send;
  res.send = function(data) {
    console.log('\n=== Outgoing Response ===');
    console.log('Status:', res.statusCode);
    console.log('Headers:', JSON.stringify(res.getHeaders(), null, 2));
    console.log('Body:', data);
    console.log('=====================\n');
    return oldSend.apply(res, arguments);
  };

  next();
});

// Configure logging
console.log = function() {
  process.stdout.write(new Date().toISOString() + ' ');
  console.info.apply(console, arguments);
};
console.error = function() {
  process.stderr.write(new Date().toISOString() + ' [ERROR] ');
  console.info.apply(console, arguments);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || '/data';
const JOURNAL_DIR = process.env.JOURNAL_DIR || path.join(DATA_DIR, 'journal');
const WRITINGS_DIR = process.env.WRITINGS_DIR || path.join(DATA_DIR, 'writings');
const CONFIG_DIR = process.env.CONFIG_DIR || path.join(DATA_DIR, 'config');

// Middleware to ensure directories exist
const ensureDirectories = async () => {
  try {
    console.log('Creating required directories...');
    console.log('JOURNAL_DIR:', JOURNAL_DIR);
    console.log('WRITINGS_DIR:', WRITINGS_DIR);
    console.log('CONFIG_DIR:', CONFIG_DIR);
    
    await fs.mkdir(JOURNAL_DIR, { recursive: true });
    await fs.mkdir(WRITINGS_DIR, { recursive: true });
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    
    // Check if directories were created
    const journalStats = await fs.stat(JOURNAL_DIR);
    const writingsStats = await fs.stat(WRITINGS_DIR);
    const configStats = await fs.stat(CONFIG_DIR);
    
    console.log('Directory stats:', {
      journal: { mode: journalStats.mode, uid: journalStats.uid, gid: journalStats.gid },
      writings: { mode: writingsStats.mode, uid: writingsStats.uid, gid: writingsStats.gid },
      config: { mode: configStats.mode, uid: configStats.uid, gid: configStats.gid }
    });
    
    console.log('Directories created successfully');
  } catch (error) {
    console.error('Error creating directories:', error);
    throw error;
  }
};

// Ensure directories exist on startup
ensureDirectories().catch(error => {
  console.error('Failed to create directories:', error);
  process.exit(1);
});

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

// Helper function to read a file and its metadata
async function readFileAndMetadata(filePath, type) {
  try {
    // Read the metadata file
    const metadataPath = filePath.replace('.md', '.json');
    const content = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(content);
    
    // Read the markdown content
    let mdContent = '';
    try {
      mdContent = await fs.readFile(filePath, 'utf-8');
    } catch (e) {
      console.warn(`No .md file found for ${filePath}`);
    }

    return {
      ...metadata,
      content: mdContent,
      type
    };
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
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

// Delete directory or file endpoint - must be before the wildcard route
app.delete('/api/writings/*', async (req, res) => {
  try {
    console.log('Delete request params:', req.params);
    const itemPath = decodeURIComponent(req.params[0]);
    console.log('Decoded path:', itemPath);
    const fullPath = path.join(WRITINGS_DIR, itemPath);
    console.log('Full path:', fullPath);
    
    // Ensure the path doesn't try to escape the writings directory
    const normalizedPath = path.normalize(fullPath);
    console.log('Normalized path:', normalizedPath);
    if (!normalizedPath.startsWith(WRITINGS_DIR)) {
      console.log('Invalid path detected:', { normalizedPath, WRITINGS_DIR });
      return res.status(403).json({ error: 'Invalid path' });
    }

    try {
      const stats = await fs.stat(normalizedPath);
      console.log('File/Directory stats:', {
        isDirectory: stats.isDirectory(),
        size: stats.size,
        path: normalizedPath
      });
      
      if (stats.isDirectory()) {
        console.log('Deleting directory:', normalizedPath);
        await fs.rm(normalizedPath, { recursive: true, force: true });
      } else {
        console.log('Deleting file:', normalizedPath);
        await fs.unlink(normalizedPath);
      }
      console.log('Delete successful');
      const response = { success: true };
      console.log('Sending response:', response);
      res.json(response);
    } catch (error) {
      console.error('Initial deletion error:', error);
      if (error.code === 'ENOENT') {
        // Try with .md extension if the file wasn't found
        const mdPath = normalizedPath + '.md';
        console.log('Trying with .md extension:', mdPath);
        try {
          await fs.unlink(mdPath);
          console.log('Delete successful with .md extension');
          const response = { success: true };
          console.log('Sending response:', response);
          res.json(response);
        } catch (mdError) {
          console.error('Error deleting with .md extension:', mdError);
          const response = { error: `File or directory not found: ${itemPath}` };
          console.log('Sending error response:', response);
          res.status(404).json(response);
        }
      } else {
        const response = { error: `Failed to delete: ${error.message}` };
        console.log('Sending error response:', response);
        res.status(500).json(response);
      }
    }
  } catch (error) {
    console.error('Delete error:', error);
    const response = { error: `Failed to process delete request: ${error.message}` };
    console.log('Sending error response:', response);
    res.status(500).json(response);
  }
});

// Save writing content
app.post('/api/writings/content', async (req, res) => {
  try {
    console.log('\n=== Processing Save Writing Request ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Body:', req.body);

    const { path: writingPath, content } = req.body;

    if (!writingPath || content === undefined) {
      return res.status(400).json({ error: 'Path and content are required' });
    }

    // Clean up the path
    const cleanPath = writingPath.replace(/^\/+/, '');
    console.log('Clean path:', cleanPath);

    // Ensure it ends with .md
    const finalPath = cleanPath.endsWith('.md') ? cleanPath : `${cleanPath}.md`;
    console.log('Final path:', finalPath);

    // Construct the full file path
    const filePath = path.join(WRITINGS_DIR, finalPath);
    console.log('Full file path:', filePath);

    // Ensure the directory exists
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });

    // Write the file
    await fs.writeFile(filePath, content, 'utf8');
    console.log('Successfully wrote file:', filePath);

    // Get file stats
    const stats = await fs.stat(filePath);

    return res.json({
      path: finalPath,
      modified: stats.mtime.toISOString(),
      size: stats.size
    });
  } catch (error) {
    console.error('Error saving writing:', error);
    res.status(500).json({ error: 'Failed to save writing' });
  }
});

// Move/rename writing
app.post('/api/writings/move', async (req, res) => {
  try {
    console.log('\n=== Processing Move Writing Request ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Body:', req.body);

    const { oldPath, newPath, overwrite } = req.body;

    if (!oldPath || !newPath) {
      return res.status(400).json({ error: 'Both old and new paths are required' });
    }

    // Clean up paths and ensure they end with .md
    const cleanOldPath = oldPath.replace(/^\/+/, '');
    const cleanNewPath = newPath.replace(/^\/+/, '');
    const finalOldPath = cleanOldPath.endsWith('.md') ? cleanOldPath : `${cleanOldPath}.md`;
    const finalNewPath = cleanNewPath.endsWith('.md') ? cleanNewPath : `${cleanNewPath}.md`;

    // Construct full file paths
    const oldFilePath = path.join(WRITINGS_DIR, finalOldPath);
    const newFilePath = path.join(WRITINGS_DIR, finalNewPath);

    console.log('Moving from:', oldFilePath);
    console.log('Moving to:', newFilePath);

    // Check if source exists
    try {
      await fs.access(oldFilePath);
    } catch (error) {
      return res.status(404).json({ error: 'Source file not found' });
    }

    // Check if destination exists
    try {
      await fs.access(newFilePath);
      if (!overwrite) {
        return res.status(409).json({ error: 'Destination file already exists', code: 'FILE_EXISTS' });
      }
    } catch (error) {
      // Destination doesn't exist, which is fine
    }

    // Ensure the destination directory exists
    const destDir = path.dirname(newFilePath);
    await fs.mkdir(destDir, { recursive: true });

    // Move the file
    await fs.rename(oldFilePath, newFilePath);

    // Get file stats
    const stats = await fs.stat(newFilePath);

    return res.json({
      path: finalNewPath,
      modified: stats.mtime.toISOString(),
      size: stats.size
    });
  } catch (error) {
    console.error('Error moving writing:', error);
    res.status(500).json({ error: 'Failed to move writing' });
  }
});

// Wildcard route for getting writing content - must be after specific routes
app.get('/api/writings/*', async (req, res) => {
  try {
    console.log('\n=== Processing Writing Request ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Original URL:', req.originalUrl);
    console.log('Path:', req.path);
    console.log('Query:', req.query);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('WRITINGS_DIR:', WRITINGS_DIR);

    // Get the path after /api/writings/
    const pathAfterWritings = req.path.replace(/^\/api\/writings\//, '');
    console.log('Path after /api/writings/:', pathAfterWritings);

    // Decode the path parameter and remove any leading slashes
    const decodedPath = decodeURIComponent(pathAfterWritings).replace(/^\/+/, '');
    console.log('Decoded path:', decodedPath);

    // Construct the full file paths
    const mdPath = path.join(WRITINGS_DIR, decodedPath + '.md');
    console.log('Checking path:', mdPath);

    const entry = await readFileAndMetadata(mdPath, 'writing');
    if (!entry) {
      console.error('No entry found at path:', mdPath);
      return res.status(404).json({ error: 'File not found' });
    }

    // Get file stats
    const stats = await fs.stat(mdPath);

    // Return both content and metadata
    return res.json({
      ...entry,
      modified: stats.mtime.toISOString(),
      size: stats.size,
      path: decodedPath
    });
  } catch (error) {
    console.error('Error processing writing request:', error);
    res.status(500).json({ error: 'Failed to process writing request' });
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
