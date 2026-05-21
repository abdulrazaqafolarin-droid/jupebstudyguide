import { routerText, routerJSON, routerStream } from "./ai-router.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export async function aiChatText(
  _env: any,
  systemPrompt: string,
  messages: { role: string; content: string }[],
  opts?: any
): Promise<string> {
  const { text } = await routerText(systemPrompt, messages, opts);
  return text;
}

export async function aiChatJSON(
  _env: any,
  systemPrompt: string,
  messages: { role: string; content: string }[],
  opts?: any
): Promise<any> {
  return routerJSON(systemPrompt, messages, opts);
}

export async function aiChatStream(
  _env: any,
  systemPrompt: string,
  messages: { role: string; content: string }[],
  opts?: any
): Promise<ReadableStream> {
  return routerStream(systemPrompt, messages, opts);
}

export { CORS_HEADERS };
