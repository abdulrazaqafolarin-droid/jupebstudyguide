import { getVaultKeys } from "./keyVault.ts";

const EMBED_BASE = "https://generativelanguage.googleapis.com/v1beta";
const EMBED_MODEL = "gemini-embedding-001";
// Must match VECTOR(768) in textbook_chunks / study_question_embeddings.
export const EMBED_DIMS = 768;

export type EmbedTaskType = "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT";

/**
 * Resolve ALL usable Gemini API keys for embeddings: vault keys in priority
 * order, GEMINI_API_KEY env last. Multiple keys allow failover when one is
 * rate-limited (429) — critical for backfills.
 */
export async function resolveEmbedKeys(
  supabaseUrl: string,
  serviceKey: string,
  encryptionSecret: string | undefined
): Promise<string[]> {
  const keys: string[] = [];
  if (encryptionSecret) {
    try {
      const vaultKeys = await getVaultKeys(supabaseUrl, serviceKey, encryptionSecret, "gemini");
      for (const k of vaultKeys) keys.push(k.apiKey);
    } catch (err) {
      console.warn("[Embed] vault key lookup failed, trying env:", String(err).slice(0, 120));
    }
  }
  const envKey = Deno.env.get("GEMINI_API_KEY");
  if (envKey) keys.push(envKey);
  return keys;
}

/** Legacy single-key resolver (first usable key or null). */
export async function resolveEmbedKey(
  supabaseUrl: string,
  serviceKey: string,
  encryptionSecret: string | undefined
): Promise<string | null> {
  const keys = await resolveEmbedKeys(supabaseUrl, serviceKey, encryptionSecret);
  if (keys.length === 0) console.warn("[Embed] No Gemini key available — embeddings unavailable");
  return keys[0] || null;
}

export async function generateEmbedding(
  text: string,
  apiKey?: string | string[],
  taskType: EmbedTaskType = "RETRIEVAL_QUERY"
): Promise<number[] | null> {
  const keys = Array.isArray(apiKey) ? apiKey : apiKey ? [apiKey] : [];
  if (keys.length === 0) {
    const envKey = Deno.env.get("GEMINI_API_KEY");
    if (envKey) keys.push(envKey);
  }
  if (keys.length === 0) {
    console.warn("[Embed] No Gemini key available — embeddings unavailable");
    return null;
  }
  // Fail over across keys (e.g. 429 on the first) before giving up.
  for (const key of keys) {
    const vec = await geminiEmbed(text, key, taskType);
    if (vec) return vec;
  }
  return null;
}

export async function generateEmbeddings(
  texts: string[],
  apiKey?: string | string[],
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
