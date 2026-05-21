export interface Chunk {
  index: number;
  content: string;
  metadata: Record<string, unknown>;
}

export interface ChunkOptions {
  maxChunkSize?: number;
  overlap?: number;
}

export function chunkText(
  text: string,
  options: ChunkOptions = {}
): Chunk[] {
  const maxChunkSize = options.maxChunkSize ?? 1000;
  const overlap = options.overlap ?? 200;
  const chunks: Chunk[] = [];

  const paragraphs = text.split(/\n\s*\n/);
  let current = "";
  let index = 0;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if ((current + "\n\n" + trimmed).length > maxChunkSize && current.length > 0) {
      chunks.push({ index: index++, content: current.trim(), metadata: {} });
      const words = current.split(/\s+/);
      const overlapWords = words.slice(-Math.floor(overlap / 5));
      current = overlapWords.join(" ") + "\n\n" + trimmed;
    } else {
      current = current ? current + "\n\n" + trimmed : trimmed;
    }
  }

  if (current.trim()) {
    chunks.push({ index: index++, content: current.trim(), metadata: {} });
  }

  if (chunks.length === 0) {
    chunks.push({ index: 0, content: text.trim(), metadata: {} });
  }

  return chunks;
}
