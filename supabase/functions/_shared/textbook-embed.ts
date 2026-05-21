const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (key) {
    return geminiEmbed(text, key);
  }
  console.warn("[Embed] No GEMINI_API_KEY set — embeddings unavailable");
  return null;
}

export async function generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  return Promise.all(texts.map(generateEmbedding));
}

async function geminiEmbed(text: string, key: string): Promise<number[] | null> {
  try {
    const res = await fetch(
      `${GEMINI_BASE}/models/text-embedding-004:embedContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: { parts: [{ text }] },
        }),
      }
    );
    if (!res.ok) {
      const err = await res.text().catch(() => "unknown");
      console.error(`[Embed] Gemini error (${res.status}): ${err.slice(0, 200)}`);
      return null;
    }
    const data = await res.json();
    return data.embedding?.values || null;
  } catch (err) {
    console.error("[Embed] Gemini request failed:", String(err));
    return null;
  }
}
