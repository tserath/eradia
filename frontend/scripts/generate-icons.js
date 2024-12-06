import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourceIcon = join(__dirname, '../public/eradia.svg');
const publicDir = join(__dirname, '../public');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate PWA icons
const pwaIcons = [
  { size: 192, name: 'pwa-192x192.png' },
  { size: 512, name: 'pwa-512x512.png' }
];

// Generate PWA icons
pwaIcons.forEach(({ size, name }) => {
  sharp(sourceIcon)
    .resize(size, size)
    .png()
    .toFile(join(publicDir, name))
    .then(() => console.log(`Generated ${name}`))
    .catch(err => console.error(`Error generating ${name}:`, err));
});

// Generate maskable icon (with padding for safe area)
sharp(sourceIcon)
  .resize(512, 512, {
    fit: 'contain',
    background: { r: 26, g: 27, b: 30, alpha: 1 } // #1A1B1E
  })
  .png()
  .toFile(join(publicDir, 'maskable-icon-512x512.png'))
  .then(() => console.log('Generated maskable icon'))
  .catch(err => console.error('Error generating maskable icon:', err));

// Generate add icon
sharp(sourceIcon)
  .resize(192, 192)
  .composite([{
    input: Buffer.from(`
      <svg>
        <rect x="80" y="40" width="32" height="112" fill="white"/>
        <rect x="40" y="80" width="112" height="32" fill="white"/>
      </svg>`
    ),
    blend: 'over'
  }])
  .png()
  .toFile(join(publicDir, 'add.png'))
  .then(() => console.log('Generated add icon'))
  .catch(err => console.error('Error generating add icon:', err));
