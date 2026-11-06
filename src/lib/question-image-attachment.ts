/** 
 * Fetches a public question illustration in the browser and packages it as
 * an image attachment for the vision-capable AI route. The server never has
 * to fetch an arbitrary URL (avoids turning this feature into an SSRF proxy).
 */
export interface QuestionImageAttachment {
  base64: string;
  mimeType: string;
  name: string;
}

export const MAX_QUESTION_IMAGE_BYTES = 1_500_000;
const IMAGE_FETCH_TIMEOUT_MS = 12_000;

const SUPPORTED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

export async function fetchQuestionImageAttachment(
  imageUrl: string,
  signal?: AbortSignal,
): Promise<QuestionImageAttachment> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    throw new Error("The question image URL is invalid.");
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error("The question image must use a secure web address.");
  }

  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(signal?.reason);
  if (signal?.aborted) abortFromCaller();
  else signal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(new DOMException("Question image request timed out", "TimeoutError")),
    IMAGE_FETCH_TIMEOUT_MS,
  );

  try {
    const response = await fetch(parsedUrl.href, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`The question image could not be downloaded (HTTP ${response.status}).`);
    }

    const declaredLength = response.headers.get("content-length");
    if (declaredLength && Number(declaredLength) > MAX_QUESTION_IMAGE_BYTES) {
      throw new Error("The question image is too large to send for AI analysis (maximum 1.5 MB).");
    }

    const mimeType = (response.headers.get("content-type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase();

    if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
      throw new Error("This question image format cannot be analysed. Use PNG, JPEG, WebP, or GIF.");
    }

    // Read bytes directly rather than converting through Blob: this also
    // avoids cross-realm Blob coercion in embedded WebViews and test runtimes.
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0) {
      throw new Error("The question image is empty.");
    }
    if (bytes.byteLength > MAX_QUESTION_IMAGE_BYTES) {
      throw new Error("The question image is too large to send for AI analysis (maximum 1.5 MB).");
    }
    let binary = "";
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }

    const encodedName = parsedUrl.pathname.split("/").filter(Boolean).pop() || "question-image";
    let rawName = encodedName;
    try { rawName = decodeURIComponent(encodedName); } catch { /* keep the safe encoded path segment */ }
    const name = rawName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "question-image";

    return { base64: btoa(binary), mimeType, name };
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted) {
      throw new Error("The question image took too long to load. Your answer is saved; retry the explanation.");
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}
