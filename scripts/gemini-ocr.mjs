import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGE_DIR = path.join(__dirname, '..', 'Past questions', 'New folder');
const OUTPUT_DIR = path.join(__dirname, '..', 'extracted-text');
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

if (!GEMINI_KEY) {
  console.log('Usage: GEMINI_API_KEY=your_key node scripts/gemini-ocr.mjs');
  process.exit(1);
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function callGeminiVision(imageBase64, mimeType, prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType, data: imageBase64 } },
            { text: prompt },
          ],
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error (${res.status}): ${err}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
    const ext = path.extname(file).slice(1).replace('jpg', 'jpeg');
    const mimeType = `image/${ext}`;

    console.log(`  ${file} (${(buffer.length / 1024).toFixed(0)} KB)`);

    const prompt = `Extract ALL text visible in this exam question image. Preserve the exact format including question numbers, options (A., B., C., D.), and any marks. Output only the extracted text.`;

    try {
      const text = await callGeminiVision(base64, mimeType, prompt);
      const outName = file.replace(/\.[^.]+$/, '.txt');
      const outPath = path.join(OUTPUT_DIR, `${label.replace(/[^a-z0-9]/gi, '_')}_${outName}`);
      fs.writeFileSync(outPath, text);
      console.log(`  -> ${text.length} chars saved`);
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }
  }
}

async function main() {
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

  console.log('\nDone! Extracted text saved in extracted-text/');
}

main().catch(console.error);
