import { routerText, routerJSON, routerStream } from "./ai-router.ts";
import type { RouterMessage } from "./ai-router.ts";

const ALLOWED_ORIGIN = Deno.env.get("CORS_ORIGIN") || "*";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export async function aiChatText(
  _env: any,
  systemPrompt: string,
  messages: RouterMessage[],
  opts?: any
): Promise<string> {
  const { text } = await routerText(systemPrompt, messages, opts);
  return text;
}

export async function aiChatJSON(
  _env: any,
  systemPrompt: string,
  messages: RouterMessage[],
  opts?: any
): Promise<any> {
  return routerJSON(systemPrompt, messages, opts);
}

export async function aiChatStream(
  _env: any,
  systemPrompt: string,
  messages: RouterMessage[],
  opts?: any
): Promise<ReadableStream> {
  return routerStream(systemPrompt, messages, opts);
}

export { CORS_HEADERS };
