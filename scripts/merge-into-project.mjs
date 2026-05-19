import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NEW_FILES_DIR = path.join(__dirname, '..', 'src', 'data', 'new-data-files');
const STUDY_DIR = path.join(__dirname, '..', 'src', 'data', 'study-questions');

if (!fs.existsSync(NEW_FILES_DIR)) {
  console.log('No new-data-files directory found. Run generate-ts.mjs first.');
  process.exit(0);
}

const files = fs.readdirSync(NEW_FILES_DIR).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const targetName = file.replace('-imported', '');
  const sourcePath = path.join(NEW_FILES_DIR, file);
  const targetPath = path.join(STUDY_DIR, targetName);

  if (fs.existsSync(targetPath)) {
    console.log(`Backing up existing ${targetName} -> ${targetName}.backup`);
    fs.copyFileSync(targetPath, targetPath + '.backup');
  }

  fs.copyFileSync(sourcePath, targetPath);
  console.log(`Merged ${file} -> study-questions/${targetName}`);
}

console.log('\n=== IMPORTANT ===');
console.log('The new data files now overwrite the existing study-questions.');
console.log('The old originals are backed up as *.backup files.');
console.log('');
console.log('Next steps:');
console.log('1. Update src/data/study-questions/index.ts to import new getters');
console.log('2. Or manually merge the new questions into the existing arrays');
console.log('3. Run build to verify: npx vite build');
