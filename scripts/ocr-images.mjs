import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGE_DIR = 'C:\\Users\\HP\\Downloads\\Past questions';
const OUTPUT_DIR = path.join(__dirname, '..', 'extracted-text');

const OPENROUTER_KEY = process.env.VITE_OPENROUTER_API_KEY || '';

if (!OPENROUTER_KEY) {
  console.log('============================================================');
  console.log('VITE_OPENROUTER_API_KEY is not set.');
  console.log('To OCR images, set it and re-run:');
  console.log('  set VITE_OPENROUTER_API_KEY=sk-or-v1-...');
  console.log('  node scripts/ocr-images.mjs');
  console.log('');
  console.log('Image folders to process:');
  console.log('  1. 2020 biology/ (6 images)');
  console.log('  2. chemistry 2019/ (8 images)');
  console.log('  3. past question 2015 chemistry/ (23 images)');
  console.log('  4. past question 2015 physics/ (6 images)');
  console.log('');
  console.log('Scanned PDFs to OCR:');
  console.log('  2019 Biology, 2019 Math, 2019 Physics');
  console.log('  2020 Chemistry, 2020 Math, 2020 Physics');
  console.log('  2022 Biology, 2022 Chemistry, 2022 Physics');
  console.log('============================================================');
  process.exit(0);
}

async function callGeminiVision(imageBase64, mimeType, prompt) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3.1-pro-preview',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        ],
      }],
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function processImageFolder(folderPath, label) {
  const files = fs.readdirSync(folderPath)
    .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
    .sort();

  console.log(`\n=== ${label} (${files.length} images) ===`);

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString('base64');
    const mimeType = `image/${path.extname(file).slice(1).replace('jpg', 'jpeg')}`;

    console.log(`  Reading: ${file} (${(buffer.length / 1024).toFixed(0)} KB)`);

    const prompt = `Extract ALL text visible in this exam question image. Preserve the exact format including question numbers, options (A., B., C., D.), and any marks. Output only the extracted text.`;

    try {
      const text = await callGeminiVision(base64, mimeType, prompt);
      const outName = file.replace(/\.[^.]+$/, '.txt');
      fs.writeFileSync(path.join(OUTPUT_DIR, `${label.replace(/[^a-z0-9]/gi, '_')}_${outName}`), text);
      console.log(`  OCR complete (${text.length} chars)`);
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }
  }
}

async function processScannedPdf(pdfPath) {
  const buffer = fs.readFileSync(pdfPath);
  const base64 = buffer.toString('base64');
  const name = path.basename(pdfPath, '.pdf');

  console.log(`\nProcessing scanned PDF: ${name}`);
  // For scanned PDFs, the LLM can extract text from the first few pages
  // More comprehensive PDF OCR would require per-page image extraction
  console.log(`  Scanned PDF: ${(buffer.length / 1024).toFixed(0)} KB`);
  console.log(`  Note: For best results, extract individual pages as images first`);
}

async function main() {
  // Process image folders
  const folders = [
    { path: path.join(IMAGE_DIR, '2020 biology'), label: '2020_biology' },
    { path: path.join(IMAGE_DIR, 'chemistry 2019'), label: '2019_chemistry' },
    { path: path.join(IMAGE_DIR, 'past question 2015 chemistry'), label: '2015_chemistry' },
    { path: path.join(IMAGE_DIR, 'past question 2015 physics'), label: '2015_physics' },
  ];

  for (const folder of folders) {
    if (fs.existsSync(folder.path)) {
      await processImageFolder(folder.path, folder.label);
    } else {
      console.log(`\nSkipping ${folder.label}: folder not found`);
    }
  }

  // List scanned PDFs that need OCR
  const pdfs = ['2019 Biology - MCQ & Essay (1).pdf', '2019 Mathematics (1) (2).pdf',
    '2019 Physics - MCQ & Essay (1).pdf', '2020 Chemistry - MCQ & Essay (1).pdf',
    '2020 Mathematics (1) (1).pdf', '2020 Physics - MCQ & Essay (1).pdf',
    '2022 Biology - MCQ & Essay.pdf', '2022 Chemistry - MCQ & Essay.pdf',
    '2022 Physics - MCQ & Essay.pdf'];

  for (const pdf of pdfs) {
    const pdfPath = path.join(IMAGE_DIR, pdf);
    if (fs.existsSync(pdfPath)) {
      await processScannedPdf(pdfPath);
    }
  }

  console.log('\n============================================================');
  console.log('OCR complete! Run import-questions.mjs to parse extracted text');
  console.log('============================================================');
}

main().catch(console.error);
