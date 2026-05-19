import { generateEmbedding } from "./ai-service";

let pdfjsLib: typeof import("pdfjs-dist") | null = null;

async function getPDFJS() {
  if (!pdfjsLib) {
    pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs";
  }
  return pdfjsLib;
}

interface TextbookChunk {
  id: string;
  title: string;
  text: string;
  embedding: number[];
}

const DB_NAME = "jupeb-rag";
const DB_VERSION = 1;
const STORE_NAME = "textbook-chunks";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllChunks(): Promise<TextbookChunk[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => { resolve(req.result); db.close(); };
    req.onerror = () => { reject(req.error); db.close(); };
  });
}

async function putChunk(chunk: TextbookChunk): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(chunk);
    req.onsuccess = () => { resolve(); db.close(); };
    req.onerror = () => { reject(req.error); db.close(); };
  });
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  return chunks;
}

export async function processPDF(
  file: File,
  onProgress?: (stage: string, pct: number) => void
): Promise<{ chunksCount: number; title: string }> {
  onProgress?.("Extracting text from PDF...", 10);

  const pdfjs = await getPDFJS();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: { str: string }) => item.str).join(" ");
    fullText += pageText + "\n\n";
  }

  onProgress?.("Chunking text...", 40);
  const rawChunks = chunkText(fullText);
  const title = file.name.replace(/\.pdf$/i, "");

  onProgress?.(`Generating embeddings (${rawChunks.length} chunks)...`, 60);

  let done = 0;
  for (const text of rawChunks) {
    const embedding = await generateEmbedding(text);
    const chunk: TextbookChunk = {
      id: `${title}-${crypto.randomUUID().slice(0, 8)}`,
      title,
      text,
      embedding,
    };
    await putChunk(chunk);
    done++;
    onProgress?.(
      `Embedding chunk ${done}/${rawChunks.length}...`,
      60 + Math.round((done / rawChunks.length) * 30)
    );
  }

  onProgress?.("Done!", 100);
  return { chunksCount: rawChunks.length, title };
}

export async function searchRelevantChunks(
  query: string,
  k = 5
): Promise<string> {
  const [queryEmb, chunks] = await Promise.all([
    generateEmbedding(query),
    getAllChunks(),
  ]);

  if (chunks.length === 0) return "";

  const scored = chunks
    .map((c) => ({ chunk: c, score: cosineSimilarity(queryEmb, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  return scored
    .map((s) => `[From "${s.chunk.title}"]\n${s.chunk.text}`)
    .join("\n\n---\n\n");
}

export async function clearAllTextbooks(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => { resolve(); db.close(); };
    req.onerror = () => { reject(req.error); db.close(); };
  });
}

export async function getTextbookCount(): Promise<number> {
  const chunks = await getAllChunks();
  const titles = new Set(chunks.map((c) => c.title));
  return titles.size;
}
