import { generateEmbedding } from "./ai-service";
import type { ExamProgramId } from "@/lib/exam-program";
import { getTextbookDatabaseName } from "@/lib/textbook-library";
export { getTextbookDatabaseName } from "@/lib/textbook-library";
let pdfjsLib: typeof import("pdfjs-dist") | null = null;
async function getPDFJS() {
  if (!pdfjsLib) {
    pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.worker.min.mjs";
  }
  return pdfjsLib;
}
interface TextbookChunk { id: string; title: string; text: string; embedding: number[]; }
const DB_VERSION = 1;
const STORE_NAME = "textbook-chunks";
function openDB(program: ExamProgramId, userId: string): Promise<IDBDatabase> {
  const dbName = getTextbookDatabaseName(program, userId);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function getAllChunks(program: ExamProgramId, userId: string): Promise<TextbookChunk[]> {
  const db = await openDB(program, userId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => { resolve(req.result as TextbookChunk[]); db.close(); };
    req.onerror = () => { reject(req.error); db.close(); };
  });
}
async function putChunk(chunk: TextbookChunk, program: ExamProgramId, userId: string): Promise<void> {
  const db = await openDB(program, userId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).put(chunk);
    req.onsuccess = () => { resolve(); db.close(); };
    req.onerror = () => { reject(req.error); db.close(); };
  });
}
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; magA += a[i] * a[i]; magB += b[i] * b[i]; }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}
function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start += chunkSize - overlap;
  }
  return chunks;
}
export async function processPDF(
  file: File,
  onProgress: (stage: string, pct: number) => void,
  program: ExamProgramId,
  userId: string,
): Promise<{ chunksCount: number; title: string }> {
  getTextbookDatabaseName(program, userId);
  onProgress("Extracting text from PDF...", 10);
  const pdfjs = await getPDFJS();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map((item) => ("str" in item ? item.str : "")).join(" ") + "\n\n";
  }
  if (!fullText.trim()) throw new Error("This PDF has no extractable text. Scanned/image-only PDFs are not supported by textbook indexing yet.");
  onProgress("Chunking text...", 40);
  const rawChunks = chunkText(fullText);
  const title = file.name.replace(/\.pdf$/i, "");
  if (rawChunks.length === 0) throw new Error("No searchable text was found in this PDF.");
  onProgress(`Generating embeddings (${rawChunks.length} chunks)...`, 60);
  let done = 0;
  for (const text of rawChunks) {
    const embedding = await generateEmbedding(text);
    await putChunk({ id: crypto.randomUUID(), title, text, embedding }, program, userId);
    done++;
    onProgress(`Embedding chunk ${done}/${rawChunks.length}...`, 60 + Math.round((done / rawChunks.length) * 30));
  }
  onProgress("Done!", 100);
  return { chunksCount: rawChunks.length, title };
}
export async function searchRelevantChunks(
  query: string,
  program: ExamProgramId,
  userId: string,
  k = 5,
): Promise<string> {
  if (!query.trim()) return "";
  const chunks = await getAllChunks(program, userId);
  if (chunks.length === 0) return "";
  const queryEmbedding = await generateEmbedding(query);
  const scored = chunks
    .map((chunk) => ({ chunk, score: cosineSimilarity(queryEmbedding, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, k));
  return scored.map((item) => `[From "${item.chunk.title}"]\n${item.chunk.text}`).join("\n\n---\n\n");
}
export async function clearAllTextbooks(program: ExamProgramId, userId: string): Promise<void> {
  const db = await openDB(program, userId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => { resolve(); db.close(); };
    tx.onerror = () => { reject(tx.error); db.close(); };
  });
}
export async function getTextbookCount(program: ExamProgramId, userId: string): Promise<number> {
  const chunks = await getAllChunks(program, userId);
  return new Set(chunks.map((chunk) => chunk.title)).size;
}
