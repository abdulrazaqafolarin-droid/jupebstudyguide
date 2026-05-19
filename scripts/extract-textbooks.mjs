import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEXTBOOK_DIR = 'C:\\Users\\HP\\Downloads\\textbook jupeb';
const OUTPUT_DIR = path.join(__dirname, '..', 'extracted-textbooks');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const files = fs.readdirSync(TEXTBOOK_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));

console.log(`Found ${files.length} textbooks`);

for (const file of files) {
  const filePath = path.join(TEXTBOOK_DIR, file);
  console.log(`\nProcessing: ${file}`);
  try {
    const buffer = fs.readFileSync(filePath);
    const doc = await getDocument({ data: buffer.buffer }).promise;
    let text = '';
    for (let i = 1; i <= Math.min(doc.numPages, 50); i++) { // limit to 50 pages each
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      text += `=== PAGE ${i} ===\n${pageText}\n\n`;
    }
    const outName = file.replace(/\.pdf$/i, '.txt');
    fs.writeFileSync(path.join(OUTPUT_DIR, outName), text, 'utf-8');
    const sizeKb = (text.length / 1024).toFixed(0);
    console.log(`  Extracted ${Math.min(doc.numPages, 50)}/${doc.numPages} pages (${sizeKb} KB)`);
  } catch (err) {
    console.error(`  Error: ${err.message}`);
  }
}

console.log('\nDone! Textbooks extracted to:', OUTPUT_DIR);
console.log('Upload these files through the Textbook Uploader in the app UI (supports up to 20MB PDFs).');
