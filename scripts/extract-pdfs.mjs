import fs from 'fs';
import path from 'path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const pastQuestionsDir = 'C:\\Users\\HP\\Downloads\\Past questions';
const outputDir = path.join(process.cwd(), 'extracted-text');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const files = fs.readdirSync(pastQuestionsDir).filter(f => f.toLowerCase().endsWith('.pdf'));
console.log(`Found ${files.length} PDFs`);

for (const file of files) {
  const filePath = path.join(pastQuestionsDir, file);
  console.log(`\nProcessing: ${file}`);
  try {
    const buffer = fs.readFileSync(filePath);
    const doc = await getDocument({ data: buffer.buffer }).promise;
    let text = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      text += `=== PAGE ${i} ===\n${pageText}\n\n`;
    }
    const outName = file.replace(/\.pdf$/i, '.txt');
    fs.writeFileSync(path.join(outputDir, outName), text, 'utf-8');
    console.log(`  Extracted ${doc.numPages} pages (${(text.length / 1024).toFixed(0)} KB)`);
  } catch (err) {
    console.error(`  Error: ${err.message}`);
  }
}

console.log('\nDone!');
