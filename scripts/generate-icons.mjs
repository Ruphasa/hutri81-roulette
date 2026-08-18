import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const svgPath = path.join(rootDir, 'public', 'brand-icon.svg');
const outputDir = path.join(rootDir, 'public', 'icons');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const sizes = [
  { size: 192, filename: 'pwa-192x192.png' },
  { size: 512, filename: 'pwa-512x512.png' }
];

async function generateIcons() {
  const svgBuffer = fs.readFileSync(svgPath);

  for (const { size, filename } of sizes) {
    const destPath = path.join(outputDir, filename);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(destPath);
    console.log(`Generated ${filename} (${size}x${size})`);
  }
}

generateIcons().catch((err) => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
