import { getVaultKeys } from "./keyVault.ts";

const EMBED_BASE = "https://generativelanguage.googleapis.com/v1beta";
const EMBED_MODEL = "gemini-embedding-001";
// Must match VECTOR(768) in textbook_chunks / study_question_embeddings.
export const EMBED_DIMS = 768;

export type EmbedTaskType = "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT";

/**
 * Resolve a Gemini API key for embeddings: vault first (cooldown-aware),
 * GEMINI_API_KEY env fallback. Returns null when nothing is configured.
 */
export async function resolveEmbedKey(
  supabaseUrl: string,
  serviceKey: string,
  encryptionSecret: string | undefined
): Promise<string | null> {
  if (encryptionSecret) {
    try {
      const vaultKeys = await getVaultKeys(supabaseUrl, serviceKey, encryptionSecret, "gemini");
      if (vaultKeys.length > 0) return vaultKeys[0].apiKey;
    } catch (err) {
      console.warn("[Embed] vault key lookup failed, trying env:", String(err).slice(0, 120));
    }
  }
  return Deno.env.get("GEMINI_API_KEY") || null;
}

export async function generateEmbedding(
  text: string,
  apiKey?: string,
  taskType: EmbedTaskType = "RETRIEVAL_QUERY"
): Promise<number[] | null> {
  const key = apiKey || Deno.env.get("GEMINI_API_KEY");
  if (!key) {
    console.warn("[Embed] No Gemini key available — embeddings unavailable");
    return null;
  }
  return geminiEmbed(text, key, taskType);
}

export async function generateEmbeddings(
  texts: string[],
  apiKey?: string,
  taskType: EmbedTaskType = "RETRIEVAL_DOCUMENT"
): Promise<(number[] | null)[]> {
  return Promise.all(texts.map((t) => generateEmbedding(t, apiKey, taskType)));
}

async function geminiEmbed(
  text: string,
  key: string,
  taskType: EmbedTaskType
): Promise<number[] | null> {
  try {
    const res = await fetch(
      `${EMBED_BASE}/models/${EMBED_MODEL}:embedContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `models/${EMBED_MODEL}`,
          content: { parts: [{ text }] },
          taskType,
          outputDimensionality: EMBED_DIMS,
        }),
      }
    );
    if (!res.ok) {
      const err = await res.text().catch(() => "unknown");
      console.error(`[Embed] Gemini error (${res.status}): ${err.slice(0, 200)}`);
      return null;
    }
    const data = await res.json();
    const values = data.embedding?.values || null;
    if (!values || values.length !== EMBED_DIMS) {
      console.error(`[Embed] unexpected dims: got ${values?.length}, want ${EMBED_DIMS}`);
      return null;
    }
    return values;
  } catch (err) {
    console.error("[Embed] Gemini request failed:", String(err));
    return null;
  }
}
