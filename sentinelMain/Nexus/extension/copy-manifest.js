import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcManifest = path.join(__dirname, 'manifest.json');
const distDir = path.join(__dirname, 'dist');
const distManifest = path.join(distDir, 'manifest.json');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.copyFileSync(srcManifest, distManifest);
console.log('[NEXUS Build] Manifest V3 copied to dist/manifest.json successfully.');
