import { routerText, routerJSON, routerStream } from "./ai-router.ts";
import type { RouterMessage, RouterOpts } from "./ai-router.ts";

const ALLOWED_ORIGIN = Deno.env.get("CORS_ORIGIN") || "*";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export async function aiChatText(
  _env: unknown,
  systemPrompt: string,
  messages: RouterMessage[],
  opts?: RouterOpts
): Promise<string> {
  const { text } = await routerText(systemPrompt, messages, opts);
  return text;
}

export async function aiChatJSON(
  _env: unknown,
  systemPrompt: string,
  messages: RouterMessage[],
  opts?: RouterOpts
): Promise<unknown> {
  return routerJSON(systemPrompt, messages, opts);
}

export async function aiChatStream(
  _env: unknown,
  systemPrompt: string,
  messages: RouterMessage[],
  opts?: RouterOpts
): Promise<ReadableStream<Uint8Array>> {
  return routerStream(systemPrompt, messages, opts);
}

export { CORS_HEADERS };
