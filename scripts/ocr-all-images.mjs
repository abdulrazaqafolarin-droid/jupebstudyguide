import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Tesseract from 'tesseract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAST_Q_DIR = path.join(__dirname, '..', 'Past questions', 'New folder');
const EXTRACTED_DIR = path.join(__dirname, '..', 'extracted-text');

fs.mkdirSync(EXTRACTED_DIR, { recursive: true });

function parseLabelFromPath(relPath) {
  const parts = relPath.replace(/\\/g, '/').split('/');
  let label = parts.slice(0, -1).join('_').replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return label || 'unknown';
}

function findImages(dir) {
  const results = [];
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) {
      results.push(...findImages(fp));
    } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(f)) {
      results.push(fp);
    }
  }
  return results;
}

async function ocrImage(filePath) {
  const relPath = path.relative(PAST_Q_DIR, filePath);
  const label = path.basename(relPath).replace(/\.[^.]+$/, '');
  const outFile = path.join(EXTRACTED_DIR, `${label}.txt`);

  if (fs.existsSync(outFile) && fs.readFileSync(outFile, 'utf-8').trim().length > 0) {
    return;
  }

  const stats = fs.statSync(filePath);
  console.log(`  ${relPath} (${(stats.size / 1024).toFixed(0)} KB)`);

  try {
    const { data } = await Tesseract.recognize(filePath, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const pct = Math.round((m.progress || 0) * 100);
          process.stdout.write(`\r    OCR progress: ${pct}%`);
        }
      },
    });
    process.stdout.write('\n');
    fs.writeFileSync(outFile, data.text.trim(), 'utf-8');
    console.log(`    -> ${data.text.trim().length} chars saved`);
  } catch (err) {
    console.error(`    Error: ${err.message}`);
  }
}

async function main() {
  console.log('Finding images...');
  const images = findImages(PAST_Q_DIR);
  console.log(`Found ${images.length} images\n`);

  let processed = 0;
  for (const img of images) {
    await ocrImage(img);
    processed++;
  }

  console.log(`\nDone! Processed ${processed} images.`);
}

main().catch(console.error);
